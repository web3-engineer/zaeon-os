import Foundation

// Modelos do contrato de docs/HERMES_ZAEON.md. Os decodificadores são escritos à mão para tolerar
// `null`, campo ausente e número vindo como string; só o que identifica a coisa (ids, datas) é exigido.

// MARK: - Painel

/// `GET /api/admin/orquestra/painel`
public struct Painel: Decodable, Hashable, Sendable {
    public var geradoEm: Date?
    public var modo: ModoOrquestra
    public var emVoo: Int
    public var config: ConfigOrquestra
    public var motores: [MotorPainel]
    public var datasets: [DatasetPainel]
    public var ferramentas: [FerramentaPainel]
    public var tarefas: [ResumoTarefa]

    public init(geradoEm: Date? = nil, modo: ModoOrquestra = .off, emVoo: Int = 0, config: ConfigOrquestra = .init(),
                motores: [MotorPainel] = [], datasets: [DatasetPainel] = [], ferramentas: [FerramentaPainel] = [],
                tarefas: [ResumoTarefa] = []) {
        self.geradoEm = geradoEm; self.modo = modo; self.emVoo = emVoo; self.config = config
        self.motores = motores; self.datasets = datasets; self.ferramentas = ferramentas; self.tarefas = tarefas
    }

    enum CodingKeys: String, CodingKey { case geradoEm, modo, emVoo, config, motores, datasets, ferramentas, tarefas }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        geradoEm = try? c.decodeIfPresent(Date.self, forKey: .geradoEm)
        modo = (try? c.decodeIfPresent(ModoOrquestra.self, forKey: .modo)) ?? .desconhecido("")
        emVoo = c.inteiroFlex(.emVoo) ?? 0
        config = (try? c.decodeIfPresent(ConfigOrquestra.self, forKey: .config)) ?? ConfigOrquestra()
        motores = c.listaFlex(MotorPainel.self, .motores)
        datasets = c.listaFlex(DatasetPainel.self, .datasets)
        ferramentas = c.listaFlex(FerramentaPainel.self, .ferramentas)
        tarefas = c.listaFlex(ResumoTarefa.self, .tarefas)
    }

    public func motor(_ id: String) -> MotorPainel? { motores.first { $0.id == id } }
}

public struct ConfigOrquestra: Decodable, Hashable, Sendable {
    public var planoMinimo: String?
    public var subagentesPro: Int?
    public var subagentesMax: Int?
    public var maxSimultaneas: Int?
    public var prazoProfundoMs: Double?
    public var prazoEnxameMs: Double?
    public var sorteio: Bool
    public var verificador: ModoVerificador?
    public var motorForcado: String?

    public init(planoMinimo: String? = nil, subagentesPro: Int? = nil, subagentesMax: Int? = nil, maxSimultaneas: Int? = nil,
                prazoProfundoMs: Double? = nil, prazoEnxameMs: Double? = nil, sorteio: Bool = false,
                verificador: ModoVerificador? = nil, motorForcado: String? = nil) {
        self.planoMinimo = planoMinimo; self.subagentesPro = subagentesPro; self.subagentesMax = subagentesMax
        self.maxSimultaneas = maxSimultaneas; self.prazoProfundoMs = prazoProfundoMs; self.prazoEnxameMs = prazoEnxameMs
        self.sorteio = sorteio; self.verificador = verificador; self.motorForcado = motorForcado
    }

    enum CodingKeys: String, CodingKey {
        case planoMinimo, subagentesPro, subagentesMax, maxSimultaneas, prazoProfundoMs, prazoEnxameMs, sorteio, verificador, motorForcado
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        planoMinimo = c.textoFlex(.planoMinimo)
        subagentesPro = c.inteiroFlex(.subagentesPro)
        subagentesMax = c.inteiroFlex(.subagentesMax)
        maxSimultaneas = c.inteiroFlex(.maxSimultaneas)
        prazoProfundoMs = c.numeroFlex(.prazoProfundoMs)
        prazoEnxameMs = c.numeroFlex(.prazoEnxameMs)
        sorteio = c.boolFlex(.sorteio) ?? false
        verificador = try? c.decodeIfPresent(ModoVerificador.self, forKey: .verificador)
        motorForcado = c.textoFlex(.motorForcado)
    }
}

// MARK: - Motor

