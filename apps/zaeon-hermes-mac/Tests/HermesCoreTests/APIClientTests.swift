import XCTest
@testable import HermesCore
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Stub de rede: cada teste registra a resposta e lê a requisição que o cliente mandou.
final class StubURLProtocol: URLProtocol {
    struct Resposta { var status: Int; var corpo: Data }
    nonisolated(unsafe) static var resposta = Resposta(status: 200, corpo: Data())
    nonisolated(unsafe) static var ultima: URLRequest?
    nonisolated(unsafe) static var ultimoCorpo: Data?
    nonisolated(unsafe) static var falhaDeRede: Bool = false

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        StubURLProtocol.ultima = request
        StubURLProtocol.ultimoCorpo = request.httpBody ?? request.httpBodyStream.map(StubURLProtocol.ler)
        if StubURLProtocol.falhaDeRede {
            client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet))
            return
        }
        let r = StubURLProtocol.resposta
        let http = HTTPURLResponse(url: request.url!, statusCode: r.status, httpVersion: "HTTP/1.1",
                                   headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: http, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: r.corpo)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}

    static func ler(_ s: InputStream) -> Data {
        s.open(); defer { s.close() }
        var d = Data()
        var buf = [UInt8](repeating: 0, count: 4096)
        while s.hasBytesAvailable {
            let n = s.read(&buf, maxLength: buf.count)
            if n <= 0 { break }
            d.append(buf, count: n)
        }
        return d
    }
}

final class APIClientTests: XCTestCase {
    var cliente: APIClient!

    override func setUpWithError() throws {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.protocolClasses = [StubURLProtocol.self]
        StubURLProtocol.ultima = nil
        StubURLProtocol.ultimoCorpo = nil
        StubURLProtocol.falhaDeRede = false
        cliente = try APIClient(urlServidor: "https://zaeon.space/", token: "  tok-1234567890-1234567890-1234567890  ",
                                sessao: URLSession(configuration: cfg))
    }

    private func responder(_ status: Int, _ fixture: Fixtures.Nome) throws {
        StubURLProtocol.resposta = .init(status: status, corpo: try Fixtures.dados(fixture))
    }

    func test200PainelDecodificaEMandaBearer() async throws {
        try responder(200, .painel)
        let p = try await cliente.painel()
        XCTAssertEqual(p.motores.count, 5)
        let req = try XCTUnwrap(StubURLProtocol.ultima)
        XCTAssertEqual(req.url?.absoluteString, "https://zaeon.space/api/admin/orquestra/painel")
        XCTAssertEqual(req.httpMethod, "GET")
        XCTAssertEqual(req.value(forHTTPHeaderField: "Authorization"), "Bearer tok-1234567890-1234567890-1234567890")
    }

    func test401ViraErroTipado() async throws {
        try responder(401, .erroNaoAutorizado)
        do {
            _ = try await cliente.painel()
            XCTFail("devia lançar")
        } catch let e as ErroAPI {
            XCTAssertEqual(e, .naoAutorizado)
            XCTAssertTrue(e.localizedDescription.contains("ORQUESTRA_CONSOLE_TOKEN"))
        }
    }

    func test404DaTarefa() async throws {
        try responder(404, .erroNaoEncontrada)
        do {
            _ = try await cliente.tarefa(id: "abc")
            XCTFail("devia lançar")
        } catch let e as ErroAPI {
            XCTAssertEqual(e, .naoEncontrado(codigo: "nao_encontrada"))
        }
        XCTAssertEqual(StubURLProtocol.ultima?.url?.path, "/api/admin/orquestra/tarefas/abc")
    }

    func test503DaExportacao() async throws {
        try responder(503, .erroDatasets)
        do {
            _ = try await cliente.exportar(desde: nil)
            XCTFail("devia lançar")
        } catch let e as ErroAPI {
            XCTAssertEqual(e, .indisponivel(codigo: "datasets_desligados"))
            XCTAssertTrue(e.localizedDescription.contains("HF_DATASETS_TOKEN"))
        }
        XCTAssertEqual(StubURLProtocol.ultima?.httpMethod, "POST")
    }

    func test500Generico() async throws {
        StubURLProtocol.resposta = .init(status: 500, corpo: Data("<html>".utf8))
        do {
            _ = try await cliente.painel()
            XCTFail("devia lançar")
        } catch let e as ErroAPI {
            XCTAssertEqual(e, .http(status: 500, codigo: nil))
        }
    }

