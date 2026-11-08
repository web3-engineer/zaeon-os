import Foundation

// Cada enum do contrato tem um `case desconhecido(String)`: valor novo do servidor não quebra o app.
// `init(from:)`/`encode(to:)` são explícitos (e não sintetizados) para garantir o escape.

/// `ORQUESTRA=off|sombra|on` no servidor.
public enum ModoOrquestra: EnumTolerante {
    case off, sombra, on
    case desconhecido(String)

    public static let conhecidos: [ModoOrquestra] = [.off, .sombra, .on]
    public var bruto: String {
        switch self {
        case .off: "off"
        case .sombra: "sombra"
        case .on: "on"
        case .desconhecido(let s): s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

/// Quem passa pelo verificador global (`ORQ_VERIFICADOR`).
public enum ModoVerificador: EnumTolerante {
    case max, todos, off
    case desconhecido(String)

    public static let conhecidos: [ModoVerificador] = [.max, .todos, .off]
    public var bruto: String {
        switch self {
        case .max: "max"
        case .todos: "todos"
        case .off: "off"
        case .desconhecido(let s): s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

/// O laboratório de onde vem o motor (define a cor do selo no app).
public enum OrigemMotor: EnumTolerante {
    case zaeon, alibaba, deepseek, moonshot, outro
    case desconhecido(String)

    public static let conhecidos: [OrigemMotor] = [.zaeon, .alibaba, .deepseek, .moonshot, .outro]
    public var bruto: String {
        switch self {
        case .zaeon: "zaeon"
        case .alibaba: "alibaba"
        case .deepseek: "deepseek"
        case .moonshot: "moonshot"
        case .outro: "outro"
        case .desconhecido(let s): s
        }
    }
    public var rotulo: String {
        switch self {
        case .zaeon: "Zaeon"
        case .alibaba: "Alibaba"
        case .deepseek: "DeepSeek"
        case .moonshot: "Moonshot"
        case .outro: "Outro"
        case .desconhecido(let s): s.isEmpty ? "?" : s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

/// Formato da tarefa: um agente só, um agente profundo, ou enxame de subagentes.
public enum FormatoMotor: EnumTolerante {
    case unico, profundo, enxame
    case desconhecido(String)

    public static let conhecidos: [FormatoMotor] = [.unico, .profundo, .enxame]
    public var bruto: String {
        switch self {
        case .unico: "unico"
        case .profundo: "profundo"
        case .enxame: "enxame"
        case .desconhecido(let s): s
        }
    }
    public var rotulo: String {
        switch self {
        case .unico: "único"
        case .profundo: "profundo"
        case .enxame: "enxame"
        case .desconhecido(let s): s.isEmpty ? "?" : s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

/// Estado do cartão no quadro.
public enum StatusTarefa: EnumTolerante {
    case rodando, concluida, fallback, falhou
    case desconhecido(String)

    public static let conhecidos: [StatusTarefa] = [.rodando, .concluida, .fallback, .falhou]
    public var bruto: String {
        switch self {
        case .rodando: "rodando"
        case .concluida: "concluida"
        case .fallback: "fallback"
        case .falhou: "falhou"
        case .desconhecido(let s): s
        }
    }
    public var rotulo: String {
        switch self {
        case .rodando: "Rodando"
        case .concluida: "Concluída"
        case .fallback: "Fallback (Aura assumiu)"
        case .falhou: "Falhou"
        case .desconhecido(let s): s.isEmpty ? "Desconhecido" : s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

/// De onde a tarefa veio: um turno de chat de aluno ou a arena do console.
public enum OrigemTarefa: EnumTolerante {
    case chat, arena
    case desconhecido(String)

    public static let conhecidos: [OrigemTarefa] = [.chat, .arena]
    public var bruto: String {
        switch self {
        case .chat: "chat"
        case .arena: "arena"
        case .desconhecido(let s): s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

/// Tipo de base de conhecimento.
public enum TipoDataset: EnumTolerante {
    case ragArea, ragTurma, ragPessoal, hfDataset
    case desconhecido(String)

    public static let conhecidos: [TipoDataset] = [.ragArea, .ragTurma, .ragPessoal, .hfDataset]
    public var bruto: String {
        switch self {
        case .ragArea: "rag-area"
        case .ragTurma: "rag-turma"
        case .ragPessoal: "rag-pessoal"
        case .hfDataset: "hf-dataset"
        case .desconhecido(let s): s
        }
    }
    public var rotulo: String {
        switch self {
        case .ragArea: "RAG · área"
        case .ragTurma: "RAG · turma"
        case .ragPessoal: "RAG · pessoal"
        case .hfDataset: "Hugging Face"
        case .desconhecido(let s): s.isEmpty ? "?" : s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

/// Fase de um evento da trilha (`lib/orquestra/*`: orquestra, enxame, subagente, ferramenta, verificador).
public enum FaseEvento: EnumTolerante {
    case orquestra, enxame, subagente, ferramenta, verificador
    case desconhecido(String)

    public static let conhecidos: [FaseEvento] = [.orquestra, .enxame, .subagente, .ferramenta, .verificador]
    public var bruto: String {
        switch self {
        case .orquestra: "orquestra"
        case .enxame: "enxame"
        case .subagente: "subagente"
        case .ferramenta: "ferramenta"
        case .verificador: "verificador"
        case .desconhecido(let s): s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

/// Intents aceitos pela arena (`POST /arena`).
public enum IntentArena: String, CaseIterable, Codable, Sendable, Identifiable {
    case criarTrabalho = "criar_trabalho"
    case pesquisarFontes = "pesquisar_fontes"
    case revisar = "revisar"
    case explicarConceito = "explicar_conceito"

    public var id: String { rawValue }
    public var rotulo: String {
        switch self {
        case .criarTrabalho: "Criar trabalho"
        case .pesquisarFontes: "Pesquisar fontes"
        case .revisar: "Revisar"
        case .explicarConceito: "Explicar conceito"
        }
    }
}
