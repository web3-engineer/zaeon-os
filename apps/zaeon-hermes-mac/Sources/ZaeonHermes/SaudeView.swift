import Charts
import HermesCore
import SwiftUI

/// Saúde do chat (`GET /saude?horas=`): serve para VERIFICAR se as correções de experiência funcionaram.
/// Bom = reserva perto de 0, modelo aposentado = 0, p90 do rascunho baixo. Atualiza a cada 30 s.
struct SaudeView: View {
    @Environment(EstadoApp.self) private var estado
    @State private var janela: JanelaSaude = .umDia
    @State private var saude: SaudeChat?
    @State private var erro: String?
    @State private var carregando = false
    @State private var atualizadoEm: Date?

    static let intervalo: Duration = .seconds(30)

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                cabecalho

                if let s = saude {
                    if let erro {
                        Label(erro, systemImage: "exclamationmark.triangle.fill")
                            .font(.callout)
                            .foregroundStyle(.orange)
                    }
                    CartoesSaude(saude: s)
                    LegendaCriterios(criterios: Saude.criterios(s))
                    SerieHoraria(serie: Saude.serie(s), janela: janela)
                    TabelaFases(linhas: Saude.fases(s))
                    HStack(alignment: .top, spacing: 16) {
                        BarrasAlvo(barras: Saude.alvos(s))
                        ListaErros(linhas: Saude.erros(s))
                    }
                    TabelaModelos(modelos: Saude.modelos(s))
                } else if let erro {
                    TelaVazia(titulo: "Não deu para ler a saúde do chat", mensagem: erro, icone: "heart.text.square")
                        .frame(minHeight: 360)
                } else {
                    LazyVGrid(columns: colunasCartoes, spacing: 14) {
                        ForEach(0..<4, id: \.self) { _ in
                            RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color.primary.opacity(0.06)).frame(height: 128)
                        }
                    }
                    EsqueletoCartoes(quantidade: 2, altura: 200)
                }
            }
            .padding(24)
            .frame(maxWidth: 1_280, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Marca.gradienteSuave.opacity(0.25))
        .navigationTitle("Saúde do chat")
        // muda a janela ou o servidor → recomeça o laço (e cancela o anterior)
        .task(id: "\(janela.rawValue)|\(estado.urlServidor)|\(estado.token.count)") { await ciclo() }
    }

    private var colunasCartoes: [GridItem] {
        [GridItem(.adaptive(minimum: 220), spacing: 14)]
    }

    private var cabecalho: some View {
        HStack(alignment: .center, spacing: 14) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Saúde do chat").font(.title2.weight(.semibold))
                Text("Estudos e Pesquisa · Aura e orquestra · TokenLedger por turno")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if carregando {
                ProgressView().controlSize(.small)
            } else if let atualizadoEm {
                Text("atualizado \(Fmt.ha(atualizadoEm)) · a cada 30 s")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Picker("Janela", selection: $janela) {
                ForEach(JanelaSaude.allCases) { j in Text(j.rotulo).tag(j) }
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .frame(width: 180)
        }
    }

    private func ciclo() async {
        while !Task.isCancelled {
            carregando = true
            do {
                let s = try await estado.fonte.saude(horas: janela.horas)
                guard !Task.isCancelled else { return }
                saude = s
                erro = nil
                atualizadoEm = Date()
            } catch {
                guard !Task.isCancelled else { return }
                // falha no refresh não apaga o que já está na tela (a faixa laranja avisa)
                self.erro = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
            carregando = false
            try? await Task.sleep(for: Self.intervalo)
        }
    }
}

// MARK: - Cartões grandes

private struct CartoesSaude: View {
    let saude: SaudeChat

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 14)], spacing: 14) {
            ForEach(Saude.cartoes(saude)) { c in
                CartaoGrande(cartao: c, icone: icone(c.id))
            }
        }
    }

    private func icone(_ id: String) -> String {
        switch id {
        case "falha": "exclamationmark.triangle"
        case "reserva": "arrow.triangle.swap"
        case "aposentado": "archivebox"
        default: "bubble.left.and.bubble.right"
        }
    }
}

private struct CartaoGrande: View {
    let cartao: CartaoMetrica
    let icone: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: icone)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(cartao.tom == .normal ? AnyShapeStyle(Marca.gradiente) : AnyShapeStyle(cartao.tom.cor))
                    .frame(width: 26, height: 26)
                    .background(Circle().fill((cartao.tom == .normal ? Marca.ciano : cartao.tom.cor).opacity(0.14)))
                Text(cartao.titulo).font(.callout.weight(.medium)).foregroundStyle(.secondary)
                Spacer()
                if cartao.tom == .ruim || cartao.tom == .alerta {
                    Image(systemName: "exclamationmark.circle.fill").foregroundStyle(cartao.tom.cor)
                } else if cartao.tom == .bom {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                }
            }
            Text(cartao.valor)
                .font(.system(size: 36, weight: .semibold, design: .rounded).monospacedDigit())
                .foregroundStyle(cartao.tom == .ruim || cartao.tom == .alerta ? AnyShapeStyle(cartao.tom.cor) : AnyShapeStyle(.primary))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(cartao.detalhe ?? " ")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cartao(raio: 16, destaque: cartao.tom == .ruim || cartao.tom == .alerta ? cartao.tom.cor : nil, padding: 16)
    }
}

