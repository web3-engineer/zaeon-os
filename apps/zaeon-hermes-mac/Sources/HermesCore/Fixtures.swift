import Foundation

/// As fixtures JSON do pacote (Resources/fixtures). Servem aos testes e ao modo DEMO.
public enum Fixtures {
    /// Nomes (sem .json) das fixtures empacotadas.
    public enum Nome: String, CaseIterable, Sendable {
        case painel
        case tarefas
        case tarefaEnxame = "tarefa-enxame"
        case tarefaRodando = "tarefa-rodando"
        case tarefaFallback = "tarefa-fallback"
        case arena
        case exportar
        case painelTolerante = "painel-tolerante"
        case erroNaoAutorizado = "erro-401"
        case erroNaoEncontrada = "erro-404"
        case erroDatasets = "erro-503"
    }

    /// Nome da pasta copiada pelo SwiftPM (`.copy("Resources/fixtures")`).
    static let pasta = "fixtures"

    public static func dados(_ nome: Nome) throws -> Data {
        guard let url = url(nome.rawValue) else {
            throw CocoaError(.fileNoSuchFile, userInfo: [NSLocalizedDescriptionKey: "fixture \(nome.rawValue).json não encontrada"])
        }
        return try Data(contentsOf: url)
    }

    public static func decodificar<T: Decodable>(_ tipo: T.Type, de nome: Nome) throws -> T {
        try JSONHermes.decodificador().decode(T.self, from: dados(nome))
    }

    /// Procura a fixture primeiro no .app montado pelo `empacotar.sh` (Contents/Resources/*.bundle),
    /// depois no `Bundle.module` do SwiftPM. A ordem importa: o acessor gerado do `Bundle.module`
    /// procura o bundle na RAIZ do .app (onde o codesign não deixa pôr nada) e, se não acha, cai num
    /// caminho absoluto da máquina de build e chama `fatalError`.
    static func url(_ nome: String) -> URL? {
        for b in bundlesCandidatos() {
            if let u = b.url(forResource: nome, withExtension: "json", subdirectory: pasta) { return u }
            if let u = b.url(forResource: nome, withExtension: "json") { return u }
        }
        return nil
    }

    private static func bundlesCandidatos() -> [Bundle] {
        var saida: [Bundle] = []
        let fm = FileManager.default
        let bases = [Bundle.main.resourceURL, Bundle.main.bundleURL, Bundle.main.executableURL?.deletingLastPathComponent()]
        for base in bases.compactMap({ $0 }) {
            guard let itens = try? fm.contentsOfDirectory(at: base, includingPropertiesForKeys: nil) else { continue }
            for item in itens where item.lastPathComponent.hasSuffix("_HermesCore.bundle") || item.lastPathComponent.hasSuffix("_HermesCore.resources") {
                if let b = Bundle(url: item) {
                    saida.append(b)
                } else if fm.fileExists(atPath: item.appendingPathComponent(pasta).path) {
                    // No Linux o ".resources" é uma pasta simples, sem Info.plist.
                    saida.append(Bundle(path: item.path) ?? Bundle.main)
                }
            }
        }
        if saida.isEmpty { saida.append(Bundle.module) }
        return saida
    }
}

/// Fonte de dados sem servidor: as fixtures, com um relógio que "anda" para o quadro parecer vivo.
public final class FonteDemo: FonteHermes, @unchecked Sendable {
    private let lock = NSLock()
    private var painelBase: Painel?
    private var detalhes: [String: TarefaDetalhe] = [:]
    /// Tarefas criadas pela arena no DEMO (id → início).
    private var arenaCriadas: [String: (Date, ResumoTarefa)] = [:]
    private let agora: @Sendable () -> Date

    private func comLock<T>(_ f: () throws -> T) rethrows -> T {
        lock.lock(); defer { lock.unlock() }
        return try f()
    }

    public init(agora: @escaping @Sendable () -> Date = { Date() }) {
        self.agora = agora
    }

    private func carregar() throws -> Painel {
        lock.lock(); defer { lock.unlock() }
        if let p = painelBase { return p }
        let p = try Fixtures.decodificar(Painel.self, de: .painel)
        for n in [Fixtures.Nome.tarefaEnxame, .tarefaRodando, .tarefaFallback] {
            if let r = try? Fixtures.decodificar(RespostaTarefa.self, de: n) { detalhes[r.tarefa.id] = r.tarefa }
        }
        painelBase = p
        return p
    }

