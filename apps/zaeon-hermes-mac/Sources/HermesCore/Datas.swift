import Foundation

/// Datas ISO-8601 do contrato, com e sem fração de segundo ("2026-11-08T05:00:00.000Z" e "2026-11-08T05:00:00Z").
public enum Datas {
    private final class Formatadores: @unchecked Sendable {
        // ISO8601DateFormatter é thread-safe para leitura depois de configurado; o lock é por garantia.
        let lock = NSLock()
        let comFracao: ISO8601DateFormatter = {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return f
        }()
        let semFracao: ISO8601DateFormatter = {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime]
            return f
        }()
    }

    private static let f = Formatadores()

    /// Lê ISO-8601 com ou sem fração. `nil` se não for ISO.
    public static func ler(_ s: String) -> Date? {
        let texto = s.trimmingCharacters(in: .whitespaces)
        f.lock.lock(); defer { f.lock.unlock() }
        if let d = f.comFracao.date(from: texto) { return d }
        if let d = f.semFracao.date(from: texto) { return d }
        // fração com mais de 3 dígitos (ex.: microssegundos do Python) ou ausente: normaliza e tenta de novo
        if let ponto = texto.firstIndex(of: "."), let fim = texto[ponto...].firstIndex(where: { $0 == "Z" || $0 == "+" || $0 == "-" }) {
            let fracao = texto[texto.index(after: ponto)..<fim]
            let tres = String((fracao + "000").prefix(3))
            let normal = String(texto[..<ponto]) + "." + tres + String(texto[fim...])
            if let d = f.comFracao.date(from: normal) { return d }
        }
        return nil
    }

    public static func isoComFracao(_ d: Date) -> String {
        f.lock.lock(); defer { f.lock.unlock() }
        return f.comFracao.string(from: d)
    }

    /// Estratégia do JSONDecoder: string ISO (com/sem fração) ou número (epoch em ms, tolerância).
    public static let estrategia: JSONDecoder.DateDecodingStrategy = .custom { decoder in
        let c = try decoder.singleValueContainer()
        if let s = try? c.decode(String.self) {
            if let d = ler(s) { return d }
            throw DecodingError.dataCorruptedError(in: c, debugDescription: "Data fora do ISO-8601: \(s)")
        }
        if let n = try? c.decode(Double.self) {
            // > 10^11 só pode ser milissegundo (10^11 s é o ano 5138)
            return Date(timeIntervalSince1970: n > 100_000_000_000 ? n / 1000 : n)
        }
        throw DecodingError.dataCorruptedError(in: c, debugDescription: "Data ausente ou de tipo inesperado")
    }
}

public enum JSONHermes {
    public static func decodificador() -> JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = Datas.estrategia
        return d
    }

    public static func codificador() -> JSONEncoder {
        let e = JSONEncoder()
        e.outputFormatting = [.sortedKeys]
        e.dateEncodingStrategy = .custom { data, encoder in
            var c = encoder.singleValueContainer()
            try c.encode(Datas.isoComFracao(data))
        }
        return e
    }
}
