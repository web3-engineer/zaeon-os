import Foundation

/// Um cartão de métrica do dashboard do motor.
public struct CartaoMetrica: Hashable, Sendable, Identifiable {
    public var id: String
    public var titulo: String
    public var valor: String
    public var detalhe: String?
    public var tom: Tom

    public init(id: String, titulo: String, valor: String, detalhe: String? = nil, tom: Tom = .normal) {
        self.id = id; self.titulo = titulo; self.valor = valor; self.detalhe = detalhe; self.tom = tom
    }
}

/// Ponto do gráfico de barras das últimas tarefas.
public struct PontoGrafico: Hashable, Sendable, Identifiable {
    public var id: String
    /// Rótulo curto do eixo X ("#1", "#2", … da mais antiga para a mais nova).
    public var rotulo: String
    public var segundos: Double
    public var custoUsd: Double
    public var status: StatusTarefa
}

public enum Estatisticas {
    /// Os cartões do dashboard, na ordem da tela.
    public static func cartoes(_ m: MetricasMotor) -> [CartaoMetrica] {
        let taxa: (Int) -> String? = { n in m.tarefas > 0 ? Fmt.pct(Double(n) / Double(m.tarefas)) + " do total" : nil }
        return [
            CartaoMetrica(id: "tarefas", titulo: "Tarefas", valor: Fmt.inteiro(m.tarefas)),
            CartaoMetrica(id: "concluidas", titulo: "Concluídas", valor: Fmt.inteiro(m.concluidas), detalhe: taxa(m.concluidas),
                          tom: m.tarefas > 0 && m.concluidas == m.tarefas ? .bom : .normal),
            CartaoMetrica(id: "fallbacks", titulo: "Fallbacks", valor: Fmt.inteiro(m.fallbacks), detalhe: taxa(m.fallbacks),
                          tom: m.fallbacks > 0 ? .alerta : .normal),
            CartaoMetrica(id: "degradadas", titulo: "Degradadas", valor: Fmt.inteiro(m.degradadas), detalhe: taxa(m.degradadas),
                          tom: m.degradadas > 0 ? .alerta : .normal),
            CartaoMetrica(id: "p50", titulo: "Tempo p50", valor: Fmt.ms(m.msP50)),
            CartaoMetrica(id: "p90", titulo: "Tempo p90", valor: Fmt.ms(m.msP90)),
            CartaoMetrica(id: "custoMedio", titulo: "Custo médio", valor: Fmt.usd(m.custoMedioUsd)),
            CartaoMetrica(id: "custoTotal", titulo: "Custo total", valor: Fmt.usd(m.custoTotalUsd)),
            CartaoMetrica(id: "invalidas", titulo: "Citações inventadas", valor: Fmt.inteiro(m.citacoesInventadas),
                          tom: m.citacoesInventadas > 0 ? .ruim : .bom),
            CartaoMetrica(id: "cobertura", titulo: "Cobertura média", valor: Fmt.pct(m.coberturaMedia),
                          tom: Apresentacao.tomCobertura(m.coberturaMedia)),
            CartaoMetrica(id: "subagentes", titulo: "Subagentes (média)",
                          valor: m.subagentesMedia.map { Fmt.decimal($0, casas: 1) } ?? Fmt.vazio),
        ]
    }