// MARK: - Legenda: o que é "bom"

private struct LegendaCriterios: View {
    let criterios: [CriterioSaude]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("O que é bom").font(.headline)
            ForEach(criterios) { c in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Image(systemName: c.ok == true ? "checkmark.circle.fill" : (c.ok == false ? "xmark.circle.fill" : "questionmark.circle"))
                        .foregroundStyle(c.ok == true ? Color.green : (c.ok == false ? Color.red : Color.secondary))
                    Text(c.titulo).font(.callout.weight(.semibold))
                    Text(c.detalhe).font(.callout).foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cartao(raio: 14, padding: 14)
    }
}

// MARK: - Série por hora

private struct SerieHoraria: View {
    let serie: [PontoSaude]
    let janela: JanelaSaude

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Por hora").tituloSecao()
                Spacer()
                HStack(spacing: 12) {
                    Chip(cor: Marca.ciano, texto: "chamadas ok")
                    Chip(cor: .red, texto: "falhas")
                    Chip(cor: Marca.azul, texto: "p50")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            if serie.isEmpty {
                Text("Sem chamadas nesta janela.").foregroundStyle(.secondary).frame(maxWidth: .infinity, minHeight: 120)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Chart {
                        ForEach(serie) { p in
                            BarMark(x: .value("Hora", p.hora, unit: .hour),
                                    y: .value("Chamadas", max(0, p.chamadas - p.falhas)))
                                .foregroundStyle(by: .value("Série", "ok"))
                            BarMark(x: .value("Hora", p.hora, unit: .hour),
                                    y: .value("Chamadas", p.falhas))
                                .foregroundStyle(by: .value("Série", "falhas"))
                        }
                    }
                    .chartForegroundStyleScale(["ok": Marca.ciano, "falhas": Color.red])
                    .chartLegend(.hidden)
                    .chartXAxis { eixoX }
                    .frame(height: 190)

                    Text("p50 (s)").font(.caption2).foregroundStyle(.secondary)
                    Chart {
                        ForEach(serie.filter { $0.msP50 != nil }) { p in
                            LineMark(x: .value("Hora", p.hora, unit: .hour),
                                     y: .value("p50 (s)", (p.msP50 ?? 0) / 1_000))
                                .interpolationMethod(.monotone)
                                .foregroundStyle(Marca.azul)
                            PointMark(x: .value("Hora", p.hora, unit: .hour),
                                      y: .value("p50 (s)", (p.msP50 ?? 0) / 1_000))
                                .symbolSize(janela == .semana ? 6 : 18)
                                .foregroundStyle(Marca.azul)
                        }
                    }
                    .chartXAxis { eixoX }
                    .frame(height: 100)
                }
                .cartao(raio: 14, padding: 16)
            }
        }
    }

    @AxisContentBuilder
    private var eixoX: some AxisContent {
        AxisMarks(values: .automatic(desiredCount: janela == .semana ? 7 : 8)) { _ in
            AxisGridLine()
            AxisValueLabel(format: janela == .semana
                           ? Date.FormatStyle().weekday(.abbreviated).hour()
                           : Date.FormatStyle().hour())
        }
    }
}

private struct Chip: View {
    let cor: Color
    let texto: String
    var body: some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 2).fill(cor).frame(width: 10, height: 10)
            Text(texto)
        }
    }
}

// MARK: - Fases

private struct TabelaFases: View {
    let linhas: [LinhaFaseSaude]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Por fase").tituloSecao()
            if linhas.isEmpty {
                Text("Sem fases nesta janela.").foregroundStyle(.secondary)
            } else {
                Grid(alignment: .leading, horizontalSpacing: 24, verticalSpacing: 9) {
                    GridRow {
                        Text("Fase")
                        Text("Chamadas").gridColumnAlignment(.trailing)
                        Text("Falhas").gridColumnAlignment(.trailing)
                        Text("Taxa").gridColumnAlignment(.trailing)
                        Text("p50").gridColumnAlignment(.trailing)
                        Text("p90").gridColumnAlignment(.trailing)
                    }
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    Divider().gridCellUnsizedAxes(.horizontal)
                    ForEach(linhas) { l in
                        GridRow {
                            HStack(spacing: 6) {
                                Text(l.fase.rotulo).font(.callout.weight(.medium))
                                Text(l.fase.bruto).font(.caption.monospaced()).foregroundStyle(.tertiary)
                            }
                            Text(l.chamadas).monospacedDigit()
                            Text(l.falhas).monospacedDigit()
                            Text(l.taxa).monospacedDigit().foregroundStyle(cor(l.tomTaxa))
                            Text(l.p50).monospacedDigit()
                            Text(l.p90).monospacedDigit().fontWeight(l.fase == .draft ? .semibold : .regular)
                                .foregroundStyle(cor(l.tomP90))
                                .help(l.fase == .draft ? "Meta: p90 do rascunho ≤ 12 s" : "")
                        }
                        .font(.callout)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .cartao(raio: 14, padding: 16)
            }
        }
    }