    func testJSONForaDoContrato() async throws {
        StubURLProtocol.resposta = .init(status: 200, corpo: Data(#"{"tarefa": {"id": 1}}"#.utf8))
        do {
            _ = try await cliente.tarefa(id: "x")
            XCTFail("devia lançar")
        } catch let e as ErroAPI {
            guard case .decodificacao = e else { return XCTFail("esperava decodificação, veio \(e)") }
        }
    }

    func testFalhaDeRede() async throws {
        StubURLProtocol.falhaDeRede = true
        do {
            _ = try await cliente.painel()
            XCTFail("devia lançar")
        } catch let e as ErroAPI {
            guard case .rede = e else { return XCTFail("esperava rede, veio \(e)") }
        }
    }

    func testTarefasComFiltros() async throws {
        try responder(200, .tarefas)
        let t = try await cliente.tarefas(motor: "kimi-enxame", status: .concluida, limite: 20)
        XCTAssertEqual(t.count, 3)
        let url = try XCTUnwrap(StubURLProtocol.ultima?.url)
        let q = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        XCTAssertEqual(url.path, "/api/admin/orquestra/tarefas")
        XCTAssertEqual(q.first { $0.name == "motor" }?.value, "kimi-enxame")
        XCTAssertEqual(q.first { $0.name == "status" }?.value, "concluida")
        XCTAssertEqual(q.first { $0.name == "limite" }?.value, "20")
    }

    func testDetalheDaTarefa() async throws {
        try responder(200, .tarefaEnxame)
        let t = try await cliente.tarefa(id: "6730a1f0c9e77b2a1d4e9f03")
        XCTAssertEqual(t.listaEvidencias.count, 10)
        XCTAssertEqual(t.ledger.count, 13)
    }

    func testArenaPostaOCorpo() async throws {
        try responder(202, .arena)
        let ids = try await cliente.arena(PedidoArena(objetivo: "Compare três motores num levantamento de fontes", intent: .pesquisarFontes,
                                                      kind: "artigo", motores: ["kimi-enxame", "aura"]))
        XCTAssertEqual(ids.count, 3)
        let req = try XCTUnwrap(StubURLProtocol.ultima)
        XCTAssertEqual(req.httpMethod, "POST")
        XCTAssertEqual(req.url?.path, "/api/admin/orquestra/arena")
        XCTAssertEqual(req.value(forHTTPHeaderField: "Content-Type"), "application/json")
        let corpo = try XCTUnwrap(StubURLProtocol.ultimoCorpo)
        let obj = try XCTUnwrap(JSONSerialization.jsonObject(with: corpo) as? [String: Any])
        XCTAssertEqual(obj["intent"] as? String, "pesquisar_fontes")
        XCTAssertEqual(obj["kind"] as? String, "artigo")
        XCTAssertEqual(obj["motores"] as? [String], ["kimi-enxame", "aura"])
    }

    func testExportar200() async throws {
        try responder(200, .exportar)
        let r = try await cliente.exportar(desde: Datas.ler("2026-11-01T00:00:00Z"))
        XCTAssertEqual(r.exportadas, 12)
        XCTAssertEqual(r.arquivo, "data/2026-11-08T050000Z.jsonl")
        let corpo = String(data: try XCTUnwrap(StubURLProtocol.ultimoCorpo), encoding: .utf8)
        XCTAssertEqual(corpo, #"{"desde":"2026-11-01T00:00:00.000Z"}"#)
    }

    func testNormalizarURL() {
        XCTAssertEqual(APIClient.normalizarURL("zaeon.space")?.absoluteString, "https://zaeon.space")
        XCTAssertEqual(APIClient.normalizarURL("localhost:3000")?.absoluteString, "http://localhost:3000")
        XCTAssertEqual(APIClient.normalizarURL(" http://localhost:3000/// ")?.absoluteString, "http://localhost:3000")
        XCTAssertEqual(APIClient.normalizarURL("https://zaeon.space/base")?.absoluteString, "https://zaeon.space/base")
        XCTAssertNil(APIClient.normalizarURL(""))
        XCTAssertNil(APIClient.normalizarURL("ftp://x"))
        XCTAssertThrowsError(try APIClient(urlServidor: "", token: "t"))
    }

    func testSemTokenNaoMandaCabecalho() throws {
        let c = APIClient(baseURL: URL(string: "http://localhost:3000")!, token: "")
        let r = try c.requisicao("painel")
        XCTAssertNil(r.value(forHTTPHeaderField: "Authorization"))
        XCTAssertEqual(r.url?.absoluteString, "http://localhost:3000/api/admin/orquestra/painel")
    }
}
