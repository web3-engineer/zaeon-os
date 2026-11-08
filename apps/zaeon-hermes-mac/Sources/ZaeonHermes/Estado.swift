import Foundation
import HermesCore
import Observation

/// Seções da barra lateral.
enum Secao: Hashable {
    case quadro
    case motor(String)
    case datasets
    case arena
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
    // MARK: Configuração (URL e token no Keychain; DEMO no UserDefaults)

    var urlServidor: String
    var token: String
    var demo: Bool

    // MARK: Dados

    private(set) var fonte: any FonteHermes
    var painel: Painel?
    var erro: String?
    var carregando = false
    var ultimaAtualizacao: Date?

    // MARK: Navegação e filtros

    var secao: Secao? = .quadro
    var caminho: [RotaTarefa] = []
    var filtro = FiltroTarefas()

    let arena = EstadoArena()

    /// Intervalo do auto-refresh do painel.
    static let intervaloPainel: Duration = .seconds(10)

    private static let chaveDemo = "zaeon.hermes.demo"

    init() {
        let url = Keychain.ler(.url) ?? ""
        let token = Keychain.ler(.token) ?? ""
        self.urlServidor = url
        self.token = token
        // Sem credencial salva, o app abre em DEMO: dá para ver tudo sem servidor.
        let demoSalvo = UserDefaults.standard.object(forKey: Self.chaveDemo) as? Bool
        let demo = demoSalvo ?? token.isEmpty
        self.demo = demo
        self.fonte = Self.criarFonte(demo: demo, url: url, token: token)
    }

    private static func criarFonte(demo: Bool, url: String, token: String) -> any FonteHermes {
        if demo { return FonteDemo() }
        if let c = try? APIClient(urlServidor: url, token: token) { return c }
        return FonteDemo()
    }

    /// `nil` quando a configuração atual consegue falar com um servidor (ou está em DEMO).
    var problemaConfiguracao: String? {
        if demo { return nil }
        if APIClient.normalizarURL(urlServidor) == nil { return "Configure a URL do servidor em Configurações." }
        if token.isEmpty { return "Configure o token (ORQUESTRA_CONSOLE_TOKEN) em Configurações." }
        return nil
    }

    /// Salva no Keychain e troca a fonte de dados.
    func salvarConfiguracao(url: String, token: String, demo: Bool) {
        let urlNormal = APIClient.normalizarURL(url)?.absoluteString ?? url.trimmingCharacters(in: .whitespacesAndNewlines)
        let tokenLimpo = token.trimmingCharacters(in: .whitespacesAndNewlines)
        Keychain.gravar(urlNormal, em: .url)
        Keychain.gravar(tokenLimpo, em: .token)
        UserDefaults.standard.set(demo, forKey: Self.chaveDemo)
        self.urlServidor = urlNormal
        self.token = tokenLimpo
        self.demo = demo
        self.fonte = Self.criarFonte(demo: demo, url: urlNormal, token: tokenLimpo)
        self.painel = nil
        self.erro = nil
        self.caminho = []
        arena.limpar()
        Task { await atualizar() }
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
            // a fonte pode ter mudado enquanto esperávamos (troca de DEMO/servidor)
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
