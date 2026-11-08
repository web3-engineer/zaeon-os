import Foundation

// MARK: - Linha do tempo

public struct ItemLinhaDoTempo: Hashable, Sendable, Identifiable {
    public var id: Int
    public var t: Double
    /// "+12,3 s" desde o início da tarefa.
    public var quando: String
    /// Intervalo desde o evento anterior ("Δ 1,2 s"); `nil` no primeiro.
    public var delta: String?
    public var fase: FaseEvento
    public var rotulo: String
    public var agente: String?
}

public enum LinhaDoTempo {
    /// Eventos em ordem de `t` (estável), com tempo relativo e intervalo entre eles.
    /// O prefixo "agente · " é tirado do rótulo quando repete o agente (o progresso do chat junta os dois).
    public static func itens(_ eventos: [EventoTarefa]) -> [ItemLinhaDoTempo] {
        let ordenados = eventos.enumerated().sorted { a, b in a.element.t != b.element.t ? a.element.t < b.element.t : a.offset < b.offset }
        var anterior: Double?
        return ordenados.map { par in
            let e = par.element
            defer { anterior = e.t }
            return ItemLinhaDoTempo(
                id: e.indice,
                t: e.t,
                quando: Fmt.relativoTarefa(e.t),
                delta: anterior.map { "Δ " + Fmt.ms(max(0, e.t - $0)) },
                fase: e.fase,
                rotulo: rotuloLimpo(e),
                agente: e.agente
            )
        }
    }

    static func rotuloLimpo(_ e: EventoTarefa) -> String {
        guard let a = e.agente, !a.isEmpty else { return e.rotulo }
        for sep in [" · ", ": "] where e.rotulo.hasPrefix(a + sep) {
            return String(e.rotulo.dropFirst(a.count + sep.count))
        }
        return e.rotulo
    }
}

// MARK: - Árvore de subagentes

/// Nó da árvore do enxame: orquestrador → subagentes → chamadas de ferramenta.
public struct NoAgente: Hashable, Sendable, Identifiable {
    public enum Tipo: String, Hashable, Sendable { case orquestrador, subagente, chamada }

    public var id: String
    public var tipo: Tipo
    /// "Kimi K2.6", "subagente 3 · DeepSeek V4 Flash", "literature_search: …"
    public var nome: String
    /// Para subagente: a parte que recebeu ("Métodos"). Para orquestrador: "3 subagentes em 2 lotes".
    public var titulo: String?
    /// Modelo do subagente, extraído do nome ("DeepSeek V4 Flash").
    public var modelo: String?
    /// Número do subagente (1, 2, 3…).
    public var numero: Int?
    /// Lote (1ª, 2ª… chamada de `delegar`) em que o subagente nasceu.
    public var lote: Int?
    /// ms desde o início da tarefa em que o nó apareceu.
    public var inicio: Double?
    /// Evidências [E#] atribuídas a este agente.
    public var evidencias: [String]
    /// `nil` = folha (o OutlineGroup do SwiftUI usa isso).
    public var filhos: [NoAgente]?

    public init(id: String, tipo: Tipo, nome: String, titulo: String? = nil, modelo: String? = nil, numero: Int? = nil, lote: Int? = nil,
                inicio: Double? = nil, evidencias: [String] = [], filhos: [NoAgente]? = nil) {
        self.id = id; self.tipo = tipo; self.nome = nome; self.titulo = titulo; self.modelo = modelo; self.numero = numero
        self.lote = lote; self.inicio = inicio; self.evidencias = evidencias; self.filhos = filhos
    }

    /// Quantos subagentes há abaixo (só faz sentido no orquestrador).
    public var totalSubagentes: Int { (filhos ?? []).filter { $0.tipo == .subagente }.count }
}

