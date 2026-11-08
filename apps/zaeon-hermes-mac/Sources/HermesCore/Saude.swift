import Foundation

// `GET /api/admin/orquestra/saude?horas=24`: a saúde do chat (docs/HERMES_ZAEON.md, fim do arquivo).
// Agrega o TokenLedger das superfícies `estudos` e `pesquisa` (Aura e orquestra). Serve para VERIFICAR
// as correções de experiência: reserva perto de 0, modelo aposentado = 0, p90 do draft baixo.

// MARK: - Enums tolerantes

/// Fase do turno do chat no ledger.
public enum FaseChat: EnumTolerante {
    case route, plan, acao, draft, sintese, critique
    case desconhecido(String)

    /// Na ordem do pipeline (é a ordem da tabela).
    public static let conhecidos: [FaseChat] = [.route, .plan, .acao, .draft, .sintese, .critique]
    public var bruto: String {
        switch self {
        case .route: "route"
        case .plan: "plan"
        case .acao: "acao"
        case .draft: "draft"
        case .sintese: "sintese"
        case .critique: "critique"
        case .desconhecido(let s): s
        }
    }
    public var rotulo: String {
        switch self {
        case .route: "roteamento"
        case .plan: "plano"
        case .acao: "ação (ferramentas)"
        case .draft: "rascunho"
        case .sintese: "síntese"
        case .critique: "crítica"
        case .desconhecido(let s): s.isEmpty ? "?" : s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

/// Para onde a chamada foi: Vertex (principal) ou Hugging Face (a reserva de outra família).
public enum AlvoChat: EnumTolerante {
    case vertex, huggingface
    case desconhecido(String)

    public static let conhecidos: [AlvoChat] = [.vertex, .huggingface]
    public var bruto: String {
        switch self {
        case .vertex: "vertex"
        case .huggingface: "huggingface"
        case .desconhecido(let s): s
        }
    }
    public var rotulo: String {
        switch self {
        case .vertex: "Vertex"
        case .huggingface: "Hugging Face (reserva)"
        case .desconhecido(let s): s.isEmpty ? "?" : s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

/// Classe do erro de uma chamada.
public enum ClasseErroChat: EnumTolerante {
    case rateLimit, timeout, modeloInexistente
    case desconhecido(String)

    public static let conhecidos: [ClasseErroChat] = [.rateLimit, .timeout, .modeloInexistente]
    public var bruto: String {
        switch self {
        case .rateLimit: "rate_limit"
        case .timeout: "timeout"
        case .modeloInexistente: "modelo_inexistente"
        case .desconhecido(let s): s
        }
    }
    public var rotulo: String {
        switch self {
        case .rateLimit: "limite de taxa (429)"
        case .timeout: "tempo esgotado"
        case .modeloInexistente: "modelo inexistente (404)"
        case .desconhecido(let s): s.isEmpty ? "?" : s.replacingOccurrences(of: "_", with: " ")
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

// MARK: - Modelos

public struct SaudeChat: Decodable, Hashable, Sendable {
    public var geradoEm: Date?
    public var janelaHoras: Int
    public var chamadas: Int
    public var turnos: Int
    public var falhas: Int
    /// Se o servidor mandar `null`, sai de `falhas / chamadas`.
    public var taxaFalha: Double?
    /// Turnos em que o aluno recebeu OUTRA família (gpt-oss pela reserva HF).
    public var turnosComReserva: Int
    public var taxaReserva: Double?
    /// 404 de modelo (ex.: Pro aposentado). Deve ir a zero.
    public var turnosComModeloAposentado: Int
    public var porFase: [FaseSaude]
    public var porAlvo: [AlvoSaude]
    public var erros: [ErroSaude]
    public var modelos: [ModeloSaude]
    public var serie: [PontoSaude]

    public init(geradoEm: Date? = nil, janelaHoras: Int = 24, chamadas: Int = 0, turnos: Int = 0, falhas: Int = 0,
                taxaFalha: Double? = nil, turnosComReserva: Int = 0, taxaReserva: Double? = nil, turnosComModeloAposentado: Int = 0,
                porFase: [FaseSaude] = [], porAlvo: [AlvoSaude] = [], erros: [ErroSaude] = [], modelos: [ModeloSaude] = [],
                serie: [PontoSaude] = []) {
        self.geradoEm = geradoEm; self.janelaHoras = janelaHoras; self.chamadas = chamadas; self.turnos = turnos
        self.falhas = falhas
        self.taxaFalha = taxaFalha ?? (chamadas > 0 ? Double(falhas) / Double(chamadas) : nil)
        self.turnosComReserva = turnosComReserva
        self.taxaReserva = taxaReserva ?? (turnos > 0 ? Double(turnosComReserva) / Double(turnos) : nil)
        self.turnosComModeloAposentado = turnosComModeloAposentado
        self.porFase = porFase; self.porAlvo = porAlvo; self.erros = erros; self.modelos = modelos; self.serie = serie
    }

    enum CodingKeys: String, CodingKey {
        case geradoEm, janelaHoras, chamadas, turnos, falhas, taxaFalha, turnosComReserva, taxaReserva,
             turnosComModeloAposentado, porFase, porAlvo, erros, modelos, serie
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.init(
            geradoEm: try? c.decodeIfPresent(Date.self, forKey: .geradoEm),
            janelaHoras: c.inteiroFlex(.janelaHoras) ?? 24,
            chamadas: c.inteiroFlex(.chamadas) ?? 0,
            turnos: c.inteiroFlex(.turnos) ?? 0,
            falhas: c.inteiroFlex(.falhas) ?? 0,
            taxaFalha: c.numeroFlex(.taxaFalha),
            turnosComReserva: c.inteiroFlex(.turnosComReserva) ?? 0,
            taxaReserva: c.numeroFlex(.taxaReserva),
            turnosComModeloAposentado: c.inteiroFlex(.turnosComModeloAposentado) ?? 0,
            porFase: c.listaFlex(FaseSaude.self, .porFase),
            porAlvo: c.listaFlex(AlvoSaude.self, .porAlvo),
            erros: c.listaFlex(ErroSaude.self, .erros),
            modelos: c.listaFlex(ModeloSaude.self, .modelos),
            serie: c.listaFlex(PontoSaude.self, .serie)
        )
    }
}

public struct FaseSaude: Decodable, Hashable, Sendable, Identifiable {
    public var fase: FaseChat
    public var chamadas: Int
    public var falhas: Int
    public var taxaFalha: Double?
    public var msP50: Double?
    public var msP90: Double?
    public var id: String { fase.bruto }

    public init(fase: FaseChat, chamadas: Int, falhas: Int, taxaFalha: Double? = nil, msP50: Double? = nil, msP90: Double? = nil) {
        self.fase = fase; self.chamadas = chamadas; self.falhas = falhas
        self.taxaFalha = taxaFalha ?? (chamadas > 0 ? Double(falhas) / Double(chamadas) : nil)
        self.msP50 = msP50; self.msP90 = msP90
    }

    enum CodingKeys: String, CodingKey { case fase, chamadas, falhas, taxaFalha, msP50, msP90 }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.init(fase: (try? c.decodeIfPresent(FaseChat.self, forKey: .fase)) ?? .desconhecido(""),
                  chamadas: c.inteiroFlex(.chamadas) ?? 0, falhas: c.inteiroFlex(.falhas) ?? 0,
                  taxaFalha: c.numeroFlex(.taxaFalha), msP50: c.numeroFlex(.msP50), msP90: c.numeroFlex(.msP90))
    }
}

public struct AlvoSaude: Decodable, Hashable, Sendable, Identifiable {
    public var alvo: AlvoChat
    public var chamadas: Int
    /// 0…1 do total de chamadas; `nil` vira o cálculo da tela.
    public var fracao: Double?
    public var id: String { alvo.bruto }

    public init(alvo: AlvoChat, chamadas: Int, fracao: Double? = nil) {
        self.alvo = alvo; self.chamadas = chamadas; self.fracao = fracao
    }

    enum CodingKeys: String, CodingKey { case alvo, chamadas, fracao }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        alvo = (try? c.decodeIfPresent(AlvoChat.self, forKey: .alvo)) ?? .desconhecido("")
        chamadas = c.inteiroFlex(.chamadas) ?? 0
        fracao = c.numeroFlex(.fracao)
    }
}

public struct ErroSaude: Decodable, Hashable, Sendable, Identifiable {
    public var classe: ClasseErroChat
    public var n: Int
    public var id: String { classe.bruto }

    public init(classe: ClasseErroChat, n: Int) { self.classe = classe; self.n = n }

    enum CodingKeys: String, CodingKey { case classe, n }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        classe = (try? c.decodeIfPresent(ClasseErroChat.self, forKey: .classe)) ?? .desconhecido("")
        n = c.inteiroFlex(.n) ?? 0
    }
}

public struct ModeloSaude: Decodable, Hashable, Sendable, Identifiable {
    public var model: String
    public var chamadas: Int
    public var falhas: Int
    public var taxaFalha: Double?
    public var id: String { model }

    public init(model: String, chamadas: Int, falhas: Int, taxaFalha: Double? = nil) {
        self.model = model; self.chamadas = chamadas; self.falhas = falhas
        self.taxaFalha = taxaFalha ?? (chamadas > 0 ? Double(falhas) / Double(chamadas) : nil)
    }

    enum CodingKeys: String, CodingKey { case model, chamadas, falhas, taxaFalha }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.init(model: c.textoFlex(.model) ?? "?", chamadas: c.inteiroFlex(.chamadas) ?? 0, falhas: c.inteiroFlex(.falhas) ?? 0,
                  taxaFalha: c.numeroFlex(.taxaFalha))
    }
}

public struct PontoSaude: Decodable, Hashable, Sendable, Identifiable {
    public var hora: Date
    public var chamadas: Int
    public var falhas: Int
    public var msP50: Double?
    public var id: Date { hora }

    public init(hora: Date, chamadas: Int, falhas: Int, msP50: Double? = nil) {
        self.hora = hora; self.chamadas = chamadas; self.falhas = falhas; self.msP50 = msP50
    }

    enum CodingKeys: String, CodingKey { case hora, chamadas, falhas, msP50 }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        hora = try c.decode(Date.self, forKey: .hora)
        chamadas = c.inteiroFlex(.chamadas) ?? 0
        falhas = c.inteiroFlex(.falhas) ?? 0
        msP50 = c.numeroFlex(.msP50)
    }
}

// MARK: - Lógica de tela

/// Janelas do seletor.
public enum JanelaSaude: Int, CaseIterable, Hashable, Sendable, Identifiable {
    case umaHora = 1
    case umDia = 24
    case semana = 168
    public var id: Int { rawValue }
    public var horas: Int { rawValue }
    public var rotulo: String {
        switch self {
        case .umaHora: "1 h"
        case .umDia: "24 h"
        case .semana: "7 d"
        }
    }
}

/// Um critério de "bom" com o resultado da janela atual.
public struct CriterioSaude: Hashable, Sendable, Identifiable {
    public var id: String
    public var titulo: String
    public var detalhe: String
    public var ok: Bool?
}

public struct LinhaFaseSaude: Hashable, Sendable, Identifiable {
    public var id: String
    public var fase: FaseChat
    public var chamadas: String
    public var falhas: String
    public var taxa: String
    public var tomTaxa: Tom
    public var p50: String
    public var p90: String
    public var tomP90: Tom
}

public struct BarraAlvo: Hashable, Sendable, Identifiable {
    public var id: String
    public var alvo: AlvoChat
    public var chamadas: Int
    public var fracao: Double
    public var rotulo: String
}

public struct LinhaErroSaude: Hashable, Sendable, Identifiable {
    public var id: String
    public var classe: ClasseErroChat
    public var n: Int
    /// Parte do total de erros (0…1).
    public var fracao: Double
    public var tom: Tom
}

public enum Saude {
    /// Limites do que é "bom" (os mesmos da legenda da tela).
    public static let limiteFalhaAlerta = 0.02
    public static let limiteFalhaRuim = 0.05
    public static let limiteReservaAlerta = 0.05
    public static let limiteReservaRuim = 0.10
    /// p90 do rascunho acima disto já é espera sentida pelo aluno.
    public static let limiteP90DraftAlertaMs = 12_000.0
    public static let limiteP90DraftRuimMs = 20_000.0

    public static func tomFalha(_ taxa: Double?) -> Tom {
        guard let taxa else { return .normal }
        if taxa >= limiteFalhaRuim { return .ruim }
        if taxa >= limiteFalhaAlerta { return .alerta }
        return .bom
    }

    /// Reserva (troca de família): > 5% âmbar, > 10% vermelho.
    public static func tomReserva(_ taxa: Double?) -> Tom {
        guard let taxa else { return .normal }
        if taxa > limiteReservaRuim { return .ruim }
        if taxa > limiteReservaAlerta { return .alerta }
        return .bom
    }

    public static func tomP90Draft(_ ms: Double?) -> Tom {
        guard let ms else { return .normal }
        if ms > limiteP90DraftRuimMs { return .ruim }
        if ms > limiteP90DraftAlertaMs { return .alerta }
        return .bom
    }

    /// Porcentagem com uma casa (taxas pequenas importam aqui): 0.0346 → "3,5%"; 0 → "0%".
    public static func pct1(_ v: Double?) -> String {
        guard let v, v.isFinite else { return Fmt.vazio }
        if v == 0 { return "0%" }
        return "\(Fmt.decimal(v * 100, casas: 1))%"
    }

    /// Os 4 cartões grandes do topo.
    public static func cartoes(_ s: SaudeChat) -> [CartaoMetrica] {
        [
            CartaoMetrica(id: "falha", titulo: "Taxa de falha", valor: pct1(s.taxaFalha),
                          detalhe: "\(Fmt.inteiro(s.falhas)) de \(Fmt.inteiro(s.chamadas)) chamadas", tom: tomFalha(s.taxaFalha)),
            CartaoMetrica(id: "reserva", titulo: "Turnos na reserva", valor: pct1(s.taxaReserva),
                          detalhe: "\(Fmt.inteiro(s.turnosComReserva)) turno\(s.turnosComReserva == 1 ? "" : "s") com outra família",
                          tom: tomReserva(s.taxaReserva)),
            CartaoMetrica(id: "aposentado", titulo: "Modelo aposentado", valor: Fmt.inteiro(s.turnosComModeloAposentado),
                          detalhe: "turnos com 404 de modelo", tom: s.turnosComModeloAposentado > 0 ? .ruim : .bom),
            CartaoMetrica(id: "turnos", titulo: "Turnos", valor: Fmt.inteiro(s.turnos),
                          detalhe: "\(Fmt.inteiro(s.chamadas)) chamadas em \(janelaTexto(s.janelaHoras))"),
        ]
    }

    public static func janelaTexto(_ horas: Int) -> String {
        if horas % 24 == 0 && horas >= 48 { return "\(horas / 24) dias" }
        return horas == 1 ? "1 hora" : "\(horas) horas"
    }

    /// Fases na ordem do pipeline; as desconhecidas vão no fim, em ordem alfabética.
    public static func fases(_ s: SaudeChat) -> [LinhaFaseSaude] {
        let ordem = FaseChat.conhecidos
        let ordenadas = s.porFase.sorted { a, b in
            let ia = ordem.firstIndex(of: a.fase) ?? Int.max
            let ib = ordem.firstIndex(of: b.fase) ?? Int.max
            return ia != ib ? ia < ib : a.fase.bruto < b.fase.bruto
        }
        return ordenadas.map { f in
            LinhaFaseSaude(id: f.id, fase: f.fase, chamadas: Fmt.inteiro(f.chamadas), falhas: Fmt.inteiro(f.falhas),
                           taxa: pct1(f.taxaFalha), tomTaxa: tomFalha(f.taxaFalha), p50: Fmt.ms(f.msP50), p90: Fmt.ms(f.msP90),
                           tomP90: f.fase == .draft ? tomP90Draft(f.msP90) : .normal)
        }
    }

    /// Barras por alvo, da maior para a menor; `fracao` nula é calculada sobre a soma.
    public static func alvos(_ s: SaudeChat) -> [BarraAlvo] {
        let total = max(1, s.porAlvo.reduce(0) { $0 + $1.chamadas })
        return s.porAlvo
            .map { a in
                let f = a.fracao ?? Double(a.chamadas) / Double(total)
                return BarraAlvo(id: a.id, alvo: a.alvo, chamadas: a.chamadas, fracao: f, rotulo: a.alvo.rotulo)
            }
            .sorted { $0.chamadas != $1.chamadas ? $0.chamadas > $1.chamadas : $0.id < $1.id }
    }

    /// Erros por classe, do mais frequente; modelo inexistente é sempre vermelho (deveria ser zero).
    public static func erros(_ s: SaudeChat) -> [LinhaErroSaude] {
        let total = max(1, s.erros.reduce(0) { $0 + $1.n })
        return s.erros
            .sorted { $0.n != $1.n ? $0.n > $1.n : $0.id < $1.id }
            .map { e in
                LinhaErroSaude(id: e.id, classe: e.classe, n: e.n, fracao: Double(e.n) / Double(total),
                               tom: e.classe == .modeloInexistente && e.n > 0 ? .ruim : .normal)
            }
    }

    /// Modelos do mais problemático (taxa de falha) para o menos; empate cai no volume.
    public static func modelos(_ s: SaudeChat) -> [ModeloSaude] {
        s.modelos.sorted { a, b in
            let (x, y) = (a.taxaFalha ?? 0, b.taxaFalha ?? 0)
            if x != y { return x > y }
            return a.chamadas != b.chamadas ? a.chamadas > b.chamadas : a.model < b.model
        }
    }

    /// Série em ordem de hora.
    public static func serie(_ s: SaudeChat) -> [PontoSaude] {
        s.serie.sorted { $0.hora < $1.hora }
    }

    /// O que é "bom", com o veredito da janela atual (`ok == nil` = sem dado).
    public static func criterios(_ s: SaudeChat) -> [CriterioSaude] {
        let draft = s.porFase.first { $0.fase == .draft }
        return [
            CriterioSaude(id: "reserva", titulo: "Reserva perto de 0",
                          detalhe: "Turno na reserva = o aluno recebeu outra família de modelo. Hoje: \(pct1(s.taxaReserva)) (meta ≤ 5%).",
                          ok: s.taxaReserva.map { $0 <= limiteReservaAlerta }),
            CriterioSaude(id: "aposentado", titulo: "Modelo aposentado = 0",
                          detalhe: "404 de modelo significa id velho no código. Hoje: \(s.turnosComModeloAposentado) turno(s).",
                          ok: s.turnosComModeloAposentado == 0),
            CriterioSaude(id: "draft", titulo: "p90 do rascunho baixo",
                          detalhe: "É a espera que o aluno sente. Hoje: \(Fmt.ms(draft?.msP90)) (meta ≤ \(Fmt.ms(limiteP90DraftAlertaMs))).",
                          ok: draft?.msP90.map { $0 <= limiteP90DraftAlertaMs }),
        ]
    }
}
