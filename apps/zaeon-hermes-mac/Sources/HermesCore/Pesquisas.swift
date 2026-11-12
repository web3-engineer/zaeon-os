import Foundation

// PESQUISAS da vitrine (`/api/admin/vitrine/pesquisas`, lib/estudos/pesquisas no servidor): cada pesquisa vira uma
// PASTA na vitrine, e as PARTES dela (artigo, dados, protocolo…) são os papéis dentro da pasta. O console publica
// direto (entra "publicada", origem "console") e modera a fila do que os usuários mandam da Sala de Pesquisa.
// As regras aqui são as MESMAS do servidor — o app avisa antes de mandar, o servidor confere de novo.

/// O tipo de uma parte (o papel dentro da pasta).
public enum TipoParte: String, CaseIterable, Codable, Hashable, Sendable, Identifiable {
    case artigo, dados, protocolo, revisao, codigo, anexo
    public var id: String { rawValue }
    public var nome: String {
        switch self {
        case .artigo: "Artigo"
        case .dados: "Dados"
        case .protocolo: "Protocolo"
        case .revisao: "Revisão"
        case .codigo: "Código"
        case .anexo: "Anexo"
        }
    }
}

public enum StatusPesquisa: EnumTolerante {
    case pendente, publicada, recusada
    case desconhecido(String)

    public static let conhecidos: [StatusPesquisa] = [.pendente, .publicada, .recusada]
    public var bruto: String {
        switch self {
        case .pendente: "pendente"
        case .publicada: "publicada"
        case .recusada: "recusada"
        case .desconhecido(let s): s
        }
    }
    public var rotulo: String {
        switch self {
        case .pendente: "Na fila"
        case .publicada: "Publicadas"
        case .recusada: "Recusadas"
        case .desconhecido(let s): s.isEmpty ? "?" : s
        }
    }
    public init(from decoder: Decoder) throws { self = try Self.decodificar(decoder) }
    public func encode(to encoder: Encoder) throws { try codificar(encoder) }
}

/// Os limites do servidor (lib/estudos/pesquisas `LIMITES`).
public enum LimitesPesquisa {
    public static let titulo = 120
    public static let resumo = 4000
    public static let nicho = 60
    public static let tituloParte = 80
    public static let conteudo = 200_000
    public static let partes = 12
    public static let tags = 12
    public static let tag = 32
}

/// Uma parte sendo escrita no formulário.
public struct ParteRascunho: Identifiable, Hashable, Sendable {
    public var id = UUID()
    public var tipo: TipoParte
    public var titulo: String
    public var conteudo: String
    public var url: String
    /// de onde veio o texto, quando foi importado de um arquivo (só pra mostrar)
    public var arquivo: String?

    public init(tipo: TipoParte = .artigo, titulo: String = "", conteudo: String = "", url: String = "", arquivo: String? = nil) {
        self.tipo = tipo; self.titulo = titulo; self.conteudo = conteudo; self.url = url; self.arquivo = arquivo
    }
}

/// A pesquisa sendo escrita no formulário do app.
public struct RascunhoPesquisa: Hashable, Sendable {
    public var titulo = ""
    public var resumo = ""
    public var nicho = ""
    /// separadas por vírgula
    public var tags = ""
    /// publicar em nome de uma conta (opcional); vazio = autor Zaeon
    public var contaEmail = ""
    public var partes: [ParteRascunho] = [ParteRascunho()]

    public init() {}

