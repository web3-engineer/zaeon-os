import Foundation

// Conversas do console (`/api/admin/orquestra/interlocutores` e `/conversas`): o admin fala com qualquer agente
// da casa, mentor ou motor da orquestra. O turno roda em segundo plano no servidor; o app acompanha por GET.

public enum TipoInterlocutor: EnumTolerante {
    case agente, mentor, motor
    case desconhecido(String)

    public static let conhecidos: [TipoInterlocutor] = [.agente, .mentor, .motor]
    public var bruto: String {
        switch self {
        case .agente: "agente"
        case .mentor: "mentor"
        case .motor: "motor"
        case .desconhecido(let s): s
        }
    }
    public var rotulo: String {
        switch self {
        case .agente: "Agentes da casa"
        case .mentor: "Mentores"
        case .motor: "Motores da orquestra"
        case .desconhecido(let s): s.isEmpty ? "Outros" : s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

public struct Interlocutor: Decodable, Hashable, Sendable, Identifiable {
    public var id: String
    public var nome: String
    public var tipo: TipoInterlocutor
    public var descricao: String
    public var disponivel: Bool

    public init(id: String, nome: String, tipo: TipoInterlocutor = .agente, descricao: String = "", disponivel: Bool = true) {
        self.id = id; self.nome = nome; self.tipo = tipo; self.descricao = descricao; self.disponivel = disponivel
    }

    enum CodingKeys: String, CodingKey { case id, nome, tipo, descricao, disponivel }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        nome = c.textoFlex(.nome) ?? id
        tipo = (try? c.decodeIfPresent(TipoInterlocutor.self, forKey: .tipo)) ?? .desconhecido("")
        descricao = c.textoFlex(.descricao) ?? ""
        disponivel = c.boolFlex(.disponivel) ?? true
    }
}

struct ListaInterlocutores: Decodable { let interlocutores: [Interlocutor]
    enum CodingKeys: String, CodingKey { case interlocutores }
    init(from decoder: Decoder) throws { interlocutores = try decoder.container(keyedBy: CodingKeys.self).listaFlex(Interlocutor.self, .interlocutores) }
}

public enum StatusMensagem: EnumTolerante {
    case rodando, concluida, falhou
    case desconhecido(String)

    public static let conhecidos: [StatusMensagem] = [.rodando, .concluida, .falhou]
    public var bruto: String {
        switch self {
        case .rodando: "rodando"
        case .concluida: "concluida"
        case .falhou: "falhou"
        case .desconhecido(let s): s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

public struct EventoVivo: Decodable, Hashable, Sendable, Identifiable {
    public var t: Double
    public var fase: String
    public var rotulo: String
    public var id: String { "\(Int(t))|\(rotulo)" }

    public init(t: Double, fase: String, rotulo: String) { self.t = t; self.fase = fase; self.rotulo = rotulo }

    enum CodingKeys: String, CodingKey { case t, fase, rotulo }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        t = c.numeroFlex(.t) ?? 0
        fase = c.textoFlex(.fase) ?? ""
        rotulo = c.textoFlex(.rotulo) ?? ""
    }
}

public struct AoVivo: Decodable, Hashable, Sendable {
    public var eventos: [EventoVivo]
    public var previa: String
    public var modelo: String?
    public var ms: Double?

    public init(eventos: [EventoVivo] = [], previa: String = "", modelo: String? = nil, ms: Double? = nil) {
        self.eventos = eventos; self.previa = previa; self.modelo = modelo; self.ms = ms
    }

    enum CodingKeys: String, CodingKey { case eventos, previa, modelo, ms }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        eventos = c.listaFlex(EventoVivo.self, .eventos)
        previa = c.textoFlex(.previa) ?? ""
        modelo = c.textoFlex(.modelo)
        ms = c.numeroFlex(.ms)
    }
}

public struct MensagemConversa: Decodable, Hashable, Sendable, Identifiable {
    public var id: String
    public var doAdmin: Bool
    public var texto: String
    public var em: Date?
    public var tarefaId: String?
    public var status: StatusMensagem?
    public var ms: Double?
    public var modelo: String?
    public var aoVivo: AoVivo?

    public init(id: String, doAdmin: Bool, texto: String, em: Date? = nil, tarefaId: String? = nil, status: StatusMensagem? = nil,
                ms: Double? = nil, modelo: String? = nil, aoVivo: AoVivo? = nil) {
        self.id = id; self.doAdmin = doAdmin; self.texto = texto; self.em = em; self.tarefaId = tarefaId
        self.status = status; self.ms = ms; self.modelo = modelo; self.aoVivo = aoVivo
    }

    enum CodingKeys: String, CodingKey { case id, papel, texto, em, tarefaId, status, ms, modelo, aoVivo }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        doAdmin = c.textoFlex(.papel) == "voce"
        texto = c.textoFlex(.texto) ?? ""
        em = try? c.decodeIfPresent(Date.self, forKey: .em)
        tarefaId = c.textoFlex(.tarefaId)
        status = try? c.decodeIfPresent(StatusMensagem.self, forKey: .status)
        ms = c.numeroFlex(.ms)
        modelo = c.textoFlex(.modelo)
        aoVivo = try? c.decodeIfPresent(AoVivo.self, forKey: .aoVivo)
    }

    public var rodando: Bool { !doAdmin && status == .rodando }
}

public struct Conversa: Decodable, Hashable, Sendable, Identifiable {
    public var id: String
    public var titulo: String
    public var agente: String
    public var criadaEm: Date?
    public var atualizadaEm: Date?
    public var mensagens: [MensagemConversa]

    public init(id: String, titulo: String = "Nova conversa", agente: String, criadaEm: Date? = nil, atualizadaEm: Date? = nil,
                mensagens: [MensagemConversa] = []) {
        self.id = id; self.titulo = titulo; self.agente = agente; self.criadaEm = criadaEm; self.atualizadaEm = atualizadaEm
        self.mensagens = mensagens
    }

    enum CodingKeys: String, CodingKey { case id, titulo, agente, criadaEm, atualizadaEm, mensagens }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        titulo = c.textoFlex(.titulo) ?? "Conversa"
        agente = c.textoFlex(.agente) ?? ""
        criadaEm = try? c.decodeIfPresent(Date.self, forKey: .criadaEm)
        atualizadaEm = try? c.decodeIfPresent(Date.self, forKey: .atualizadaEm)
        mensagens = c.listaFlex(MensagemConversa.self, .mensagens)
    }

    /// algum turno ainda rodando? (o app acompanha mais rápido enquanto sim)
    public var rodando: Bool { mensagens.contains(where: \.rodando) }
}

struct RespostaConversa: Decodable { let conversa: Conversa }

public struct ResumoConversa: Decodable, Hashable, Sendable, Identifiable {
    public var id: String
    public var titulo: String
    public var agente: String
    public var atualizadaEm: Date?
    public var mensagens: Int
    public var ultimaTexto: String?
    public var rodando: Bool