public struct MotorPainel: Decodable, Hashable, Sendable, Identifiable {
    public var id: String
    public var nome: String
    public var origem: OrigemMotor
    public var formato: FormatoMotor
    public var descricao: String
    public var disponivel: Bool
    public var modelos: [ModeloMotor]
    public var ferramentas: [String]
    public var datasets: [String]
    public var prompt: String
    public var metricas: MetricasMotor

    public init(id: String, nome: String, origem: OrigemMotor, formato: FormatoMotor, descricao: String = "",
                disponivel: Bool = true, modelos: [ModeloMotor] = [], ferramentas: [String] = [], datasets: [String] = [],
                prompt: String = "", metricas: MetricasMotor = .init()) {
        self.id = id; self.nome = nome; self.origem = origem; self.formato = formato; self.descricao = descricao
        self.disponivel = disponivel; self.modelos = modelos; self.ferramentas = ferramentas; self.datasets = datasets
        self.prompt = prompt; self.metricas = metricas
    }

    enum CodingKeys: String, CodingKey { case id, nome, origem, formato, descricao, disponivel, modelos, ferramentas, datasets, prompt, metricas }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        nome = c.textoFlex(.nome) ?? id
        origem = (try? c.decodeIfPresent(OrigemMotor.self, forKey: .origem)) ?? .desconhecido("")
        formato = (try? c.decodeIfPresent(FormatoMotor.self, forKey: .formato)) ?? .desconhecido("")
        descricao = c.textoFlex(.descricao) ?? ""
        disponivel = c.boolFlex(.disponivel) ?? false
        modelos = c.listaFlex(ModeloMotor.self, .modelos)
        ferramentas = c.listaFlex(String.self, .ferramentas)
        datasets = c.listaFlex(String.self, .datasets)
        prompt = c.textoFlex(.prompt) ?? ""
        metricas = (try? c.decodeIfPresent(MetricasMotor.self, forKey: .metricas)) ?? MetricasMotor()
    }
}

public struct ModeloMotor: Decodable, Hashable, Sendable, Identifiable {
    public var id: String
    public var nome: String
    public var familia: String?
    public var rotas: [RotaModelo]
    public var preco: PrecoModelo?

    public init(id: String, nome: String, familia: String? = nil, rotas: [RotaModelo] = [], preco: PrecoModelo? = nil) {
        self.id = id; self.nome = nome; self.familia = familia; self.rotas = rotas; self.preco = preco
    }

    enum CodingKeys: String, CodingKey { case id, nome, familia, rotas, preco }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        nome = c.textoFlex(.nome) ?? id
        familia = c.textoFlex(.familia)
        rotas = c.listaFlex(RotaModelo.self, .rotas)
        preco = try? c.decodeIfPresent(PrecoModelo.self, forKey: .preco)
    }

    /// Alguma rota com chave no servidor?
    public var algumaRotaConfigurada: Bool { rotas.contains { $0.configurado } }
}

public struct RotaModelo: Decodable, Hashable, Sendable, Identifiable {
    public var provedor: String
    public var modelo: String
    public var configurado: Bool
    public var id: String { "\(provedor)/\(modelo)" }

    public init(provedor: String, modelo: String, configurado: Bool) {
        self.provedor = provedor; self.modelo = modelo; self.configurado = configurado
    }

    enum CodingKeys: String, CodingKey { case provedor, modelo, configurado }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        provedor = c.textoFlex(.provedor) ?? "?"
        modelo = c.textoFlex(.modelo) ?? "?"
        configurado = c.boolFlex(.configurado) ?? false
    }
}

/// USD por milhão de tokens.
public struct PrecoModelo: Decodable, Hashable, Sendable {
    public var prompt: Double?
    public var completion: Double?
    public var cached: Double?

    public init(prompt: Double? = nil, completion: Double? = nil, cached: Double? = nil) {
        self.prompt = prompt; self.completion = completion; self.cached = cached
    }

    enum CodingKeys: String, CodingKey { case prompt, completion, cached }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        prompt = c.numeroFlex(.prompt)
        completion = c.numeroFlex(.completion)
        cached = c.numeroFlex(.cached)
    }
}