    /// PURA: o que impede de publicar, em frases prontas pra tela (vazio = pode mandar).
    public func problemas() -> [String] {
        var p: [String] = []
        let t = titulo.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { p.append("Dê um título à pesquisa.") }
        if t.count > LimitesPesquisa.titulo { p.append("Título com mais de \(LimitesPesquisa.titulo) caracteres.") }
        if resumo.count > LimitesPesquisa.resumo { p.append("Resumo com mais de \(LimitesPesquisa.resumo) caracteres.") }
        let email = contaEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        if !email.isEmpty && !email.contains("@") { p.append("O e-mail da conta não parece um e-mail.") }
        if partes.isEmpty { p.append("A pesquisa precisa de pelo menos uma parte.") }
        if partes.count > LimitesPesquisa.partes { p.append("No máximo \(LimitesPesquisa.partes) partes.") }
        for (i, parte) in partes.enumerated() {
            let n = "Parte \(i + 1) (\(parte.tipo.nome))"
            let texto = parte.conteudo.trimmingCharacters(in: .whitespacesAndNewlines)
            let link = parte.url.trimmingCharacters(in: .whitespacesAndNewlines)
            if texto.isEmpty && link.isEmpty { p.append("\(n): escreva o texto, importe um arquivo ou cole um link https.") }
            if !link.isEmpty && !Pesquisas.ehHttps(link) { p.append("\(n): o link precisa começar com https://.") }
            if texto.count > LimitesPesquisa.conteudo { p.append("\(n): texto grande demais (máx. \(Fmt.inteiro(LimitesPesquisa.conteudo)) caracteres) — mande como link.") }
        }
        return p
    }

    /// PURA: o corpo do POST, já limpo (sem espaços nas pontas, sem campos vazios).
    public func pedido() -> PedidoPesquisa {
        var tagsLimpas: [String] = []
        for bruta in tags.split(whereSeparator: { ",;\n".contains($0) }) {
            let t = String(bruta.trimmingCharacters(in: .whitespaces).prefix(LimitesPesquisa.tag))
            if !t.isEmpty, !tagsLimpas.contains(t), tagsLimpas.count < LimitesPesquisa.tags { tagsLimpas.append(t) }
        }
        let email = contaEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        return PedidoPesquisa(
            titulo: titulo.trimmingCharacters(in: .whitespacesAndNewlines),
            resumo: resumo.trimmingCharacters(in: .whitespacesAndNewlines),
            nicho: nicho.trimmingCharacters(in: .whitespacesAndNewlines),
            tags: tagsLimpas,
            contaEmail: email.isEmpty ? nil : email.lowercased(),
            partes: partes.map { p in
                let texto = p.conteudo.trimmingCharacters(in: .whitespacesAndNewlines)
                let link = p.url.trimmingCharacters(in: .whitespacesAndNewlines)
                let tit = p.titulo.trimmingCharacters(in: .whitespacesAndNewlines)
                return PedidoPesquisa.Parte(tipo: p.tipo.rawValue, titulo: tit.isEmpty ? nil : tit,
                                            conteudo: texto.isEmpty ? nil : texto, url: link.isEmpty ? nil : link)
            }
        )
    }
}

/// O corpo de `POST /api/admin/vitrine/pesquisas`.
public struct PedidoPesquisa: Encodable, Equatable, Sendable {
    public struct Parte: Encodable, Equatable, Sendable {
        public var tipo: String
        public var titulo: String?
        public var conteudo: String?
        public var url: String?
    }
    public var titulo: String
    public var resumo: String
    public var nicho: String
    public var tags: [String]
    public var contaEmail: String?
    public var partes: [Parte]
}

