import Foundation

// Atualização automática do app (`GET /api/admin/orquestra/app` e `/app/baixar`, com a chave do console).
// O workflow do app publica um build novo a cada push na main; o app compara o build dele com o do servidor.

/// `GET /app` — a última versão publicada.
public struct ManifestoApp: Decodable, Hashable, Sendable {
    public var build: Int
    public var versao: String
    public var sha: String?
    public var criadoEm: Date?
    public var sha256: String
    public var tamanho: Int

    public init(build: Int, versao: String = "0.1.0", sha: String? = nil, criadoEm: Date? = nil, sha256: String, tamanho: Int = 0) {
        self.build = build; self.versao = versao; self.sha = sha; self.criadoEm = criadoEm; self.sha256 = sha256; self.tamanho = tamanho
    }

    enum CodingKeys: String, CodingKey { case build, versao, sha, criadoEm, sha256, tamanho }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        guard let b = c.inteiroFlex(.build), b > 0 else {
            throw DecodingError.dataCorruptedError(forKey: .build, in: c, debugDescription: "build ausente")
        }
        build = b
        versao = c.textoFlex(.versao) ?? "0.1.0"
        sha = c.textoFlex(.sha)
        criadoEm = try? c.decodeIfPresent(Date.self, forKey: .criadoEm)
        sha256 = (c.textoFlex(.sha256) ?? "").lowercased()
        tamanho = c.inteiroFlex(.tamanho) ?? 0
    }

    /// commit curto, pra tela
    public var shaCurto: String? { sha.map { String($0.prefix(7)) } }
}

/// Regras PURAS da atualização (testáveis no Linux).
public enum Atualizacao {
    /// o build deste app (`CFBundleVersion`). nil = rodando fora de um .app (swift run): não se atualiza.
    public static func buildAtual(_ info: [String: Any]?) -> Int? {
        guard let s = info?["CFBundleVersion"] as? String, let n = Int(s), n > 0 else { return nil }
        return n
    }

    /// Há versão nova? Só quando o servidor tem build MAIOR (nunca "atualiza" para trás).
    public static func disponivel(atual: Int?, manifesto: ManifestoApp?) -> Bool {
        guard let atual, let m = manifesto, m.sha256.count == 64 else { return false }
        return m.build > atual
    }
}
