import Foundation
import Security

/// URL do servidor e token do console no Keychain do macOS (item genérico do serviço `space.zaeon.hermes`).
enum Keychain {
    enum Conta: String {
        case url = "servidor-url"
        case token = "console-token"
    }

    static let servico = "space.zaeon.hermes"

    private static func consulta(_ conta: Conta) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: servico,
            kSecAttrAccount as String: conta.rawValue,
        ]
    }

    static func ler(_ conta: Conta) -> String? {
        var q = consulta(conta)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &item) == errSecSuccess, let dados = item as? Data else { return nil }
        return String(data: dados, encoding: .utf8)
    }

    /// Grava (substituindo); valor vazio apaga o item.
    @discardableResult
    static func gravar(_ valor: String, em conta: Conta) -> Bool {
        let base = consulta(conta)
        SecItemDelete(base as CFDictionary)
        guard !valor.isEmpty else { return true }
        var novo = base
        novo[kSecValueData as String] = Data(valor.utf8)
        novo[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        novo[kSecAttrLabel as String] = "Zaeon Hermes (\(conta.rawValue))"
        return SecItemAdd(novo as CFDictionary, nil) == errSecSuccess
    }
}