/// Uma pesquisa como o servidor devolve (a lista e o resultado de publicar/moderar).
public struct PesquisaVitrine: Decodable, Hashable, Sendable, Identifiable {
    public struct Parte: Decodable, Hashable, Sendable {
        public var tipo: String
        public var titulo: String
        public var caracteres: Int
        public var link: Bool
        enum CodingKeys: String, CodingKey { case tipo, titulo, conteudo, url }
        public init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            tipo = c.textoFlex(.tipo) ?? ""
            titulo = c.textoFlex(.titulo) ?? ""
            caracteres = c.textoFlex(.conteudo)?.count ?? 0
            link = !(c.textoFlex(.url) ?? "").isEmpty
        }
        public var nomeTipo: String { TipoParte(rawValue: tipo)?.nome ?? tipo }
    }

    public var id: String
    public var slug: String
    public var titulo: String
    public var resumo: String
    public var nicho: String
    public var autor: String
    public var origem: String
    public var status: StatusPesquisa
    public var motivo: String?
    public var partes: [Parte]
    public var criadoEm: Date?
    /// o nome da conta que publicou, quando há conta ligada
    public var conta: String?

    enum CodingKeys: String, CodingKey { case id, slug, titulo, resumo, nicho, autor, origem, status, motivo, partes, criadoEm, conta }
    enum ChavesConta: String, CodingKey { case name }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        slug = c.textoFlex(.slug) ?? ""
        titulo = c.textoFlex(.titulo) ?? "(sem título)"
        resumo = c.textoFlex(.resumo) ?? ""
        nicho = c.textoFlex(.nicho) ?? ""
        autor = c.textoFlex(.autor) ?? ""
        origem = c.textoFlex(.origem) ?? ""
        status = (try? c.decodeIfPresent(StatusPesquisa.self, forKey: .status)) ?? .desconhecido("")
        motivo = c.textoFlex(.motivo)
        partes = c.listaFlex(Parte.self, .partes)
        criadoEm = c.textoFlex(.criadoEm).flatMap(Datas.ler)
        conta = (try? c.nestedContainer(keyedBy: ChavesConta.self, forKey: .conta)).flatMap { $0.textoFlex(.name) }
    }

    /// quem aparece como autor: a conta, o autor declarado ou a Zaeon
    public var quem: String { [conta, autor].compactMap { $0?.isEmpty == false ? $0 : nil }.first ?? "Zaeon" }
    public var rotuloOrigem: String {
        switch origem {
        case "usuario": "usuário"
        case "console": "console"
        case "admin": "admin"
        default: origem.isEmpty ? "?" : origem
        }
    }
}

struct RespostaPesquisa: Decodable { let pesquisa: PesquisaVitrine }
struct ListaPesquisas: Decodable { let pesquisas: [PesquisaVitrine]
    enum CodingKeys: String, CodingKey { case pesquisas }
    init(from decoder: Decoder) throws { pesquisas = try decoder.container(keyedBy: CodingKeys.self).listaFlex(PesquisaVitrine.self, .pesquisas) }
}
struct PedidoModeracao: Encodable { let status: String; let motivo: String? }

public enum Pesquisas {
    /// só https (o servidor recusa http, javascript:, data:)
    public static func ehHttps(_ texto: String) -> Bool {
        guard let u = URL(string: texto.trimmingCharacters(in: .whitespacesAndNewlines)) else { return false }
        return u.scheme?.lowercased() == "https" && (u.host?.isEmpty == false)
    }

    /// as extensões que o app importa como TEXTO de uma parte
    public static let extensoesTexto = ["md", "markdown", "txt", "csv", "tsv", "json", "tex", "bib", "py", "r", "ipynb"]

    /// PURA: o texto de um arquivo importado — UTF-8, com recaída pra Latin-1 (CSV exportado do Excel brasileiro).
    /// nil = binário (PDF, imagem…): esse vai como link, não como texto.
    public static func textoDoArquivo(_ dados: Data) -> String? {
        if dados.prefix(1024).contains(0) { return nil }
        if let s = String(data: dados, encoding: .utf8) { return s.hasPrefix("\u{FEFF}") ? String(s.dropFirst()) : s }
        return String(data: dados, encoding: .isoLatin1)
    }

    /// PURA: o tipo de parte mais provável pelo nome do arquivo (dados.csv → Dados, script.py → Código…)
    public static func tipoSugerido(arquivo: String) -> TipoParte? {
        let ext = (arquivo as NSString).pathExtension.lowercased()
        switch ext {
        case "csv", "tsv", "json": return .dados
        case "py", "r", "ipynb": return .codigo
        case "bib": return .anexo
        default: return nil
        }
    }
}