/// Métricas agregadas do motor. Contagens viram 0 quando vêm nulas; médias e percentis ficam `nil`
/// (sem tarefa, não há p50: mostrar "—" é mais honesto que mostrar 0).
public struct MetricasMotor: Decodable, Hashable, Sendable {
    public var tarefas: Int
    public var concluidas: Int
    public var fallbacks: Int
    public var degradadas: Int
    public var msP50: Double?
    public var msP90: Double?
    public var custoMedioUsd: Double?
    public var custoTotalUsd: Double?
    public var citacoesInventadas: Int
    public var coberturaMedia: Double?
    public var subagentesMedia: Double?

    public init(tarefas: Int = 0, concluidas: Int = 0, fallbacks: Int = 0, degradadas: Int = 0, msP50: Double? = nil,
                msP90: Double? = nil, custoMedioUsd: Double? = nil, custoTotalUsd: Double? = nil, citacoesInventadas: Int = 0,
                coberturaMedia: Double? = nil, subagentesMedia: Double? = nil) {
        self.tarefas = tarefas; self.concluidas = concluidas; self.fallbacks = fallbacks; self.degradadas = degradadas
        self.msP50 = msP50; self.msP90 = msP90; self.custoMedioUsd = custoMedioUsd; self.custoTotalUsd = custoTotalUsd
        self.citacoesInventadas = citacoesInventadas; self.coberturaMedia = coberturaMedia; self.subagentesMedia = subagentesMedia
    }

    enum CodingKeys: String, CodingKey {
        case tarefas, concluidas, fallbacks, degradadas, msP50, msP90, custoMedioUsd, custoTotalUsd, citacoesInventadas, coberturaMedia, subagentesMedia
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        tarefas = c.inteiroFlex(.tarefas) ?? 0
        concluidas = c.inteiroFlex(.concluidas) ?? 0
        fallbacks = c.inteiroFlex(.fallbacks) ?? 0
        degradadas = c.inteiroFlex(.degradadas) ?? 0
        msP50 = c.numeroFlex(.msP50)
        msP90 = c.numeroFlex(.msP90)
        custoMedioUsd = c.numeroFlex(.custoMedioUsd)
        custoTotalUsd = c.numeroFlex(.custoTotalUsd)
        citacoesInventadas = c.inteiroFlex(.citacoesInventadas) ?? 0
        coberturaMedia = c.numeroFlex(.coberturaMedia)
        subagentesMedia = c.numeroFlex(.subagentesMedia)
    }
}

// MARK: - Dataset e ferramenta

public struct DatasetPainel: Decodable, Hashable, Sendable, Identifiable {
    public var id: String
    public var nome: String
    public var tipo: TipoDataset
    public var fonte: String
    public var licenca: String
    public var descricao: String
    /// `nil` quando o banco do RAG não respondeu.
    public var documentos: Int?
    public var trechos: Int?
    public var conectado: Bool

    public init(id: String, nome: String, tipo: TipoDataset, fonte: String = "", licenca: String = "", descricao: String = "",
                documentos: Int? = nil, trechos: Int? = nil, conectado: Bool = false) {
        self.id = id; self.nome = nome; self.tipo = tipo; self.fonte = fonte; self.licenca = licenca; self.descricao = descricao
        self.documentos = documentos; self.trechos = trechos; self.conectado = conectado
    }

    enum CodingKeys: String, CodingKey { case id, nome, tipo, fonte, licenca, descricao, documentos, trechos, conectado }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        nome = c.textoFlex(.nome) ?? id
        tipo = (try? c.decodeIfPresent(TipoDataset.self, forKey: .tipo)) ?? .desconhecido("")
        fonte = c.textoFlex(.fonte) ?? ""
        licenca = c.textoFlex(.licenca) ?? ""
        descricao = c.textoFlex(.descricao) ?? ""
        documentos = c.inteiroFlex(.documentos)
        trechos = c.inteiroFlex(.trechos)
        conectado = c.boolFlex(.conectado) ?? false
    }
}

public struct FerramentaPainel: Decodable, Hashable, Sendable, Identifiable {
    public var nome: String
    public var descricao: String
    /// "read" hoje; texto livre para não travar num valor novo.
    public var risco: String
    public var id: String { nome }

    public init(nome: String, descricao: String = "", risco: String = "read") {
        self.nome = nome; self.descricao = descricao; self.risco = risco
    }