    public func painel() async throws -> Painel {
        var p = try carregar()
        let extras = comLock { arenaCriadas.values.map { estadoArena($0.0, $0.1) } }
        p.tarefas = (extras + p.tarefas).sorted { $0.criadaEm > $1.criadaEm }
        p.emVoo = p.tarefas.filter(\.estaRodando).count
        p.geradoEm = agora()
        return p
    }

    public func tarefas(motor: String?, status: StatusTarefa?, limite: Int?) async throws -> [ResumoTarefa] {
        var t = try await painel().tarefas
        if let motor, !motor.isEmpty { t = t.filter { $0.motor == motor } }
        if let status { t = t.filter { $0.status == status } }
        if let limite { t = Array(t.prefix(limite)) }
        return t
    }

    public func tarefa(id: String) async throws -> TarefaDetalhe {
        let p = try await painel()
        if let d = comLock({ detalhes[id] }) { return d }
        guard let r = p.tarefas.first(where: { $0.id == id }) else { throw ErroAPI.naoEncontrado(codigo: "nao_encontrada") }
        return TarefaDetalhe(
            resumo: r,
            eventos: [
                EventoTarefa(t: 0, fase: .orquestra, rotulo: "\(r.nomeMotor) assumiu este pedido (\(r.formato.rotulo))", agente: r.nomeMotor),
                EventoTarefa(t: (r.ms ?? 4_000) * 0.4, fase: .ferramenta, rotulo: "literature_search: \(r.objetivo.prefix(60))", agente: r.nomeMotor),
            ] + (r.estaRodando ? [] : [EventoTarefa(t: (r.ms ?? 8_000) * 0.9, fase: .verificador, rotulo: "Conferindo as citações contra as fontes")]),
            texto: r.estaRodando ? "" : "_(modo DEMO: esta tarefa não tem trilha completa na fixture)_",
            uso: UsoTarefa(promptTokens: 0, completionTokens: 0, chamadas: 0, custoUsd: r.custoUsd)
        )
    }

    /// No DEMO a arena cria tarefas falsas que terminam em ~8 s, para o polling ter o que mostrar.
    public func arena(_ pedido: PedidoArena) async throws -> [String] {
        if let p = pedido.problema { throw ErroAPI.http(status: 400, codigo: p) }
        let p = try carregar()
        let inicio = agora()
        var ids: [String] = []
        for (i, m) in pedido.motores.enumerated() {
            let motor = p.motor(m)
            let id = String(format: "demo%08x%012x", Int(inicio.timeIntervalSince1970) & 0xffffffff, i)
            let r = ResumoTarefa(id: id, criadaEm: inicio.addingTimeInterval(Double(i) * 0.001), status: .rodando, origem: .arena,
                                 motor: m, nomeMotor: motor?.nome ?? m, formato: motor?.formato ?? .unico,
                                 intent: pedido.intent.rawValue, plano: "max", objetivo: String(pedido.objetivo.prefix(160)))
            comLock { arenaCriadas[id] = (inicio, r) }
            ids.append(id)
        }
        return ids
    }

    private func estadoArena(_ inicio: Date, _ base: ResumoTarefa) -> ResumoTarefa {
        var r = base
        let passou = agora().timeIntervalSince(inicio)
        // semente determinística por motor (hashValue muda a cada execução)
        let semente = Double(base.motor.unicodeScalars.reduce(0) { $0 + Int($1.value) } % 100) / 100
        let duracao = base.formato == .unico ? 3.0 : 6.0 + semente * 6
        r.atualizadaEm = agora()
        guard passou >= duracao else { return r }
        r.status = base.formato == .unico ? .concluida : (semente > 0.85 ? .fallback : .concluida)
        r.ms = duracao * 1000
        r.custoUsd = base.formato == .enxame ? 0.30 + semente * 0.2 : (base.formato == .profundo ? 0.08 + semente * 0.05 : 0.01)
        r.subagentes = base.formato == .enxame ? 3 + Int(semente * 5) : 0
        r.evidencias = 8 + Int(semente * 20)
        r.citadas = 5 + Int(semente * 10)
        r.invalidas = semente > 0.7 ? 1 : 0
        r.cobertura = 0.6 + semente * 0.35
        r.aprovado = true
        r.degradado = false
        return r
    }

    public func exportar(desde: Date?) async throws -> ResultadoExportacao {
        try Fixtures.decodificar(ResultadoExportacao.self, de: .exportar)
    }
}