    /// Recalcula as métricas a partir de uma lista de tarefas (para comparar na arena ou quando o
    /// servidor não mandou `metricas`). Tarefas rodando contam em `tarefas` mas não nas médias.
    public static func calcular(_ tarefas: [ResumoTarefa]) -> MetricasMotor {
        let fechadas = tarefas.filter { !$0.estaRodando }
        let tempos = fechadas.compactMap(\.ms).sorted()
        let custos = fechadas.compactMap(\.custoUsd)
        let coberturas = fechadas.compactMap(\.cobertura)
        let subs = fechadas.compactMap(\.subagentes).map(Double.init)
        return MetricasMotor(
            tarefas: tarefas.count,
            concluidas: tarefas.filter { $0.status == .concluida }.count,
            fallbacks: tarefas.filter { $0.status == .fallback }.count,
            degradadas: tarefas.filter { $0.degradado == true }.count,
            msP50: percentil(tempos, 0.5),
            msP90: percentil(tempos, 0.9),
            custoMedioUsd: media(custos),
            custoTotalUsd: custos.isEmpty ? nil : custos.reduce(0, +),
            citacoesInventadas: fechadas.compactMap(\.invalidas).reduce(0, +),
            coberturaMedia: media(coberturas),
            subagentesMedia: media(subs)
        )
    }

    /// Percentil por "nearest rank" (o valor existe na amostra; p50 de [1,2,3,4] = 2).
    public static func percentil(_ ordenados: [Double], _ p: Double) -> Double? {
        guard !ordenados.isEmpty else { return nil }
        let rank = Int((p * Double(ordenados.count)).rounded(.up))
        return ordenados[min(max(rank, 1), ordenados.count) - 1]
    }

    public static func media(_ v: [Double]) -> Double? {
        v.isEmpty ? nil : v.reduce(0, +) / Double(v.count)
    }

    /// As últimas `limite` tarefas fechadas, da mais antiga para a mais nova (leitura natural do gráfico).
    public static func pontosGrafico(_ tarefas: [ResumoTarefa], limite: Int = 20) -> [PontoGrafico] {
        let ultimas = tarefas.filter { !$0.estaRodando }.sorted { $0.criadaEm > $1.criadaEm }.prefix(limite).reversed()
        return ultimas.enumerated().map { i, t in
            PontoGrafico(id: t.id, rotulo: "#\(i + 1)", segundos: (t.ms ?? 0) / 1_000, custoUsd: t.custoUsd ?? 0, status: t.status)
        }
    }
}

/// Linha de comparação da arena (uma por tarefa disparada).
public struct LinhaArena: Hashable, Sendable, Identifiable {
    public var id: String
    public var motor: String
    public var nomeMotor: String
    public var status: StatusTarefa
    public var ms: String
    public var custo: String
    public var subagentes: String
    public var evidencias: String
    public var invalidas: String
    public var cobertura: String
    /// Melhor da rodada nesta métrica (só entre as concluídas).
    public var maisRapida: Bool
    public var maisBarata: Bool
    public var maiorCobertura: Bool
}

public enum Arena {
    public static func comparar(_ tarefas: [ResumoTarefa]) -> [LinhaArena] {
        let ok = tarefas.filter { $0.status == .concluida }
        let rapida = ok.compactMap { t in t.ms.map { (t.id, $0) } }.min { $0.1 < $1.1 }?.0
        let barata = ok.compactMap { t in t.custoUsd.map { (t.id, $0) } }.min { $0.1 < $1.1 }?.0
        let cobre = ok.compactMap { t in t.cobertura.map { (t.id, $0) } }.max { $0.1 < $1.1 }?.0
        let varias = ok.count > 1
        return tarefas.map { t in
            LinhaArena(id: t.id, motor: t.motor, nomeMotor: t.nomeMotor, status: t.status, ms: Fmt.ms(t.ms), custo: Fmt.usd(t.custoUsd),
                       subagentes: t.subagentes.map(String.init) ?? Fmt.vazio, evidencias: t.evidencias.map(String.init) ?? Fmt.vazio,
                       invalidas: t.invalidas.map(String.init) ?? Fmt.vazio, cobertura: Fmt.pct(t.cobertura),
                       maisRapida: varias && t.id == rapida, maisBarata: varias && t.id == barata, maiorCobertura: varias && t.id == cobre)
        }
    }

    /// Ainda há tarefa da rodada sem terminar?
    public static func algumaRodando(_ tarefas: [ResumoTarefa]) -> Bool {
        tarefas.contains(where: \.estaRodando)
    }
}
