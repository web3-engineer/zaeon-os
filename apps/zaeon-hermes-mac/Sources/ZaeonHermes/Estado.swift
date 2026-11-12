import Foundation
import HermesCore
import Observation

/// Seções da barra lateral.
enum Secao: Hashable {
    case quadro
    case saude
    case terminal
    case novaConversa
    case conversa(String)
    case agente(String)
    case motor(String)
    case datasets
    case arena
    /// a vitrine: publicar pesquisas (pastas) e moderar a fila
    case pesquisas
    case configuracoes
}

/// Destino de navegação: o detalhe de uma tarefa.
struct RotaTarefa: Hashable {
    let id: String
}

/// Estado global do app: configuração, fonte de dados, painel e navegação.
@MainActor
@Observable
final class EstadoApp {
    // MARK: Configuração (URL e token em ~/Library/Application Support/space.zaeon.hermes/config.json, 0600). SEM modo DEMO: o console só mostra dado real da Zaeon.

    var urlServidor: String
    var token: String

    // MARK: Dados

    private(set) var fonte: any FonteHermes
    var painel: Painel?
    /// os agentes da casa (`GET /agentes`): a lista vive na barra lateral, o detalhe em `AgenteTela`
    var agentes: RespostaAgentes?
    var erroAgentes: String?
    var janelaAgentes: JanelaAgentes = .seteDias
    /// as conversas salvas (barra lateral) e com quem dá pra conversar
    var conversas: [ResumoConversa] = []
    var interlocutores: [Interlocutor] = []
    var erroConversas: String?
    var erro: String?
    var carregando = false
    var ultimaAtualizacao: Date?

    // MARK: Navegação e filtros

    var secao: Secao? = .quadro
    var caminho: [RotaTarefa] = []
    var filtro = FiltroTarefas()

    let arena = EstadoArena()
    let atualizador = Atualizador()
    let terminal = EstadoTerminal()

    /// Intervalo do auto-refresh do painel.
    static let intervaloPainel: Duration = .seconds(10)

    /// o servidor de produção da Zaeon — o padrão quando nada foi salvo ainda
    static let urlPadrao = "https://zaeon.com.br"

    init() {
        let url = Credenciais.ler(.url).flatMap { $0.isEmpty ? nil : $0 } ?? Self.urlPadrao
        let token = Credenciais.ler(.token) ?? ""
        self.urlServidor = url
        self.token = token
        // o modo DEMO das versões anteriores saiu: limpa a preferência antiga pra ela não voltar
        UserDefaults.standard.removeObject(forKey: "zaeon.hermes.demo")
        self.fonte = Self.criarFonte(url: url, token: token)
    }

    /// Sem URL/token válidos não há fonte de dados — nunca dados de exemplo no lugar.
    private static func criarFonte(url: String, token: String) -> any FonteHermes {
        if !token.isEmpty, let c = try? APIClient(urlServidor: url, token: token) { return c }
        return FonteDesconectada()
    }

    /// `nil` quando a configuração atual consegue falar com o servidor.
    var problemaConfiguracao: String? {
        if APIClient.normalizarURL(urlServidor) == nil { return "Configure a URL do servidor em Configurações." }
        if token.isEmpty { return "Configure o token (ORQUESTRA_CONSOLE_TOKEN) em Configurações." }
        return nil
    }

    /// Salva no arquivo de configuração (só do usuário) e troca a fonte de dados.
    func salvarConfiguracao(url: String, token: String) {
        let urlNormal = APIClient.normalizarURL(url)?.absoluteString ?? url.trimmingCharacters(in: .whitespacesAndNewlines)
        let tokenLimpo = token.trimmingCharacters(in: .whitespacesAndNewlines)
        Credenciais.gravar(urlNormal, em: .url)
        Credenciais.gravar(tokenLimpo, em: .token)
        self.urlServidor = urlNormal
        self.token = tokenLimpo
        self.fonte = Self.criarFonte(url: urlNormal, token: tokenLimpo)
        self.painel = nil
        self.agentes = nil
        self.erroAgentes = nil
        self.conversas = []
        self.interlocutores = []
        self.terminal.reiniciar()
        self.erro = nil
        self.caminho = []
        arena.limpar()
        Task {
            await atualizar()
            await atualizador.verificar(fonte)
        }
    }

