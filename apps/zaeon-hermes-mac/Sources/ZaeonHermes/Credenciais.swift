import Foundation

/// URL do servidor e chave do console, num arquivo SÓ DO USUÁRIO:
/// `~/Library/Application Support/space.zaeon.hermes/config.json` (pasta 0700, arquivo 0600).
///
/// POR QUE NÃO O KEYCHAIN. O Hermes é assinado ad-hoc (sem conta de desenvolvedor Apple). O Keychain do macOS
/// amarra cada item ao executável EXATO que o gravou (a "partition" de um app ad-hoc é o hash do binário), então
/// toda versão nova — e a atualização automática troca o binário — virava "outro app": o macOS pedia a senha de
/// login a cada abertura ("Sempre Permitir / Negar"), e quem negava abria o console sem a chave. Com o arquivo,
/// a chave sobrevive a toda atualização e nada é perguntado. A proteção é a mesma de qualquer arquivo seu: só o
/// seu usuário lê (0600). Os itens antigos "Zaeon Hermes (…)" no Keychain ficam lá, sem uso.
enum Credenciais {
    enum Campo: String {
        case url
        case token
    }

    private struct Arquivo: Codable {
        var url: String?
        var token: String?
    }

    static let pasta: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support")
        return base.appendingPathComponent("space.zaeon.hermes", isDirectory: true)
    }()

    static var caminho: URL { pasta.appendingPathComponent("config.json") }

    private static func carregar() -> Arquivo {
        guard let dados = try? Data(contentsOf: caminho),
              let a = try? JSONDecoder().decode(Arquivo.self, from: dados) else { return Arquivo() }
        return a
    }

    static func ler(_ campo: Campo) -> String? {
        let a = carregar()
        let v = campo == .url ? a.url : a.token
        return (v?.isEmpty ?? true) ? nil : v
    }

    /// Grava (vazio apaga o campo). Escrita atômica; pasta 0700 e arquivo 0600.
    @discardableResult
    static func gravar(_ valor: String, em campo: Campo) -> Bool {
        var a = carregar()
        let v: String? = valor.isEmpty ? nil : valor
        switch campo {
        case .url: a.url = v
        case .token: a.token = v
        }
        let fm = FileManager.default
        do {
            try fm.createDirectory(at: pasta, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
            try fm.setAttributes([.posixPermissions: 0o700], ofItemAtPath: pasta.path)
            let enc = JSONEncoder()
            enc.outputFormatting = [.prettyPrinted, .sortedKeys]
            try enc.encode(a).write(to: caminho, options: [.atomic])
            try fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: caminho.path)
            return true
        } catch {
            return false
        }
    }
}