    enum CodingKeys: String, CodingKey { case nome, descricao, risco }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        nome = try c.decode(String.self, forKey: .nome)
        descricao = c.textoFlex(.descricao) ?? ""
        risco = c.textoFlex(.risco) ?? "?"
    }
}

// MARK: - Tarefa

/// O cartão do quadro. `ms`/`custoUsd`/… são `nil` enquanto a tarefa está `rodando`.
public struct ResumoTarefa: Decodable, Hashable, Sendable, Identifiable {
    public var id: String
    public var criadaEm: Date
    public var atualizadaEm: Date
    public var status: StatusTarefa
    public var origem: OrigemTarefa
    public var motor: String
    public var nomeMotor: String
    public var formato: FormatoMotor
    public var intent: String
    public var plano: String?
    public var objetivo: String
    public var ms: Double?
    public var custoUsd: Double?
    public var subagentes: Int?
    public var evidencias: Int?
    public var citadas: Int?
    /// Citações inventadas (chave [E#] que nenhuma ferramenta devolveu, cortada pelo portão).
    public var invalidas: Int?
    public var cobertura: Double?
    public var aprovado: Bool?
    public var degradado: Bool?

    public init(id: String, criadaEm: Date, atualizadaEm: Date? = nil, status: StatusTarefa, origem: OrigemTarefa = .chat,
                motor: String, nomeMotor: String? = nil, formato: FormatoMotor = .unico, intent: String = "criar_trabalho",
                plano: String? = nil, objetivo: String = "", ms: Double? = nil, custoUsd: Double? = nil, subagentes: Int? = nil,
                evidencias: Int? = nil, citadas: Int? = nil, invalidas: Int? = nil, cobertura: Double? = nil,
                aprovado: Bool? = nil, degradado: Bool? = nil) {
        self.id = id; self.criadaEm = criadaEm; self.atualizadaEm = atualizadaEm ?? criadaEm; self.status = status
        self.origem = origem; self.motor = motor; self.nomeMotor = nomeMotor ?? motor; self.formato = formato
        self.intent = intent; self.plano = plano; self.objetivo = objetivo; self.ms = ms; self.custoUsd = custoUsd
        self.subagentes = subagentes; self.evidencias = evidencias; self.citadas = citadas; self.invalidas = invalidas
        self.cobertura = cobertura; self.aprovado = aprovado; self.degradado = degradado
    }

    enum CodingKeys: String, CodingKey {
        case id, criadaEm, atualizadaEm, status, origem, motor, nomeMotor, formato, intent, plano, objetivo, ms, custoUsd,
             subagentes, evidencias, citadas, invalidas, cobertura, aprovado, degradado
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        let criada = try c.decode(Date.self, forKey: .criadaEm)
        criadaEm = criada
        atualizadaEm = (try? c.decodeIfPresent(Date.self, forKey: .atualizadaEm)) ?? criada
        status = (try? c.decodeIfPresent(StatusTarefa.self, forKey: .status)) ?? .desconhecido("")
        origem = (try? c.decodeIfPresent(OrigemTarefa.self, forKey: .origem)) ?? .desconhecido("")
        motor = c.textoFlex(.motor) ?? "?"
        nomeMotor = c.textoFlex(.nomeMotor) ?? motor
        formato = (try? c.decodeIfPresent(FormatoMotor.self, forKey: .formato)) ?? .desconhecido("")
        intent = c.textoFlex(.intent) ?? ""
        plano = c.textoFlex(.plano)
        objetivo = c.textoFlex(.objetivo) ?? ""
        ms = c.numeroFlex(.ms)
        custoUsd = c.numeroFlex(.custoUsd)
        subagentes = c.inteiroFlex(.subagentes)
        evidencias = c.inteiroFlex(.evidencias)
        citadas = c.inteiroFlex(.citadas)
        invalidas = c.inteiroFlex(.invalidas)
        cobertura = c.numeroFlex(.cobertura)
        aprovado = c.boolFlex(.aprovado)
        degradado = c.boolFlex(.degradado)
    }

    public var estaRodando: Bool { status == .rodando }
}

/// `GET /tarefas` → `{ "tarefas": [ResumoTarefa] }`
public struct ListaTarefas: Decodable, Sendable {
    public var tarefas: [ResumoTarefa]
    enum CodingKeys: String, CodingKey { case tarefas }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        tarefas = c.listaFlex(ResumoTarefa.self, .tarefas)
    }
}

