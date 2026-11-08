import XCTest
@testable import HermesCore
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

final class SaudeTests: XCTestCase {
    var s: SaudeChat!

    override func setUpWithError() throws {
        s = try Fixtures.decodificar(SaudeChat.self, de: .saude)
    }

    func testDecodificaFixture() throws {
        XCTAssertEqual(s.janelaHoras, 24)
        XCTAssertEqual(s.chamadas, 1_186)
        XCTAssertEqual(s.turnos, 312)
        XCTAssertEqual(s.falhas, 41)
        XCTAssertEqual(try XCTUnwrap(s.taxaFalha), 0.0346, accuracy: 0.00001)
        XCTAssertEqual(s.turnosComReserva, 19)
        XCTAssertEqual(s.turnosComModeloAposentado, 2)
        XCTAssertNotNil(s.geradoEm)
        XCTAssertEqual(s.porFase.map(\.fase), [.route, .plan, .acao, .draft, .sintese, .critique])
        XCTAssertEqual(s.porAlvo.map(\.alvo), [.vertex, .huggingface])
        XCTAssertEqual(s.erros.map(\.classe), [.rateLimit, .timeout, .modeloInexistente])
        XCTAssertEqual(s.modelos.count, 4)
        XCTAssertEqual(s.serie.count, 24)
        // consistência interna da fixture
        XCTAssertEqual(s.porFase.reduce(0) { $0 + $1.chamadas }, s.chamadas)
        XCTAssertEqual(s.porFase.reduce(0) { $0 + $1.falhas }, s.falhas)
        XCTAssertEqual(s.serie.reduce(0) { $0 + $1.chamadas }, s.chamadas)
        XCTAssertEqual(s.erros.reduce(0) { $0 + $1.n }, s.falhas)
        XCTAssertEqual(s.modelos.reduce(0) { $0 + $1.chamadas }, s.chamadas)
    }

    func testToleranteANulosEValoresNovos() throws {
        let json = """
        { "geradoEm": null, "janelaHoras": "6", "chamadas": 10, "turnos": 4, "falhas": 2, "taxaFalha": null,
          "turnosComReserva": 1, "taxaReserva": null, "turnosComModeloAposentado": null,
          "porFase": [{ "fase": "reranker", "chamadas": 5, "falhas": 1, "taxaFalha": null, "msP50": null, "msP90": "900" },
                      { "fase": "draft", "chamadas": 5, "falhas": 1 }],
          "porAlvo": [{ "alvo": "openrouter", "chamadas": 3, "fracao": null }, { "alvo": "vertex", "chamadas": 7 }],
          "erros": [{ "classe": "quota_estourada", "n": 2 }, { "n": 1 }],
          "modelos": [{ "model": null, "chamadas": 1, "falhas": 0 }],
          "serie": [{ "hora": "2026-11-08T06:00:00Z", "chamadas": 3, "falhas": null, "msP50": null }, { "chamadas": 1 }],
          "campoNovo": true }
        """
        let t = try JSONHermes.decodificador().decode(SaudeChat.self, from: Data(json.utf8))
        XCTAssertNil(t.geradoEm)
        XCTAssertEqual(t.janelaHoras, 6)
        XCTAssertEqual(t.taxaFalha, 0.2, "null → falhas/chamadas")
        XCTAssertEqual(t.taxaReserva, 0.25, "null → turnosComReserva/turnos")
        XCTAssertEqual(t.turnosComModeloAposentado, 0)
        XCTAssertEqual(t.porFase[0].fase, .desconhecido("reranker"))
        XCTAssertEqual(t.porFase[0].taxaFalha, 0.2)
        XCTAssertEqual(t.porFase[0].msP90, 900)
        XCTAssertNil(t.porFase[0].msP50)
        XCTAssertEqual(t.porAlvo[0].alvo, .desconhecido("openrouter"))
        XCTAssertNil(t.porAlvo[0].fracao)
        XCTAssertEqual(t.erros[0].classe, .desconhecido("quota_estourada"))
        XCTAssertEqual(t.erros[0].classe.rotulo, "quota estourada")
        XCTAssertEqual(t.erros[1].classe, .desconhecido(""))
        XCTAssertEqual(t.modelos[0].model, "?")
        XCTAssertEqual(t.serie.count, 1, "ponto sem hora é pulado")
        XCTAssertEqual(t.serie[0].falhas, 0)
    }