    private func cor(_ t: Tom) -> Color {
        switch t {
        case .normal: .primary
        case .bom: .primary
        case .alerta: .orange
        case .ruim: .red
        }
    }
}

// MARK: - Alvos e erros

private struct BarrasAlvo: View {
    let barras: [BarraAlvo]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Por alvo").tituloSecao()
            VStack(alignment: .leading, spacing: 12) {
                if barras.isEmpty { Text("Sem chamadas.").foregroundStyle(.secondary) }
                ForEach(barras) { b in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(b.rotulo).font(.callout.weight(.medium))
                            Spacer()
                            Text("\(Fmt.inteiro(b.chamadas)) · \(Saude.pct1(b.fracao))")
                                .font(.callout.monospacedDigit())
                                .foregroundStyle(.secondary)
                        }
                        ProgressView(value: min(max(b.fracao, 0), 1))
                            .progressViewStyle(.linear)
                            .tint(b.alvo == .vertex ? Marca.ciano : (b.alvo == .huggingface ? Color.orange : Color.gray))
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .cartao(raio: 14, padding: 16)
        }
        .frame(maxWidth: .infinity, alignment: .top)
    }
}

private struct ListaErros: View {
    let linhas: [LinhaErroSaude]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Erros por classe").tituloSecao()
            VStack(alignment: .leading, spacing: 10) {
                if linhas.isEmpty {
                    Label("Nenhum erro nesta janela.", systemImage: "checkmark.circle.fill").foregroundStyle(.green)
                }
                ForEach(linhas) { l in
                    HStack(spacing: 10) {
                        Image(systemName: icone(l.classe))
                            .foregroundStyle(l.tom == .ruim ? Color.red : Color.orange)
                            .frame(width: 18)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(l.classe.rotulo).font(.callout.weight(.medium))
                            Text(l.classe.bruto).font(.caption.monospaced()).foregroundStyle(.tertiary)
                        }
                        Spacer()
                        Text(Fmt.inteiro(l.n))
                            .font(.title3.weight(.semibold).monospacedDigit())
                            .foregroundStyle(l.tom == .ruim ? AnyShapeStyle(Color.red) : AnyShapeStyle(.primary))
                        Text(Saude.pct1(l.fracao))
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.secondary)
                            .frame(width: 48, alignment: .trailing)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .cartao(raio: 14, padding: 16)
        }
        .frame(maxWidth: .infinity, alignment: .top)
    }

    private func icone(_ c: ClasseErroChat) -> String {
        switch c {
        case .rateLimit: "speedometer"
        case .timeout: "hourglass"
        case .modeloInexistente: "archivebox.fill"
        case .desconhecido: "exclamationmark.triangle"
        }
    }
}

// MARK: - Modelos

private struct TabelaModelos: View {
    let modelos: [ModeloSaude]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Por modelo").tituloSecao()
            if modelos.isEmpty {
                Text("Sem chamadas.").foregroundStyle(.secondary)
            } else {
                Grid(alignment: .leading, horizontalSpacing: 24, verticalSpacing: 9) {
                    GridRow {
                        Text("Modelo")
                        Text("Chamadas").gridColumnAlignment(.trailing)
                        Text("Falhas").gridColumnAlignment(.trailing)
                        Text("Taxa de falha").gridColumnAlignment(.trailing)
                        Text("")
                    }
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    Divider().gridCellUnsizedAxes(.horizontal)
                    ForEach(modelos) { m in
                        let tom = Saude.tomFalha(m.taxaFalha)
                        GridRow {
                            Text(m.model).font(.callout.monospaced()).lineLimit(1).truncationMode(.middle)
                            Text(Fmt.inteiro(m.chamadas)).monospacedDigit()
                            Text(Fmt.inteiro(m.falhas)).monospacedDigit()
                            Text(Saude.pct1(m.taxaFalha))
                                .monospacedDigit()
                                .fontWeight(tom == .ruim ? .semibold : .regular)
                                .foregroundStyle(tom == .ruim ? Color.red : (tom == .alerta ? Color.orange : Color.primary))
                            ProgressView(value: min(max(m.taxaFalha ?? 0, 0), 1))
                                .progressViewStyle(.linear)
                                .tint(tom == .ruim ? Color.red : (tom == .alerta ? Color.orange : Color.green))
                                .frame(width: 120)
                        }
                        .font(.callout)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .cartao(raio: 14, padding: 16)
            }
        }
    }
}
