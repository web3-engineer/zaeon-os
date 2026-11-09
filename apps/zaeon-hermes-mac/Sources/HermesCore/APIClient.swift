import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// De onde o app tira os dados: o servidor de verdade (`APIClient`) ou as fixtures (`FonteDemo`).
public protocol FonteHermes: Sendable {
    func painel() async throws -> Painel
    func tarefas(motor: String?, status: StatusTarefa?, limite: Int?) async throws -> [ResumoTarefa]
    func tarefa(id: String) async throws -> TarefaDetalhe
    func arena(_ pedido: PedidoArena) async throws -> [String]
    func exportar(desde: Date?) async throws -> ResultadoExportacao
    /// A saúde do chat nas últimas `horas` (`GET /saude?horas=`).
    func saude(horas: Int) async throws -> SaudeChat
    /// Os agentes da casa e o uso deles nos últimos `dias` (`GET /agentes?dias=`).
    func agentes(dias: Int) async throws -> RespostaAgentes
}

extension FonteHermes {
    /// Fonte sem a rota (DEMO dos testes, desconectada): falha com o motivo, nunca inventa agente.
    public func agentes(dias: Int) async throws -> RespostaAgentes { throw ErroAPI.indisponivel(codigo: "sem_agentes") }
}

/// Erros tipados do console. A mensagem (`errorDescription`) já vem pronta para a tela.
public enum ErroAPI: Error, Equatable, Sendable, LocalizedError {
    /// 401: token errado, ausente, ou `ORQUESTRA_CONSOLE_TOKEN` desligado no servidor.
    case naoAutorizado
    /// 404: a tarefa (ou a rota) não existe.
    case naoEncontrado(codigo: String?)
    /// 503: o serviço está desligado (ex.: `datasets_desligados` na exportação).
    case indisponivel(codigo: String?)
    /// Outro status HTTP fora de 2xx.
    case http(status: Int, codigo: String?)
    /// A resposta não bate com o contrato.
    case decodificacao(String)
    /// Sem rede, DNS, TLS, tempo esgotado…
    case rede(String)
    /// URL do servidor inválida nas configurações.
    case urlInvalida(String)

    public var errorDescription: String? {
        switch self {
        case .naoAutorizado:
            "Não autorizado (401). Confira o token: ele precisa ser igual ao ORQUESTRA_CONSOLE_TOKEN do servidor."
        case .naoEncontrado(let c):
            c == "nao_encontrada" ? "Tarefa não encontrada (404)." : "Não encontrado (404)\(c.map { ": \($0)" } ?? "")."
        case .indisponivel(let c):
            c == "datasets_desligados"
                ? "Exportação desligada no servidor (503): faltam HF_DATASETS_TOKEN e HF_DATASETS_ORG."
                : "Serviço indisponível (503)\(c.map { ": \($0)" } ?? "")."
        case .http(let s, let c):
            "Erro HTTP \(s)\(c.map { ": \($0)" } ?? "")."
        case .decodificacao(let m):
            "A resposta do servidor não bate com o contrato: \(m)"
        case .rede(let m):
            "Falha de rede: \(m)"
        case .urlInvalida(let u):
            "URL do servidor inválida: \(u)"
        }
    }
}

/// Cliente HTTP de `/api/admin/orquestra/*` (docs/HERMES_ZAEON.md), com `Authorization: Bearer`.
public final class APIClient: FonteHermes, @unchecked Sendable {
    public let baseURL: URL
    private let token: String
    private let sessao: URLSession
    private let decodificador: JSONDecoder
    private let codificador: JSONEncoder

    /// Prefixo das rotas no servidor Next.
    public static let prefixo = "api/admin/orquestra"

    public init(baseURL: URL, token: String, sessao: URLSession? = nil) {
        self.baseURL = baseURL
        self.token = token.trimmingCharacters(in: .whitespacesAndNewlines)
        if let sessao {
            self.sessao = sessao
        } else {
            let cfg = URLSessionConfiguration.ephemeral
            cfg.timeoutIntervalForRequest = 30
            cfg.requestCachePolicy = .reloadIgnoringLocalCacheData
            self.sessao = URLSession(configuration: cfg)
        }
        decodificador = JSONHermes.decodificador()
        codificador = JSONHermes.codificador()
    }

    /// Aceita "https://zaeon.space", "zaeon.space" (vira https) ou "http://localhost:3000/".
    public convenience init(urlServidor: String, token: String, sessao: URLSession? = nil) throws {
        guard let url = APIClient.normalizarURL(urlServidor) else { throw ErroAPI.urlInvalida(urlServidor) }
        self.init(baseURL: url, token: token, sessao: sessao)
    }

    public static func normalizarURL(_ texto: String) -> URL? {
        var s = texto.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !s.isEmpty else { return nil }
        if !s.contains("://") { s = (s.hasPrefix("localhost") || s.hasPrefix("127.0.0.1") ? "http://" : "https://") + s }
        while s.hasSuffix("/") { s.removeLast() }
        guard let u = URL(string: s), let esquema = u.scheme?.lowercased(), ["http", "https"].contains(esquema), u.host != nil else { return nil }
        return u
    }

