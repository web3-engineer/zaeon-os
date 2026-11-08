import Foundation

// MARK: - Quadro (kanban)

/// As colunas do quadro, na ordem da tela. `outros` só aparece se o servidor mandar um status novo.
public enum ColunaKanban: String, CaseIterable, Hashable, Sendable, Identifiable {
    case rodando, concluida, fallback, falhou, outros
    public var id: String { rawValue }

    public var titulo: String {
        switch self {
        case .rodando: "Rodando"
        case .concluida: "Concluída"
        case .fallback: "Fallback (Aura assumiu)"
        case .falhou: "Falhou"
        case .outros: "Outros"
        }
    }

    public init(_ status: StatusTarefa) {
        switch status {
        case .rodando: self = .rodando
        case .concluida: self = .concluida
        case .fallback: self = .fallback
        case .falhou: self = .falhou
        case .desconhecido: self = .outros
        }
    }
}

public struct ColunaQuadro: Hashable, Sendable, Identifiable {
    public var coluna: ColunaKanban
    public var tarefas: [ResumoTarefa]
    public var id: ColunaKanban { coluna }
    public var titulo: String { coluna.titulo }
}

public enum OrdemTarefas: String, CaseIterable, Hashable, Sendable, Identifiable {
    case recentes, maisLentas, maisCaras, maisInvalidas
    public var id: String { rawValue }
    public var rotulo: String {
        switch self {
        case .recentes: "Mais recentes"
        case .maisLentas: "Mais lentas"
        case .maisCaras: "Mais caras"
        case .maisInvalidas: "Mais citações inventadas"
        }
    }
}

/// Filtro do quadro e das listas de tarefas.
public struct FiltroTarefas: Hashable, Sendable {
    /// id do motor; `nil` = todos.
    public var motor: String?
    /// `nil` = chat e arena.
    public var origem: OrigemTarefa?
    /// Busca livre em objetivo, intent, id e nome do motor.
    public var busca: String
    public var ordem: OrdemTarefas

    public init(motor: String? = nil, origem: OrigemTarefa? = nil, busca: String = "", ordem: OrdemTarefas = .recentes) {
        self.motor = motor; self.origem = origem; self.busca = busca; self.ordem = ordem
    }

    public func aceita(_ t: ResumoTarefa) -> Bool {
        if let motor, t.motor != motor { return false }
        if let origem, t.origem != origem { return false }
        let q = busca.trimmingCharacters(in: .whitespacesAndNewlines)
        if !q.isEmpty {
            let alvo = [t.objetivo, t.intent, t.id, t.nomeMotor, t.motor].joined(separator: " ")
            if alvo.range(of: q, options: [.caseInsensitive, .diacriticInsensitive]) == nil { return false }
        }
        return true
    }

    public func aplicar(_ tarefas: [ResumoTarefa]) -> [ResumoTarefa] {
        ordenar(tarefas.filter(aceita))
    }

    /// Ordenação estável: empate cai na data (mais nova primeiro) e depois no id.
    public func ordenar(_ tarefas: [ResumoTarefa]) -> [ResumoTarefa] {
        tarefas.sorted { a, b in
            func desempate() -> Bool { a.criadaEm != b.criadaEm ? a.criadaEm > b.criadaEm : a.id < b.id }
            switch ordem {
            case .recentes: return desempate()
            case .maisLentas:
                let (x, y) = (a.ms ?? -1, b.ms ?? -1)
                return x != y ? x > y : desempate()
            case .maisCaras:
                let (x, y) = (a.custoUsd ?? -1, b.custoUsd ?? -1)
                return x != y ? x > y : desempate()
            case .maisInvalidas:
                let (x, y) = (a.invalidas ?? -1, b.invalidas ?? -1)
                return x != y ? x > y : desempate()
            }
        }
    }
}

public enum Quadro {
    /// Agrupa as tarefas nas colunas do quadro. As 4 colunas fixas sempre existem (mesmo vazias);
    /// `outros` só entra quando tem cartão.
    public static func colunas(_ tarefas: [ResumoTarefa], filtro: FiltroTarefas = .init()) -> [ColunaQuadro] {
        let filtradas = filtro.aplicar(tarefas)
        var grupos: [ColunaKanban: [ResumoTarefa]] = [:]
        for t in filtradas { grupos[ColunaKanban(t.status), default: []].append(t) }
        return ColunaKanban.allCases.compactMap { c in
            let lista = grupos[c] ?? []
            if c == .outros && lista.isEmpty { return nil }
            return ColunaQuadro(coluna: c, tarefas: lista)
        }
    }

    /// Motores que aparecem nas tarefas (para o filtro), em ordem de nome.
    public static func motoresPresentes(_ tarefas: [ResumoTarefa]) -> [(id: String, nome: String)] {
        var vistos: [String: String] = [:]
        for t in tarefas where vistos[t.motor] == nil { vistos[t.motor] = t.nomeMotor }
        return vistos.map { (id: $0.key, nome: $0.value) }.sorted { $0.nome.localizedCaseInsensitiveCompare($1.nome) == .orderedAscending }
    }
}

// MARK: - Cartão (o que a tela mostra de cada tarefa)

public enum Tom: String, Hashable, Sendable {
    case normal, bom, alerta, ruim
}

/// Os números de um cartão do quadro, já formatados.
public struct ApresentacaoCartao: Hashable, Sendable {
    public var ms: String
    public var custo: String
    public var subagentes: String?
    public var invalidas: String
    public var tomInvalidas: Tom
    public var cobertura: String
    public var tomCobertura: Tom
    public var intent: String

    public init(_ t: ResumoTarefa) {
        ms = Fmt.ms(t.ms)
        custo = Fmt.usd(t.custoUsd)
        subagentes = (t.subagentes ?? 0) > 0 ? "\(t.subagentes!) subagente\(t.subagentes! == 1 ? "" : "s")" : nil
        invalidas = t.invalidas.map { "\($0) inventada\($0 == 1 ? "" : "s")" } ?? Fmt.vazio
        tomInvalidas = (t.invalidas ?? 0) > 0 ? .ruim : .normal
        cobertura = Fmt.pct(t.cobertura)
        tomCobertura = Apresentacao.tomCobertura(t.cobertura)
        intent = Fmt.intent(t.intent)
    }
}

public enum Apresentacao {
    public static func tomCobertura(_ c: Double?) -> Tom {
        guard let c else { return .normal }
        if c >= 0.8 { return .bom }
        if c >= 0.5 { return .alerta }
        return .ruim
    }
}