/// `GET /tarefas/{id}` → `{ "tarefa": … }`
public struct RespostaTarefa: Decodable, Sendable {
    public var tarefa: TarefaDetalhe
}

/// O cartão com a trilha completa: `ResumoTarefa & { decisao, eventos, evidencias, texto, … }`.
public struct TarefaDetalhe: Decodable, Hashable, Sendable, Identifiable {
    public var resumo: ResumoTarefa
    public var decisao: Decisao?
    public var eventos: [EventoTarefa]
    /// Lista de evidências. Atenção: `resumo.evidencias` é a CONTAGEM; esta é a lista.
    public var listaEvidencias: [Evidencia]
    /// Markdown final com as chaves [E#] (as mesmas de `listaEvidencias`).
    public var texto: String
    public var motivo: String?
    public var erro: String?
    public var uso: UsoTarefa?
    public var ledger: [LinhaLedger]

    public var id: String { resumo.id }

    public init(resumo: ResumoTarefa, decisao: Decisao? = nil, eventos: [EventoTarefa] = [], listaEvidencias: [Evidencia] = [],
                texto: String = "", motivo: String? = nil, erro: String? = nil, uso: UsoTarefa? = nil, ledger: [LinhaLedger] = []) {
        self.resumo = resumo; self.decisao = decisao
        self.eventos = eventos.enumerated().map { i, e in var e = e; e.indice = i; return e }
        self.listaEvidencias = listaEvidencias; self.texto = texto; self.motivo = motivo; self.erro = erro; self.uso = uso
        self.ledger = ledger.enumerated().map { i, l in var l = l; l.indice = i; return l }
    }

    enum CodingKeys: String, CodingKey { case decisao, eventos, evidencias, texto, motivo, erro, uso, ledger }

    public init(from decoder: Decoder) throws {
        var r = try ResumoTarefa(from: decoder)
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let evidencias = c.listaFlex(Evidencia.self, .evidencias)
        // No detalhe, `evidencias` é a LISTA (no resumo é a contagem): o nome colide na interseção
        // `ResumoTarefa & {…}` do contrato. A contagem do resumo sai do tamanho da lista.
        if r.evidencias == nil { r.evidencias = evidencias.count }
        self.init(
            resumo: r,
            decisao: try? c.decodeIfPresent(Decisao.self, forKey: .decisao),
            eventos: c.listaFlex(EventoTarefa.self, .eventos),
            listaEvidencias: evidencias,
            texto: c.textoFlex(.texto) ?? "",
            motivo: c.textoFlex(.motivo),
            erro: c.textoFlex(.erro),
            uso: try? c.decodeIfPresent(UsoTarefa.self, forKey: .uso),
            ledger: c.listaFlex(LinhaLedger.self, .ledger)
        )
    }

    /// Detalhe mínimo a partir de um resumo (modo DEMO, ou enquanto o detalhe não chegou).
    public static func soResumo(_ r: ResumoTarefa) -> TarefaDetalhe { TarefaDetalhe(resumo: r) }
}

public struct Decisao: Decodable, Hashable, Sendable {
    public var motor: String
    public var formato: FormatoMotor
    public var motivo: String
    public var maxSubagentes: Int?
    public var prazoMs: Double?
    public var verificadorGlobal: Bool

    public init(motor: String, formato: FormatoMotor, motivo: String, maxSubagentes: Int? = nil, prazoMs: Double? = nil,
                verificadorGlobal: Bool = false) {
        self.motor = motor; self.formato = formato; self.motivo = motivo; self.maxSubagentes = maxSubagentes
        self.prazoMs = prazoMs; self.verificadorGlobal = verificadorGlobal
    }

    enum CodingKeys: String, CodingKey { case motor, formato, motivo, maxSubagentes, prazoMs, verificadorGlobal }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        motor = c.textoFlex(.motor) ?? "?"
        formato = (try? c.decodeIfPresent(FormatoMotor.self, forKey: .formato)) ?? .desconhecido("")
        motivo = c.textoFlex(.motivo) ?? ""
        maxSubagentes = c.inteiroFlex(.maxSubagentes)
        prazoMs = c.numeroFlex(.prazoMs)
        verificadorGlobal = c.boolFlex(.verificadorGlobal) ?? false
    }
}

