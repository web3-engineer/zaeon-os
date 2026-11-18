import XCTest
@testable import HermesCore
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// As pesquisas da vitrine no console: o rascunho (as mesmas regras do servidor), o corpo do POST, a decodificação
/// tolerante da resposta e as três rotas (publicar, listar, moderar) com o Bearer.
final class PesquisasTests: XCTestCase {

    // MARK: Rascunho

    func testRascunhoVazioListaOQueFalta() {
        let r = RascunhoPesquisa()
        let p = r.problemas()
        XCTAssertTrue(p.contains("Dê um título à pesquisa."))
        XCTAssertTrue(p.contains { $0.hasPrefix("Parte 1 (Artigo): escreva o texto") })
    }

    func testLinkPrecisaSerHttpsEEmailPrecisaTerArroba() {
        var r = RascunhoPesquisa()
        r.titulo = "Solo do sertão"
        r.partes = [ParteRascunho(tipo: .dados, url: "http://inseguro.org/x.csv")]
        r.contaEmail = "fulano"
        let p = r.problemas()
        XCTAssertTrue(p.contains { $0.contains("https://") })
        XCTAssertTrue(p.contains { $0.contains("e-mail") })
        XCTAssertFalse(Pesquisas.ehHttps("javascript:alert(1)"))
        XCTAssertTrue(Pesquisas.ehHttps("https://zenodo.org/record/1"))
    }

    func testLimitesDeTamanhoEPartes() {
        var r = RascunhoPesquisa()
        r.titulo = "T"
        r.partes = Array(repeating: ParteRascunho(conteudo: "x"), count: LimitesPesquisa.partes + 1)
        XCTAssertTrue(r.problemas().contains { $0.contains("No máximo") })
        r.partes = [ParteRascunho(conteudo: String(repeating: "a", count: LimitesPesquisa.conteudo + 1))]
        XCTAssertTrue(r.problemas().contains { $0.contains("grande demais") })
    }

    func testPedidoSaiLimpo() {
        var r = RascunhoPesquisa()
        r.titulo = "  Microbioma  "
        r.nicho = " Biologia "
        r.tags = "solo, sertão, solo ,, 16S"
        r.contaEmail = " Iracema@Exemplo.com "
        r.partes = [
            ParteRascunho(tipo: .artigo, titulo: "  ", conteudo: "  texto  "),
            ParteRascunho(tipo: .dados, titulo: "16S", url: " https://zenodo.org/r/9 "),
        ]
        XCTAssertTrue(r.problemas().isEmpty)
        let p = r.pedido()
        XCTAssertEqual(p.titulo, "Microbioma")
        XCTAssertEqual(p.nicho, "Biologia")
        XCTAssertEqual(p.tags, ["solo", "sertão", "16S"])
        XCTAssertEqual(p.contaEmail, "iracema@exemplo.com")
        XCTAssertEqual(p.partes, [
            .init(tipo: "artigo", titulo: nil, conteudo: "texto", url: nil),
            .init(tipo: "dados", titulo: "16S", conteudo: nil, url: "https://zenodo.org/r/9"),
        ])
        var semConta = r; semConta.contaEmail = "  "
        XCTAssertNil(semConta.pedido().contaEmail)
    }

    // MARK: Arquivos importados

    func testTextoDoArquivoUtf8Latin1EBinario() {
        XCTAssertEqual(Pesquisas.textoDoArquivo(Data("\u{FEFF}a,b\n1,2".utf8)), "a,b\n1,2")
        XCTAssertEqual(Pesquisas.textoDoArquivo(Data([0x6D, 0xE9, 0x64, 0x69, 0x61])), "média")   // Latin-1 (Excel BR)
        XCTAssertNil(Pesquisas.textoDoArquivo(Data([0x25, 0x50, 0x44, 0x46, 0x00, 0x01])))     // binário (PDF)
        XCTAssertEqual(Pesquisas.tipoSugerido(arquivo: "amostras.csv"), .dados)
        XCTAssertEqual(Pesquisas.tipoSugerido(arquivo: "analise.py"), .codigo)
        XCTAssertNil(Pesquisas.tipoSugerido(arquivo: "artigo.md"))
    }

    // MARK: Decodificação

