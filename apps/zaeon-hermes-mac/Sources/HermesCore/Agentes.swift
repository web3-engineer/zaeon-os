import Foundation

// `GET /api/admin/orquestra/agentes?dias=` — os AGENTES DA CASA (personas, mentores, criados no admin),
// com capacidades, prompt, bases e o uso real do TokenLedger. Os motores da orquestra seguem no /painel.

/// O que o agente é no roster.
public enum TipoAgente: EnumTolerante {
    case persona, mentor, custom, sistema
    case desconhecido(String)

    public static let conhecidos: [TipoAgente] = [.persona, .mentor, .custom, .sistema]
    public var bruto: String {
        switch self {
        case .persona: "persona"
        case .mentor: "mentor"
        case .custom: "custom"
        case .sistema: "sistema"
        case .desconhecido(let s): s
        }
    }
    public var rotulo: String {
        switch self {
        case .persona: "Agente"
        case .mentor: "Mentor"
        case .custom: "Criado no admin"
        case .sistema: "Sistema"
        case .desconhecido(let s): s.isEmpty ? "?" : s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

public struct RespostaAgentes: Decodable, Hashable, Sendable {
    public var geradoEm: Date?
    public var janelaDias: Int
    public var bancoOk: Bool
    public var agentes: [AgenteCasa]

    public init(geradoEm: Date? = nil, janelaDias: Int = 7, bancoOk: Bool = true, agentes: [AgenteCasa] = []) {
        self.geradoEm = geradoEm; self.janelaDias = janelaDias; self.bancoOk = bancoOk; self.agentes = agentes
    }

    enum CodingKeys: String, CodingKey { case geradoEm, janelaDias, bancoOk, agentes }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        geradoEm = try? c.decodeIfPresent(Date.self, forKey: .geradoEm)
        janelaDias = c.inteiroFlex(.janelaDias) ?? 7
        bancoOk = c.boolFlex(.bancoOk) ?? true
        agentes = c.listaFlex(AgenteCasa.self, .agentes)
    }
}

public struct ProtocoloAgente: Decodable, Hashable, Sendable {
    public var ensemble: Int
    public var reflexoes: Int
    public var porque: String

    enum CodingKeys: String, CodingKey { case ensemble, reflexoes, porque }

    public init(ensemble: Int = 1, reflexoes: Int = 0, porque: String = "") {
        self.ensemble = ensemble; self.reflexoes = reflexoes; self.porque = porque
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        ensemble = c.inteiroFlex(.ensemble) ?? 1
        reflexoes = c.inteiroFlex(.reflexoes) ?? 0
        porque = c.textoFlex(.porque) ?? ""
    }
}

public struct Contagem: Decodable, Hashable, Sendable, Identifiable {
    public var nome: String
    public var chamadas: Int
    public var id: String { nome }

    public init(nome: String, chamadas: Int) { self.nome = nome; self.chamadas = chamadas }

    /// o servidor manda `{modelo|superficie|erro, chamadas}`: aceita qualquer um dos três como nome
    enum CodingKeys: String, CodingKey { case modelo, superficie, erro, chamadas }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        nome = c.textoFlex(.modelo) ?? c.textoFlex(.superficie) ?? c.textoFlex(.erro) ?? "?"
        chamadas = c.inteiroFlex(.chamadas) ?? 0
    }
}

public struct DiaUso: Decodable, Hashable, Sendable, Identifiable {
    public var dia: String
    public var chamadas: Int
    public var falhas: Int
    public var id: String { dia }

    public init(dia: String, chamadas: Int, falhas: Int) { self.dia = dia; self.chamadas = chamadas; self.falhas = falhas }

    enum CodingKeys: String, CodingKey { case dia, chamadas, falhas }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        dia = c.textoFlex(.dia) ?? ""
        chamadas = c.inteiroFlex(.chamadas) ?? 0
        falhas = c.inteiroFlex(.falhas) ?? 0
    }
}

