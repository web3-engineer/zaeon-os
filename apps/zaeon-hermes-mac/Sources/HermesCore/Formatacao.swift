import Foundation

/// Formatação pt-BR determinística (sem depender do locale da máquina, para os testes baterem).
public enum Fmt {
    public static let vazio = "—"

    /// Decimal com vírgula: `decimal(1234.5, casas: 1)` → "1.234,5".
    public static func decimal(_ v: Double, casas: Int = 1) -> String {
        let s = String(format: "%.\(max(0, casas))f", abs(v))
        let partes = s.split(separator: ".", maxSplits: 1).map(String.init)
        let inteiro = milhar(partes[0])
        let sinal = v < 0 && s.contains(where: { $0 != "0" && $0 != "." }) ? "-" : ""
        return sinal + (partes.count > 1 ? "\(inteiro),\(partes[1])" : inteiro)
    }

    /// Inteiro com ponto de milhar: 56789 → "56.789".
    public static func inteiro(_ v: Int?) -> String {
        guard let v else { return vazio }
        return (v < 0 ? "-" : "") + milhar(String(abs(v)))
    }

    private static func milhar(_ digitos: String) -> String {
        var saida = ""
        for (i, ch) in digitos.reversed().enumerated() {
            if i > 0 && i % 3 == 0 { saida.append(".") }
            saida.append(ch)
        }
        return String(saida.reversed())
    }

    /// Duração: 850 → "850 ms"; 12_345 → "12,3 s"; 125_000 → "2 min 05 s"; 3_725_000 → "1 h 02 min".
    public static func ms(_ v: Double?) -> String {
        guard let v, v.isFinite, v >= 0 else { return vazio }
        if v < 1_000 { return "\(Int(v.rounded())) ms" }
        let s = v / 1_000
        if s < 60 { return "\(decimal(s, casas: 1)) s" }
        let total = Int(s.rounded())
        if total < 3_600 { return String(format: "%d min %02d s", total / 60, total % 60) }
        return String(format: "%d h %02d min", total / 3_600, (total % 3_600) / 60)
    }

    /// Dinheiro em USD estimado: 0.42 → "US$ 0,42"; 0.0031 → "US$ 0,0031"; 1234.5 → "US$ 1.234,50".
    public static func usd(_ v: Double?) -> String {
        guard let v, v.isFinite else { return vazio }
        if v != 0 && abs(v) < 0.01 { return "US$ \(decimal(v, casas: 4))" }
        return "US$ \(decimal(v, casas: 2))"
    }

    /// Fração 0…1 → "83%". Valor > 1 é tratado como já em porcentagem.
    public static func pct(_ v: Double?) -> String {
        guard let v, v.isFinite else { return vazio }
        let p = v > 1 ? v : v * 100
        return "\(Int(p.rounded()))%"
    }

    /// Tokens: 1_234 → "1.234"; 1_234_567 → "1,2 mi".
    public static func tokens(_ v: Int) -> String {
        v >= 1_000_000 ? "\(decimal(Double(v) / 1_000_000, casas: 1)) mi" : inteiro(v)
    }

    /// Preço por milhão de tokens: 0.95 → "US$ 0,95/M".
    public static func precoPorMilhao(_ v: Double?) -> String {
        guard let v else { return vazio }
        return "US$ \(decimal(v, casas: 2))/M"
    }

    /// Tempo relativo à tarefa: 0 → "+0,0 s"; 12_345 → "+12,3 s"; 125_000 → "+2 min 05 s".
    public static func relativoTarefa(_ t: Double) -> String {
        let v = max(0, t)
        if v < 60_000 { return "+\(decimal(v / 1_000, casas: 1)) s" }
        return "+" + ms(v)
    }

    /// "há 12 s", "há 3 min", "há 2 h", "há 4 dias"; no futuro (relógio adiantado) → "agora".
    public static func ha(_ data: Date, agora: Date = Date()) -> String {
        let s = agora.timeIntervalSince(data)
        if s < 5 { return "agora" }
        if s < 60 { return "há \(Int(s)) s" }
        if s < 3_600 { return "há \(Int(s / 60)) min" }
        if s < 86_400 { return "há \(Int(s / 3_600)) h" }
        let d = Int(s / 86_400)
        return d == 1 ? "há 1 dia" : "há \(d) dias"
    }

    /// Intent do contrato em texto: "criar_trabalho" → "criar trabalho".
    public static func intent(_ s: String) -> String {
        if let i = IntentArena(rawValue: s) { return i.rotulo.lowercased() }
        return s.replacingOccurrences(of: "_", with: " ")
    }
}