    public init(id: String, titulo: String, agente: String, atualizadaEm: Date? = nil, mensagens: Int = 0, ultimaTexto: String? = nil, rodando: Bool = false) {
        self.id = id; self.titulo = titulo; self.agente = agente; self.atualizadaEm = atualizadaEm; self.mensagens = mensagens
        self.ultimaTexto = ultimaTexto; self.rodando = rodando
    }

    enum CodingKeys: String, CodingKey { case id, titulo, agente, atualizadaEm, mensagens, ultima }
    enum Ultima: String, CodingKey { case texto, status }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        titulo = c.textoFlex(.titulo) ?? "Conversa"
        agente = c.textoFlex(.agente) ?? ""
        atualizadaEm = try? c.decodeIfPresent(Date.self, forKey: .atualizadaEm)
        mensagens = c.inteiroFlex(.mensagens) ?? 0
        if let u = try? c.nestedContainer(keyedBy: Ultima.self, forKey: .ultima) {
            ultimaTexto = u.textoFlex(.texto)
            rodando = u.textoFlex(.status) == "rodando"
        } else {
            ultimaTexto = nil
            rodando = false
        }
    }
}

struct ListaConversas: Decodable { let conversas: [ResumoConversa]
    enum CodingKeys: String, CodingKey { case conversas }
    init(from decoder: Decoder) throws { conversas = try decoder.container(keyedBy: CodingKeys.self).listaFlex(ResumoConversa.self, .conversas) }
}

struct RespostaEnvio: Decodable { let tarefaId: String }
struct PedidoConversa: Encodable { let agente: String }
struct PedidoMensagem: Encodable { let texto: String }
struct RespostaOk: Decodable { let ok: Bool? }

/// Agrupamento PURO dos interlocutores para a tela "Nova conversa".
public enum Interlocutores {
    public struct Grupo: Hashable, Sendable, Identifiable {
        public var tipo: TipoInterlocutor
        public var itens: [Interlocutor]
        public var id: String { tipo.bruto }
    }

    public static func grupos(_ xs: [Interlocutor]) -> [Grupo] {
        let ordem: [TipoInterlocutor] = [.agente, .mentor, .motor]
        var saida: [Grupo] = ordem.compactMap { t in
            let i = xs.filter { $0.tipo == t }
            return i.isEmpty ? nil : Grupo(tipo: t, itens: i)
        }
        let resto = xs.filter { !ordem.contains($0.tipo) }
        if !resto.isEmpty { saida.append(Grupo(tipo: .desconhecido("outros"), itens: resto)) }
        return saida
    }

    /// nome amigável do interlocutor, com o id cru de reserva
    public static func nome(_ id: String, em xs: [Interlocutor]) -> String { xs.first { $0.id == id }?.nome ?? id }
}