public enum ArvoreSubagentes {
    /// Monta a árvore a partir dos eventos `enxame` (o orquestrador criou N subagentes) e
    /// `subagente` (um subagente começou uma parte). As chamadas de ferramenta (`ferramenta`) cujo
    /// `agente` é um subagente viram filhas dele. Sem evento de enxame/subagente → `nil`.
    public static func construir(eventos: [EventoTarefa], evidencias: [Evidencia] = [], nomeMotor: String? = nil) -> NoAgente? {
        let ordenados = eventos.enumerated().sorted { a, b in a.element.t != b.element.t ? a.element.t < b.element.t : a.offset < b.offset }.map(\.element)
        guard ordenados.contains(where: { $0.fase == .enxame || $0.fase == .subagente }) else { return nil }

        var nomeOrquestrador = ordenados.first(where: { $0.fase == .enxame })?.agente ?? nomeMotor ?? "Orquestrador"
        if nomeOrquestrador.isEmpty { nomeOrquestrador = "Orquestrador" }

        var lote = 0
        var ordem: [String] = []
        var subs: [String: NoAgente] = [:]
        var chamadas: [String: [NoAgente]] = [:]

        for e in ordenados {
            switch e.fase {
            case .enxame:
                lote += 1
            case .subagente:
                let (nome, titulo) = nomeETitulo(e)
                guard subs[nome] == nil else { continue }
                let numero = numeroDoSubagente(nome)
                subs[nome] = NoAgente(id: "sub:\(nome)", tipo: .subagente, nome: nome, titulo: titulo, modelo: modeloDoSubagente(nome),
                                      numero: numero, lote: max(lote, 1), inicio: e.t)
                ordem.append(nome)
            case .ferramenta:
                guard let a = e.agente, let dono = dono(a, entre: Array(subs.keys)) else { continue }
                chamadas[dono, default: []].append(
                    NoAgente(id: "ev:\(e.indice):\(e.t)", tipo: .chamada, nome: LinhaDoTempo.rotuloLimpo(e), inicio: e.t)
                )
            default:
                continue
            }
        }

        var filhos: [NoAgente] = []
        for nome in ordem {
            guard var no = subs[nome] else { continue }
            no.evidencias = evidencias.filter { ev in ev.agente.map { dono($0, entre: [nome]) != nil } ?? false }.map(\.chave)
            let cs = chamadas[nome] ?? []
            no.filhos = cs.isEmpty ? nil : cs
            filhos.append(no)
        }
        filhos.sort { ($0.numero ?? Int.max, $0.inicio ?? 0) < ($1.numero ?? Int.max, $1.inicio ?? 0) }

        let lotes = max(lote, filhos.isEmpty ? 0 : 1)
        let orq = evidencias.filter { ev in
            guard let a = ev.agente else { return false }
            return a == nomeOrquestrador || dono(a, entre: ordem) == nil && !a.lowercased().hasPrefix("subagente")
        }.map(\.chave)
        return NoAgente(
            id: "orq:\(nomeOrquestrador)", tipo: .orquestrador, nome: nomeOrquestrador,
            titulo: "\(filhos.count) subagente\(filhos.count == 1 ? "" : "s") em \(lotes) lote\(lotes == 1 ? "" : "s")",
            inicio: ordenados.first(where: { $0.fase == .enxame })?.t, evidencias: orq,
            filhos: filhos.isEmpty ? nil : filhos
        )
    }

    /// `agente` = "subagente 3 · DeepSeek V4 Flash", `rotulo` = "subagente 3 · DeepSeek V4 Flash: Métodos".
    static func nomeETitulo(_ e: EventoTarefa) -> (String, String?) {
        if let a = e.agente, !a.isEmpty {
            let r = LinhaDoTempo.rotuloLimpo(e)
            return (a, r.isEmpty || r == a ? nil : r)
        }
        if let i = e.rotulo.range(of: ": ") {
            return (String(e.rotulo[..<i.lowerBound]), String(e.rotulo[i.upperBound...]))
        }
        return (e.rotulo, nil)
    }

    /// "subagente 12 · Kimi K2.6" → 12.
    static func numeroDoSubagente(_ nome: String) -> Int? {
        let partes = nome.split(separator: " ")
        guard partes.count >= 2, partes[0].lowercased() == "subagente" else { return nil }
        return Int(partes[1])
    }