    func testCartoes() {
        let c = Saude.cartoes(s)
        XCTAssertEqual(c.map(\.id), ["falha", "reserva", "aposentado", "turnos"])
        XCTAssertEqual(c[0].valor, "3,5%")
        XCTAssertEqual(c[0].tom, .alerta)
        XCTAssertEqual(c[0].detalhe, "41 de 1.186 chamadas")
        XCTAssertEqual(c[1].valor, "6,1%")
        XCTAssertEqual(c[1].tom, .alerta, "reserva > 5% fica âmbar")
        XCTAssertEqual(c[2].valor, "2")
        XCTAssertEqual(c[2].tom, .ruim, "aposentado > 0 fica vermelho")
        XCTAssertEqual(c[3].valor, "312")
        XCTAssertEqual(c[3].detalhe, "1.186 chamadas em 24 horas")

        let limpo = Saude.cartoes(SaudeChat(chamadas: 100, turnos: 50, falhas: 0, turnosComReserva: 0))
        XCTAssertEqual(limpo[0].valor, "0%")
        XCTAssertEqual(limpo[0].tom, .bom)
        XCTAssertEqual(limpo[1].tom, .bom)
        XCTAssertEqual(limpo[2].tom, .bom)
        XCTAssertEqual(Saude.cartoes(SaudeChat())[0].valor, "—", "sem chamada não há taxa")
    }

    func testTons() {
        XCTAssertEqual(Saude.tomReserva(0.05), .bom)
        XCTAssertEqual(Saude.tomReserva(0.051), .alerta)
        XCTAssertEqual(Saude.tomReserva(0.11), .ruim)
        XCTAssertEqual(Saude.tomFalha(0.01), .bom)
        XCTAssertEqual(Saude.tomFalha(0.05), .ruim)
        XCTAssertEqual(Saude.tomP90Draft(9_800), .bom)
        XCTAssertEqual(Saude.tomP90Draft(15_000), .alerta)
        XCTAssertEqual(Saude.tomP90Draft(25_000), .ruim)
        XCTAssertEqual(Saude.tomP90Draft(nil), .normal)
        XCTAssertEqual(Saude.janelaTexto(1), "1 hora")
        XCTAssertEqual(Saude.janelaTexto(168), "7 dias")
    }

    func testFasesNaOrdemDoPipeline() {
        var embaralhada = s!
        embaralhada.porFase.reverse()
        embaralhada.porFase.append(FaseSaude(fase: .desconhecido("aaa"), chamadas: 1, falhas: 0))
        let f = Saude.fases(embaralhada)
        XCTAssertEqual(f.map(\.fase), [.route, .plan, .acao, .draft, .sintese, .critique, .desconhecido("aaa")])
        let draft = f[3]
        XCTAssertEqual(draft.p50, "4,1 s")
        XCTAssertEqual(draft.p90, "9,8 s")
        XCTAssertEqual(draft.taxa, "5,6%")
        XCTAssertEqual(draft.tomTaxa, .ruim)
        XCTAssertEqual(draft.tomP90, .bom)
        XCTAssertEqual(f[4].tomP90, .normal, "só o p90 do draft tem meta")
    }