public struct UsoAgente: Decodable, Hashable, Sendable {
    public var janelaDias: Int
    public var chamadas: Int
    public var falhas: Int
    public var taxaFalha: Double
    public var turnos: Int
    public var msP50: Double?
    public var msP90: Double?
    public var tokens: Int
    public var custoUsd: Double
    public var ultimo: Date?
    public var modelos: [Contagem]
    public var superficies: [Contagem]
    public var erros: [Contagem]
    public var porDia: [DiaUso]

    public init(janelaDias: Int = 7, chamadas: Int = 0, falhas: Int = 0, taxaFalha: Double = 0, turnos: Int = 0,
                msP50: Double? = nil, msP90: Double? = nil, tokens: Int = 0, custoUsd: Double = 0, ultimo: Date? = nil,
                modelos: [Contagem] = [], superficies: [Contagem] = [], erros: [Contagem] = [], porDia: [DiaUso] = []) {
        self.janelaDias = janelaDias; self.chamadas = chamadas; self.falhas = falhas; self.taxaFalha = taxaFalha
        self.turnos = turnos; self.msP50 = msP50; self.msP90 = msP90; self.tokens = tokens; self.custoUsd = custoUsd
        self.ultimo = ultimo; self.modelos = modelos; self.superficies = superficies; self.erros = erros; self.porDia = porDia
    }

    enum CodingKeys: String, CodingKey {
        case janelaDias, chamadas, falhas, taxaFalha, turnos, msP50, msP90, tokens, custoUsd, ultimo, modelos, superficies, erros, porDia
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        janelaDias = c.inteiroFlex(.janelaDias) ?? 7
        chamadas = c.inteiroFlex(.chamadas) ?? 0
        falhas = c.inteiroFlex(.falhas) ?? 0
        taxaFalha = c.numeroFlex(.taxaFalha) ?? 0
        turnos = c.inteiroFlex(.turnos) ?? 0
        // p50 = 0 sem chamada que deu certo: mostra "—", não "0 ms"
        msP50 = c.numeroFlex(.msP50).flatMap { $0 > 0 ? $0 : nil }
        msP90 = c.numeroFlex(.msP90).flatMap { $0 > 0 ? $0 : nil }
        tokens = c.inteiroFlex(.tokens) ?? 0
        custoUsd = c.numeroFlex(.custoUsd) ?? 0
        ultimo = try? c.decodeIfPresent(Date.self, forKey: .ultimo)
        modelos = c.listaFlex(Contagem.self, .modelos)
        superficies = c.listaFlex(Contagem.self, .superficies)
        erros = c.listaFlex(Contagem.self, .erros)
        porDia = c.listaFlex(DiaUso.self, .porDia)
    }
}

public struct AgenteCasa: Decodable, Hashable, Sendable, Identifiable {
    public var id: String
    public var nome: String
    public var tipo: TipoAgente
    public var emoji: String
    public var bio: String
    public var curso: String?
    public var ativo: Bool
    public var conversacional: Bool
    public var ondeTrabalha: [String]
    public var plugin: String?
    public var distincao: String?
    public var habilidades: [String]
    public var habilidadesDegradadas: [String]
    public var ferramentas: [String]
    public var datasets: [String]
    public var protocolo: ProtocoloAgente?
    public var artefatos: [String]
    public var fontes: [String]
    public var guardrail: String?
    public var nivel: String?
    public var chavesLedger: [String]
    public var prompt: String
    public var uso: UsoAgente

    public init(id: String, nome: String, tipo: TipoAgente = .persona, emoji: String = "⟁", bio: String = "", curso: String? = nil,
                ativo: Bool = true, conversacional: Bool = true, ondeTrabalha: [String] = [], plugin: String? = nil,
                distincao: String? = nil, habilidades: [String] = [], habilidadesDegradadas: [String] = [], ferramentas: [String] = [],
                datasets: [String] = [], protocolo: ProtocoloAgente? = nil, artefatos: [String] = [], fontes: [String] = [],
                guardrail: String? = nil, nivel: String? = nil, chavesLedger: [String] = [], prompt: String = "", uso: UsoAgente = .init()) {
        self.id = id; self.nome = nome; self.tipo = tipo; self.emoji = emoji; self.bio = bio; self.curso = curso
        self.ativo = ativo; self.conversacional = conversacional; self.ondeTrabalha = ondeTrabalha; self.plugin = plugin
        self.distincao = distincao; self.habilidades = habilidades; self.habilidadesDegradadas = habilidadesDegradadas
        self.ferramentas = ferramentas; self.datasets = datasets; self.protocolo = protocolo; self.artefatos = artefatos
        self.fontes = fontes; self.guardrail = guardrail; self.nivel = nivel; self.chavesLedger = chavesLedger
        self.prompt = prompt; self.uso = uso
    }