    func testDecodificaPesquisaTolerante() throws {
        let json = """
        {"pesquisas":[
          {"id":"p1","slug":"solo","titulo":"Solo","resumo":"r","nicho":"Bio","autor":"","origem":"usuario","status":"pendente",
           "motivo":null,"criadoEm":"2026-11-12T09:00:00.000Z","conta":{"id":"u1","name":"Iracema"},
           "partes":[{"tipo":"artigo","titulo":"Dissertação","conteudo":"abcd"},{"tipo":"dados","titulo":"16S","url":"https://z.org"}]},
          {"id":"p2","titulo":"Sem nada","status":"arquivada","partes":null},
          {"sem_id":true}
        ]}
        """
        let l = try JSONHermes.decodificador().decode(ListaPesquisas.self, from: Data(json.utf8))
        XCTAssertEqual(l.pesquisas.count, 2)   // o item ilegível é pulado
        let a = l.pesquisas[0]
        XCTAssertEqual(a.status, .pendente)
        XCTAssertEqual(a.quem, "Iracema")
        XCTAssertEqual(a.rotuloOrigem, "usuário")
        XCTAssertEqual(a.partes.map(\.caracteres), [4, 0])
        XCTAssertEqual(a.partes.map(\.link), [false, true])
        XCTAssertEqual(a.partes.first?.nomeTipo, "Artigo")
        XCTAssertNotNil(a.criadoEm)
        let b = l.pesquisas[1]
        XCTAssertEqual(b.status, .desconhecido("arquivada"))
        XCTAssertEqual(b.quem, "Zaeon")
        XCTAssertTrue(b.partes.isEmpty)
    }

    func testErro400MostraAFraseDoServidor() {
        XCTAssertEqual(ErroAPI.http(status: 400, codigo: "Título obrigatório.").errorDescription, "Título obrigatório.")
        XCTAssertEqual(ErroAPI.http(status: 500, codigo: nil).errorDescription, "Erro HTTP 500.")
    }

    // MARK: Rotas

    private func cliente() throws -> APIClient {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.protocolClasses = [StubURLProtocol.self]
        StubURLProtocol.ultima = nil
        StubURLProtocol.ultimoCorpo = nil
        StubURLProtocol.falhaDeRede = false
        return try APIClient(urlServidor: "https://zaeon.space", token: "tok-1234567890-1234567890-1234567890", sessao: URLSession(configuration: cfg))
    }
    private let umaPesquisa = #"{"pesquisa":{"id":"p9","slug":"x","titulo":"X","status":"publicada","origem":"console","partes":[{"tipo":"artigo","titulo":"A","conteudo":"t"}]}}"#

    func testPublicarVaiPraRotaDaVitrineComBearer() async throws {
        let c = try cliente()
        StubURLProtocol.resposta = .init(status: 201, corpo: Data(umaPesquisa.utf8))
        var r = RascunhoPesquisa(); r.titulo = "X"; r.partes = [ParteRascunho(conteudo: "t")]
        let p = try await c.publicarPesquisa(r.pedido())
        XCTAssertEqual(p.status, .publicada)
        let req = try XCTUnwrap(StubURLProtocol.ultima)
        XCTAssertEqual(req.url?.absoluteString, "https://zaeon.space/api/admin/vitrine/pesquisas")
        XCTAssertEqual(req.httpMethod, "POST")
        XCTAssertEqual(req.value(forHTTPHeaderField: "Authorization"), "Bearer tok-1234567890-1234567890-1234567890")
        let corpo = try XCTUnwrap(StubURLProtocol.ultimoCorpo)
        let obj = try XCTUnwrap(JSONSerialization.jsonObject(with: corpo) as? [String: Any])
        XCTAssertEqual(obj["titulo"] as? String, "X")
        XCTAssertEqual((obj["partes"] as? [[String: Any]])?.first?["tipo"] as? String, "artigo")
    }

    func testListarPorStatusEModerar() async throws {
        let c = try cliente()
        StubURLProtocol.resposta = .init(status: 200, corpo: Data(#"{"pesquisas":[]}"#.utf8))
        _ = try await c.pesquisas(status: .pendente)
        XCTAssertEqual(StubURLProtocol.ultima?.url?.absoluteString, "https://zaeon.space/api/admin/vitrine/pesquisas?status=pendente")

        StubURLProtocol.resposta = .init(status: 200, corpo: Data(umaPesquisa.utf8))
        _ = try await c.moderarPesquisa(id: "p9", status: .recusada, motivo: "faltou citar as fontes")
        let req = try XCTUnwrap(StubURLProtocol.ultima)
        XCTAssertEqual(req.url?.absoluteString, "https://zaeon.space/api/admin/vitrine/pesquisas/p9")
        XCTAssertEqual(req.httpMethod, "PATCH")
        let obj = try XCTUnwrap(JSONSerialization.jsonObject(with: try XCTUnwrap(StubURLProtocol.ultimoCorpo)) as? [String: Any])
        XCTAssertEqual(obj["status"] as? String, "recusada")
        XCTAssertEqual(obj["motivo"] as? String, "faltou citar as fontes")
    }

    func testRecusaDoServidorVoltaComAFrase() async throws {
        let c = try cliente()
        StubURLProtocol.resposta = .init(status: 400, corpo: Data(#"{"erro":"Conta não encontrada (contaId ou contaEmail)."}"#.utf8))
        var r = RascunhoPesquisa(); r.titulo = "X"; r.partes = [ParteRascunho(conteudo: "t")]; r.contaEmail = "nao@existe.com"
        do {
            _ = try await c.publicarPesquisa(r.pedido())
            XCTFail("devia lançar")
        } catch let e as ErroAPI {
            XCTAssertEqual(e.errorDescription, "Conta não encontrada (contaId ou contaEmail).")
        }
    }
}