    static func modeloDoSubagente(_ nome: String) -> String? {
        guard let r = nome.range(of: " · ") else { return nil }
        let m = String(nome[r.upperBound...]).trimmingCharacters(in: .whitespaces)
        return m.isEmpty ? nil : m
    }

    /// De qual subagente é este `agente`? Igualdade primeiro; senão pelo número ("subagente 1" ≠ "subagente 12").
    static func dono(_ agente: String, entre nomes: [String]) -> String? {
        if nomes.contains(agente) { return agente }
        guard let n = numeroDoSubagente(agente.components(separatedBy: ":").first ?? agente) else { return nil }
        return nomes.first { numeroDoSubagente($0) == n }
    }
}

// MARK: - Ledger

public struct TotaisLedger: Hashable, Sendable {
    public var chamadas: Int
    public var falhas: Int
    public var promptTokens: Int
    public var completionTokens: Int
    public var ms: Double
    public var custoUsd: Double
    public var porModelo: [String: Double]
}

public enum Ledger {
    public static func totais(_ linhas: [LinhaLedger]) -> TotaisLedger {
        var porModelo: [String: Double] = [:]
        for l in linhas { porModelo[l.model, default: 0] += l.custoUsd ?? 0 }
        return TotaisLedger(
            chamadas: linhas.count,
            falhas: linhas.filter { !$0.ok }.count,
            promptTokens: linhas.reduce(0) { $0 + $1.promptTokens },
            completionTokens: linhas.reduce(0) { $0 + $1.completionTokens },
            ms: linhas.reduce(0) { $0 + ($1.ms ?? 0) },
            custoUsd: linhas.reduce(0) { $0 + ($1.custoUsd ?? 0) },
            porModelo: porModelo
        )
    }
}

// MARK: - Texto final (markdown com [E#])

/// Bloco do texto final, para o app renderizar título/lista/parágrafo sem um parser de markdown inteiro
/// (o `AttributedString(markdown:)` cuida só do que é inline: negrito, itálico, link, código).
public struct BlocoTexto: Hashable, Sendable, Identifiable {
    public enum Tipo: Hashable, Sendable { case titulo(Int), paragrafo, item, citacao, codigo }
    public var id: Int
    public var tipo: Tipo
    /// Markdown inline do bloco, com cada [E#] já virado link `hermes-evidencia://E#`.
    public var markdown: String
}

public enum TextoFinal {
    /// Esquema dos links das chaves de evidência no texto renderizado.
    public static let esquemaEvidencia = "hermes-evidencia"

    /// Chaves [E#] do texto, na ordem da primeira aparição, sem repetir. Aceita "[E3]" e "[E3, E7]".
    public static func chaves(_ texto: String) -> [String] {
        var vistas: [String] = []
        for grupo in gruposDeChaves(texto) {
            for c in grupo.chaves where !vistas.contains(c) { vistas.append(c) }
        }
        return vistas
    }

    /// Chaves citadas no texto que NÃO estão na lista de evidências (deveria ser vazio: o portão corta).
    public static func chavesSemEvidencia(_ texto: String, evidencias: [Evidencia]) -> [String] {
        let conhecidas = Set(evidencias.map(\.chave))
        return chaves(texto).filter { !conhecidas.contains($0) }
    }

    /// URL do link de uma chave e o caminho de volta.
    public static func url(da chave: String) -> URL? { URL(string: "\(esquemaEvidencia)://\(chave)") }
    public static func chave(da url: URL) -> String? {
        guard url.scheme == esquemaEvidencia else { return nil }
        return url.host ?? url.absoluteString.replacingOccurrences(of: "\(esquemaEvidencia)://", with: "")
    }

    /// Troca cada [E#] (ou [E1, E2]) por links markdown `[E1](hermes-evidencia://E1)`.
    public static func linkarChaves(_ md: String) -> String {
        var saida = ""
        var cursor = md.startIndex
        for g in gruposDeChaves(md) {
            saida += md[cursor..<g.faixa.lowerBound]
            saida += "[" + g.chaves.map { "[\($0)](\(esquemaEvidencia)://\($0))" }.joined(separator: ", ") + "]"
            cursor = g.faixa.upperBound
        }
        saida += md[cursor...]
        return saida
    }