    func testAlvosErrosModelosESerie() {
        let a = Saude.alvos(s)
        XCTAssertEqual(a.map(\.alvo), [.vertex, .huggingface])
        XCTAssertEqual(a[0].fracao, 0.9224, accuracy: 0.0001)
        let semFracao = Saude.alvos(SaudeChat(porAlvo: [AlvoSaude(alvo: .huggingface, chamadas: 1), AlvoSaude(alvo: .vertex, chamadas: 3)]))
        XCTAssertEqual(semFracao.map(\.alvo), [.vertex, .huggingface])
        XCTAssertEqual(semFracao[0].fracao, 0.75)

        let e = Saude.erros(s)
        XCTAssertEqual(e.map(\.n), [22, 13, 6])
        XCTAssertEqual(e.last?.tom, .ruim)
        XCTAssertEqual(e.first?.tom, .normal)
        XCTAssertEqual(e.map(\.fracao).reduce(0, +), 1, accuracy: 0.0001)

        let m = Saude.modelos(s)
        XCTAssertEqual(m.first?.model, "gemini-2.5-pro", "o aposentado (100% de falha) vem primeiro")
        XCTAssertEqual(m.last?.model, "openai/gpt-oss-120b")

        var desordenada = s!
        desordenada.serie.shuffle()
        let serie = Saude.serie(desordenada)
        XCTAssertEqual(serie.map(\.hora), serie.map(\.hora).sorted())
        XCTAssertEqual(serie.first?.hora, Datas.ler("2026-11-07T06:00:00Z"))
    }

    func testCriterios() {
        let c = Saude.criterios(s)
        XCTAssertEqual(c.map(\.id), ["reserva", "aposentado", "draft"])
        XCTAssertEqual(c.map(\.ok), [false, false, true])
        XCTAssertTrue(c[0].detalhe.contains("6,1%"))
        let vazio = Saude.criterios(SaudeChat())
        XCTAssertNil(vazio[0].ok)
        XCTAssertEqual(vazio[1].ok, true)
        XCTAssertNil(vazio[2].ok)
    }

    func testDemoRespeitaAJanela() async throws {
        let d = FonteDemo()
        let dia = try await d.saude(horas: 24)
        XCTAssertEqual(dia, s)
        let hora = try await d.saude(horas: 1)
        XCTAssertEqual(hora.janelaHoras, 1)
        XCTAssertEqual(hora.serie.count, 1)
        XCTAssertEqual(hora.serie.first?.hora, Datas.ler("2026-11-08T05:00:00Z"))
        XCTAssertEqual(hora.chamadas, 49)
        let semana = try await d.saude(horas: 168)
        XCTAssertEqual(semana.serie.count, 168)
        XCTAssertEqual(semana.chamadas, 1_186 * 7)
        XCTAssertEqual(semana.serie.map(\.hora), semana.serie.map(\.hora).sorted())
        XCTAssertEqual(Set(semana.serie.map(\.hora)).count, 168, "horas sem repetição")
    }
}

final class SaudeAPIClientTests: XCTestCase {
    var cliente: APIClient!

    override func setUpWithError() throws {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.protocolClasses = [StubURLProtocol.self]
        StubURLProtocol.ultima = nil
        StubURLProtocol.falhaDeRede = false
        cliente = try APIClient(urlServidor: "https://zaeon.space", token: "tok", sessao: URLSession(configuration: cfg))
    }

    func testSaude200() async throws {
        StubURLProtocol.resposta = .init(status: 200, corpo: try Fixtures.dados(.saude))
        let s = try await cliente.saude(horas: 168)
        XCTAssertEqual(s.turnos, 312)
        let url = try XCTUnwrap(StubURLProtocol.ultima?.url)
        XCTAssertEqual(url.path, "/api/admin/orquestra/saude")
        XCTAssertEqual(URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "horas" }?.value, "168")
        XCTAssertEqual(StubURLProtocol.ultima?.value(forHTTPHeaderField: "Authorization"), "Bearer tok")
    }

    func testSaude401() async throws {
        StubURLProtocol.resposta = .init(status: 401, corpo: try Fixtures.dados(.erroNaoAutorizado))
        do {
            _ = try await cliente.saude(horas: 24)
            XCTFail("devia lançar")
        } catch let e as ErroAPI {
            XCTAssertEqual(e, .naoAutorizado)
        }
    }

    func testHorasMinimaEh1() async throws {
        StubURLProtocol.resposta = .init(status: 200, corpo: try Fixtures.dados(.saude))
        _ = try await cliente.saude(horas: 0)
        let url = try XCTUnwrap(StubURLProtocol.ultima?.url)
        XCTAssertEqual(URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first?.value, "1")
    }
}