    enum CodingKeys: String, CodingKey {
        case id, nome, tipo, emoji, bio, curso, ativo, conversacional, ondeTrabalha, plugin, distincao, habilidades
        case habilidadesDegradadas, ferramentas, datasets, protocolo, artefatos, fontes, guardrail, nivel, chavesLedger, prompt, uso
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        nome = c.textoFlex(.nome) ?? id
        tipo = (try? c.decodeIfPresent(TipoAgente.self, forKey: .tipo)) ?? .desconhecido("")
        emoji = c.textoFlex(.emoji) ?? "⟁"
        bio = c.textoFlex(.bio) ?? ""
        curso = c.textoFlex(.curso)
        ativo = c.boolFlex(.ativo) ?? true
        conversacional = c.boolFlex(.conversacional) ?? true
        ondeTrabalha = c.listaFlex(String.self, .ondeTrabalha)
        plugin = c.textoFlex(.plugin)
        distincao = c.textoFlex(.distincao)
        habilidades = c.listaFlex(String.self, .habilidades)
        habilidadesDegradadas = c.listaFlex(String.self, .habilidadesDegradadas)
        ferramentas = c.listaFlex(String.self, .ferramentas)
        datasets = c.listaFlex(String.self, .datasets)
        protocolo = try? c.decodeIfPresent(ProtocoloAgente.self, forKey: .protocolo)
        artefatos = c.listaFlex(String.self, .artefatos)
        fontes = c.listaFlex(String.self, .fontes)
        guardrail = c.textoFlex(.guardrail)
        nivel = c.textoFlex(.nivel)
        chavesLedger = c.listaFlex(String.self, .chavesLedger)
        prompt = c.textoFlex(.prompt) ?? ""
        uso = (try? c.decodeIfPresent(UsoAgente.self, forKey: .uso)) ?? UsoAgente()
    }

    /// trabalhou na janela?
    public var ativoNaJanela: Bool { uso.chamadas > 0 }
}

/// Agrupamento e ordem da tela de agentes (PURO, testável no Linux).
public enum Elenco {
    public struct Grupo: Hashable, Sendable, Identifiable {
        public var tipo: TipoAgente
        public var agentes: [AgenteCasa]
        public var id: String { tipo.bruto }
    }

    /// Ordem dos grupos: agentes, mentores, criados no admin, sistema (o resto no fim).
    public static func grupos(_ agentes: [AgenteCasa], busca: String = "") -> [Grupo] {
        let q = busca.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let filtrados = q.isEmpty ? agentes : agentes.filter {
            $0.nome.lowercased().contains(q) || $0.id.lowercased().contains(q) || ($0.curso ?? "").lowercased().contains(q)
        }
        let ordem: [TipoAgente] = [.persona, .mentor, .custom, .sistema]
        var saida: [Grupo] = ordem.compactMap { t in
            let xs = filtrados.filter { $0.tipo == t }
            return xs.isEmpty ? nil : Grupo(tipo: t, agentes: xs)
        }
        let resto = filtrados.filter { !ordem.contains($0.tipo) }
        if !resto.isEmpty { saida.append(Grupo(tipo: .desconhecido("outros"), agentes: resto)) }
        return saida
    }

    /// Totais da janela (cabeçalho da tela).
    public static func totais(_ agentes: [AgenteCasa]) -> (agentes: Int, trabalhando: Int, chamadas: Int, falhas: Int, custoUsd: Double) {
        (agentes.count, agentes.filter(\.ativoNaJanela).count, agentes.reduce(0) { $0 + $1.uso.chamadas },
         agentes.reduce(0) { $0 + $1.uso.falhas }, agentes.reduce(0) { $0 + $1.uso.custoUsd })
    }
}