    /// Divide o markdown em blocos (linha em branco separa parágrafos; "#", "-", "*", "1.", ">" e ``` são reconhecidos).
    public static func blocos(_ texto: String) -> [BlocoTexto] {
        var blocos: [BlocoTexto] = []
        var paragrafo: [String] = []
        var codigo: [String]? = nil

        func emitir(_ tipo: BlocoTexto.Tipo, _ md: String, linkar: Bool = true) {
            blocos.append(BlocoTexto(id: blocos.count, tipo: tipo, markdown: linkar ? linkarChaves(md) : md))
        }
        func fecharParagrafo() {
            let p = paragrafo.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
            if !p.isEmpty { emitir(.paragrafo, p) }
            paragrafo = []
        }

        for linhaBruta in texto.replacingOccurrences(of: "\r\n", with: "\n").components(separatedBy: "\n") {
            let linha = linhaBruta.trimmingCharacters(in: .whitespaces)
            if codigo != nil {
                if linha.hasPrefix("```") { emitir(.codigo, codigo!.joined(separator: "\n"), linkar: false); codigo = nil }
                else { codigo!.append(linhaBruta) }
                continue
            }
            if linha.hasPrefix("```") { fecharParagrafo(); codigo = []; continue }
            if linha.isEmpty { fecharParagrafo(); continue }
            if linha.hasPrefix("#") {
                let nivel = linha.prefix(while: { $0 == "#" }).count
                let resto = linha.dropFirst(nivel)
                if nivel <= 6, resto.first == " " {
                    fecharParagrafo()
                    emitir(.titulo(nivel), resto.trimmingCharacters(in: .whitespaces))
                    continue
                }
            }
            if linha.hasPrefix("- ") || linha.hasPrefix("* ") || linha.hasPrefix("• ") {
                fecharParagrafo(); emitir(.item, String(linha.dropFirst(2))); continue
            }
            if let ponto = linha.firstIndex(of: "."), linha[..<ponto].allSatisfy(\.isNumber), !linha[..<ponto].isEmpty,
               linha[linha.index(after: ponto)...].hasPrefix(" ") {
                fecharParagrafo(); emitir(.item, linha); continue
            }
            if linha.hasPrefix(">") {
                fecharParagrafo(); emitir(.citacao, linha.dropFirst().trimmingCharacters(in: .whitespaces)); continue
            }
            paragrafo.append(linha)
        }
        if let codigo { emitir(.codigo, codigo.joined(separator: "\n"), linkar: false) }
        fecharParagrafo()
        return blocos
    }

    struct GrupoChaves { var faixa: Range<String.Index>; var chaves: [String] }

    /// Acha "[E1]", "[E1, E2]", "[E1;E2]". Não pega "[E1](…)" que já é link.
    static func gruposDeChaves(_ s: String) -> [GrupoChaves] {
        var saida: [GrupoChaves] = []
        var i = s.startIndex
        while let abre = s[i...].firstIndex(of: "[") {
            guard let fecha = s[abre...].firstIndex(of: "]") else { break }
            let dentro = s[s.index(after: abre)..<fecha]
            let partes = dentro.split(whereSeparator: { $0 == "," || $0 == ";" }).map { $0.trimmingCharacters(in: .whitespaces) }
            let validas = !partes.isEmpty && partes.allSatisfy { p in
                p.count >= 2 && p.first == "E" && p.dropFirst().allSatisfy(\.isNumber)
            }
            let depois = s.index(after: fecha)
            let jaELink = depois < s.endIndex && s[depois] == "("
            if validas && !jaELink {
                saida.append(GrupoChaves(faixa: abre..<depois, chaves: partes))
                i = depois
            } else {
                i = s.index(after: abre)
            }
        }
        return saida
    }
}
