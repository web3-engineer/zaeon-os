import Foundation

// Decodificação tolerante: o servidor pode ganhar um status, uma origem ou um formato novo antes
// de o app ser atualizado. Valor desconhecido NUNCA derruba o painel inteiro: vira
// `.desconhecido("valor-cru")` e a tela mostra o texto cru.

/// Enum de string com escape para valores que o app ainda não conhece.
public protocol EnumTolerante: Decodable, Encodable, Hashable, Sendable {
    /// Os casos conhecidos (sem o `.desconhecido`).
    static var conhecidos: [Self] { get }
    /// O caso de escape. Um `case desconhecido(String)` satisfaz este requisito.
    static func desconhecido(_ bruto: String) -> Self
    /// O valor exatamente como vem no JSON.
    var bruto: String { get }
}

extension EnumTolerante {
    public init(bruto: String) {
        self = Self.conhecidos.first { $0.bruto == bruto } ?? .desconhecido(bruto)
    }

    public var ehDesconhecido: Bool { !Self.conhecidos.contains(self) }

    static func decodificar(_ decoder: Decoder) throws -> Self {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { return .desconhecido("") }
        if let s = try? c.decode(String.self) { return Self(bruto: s) }
        if let n = try? c.decode(Double.self) { return .desconhecido(String(n)) }
        if let b = try? c.decode(Bool.self) { return .desconhecido(String(b)) }
        return .desconhecido("")
    }

    func codificar(_ encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(bruto)
    }
}

// MARK: - Números flexíveis

extension KeyedDecodingContainer {
    /// Inteiro que aceita `12`, `12.0`, `"12"` ou `null`. Ausente/nulo/ilegível → nil.
    func inteiroFlex(_ chave: Key) -> Int? {
        guard contains(chave), (try? decodeNil(forKey: chave)) == false else { return nil }
        if let i = try? decode(Int.self, forKey: chave) { return i }
        if let d = try? decode(Double.self, forKey: chave), d.isFinite { return Int(d.rounded()) }
        if let s = try? decode(String.self, forKey: chave) {
            return Int(s) ?? Double(s.replacingOccurrences(of: ",", with: ".")).map { Int($0.rounded()) }
        }
        return nil
    }

    /// Double que aceita número, string numérica ou `null`.
    func numeroFlex(_ chave: Key) -> Double? {
        guard contains(chave), (try? decodeNil(forKey: chave)) == false else { return nil }
        if let d = try? decode(Double.self, forKey: chave), d.isFinite { return d }
        if let s = try? decode(String.self, forKey: chave) {
            return Double(s.replacingOccurrences(of: ",", with: "."))
        }
        return nil
    }

    func boolFlex(_ chave: Key) -> Bool? {
        guard contains(chave), (try? decodeNil(forKey: chave)) == false else { return nil }
        if let b = try? decode(Bool.self, forKey: chave) { return b }
        if let i = try? decode(Int.self, forKey: chave) { return i != 0 }
        if let s = try? decode(String.self, forKey: chave) { return ["true", "1", "sim"].contains(s.lowercased()) }
        return nil
    }

    func textoFlex(_ chave: Key) -> String? {
        guard contains(chave), (try? decodeNil(forKey: chave)) == false else { return nil }
        if let s = try? decode(String.self, forKey: chave) { return s }
        if let i = try? decode(Int.self, forKey: chave) { return String(i) }
        if let d = try? decode(Double.self, forKey: chave) { return String(d) }
        return nil
    }

    /// Lista que tolera `null` e itens ilegíveis (o item ruim é pulado; o resto da lista fica).
    func listaFlex<T: Decodable>(_ tipo: T.Type, _ chave: Key) -> [T] {
        guard contains(chave), (try? decodeNil(forKey: chave)) == false,
              let itens = try? decode([Talvez<T>].self, forKey: chave) else { return [] }
        return itens.compactMap(\.valor)
    }
}

/// Decodifica `T` sem nunca falhar: o item ilegível vira `nil`. Como o decode do envelope sempre dá
/// certo, o contêiner da lista avança exatamente um item, em qualquer implementação do JSONDecoder.
struct Talvez<T: Decodable>: Decodable {
    let valor: T?
    init(from decoder: Decoder) throws {
        valor = try? T(from: decoder)
    }
}