public struct EventoTarefa: Decodable, Hashable, Sendable, Identifiable {
    /// ms desde o início da tarefa.
    public var t: Double
    public var fase: FaseEvento
    public var rotulo: String
    public var agente: String?
    /// Posição na lista (dada pelo `TarefaDetalhe`); é a identidade estável da linha.
    public internal(set) var indice: Int = 0
    public var id: Int { indice }

    public init(t: Double, fase: FaseEvento, rotulo: String, agente: String? = nil) {
        self.t = t; self.fase = fase; self.rotulo = rotulo; self.agente = agente
    }

    enum CodingKeys: String, CodingKey { case t, fase, rotulo, agente }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        t = c.numeroFlex(.t) ?? 0
        fase = (try? c.decodeIfPresent(FaseEvento.self, forKey: .fase)) ?? .desconhecido("")
        rotulo = c.textoFlex(.rotulo) ?? ""
        agente = c.textoFlex(.agente)
    }
}

public struct Evidencia: Decodable, Hashable, Sendable, Identifiable {
    /// "E1", "E2", … — a mesma chave que aparece no texto.
    public var chave: String
    public var claim: String
    public var source: FonteEvidencia?
    public var ferramenta: String?
    public var agente: String?
    public var id: String { chave }

    public init(chave: String, claim: String, source: FonteEvidencia? = nil, ferramenta: String? = nil, agente: String? = nil) {
        self.chave = chave; self.claim = claim; self.source = source; self.ferramenta = ferramenta; self.agente = agente
    }

    enum CodingKeys: String, CodingKey { case chave, claim, source, ferramenta, agente }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        chave = try c.decode(String.self, forKey: .chave)
        claim = c.textoFlex(.claim) ?? ""
        source = try? c.decodeIfPresent(FonteEvidencia.self, forKey: .source)
        ferramenta = c.textoFlex(.ferramenta)
        agente = c.textoFlex(.agente)
    }
}

public struct FonteEvidencia: Decodable, Hashable, Sendable {
    public var title: String?
    public var url: String?
    public var authors: String?
    public var year: Int?

    public init(title: String? = nil, url: String? = nil, authors: String? = nil, year: Int? = nil) {
        self.title = title; self.url = url; self.authors = authors; self.year = year
    }

    enum CodingKeys: String, CodingKey { case title, url, authors, year }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        title = c.textoFlex(.title)
        url = c.textoFlex(.url)
        // `authors` às vezes chega como lista
        if let s = c.textoFlex(.authors) {
            authors = s
        } else {
            let lista = c.listaFlex(String.self, .authors)
            authors = lista.isEmpty ? nil : lista.joined(separator: ", ")
        }
        year = c.inteiroFlex(.year)
    }

    /// URL clicável só se for http(s) de verdade.
    public var urlValida: URL? {
        guard let url, let u = URL(string: url), let s = u.scheme?.lowercased(), s == "http" || s == "https" else { return nil }
        return u
    }
}

public struct UsoTarefa: Decodable, Hashable, Sendable {
    public var promptTokens: Int
    public var completionTokens: Int
    public var chamadas: Int
    public var custoUsd: Double?

    public init(promptTokens: Int = 0, completionTokens: Int = 0, chamadas: Int = 0, custoUsd: Double? = nil) {
        self.promptTokens = promptTokens; self.completionTokens = completionTokens; self.chamadas = chamadas; self.custoUsd = custoUsd
    }

    enum CodingKeys: String, CodingKey { case promptTokens, completionTokens, chamadas, custoUsd }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        promptTokens = c.inteiroFlex(.promptTokens) ?? 0
        completionTokens = c.inteiroFlex(.completionTokens) ?? 0
        chamadas = c.inteiroFlex(.chamadas) ?? 0
        custoUsd = c.numeroFlex(.custoUsd)
    }
}

/// Uma chamada de LLM (o TokenLedger filtrado pelo `taskId`).
public struct LinhaLedger: Decodable, Hashable, Sendable, Identifiable {
    public var at: Date?
    public var model: String
    public var provedor: String?
    public var phase: String?
    public var promptTokens: Int
    public var completionTokens: Int
    public var ms: Double?
    public var ok: Bool
    public var erro: String?
    public var custoUsd: Double?
    public internal(set) var indice: Int = 0
    public var id: Int { indice }