    // MARK: Rotas

    public func painel() async throws -> Painel {
        try await enviar("painel")
    }

    public func tarefas(motor: String? = nil, status: StatusTarefa? = nil, limite: Int? = 50) async throws -> [ResumoTarefa] {
        var q: [URLQueryItem] = []
        if let motor, !motor.isEmpty { q.append(URLQueryItem(name: "motor", value: motor)) }
        if let status { q.append(URLQueryItem(name: "status", value: status.bruto)) }
        if let limite { q.append(URLQueryItem(name: "limite", value: String(limite))) }
        let r: ListaTarefas = try await enviar("tarefas", consulta: q)
        return r.tarefas
    }

    public func tarefa(id: String) async throws -> TarefaDetalhe {
        let seguro = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "/"))) ?? id
        let r: RespostaTarefa = try await enviar("tarefas/\(seguro)")
        return r.tarefa
    }

    public func arena(_ pedido: PedidoArena) async throws -> [String] {
        let r: RespostaArena = try await enviar("arena", metodo: "POST", corpo: try codificador.encode(pedido))
        return r.tarefas
    }

    public func exportar(desde: Date? = nil) async throws -> ResultadoExportacao {
        try await enviar("exportar", metodo: "POST", corpo: try codificador.encode(PedidoExportacao(desde: desde)))
    }

    public func saude(horas: Int = 24) async throws -> SaudeChat {
        try await enviar("saude", consulta: [URLQueryItem(name: "horas", value: String(max(1, horas)))])
    }

    public func agentes(dias: Int = 7) async throws -> RespostaAgentes {
        try await enviar("agentes", consulta: [URLQueryItem(name: "dias", value: String(max(1, dias)))])
    }

    // MARK: Transporte

    func requisicao(_ caminho: String, consulta: [URLQueryItem] = [], metodo: String = "GET", corpo: Data? = nil) throws -> URLRequest {
        let texto = baseURL.absoluteString + "/" + APIClient.prefixo + "/" + caminho
        guard var comp = URLComponents(string: texto) else { throw ErroAPI.urlInvalida(texto) }
        if !consulta.isEmpty { comp.queryItems = consulta }
        guard let url = comp.url else { throw ErroAPI.urlInvalida(texto) }
        var r = URLRequest(url: url)
        r.httpMethod = metodo
        r.setValue("application/json", forHTTPHeaderField: "Accept")
        if !token.isEmpty { r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let corpo {
            r.httpBody = corpo
            r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        return r
    }

    private func enviar<T: Decodable>(_ caminho: String, consulta: [URLQueryItem] = [], metodo: String = "GET", corpo: Data? = nil) async throws -> T {
        let req = try requisicao(caminho, consulta: consulta, metodo: metodo, corpo: corpo)
        let (dados, resposta) = try await baixar(req)
        guard let http = resposta as? HTTPURLResponse else { throw ErroAPI.rede("resposta sem HTTP") }
        try APIClient.validar(status: http.statusCode, dados: dados)
        do {
            return try decodificador.decode(T.self, from: dados)
        } catch {
            throw ErroAPI.decodificacao(APIClient.descrever(error))
        }
    }

    /// Converte status HTTP em erro tipado (2xx passa).
    static func validar(status: Int, dados: Data) throws {
        guard !(200..<300).contains(status) else { return }
        let codigo = (try? JSONDecoder().decode(CorpoErro.self, from: dados))?.erro
        switch status {
        case 401, 403: throw ErroAPI.naoAutorizado
        case 404: throw ErroAPI.naoEncontrado(codigo: codigo)
        case 503: throw ErroAPI.indisponivel(codigo: codigo)
        default: throw ErroAPI.http(status: status, codigo: codigo)
        }
    }

    /// `dataTask` + continuação: funciona igual no macOS e no FoundationNetworking do Linux.
    private func baixar(_ req: URLRequest) async throws -> (Data, URLResponse) {
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<(Data, URLResponse), Error>) in
            let tarefa = sessao.dataTask(with: req) { dados, resposta, erro in
                if let erro {
                    cont.resume(throwing: ErroAPI.rede(erro.localizedDescription))
                } else if let resposta {
                    cont.resume(returning: (dados ?? Data(), resposta))
                } else {
                    cont.resume(throwing: ErroAPI.rede("sem resposta"))
                }
            }
            tarefa.resume()
        }
    }

    static func descrever(_ erro: Error) -> String {
        guard let e = erro as? DecodingError else { return String(describing: erro) }
        func caminho(_ ctx: DecodingError.Context) -> String {
            ctx.codingPath.map { $0.intValue.map { "[\($0)]" } ?? $0.stringValue }.joined(separator: ".")
        }
        switch e {
        case .keyNotFound(let k, let ctx): return "falta o campo \(caminho(ctx)).\(k.stringValue)"
        case .typeMismatch(_, let ctx), .valueNotFound(_, let ctx), .dataCorrupted(let ctx):
            return "\(caminho(ctx)): \(ctx.debugDescription)"
        @unknown default: return String(describing: e)
        }
    }
}
