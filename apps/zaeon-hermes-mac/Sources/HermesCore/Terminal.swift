import Foundation

/// O TERMINAL da orquestra: uma linha de comando que fala com a Zaeon (nunca executa nada na máquina nem na VPS).
/// Texto sem barra = mensagem para o agente em uso (como no terminal do Hermes Agent); com barra = comando.
public enum ComandoTerminal: Equatable, Sendable {
    case vazio
    case ajuda
    case limpar
    case agentes
    case motores
    case quem
    case usar(String)
    case falar(agente: String?, texto: String)
    case nova
    case conversas
    case tarefas(limite: Int)
    case tarefa(String)
    case saude(horas: Int)
    case desconhecido(String)
}

public enum Terminal {
    /// Agente padrão de quem acabou de abrir o terminal.
    public static let agentePadrao = "aura"

    public static let ajuda: [String] = [
        "Escreva direto para falar com o agente em uso. Comandos:",
        "  /usar <agente>        troca o agente (ex.: /usar zenita, /usar kimi-enxame)",
        "  /quem                 mostra o agente em uso",
        "  /falar <agente> <msg> manda uma mensagem só para esse agente",
        "  /nova                 começa uma conversa nova com o agente em uso",
        "  /agentes              agentes da casa e mentores (com o uso de 7 dias)",
        "  /motores              motores da orquestra e se estão disponíveis",
        "  /conversas            as conversas salvas",
        "  /tarefas [n]          as últimas n tarefas da orquestra (padrão 10)",
        "  /tarefa <id>          a trilha de uma tarefa: passos, ledger e texto",
        "  /saude [horas]        a saúde do chat (padrão 24 h)",
        "  /limpar               limpa a tela   ·   ↑/↓ histórico   ·   /ajuda esta lista",
    ]

    /// PURA: transforma a linha digitada em comando.
    public static func interpretar(_ linha: String) -> ComandoTerminal {
        let t = linha.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else { return .vazio }
        guard t.hasPrefix("/") else { return .falar(agente: nil, texto: t) }
        let partes = t.dropFirst().split(separator: " ", maxSplits: 2, omittingEmptySubsequences: true).map(String.init)
        guard let cmd = partes.first?.lowercased() else { return .ajuda }
        let arg1 = partes.count > 1 ? partes[1] : nil
        let resto = partes.count > 2 ? partes[2] : nil
        switch cmd {
        case "ajuda", "help", "?": return .ajuda
        case "limpar", "clear", "cls": return .limpar
        case "agentes": return .agentes
        case "motores": return .motores
        case "quem": return .quem
        case "nova": return .nova
        case "conversas": return .conversas
        case "usar", "agente":
            guard let a = arg1 else { return .desconhecido("use: /usar <agente>") }
            return .usar(a.lowercased())
        case "falar":
            guard let a = arg1, let msg = resto, !msg.trimmingCharacters(in: .whitespaces).isEmpty else {
                return .desconhecido("use: /falar <agente> <mensagem>")
            }
            return .falar(agente: a.lowercased(), texto: msg)
        case "tarefas":
            let n = arg1.flatMap(Int.init) ?? 10
            return .tarefas(limite: min(max(n, 1), 50))
        case "tarefa":
            guard let id = arg1 else { return .desconhecido("use: /tarefa <id>") }
            return .tarefa(id)
        case "saude", "saúde":
            let h = arg1.flatMap(Int.init) ?? 24
            return .saude(horas: min(max(h, 1), 24 * 14))
        default:
            return .desconhecido("comando desconhecido: /\(cmd) — veja /ajuda")
        }
    }

    // MARK: Saídas formatadas (PURAS)

    public static func linhas(agentes: [AgenteCasa]) -> [String] {
        guard !agentes.isEmpty else { return ["(nenhum agente)"] }
        return Elenco.grupos(agentes).flatMap { g -> [String] in
            ["", "\(g.tipo == .persona ? "AGENTES" : g.tipo == .mentor ? "MENTORES" : g.tipo.rotulo.uppercased()) · \(g.agentes.count)"]
                + g.agentes.map { a in
                    let uso = a.uso.chamadas > 0 ? "\(Fmt.inteiro(a.uso.chamadas)) chamadas · \(Fmt.pct(a.uso.taxaFalha)) falha · \(Fmt.usd(a.uso.custoUsd))" : "sem uso na janela"
                    return "  \(coluna(a.id, 18)) \(coluna(a.nome, 14)) \(uso)"
                }
        }
    }

    public static func linhas(motores: [MotorPainel]) -> [String] {
        guard !motores.isEmpty else { return ["(nenhum motor)"] }
        return motores.map { m in
            "  \(m.disponivel ? "●" : "○") \(coluna(m.id, 22)) \(coluna(m.nome, 22)) \(m.formato.rotulo) · \(m.metricas.tarefas) tarefas"
        }
    }

    public static func linhas(tarefas: [ResumoTarefa]) -> [String] {
        guard !tarefas.isEmpty else { return ["(nenhuma tarefa)"] }
        return tarefas.map { t in
            "  \(t.id)  \(coluna(t.status.bruto, 10)) \(coluna(t.nomeMotor, 18)) \(String(t.objetivo.prefix(60)))"
        }
    }

    public static func linhas(conversas: [ResumoConversa], nomes: [Interlocutor]) -> [String] {
        guard !conversas.isEmpty else { return ["(nenhuma conversa)"] }
        return conversas.map { c in
            "  \(coluna(Interlocutores.nome(c.agente, em: nomes), 16)) \(c.rodando ? "◌" : " ") \(c.titulo)"
        }
    }

    public static func linhas(saude s: SaudeChat) -> [String] {
        Saude.cartoes(s).map { "  \(coluna($0.titulo, 26)) \($0.valor)\($0.detalhe.map { "  (\($0))" } ?? "")" }
    }

    /// texto à esquerda, cortado/preenchido até `n` colunas
    public static func coluna(_ s: String, _ n: Int) -> String {
        s.count >= n ? String(s.prefix(n - 1)) + "…" : s + String(repeating: " ", count: n - s.count)
    }
}