    public init(at: Date? = nil, model: String, provedor: String? = nil, phase: String? = nil, promptTokens: Int = 0,
                completionTokens: Int = 0, ms: Double? = nil, ok: Bool = true, erro: String? = nil, custoUsd: Double? = nil) {
        self.at = at; self.model = model; self.provedor = provedor; self.phase = phase; self.promptTokens = promptTokens
        self.completionTokens = completionTokens; self.ms = ms; self.ok = ok; self.erro = erro; self.custoUsd = custoUsd
    }

    enum CodingKeys: String, CodingKey { case at, model, provedor, phase, promptTokens, completionTokens, ms, ok, erro, custoUsd }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        at = try? c.decodeIfPresent(Date.self, forKey: .at)
        model = c.textoFlex(.model) ?? "?"
        provedor = c.textoFlex(.provedor)
        phase = c.textoFlex(.phase)
        promptTokens = c.inteiroFlex(.promptTokens) ?? 0
        completionTokens = c.inteiroFlex(.completionTokens) ?? 0
        ms = c.numeroFlex(.ms)
        erro = c.textoFlex(.erro)
        ok = c.boolFlex(.ok) ?? (erro == nil)
        custoUsd = c.numeroFlex(.custoUsd)
    }
}

// MARK: - Arena e exportação

/// Corpo de `POST /arena`.
public struct PedidoArena: Encodable, Hashable, Sendable {
    public var objetivo: String
    public var intent: IntentArena
    public var kind: String?
    public var motores: [String]

    /// A arena aceita até 4 motores por pedido.
    public static let maxMotores = 4

    public init(objetivo: String, intent: IntentArena, kind: String? = nil, motores: [String]) {
        self.objetivo = objetivo; self.intent = intent
        let k = kind?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.kind = (k?.isEmpty ?? true) ? nil : k
        self.motores = motores
    }

    enum CodingKeys: String, CodingKey { case objetivo, intent, kind, motores }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(objetivo, forKey: .objetivo)
        try c.encode(intent.rawValue, forKey: .intent)
        try c.encodeIfPresent(kind, forKey: .kind)
        try c.encode(motores, forKey: .motores)
    }

    /// Problema que impede o envio, em texto para a tela; `nil` = pode enviar.
    public var problema: String? {
        if objetivo.trimmingCharacters(in: .whitespacesAndNewlines).count < 10 { return "Escreva um objetivo (pelo menos 10 caracteres)." }
        if motores.isEmpty { return "Escolha pelo menos um motor." }
        if motores.count > Self.maxMotores { return "A arena aceita até \(Self.maxMotores) motores por pedido." }
        return nil
    }
}

/// `202 { "tarefas": ["id", …] }`
public struct RespostaArena: Decodable, Hashable, Sendable {
    public var tarefas: [String]
    enum CodingKeys: String, CodingKey { case tarefas }
    public init(tarefas: [String]) { self.tarefas = tarefas }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        tarefas = c.listaFlex(String.self, .tarefas)
    }
}

/// Corpo de `POST /exportar`.
public struct PedidoExportacao: Encodable, Sendable {
    public var desde: Date?
    public init(desde: Date? = nil) { self.desde = desde }
    enum CodingKeys: String, CodingKey { case desde }
    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        if let desde { try c.encode(Datas.isoComFracao(desde), forKey: .desde) }
    }
}

public struct ResultadoExportacao: Decodable, Hashable, Sendable {
    public var exportadas: Int
    public var repo: String
    public var arquivo: String

    public init(exportadas: Int, repo: String, arquivo: String) {
        self.exportadas = exportadas; self.repo = repo; self.arquivo = arquivo
    }

    enum CodingKeys: String, CodingKey { case exportadas, repo, arquivo }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        exportadas = c.inteiroFlex(.exportadas) ?? 0
        repo = c.textoFlex(.repo) ?? ""
        arquivo = c.textoFlex(.arquivo) ?? ""
    }

    /// Página do dataset no Hugging Face.
    public var urlRepo: URL? { repo.isEmpty ? nil : URL(string: "https://huggingface.co/datasets/\(repo)") }
}

/// Corpo de erro do servidor: `{ "erro": "nao_autorizado" }`.
public struct CorpoErro: Decodable, Sendable {
    public var erro: String?
}