    func atualizar() async {
        guard !carregando else { return }
        if let p = problemaConfiguracao {
            erro = p
            return
        }
        carregando = true
        defer { carregando = false }
        let f = fonte
        do {
            let p = try await f.painel()
            // a fonte pode ter mudado enquanto esperávamos (troca de servidor/token)
            guard (f as AnyObject) === (fonte as AnyObject) else { return }
            painel = p
            erro = nil
            ultimaAtualizacao = Date()
        } catch {
            self.erro = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    /// Laço do auto-refresh; roda enquanto a janela existir (`.task` cancela ao fechar).
    func cicloPainel() async {
        while !Task.isCancelled {
            await atualizar()
            try? await Task.sleep(for: Self.intervaloPainel)
        }
    }

    /// Intervalo do refresh dos agentes da casa (o ledger agregado é mais pesado que o painel).
    static let intervaloAgentes: Duration = .seconds(30)

    func atualizarAgentes() async {
        guard problemaConfiguracao == nil else { return }
        let f = fonte
        do {
            let r = try await f.agentes(dias: janelaAgentes.rawValue)
            guard (f as AnyObject) === (fonte as AnyObject) else { return }
            agentes = r
            erroAgentes = nil
        } catch {
            // falha no refresh não apaga a lista que já está na barra lateral
            erroAgentes = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    /// Laço dos agentes; a `.task(id:)` da raiz o recomeça quando muda o servidor, a chave ou a janela.
    func cicloAgentes() async {
        while !Task.isCancelled {
            await atualizarAgentes()
            try? await Task.sleep(for: Self.intervaloAgentes)
        }
    }

    // MARK: Conversas

    static let intervaloConversas: Duration = .seconds(15)

    func atualizarConversas() async {
        guard problemaConfiguracao == nil else { return }
        let f = fonte
        do {
            async let lista = f.conversas()
            async let quem = f.interlocutores()
            let (l, q) = try await (lista, quem)
            guard (f as AnyObject) === (fonte as AnyObject) else { return }
            conversas = l
            interlocutores = q
            erroConversas = nil
        } catch {
            erroConversas = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func cicloConversas() async {
        while !Task.isCancelled {
            await atualizarConversas()
            try? await Task.sleep(for: Self.intervaloConversas)
        }
    }

    /// Abre uma conversa nova com o interlocutor e navega até ela.
    func novaConversa(com agente: String) async throws {
        let c = try await fonte.criarConversa(agente: agente)
        conversas.insert(ResumoConversa(id: c.id, titulo: c.titulo, agente: c.agente, atualizadaEm: c.atualizadaEm), at: 0)
        secao = .conversa(c.id)
    }

    /// Abre a conversa sem trocar de tela (o terminal usa) e devolve o id.
    func novaConversaSemNavegar(com agente: String) async throws -> String {
        let c = try await fonte.criarConversa(agente: agente)
        conversas.insert(ResumoConversa(id: c.id, titulo: c.titulo, agente: c.agente, atualizadaEm: c.atualizadaEm), at: 0)
        return c.id
    }

    func apagarConversa(_ id: String) async {
        do {
            try await fonte.apagarConversa(id: id)
            conversas.removeAll { $0.id == id }
            if secao == .conversa(id) { secao = .novaConversa }
        } catch {
            erroConversas = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func nomeDe(_ agente: String) -> String { Interlocutores.nome(agente, em: interlocutores) }

    func motor(_ id: String) -> MotorPainel? { painel?.motor(id) }

    func abrir(_ id: String) { caminho.append(RotaTarefa(id: id)) }
}

/// Estado da arena: sobrevive à troca de seção (o polling continua enquanto houver tarefa rodando).
@MainActor
@Observable
final class EstadoArena {
    var objetivo = ""
    var intent: IntentArena = .criarTrabalho
    var kind = ""
    var escolhidos: Set<String> = []

    private(set) var ids: [String] = []
    private(set) var tarefas: [String: ResumoTarefa] = [:]
    private(set) var enviando = false
    private(set) var acompanhando = false
    var erro: String?

    @ObservationIgnored private var polling: Task<Void, Never>?

    static let intervalo: Duration = .seconds(3)

    var pedido: PedidoArena {
        PedidoArena(objetivo: objetivo.trimmingCharacters(in: .whitespacesAndNewlines), intent: intent, kind: kind,
                    motores: escolhidos.sorted())
    }

    /// As tarefas da rodada, na ordem em que o servidor devolveu os ids.
    var rodada: [ResumoTarefa] { ids.compactMap { tarefas[$0] } }

    func limpar() {
        polling?.cancel()
        polling = nil
        ids = []
        tarefas = [:]
        acompanhando = false
        erro = nil
    }

    func disparar(com fonte: any FonteHermes) async {
        if let p = pedido.problema { erro = p; return }
        limpar()
        enviando = true
        defer { enviando = false }
        do {
            ids = try await fonte.arena(pedido)
            acompanhar(fonte)
        } catch {
            self.erro = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func acompanhar(_ fonte: any FonteHermes) {
        polling?.cancel()
        acompanhando = true
        let ids = self.ids
        polling = Task { [weak self] in
            while !Task.isCancelled {
                for id in ids {
                    guard !Task.isCancelled else { return }
                    if let d = try? await fonte.tarefa(id: id) {
                        self?.tarefas[id] = d.resumo
                    }
                }
                guard let self else { return }
                let todas = ids.allSatisfy { self.tarefas[$0] != nil }
                if todas && !Arena.algumaRodando(self.rodada) { break }
                try? await Task.sleep(for: EstadoArena.intervalo)
            }
            self?.acompanhando = false
        }
    }
}

/// A fonte quando o console ainda não foi conectado: toda chamada falha com o motivo — nunca devolve dado inventado.
struct FonteDesconectada: FonteHermes {
    private var erro: ErroAPI { .naoAutorizado }
    func painel() async throws -> Painel { throw erro }
    func tarefas(motor: String?, status: StatusTarefa?, limite: Int?) async throws -> [ResumoTarefa] { throw erro }
    func tarefa(id: String) async throws -> TarefaDetalhe { throw erro }
    func arena(_ pedido: PedidoArena) async throws -> [String] { throw erro }
    func exportar(desde: Date?) async throws -> ResultadoExportacao { throw erro }
    func saude(horas: Int) async throws -> SaudeChat { throw erro }
}
