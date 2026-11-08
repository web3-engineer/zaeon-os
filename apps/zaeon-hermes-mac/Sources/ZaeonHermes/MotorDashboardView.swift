import Charts
import HermesCore
import SwiftUI

/// O dashboard de um motor: tudo o que ele tem (modelos, rotas, preços, ferramentas, datasets, prompt)
/// e tudo o que ele faz (métricas, gráfico e últimas tarefas).
struct MotorDashboardView: View {
    let motorId: String
    @Environment(EstadoApp.self) private var estado
    @State private var tarefas: [ResumoTarefa]?
    @State private var erroTarefas: String?

    var body: some View {
        Group {
            if let m = estado.motor(motorId) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        Cabecalho(motor: m)
                        SecaoMetricas(metricas: m.metricas)
                        SecaoGrafico(tarefas: tarefas ?? tarefasDoPainel)
                        SecaoModelos(modelos: m.modelos)
                        HStack(alignment: .top, spacing: 16) {
                            SecaoFerramentas(nomes: m.ferramentas)
                            SecaoDatasets(ids: m.datasets)
                        }
                        SecaoPrompt(prompt: m.prompt)
                        SecaoUltimasTarefas(tarefas: tarefas ?? tarefasDoPainel, carregando: tarefas == nil && tarefasDoPainel.isEmpty,
                                            erro: erroTarefas)
                    }
                    .padding(24)
                    .frame(maxWidth: 1_200, alignment: .leading)
                }
                .navigationTitle(m.nome)
            } else if estado.painel == nil {
                ScrollView { EsqueletoCartoes(quantidade: 4, altura: 120).padding(24) }
            } else {
                TelaVazia(titulo: "Motor não encontrado", mensagem: "O motor \(motorId) não está mais no painel.", icone: "cpu")
            }
        }
        .task(id: motorId) { await carregar() }
    }

    private var tarefasDoPainel: [ResumoTarefa] {
        (estado.painel?.tarefas ?? []).filter { $0.motor == motorId }
    }

    /// As últimas tarefas vêm do `/tarefas?motor=` (o painel só traz as 50 mais recentes de todos).
    private func carregar() async {
        tarefas = nil
        erroTarefas = nil
        do {
            tarefas = try await estado.fonte.tarefas(motor: motorId, status: nil, limite: 50)
        } catch {
            erroTarefas = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

private struct Cabecalho: View {
    let motor: MotorPainel

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(LinearGradient(colors: [motor.origem.cor, Marca.azul], startPoint: .topLeading, endPoint: .bottomTrailing))
                Image(systemName: icone).font(.system(size: 24, weight: .semibold)).foregroundStyle(.white)
            }
            .frame(width: 54, height: 54)
            .shadow(color: motor.origem.cor.opacity(0.35), radius: 8, y: 3)

            VStack(alignment: .leading, spacing: 6) {
                Text(motor.nome).font(.title2.weight(.semibold))
                HStack(spacing: 6) {
                    Pilula(texto: motor.id, cor: .secondary, icone: "number")
                    Pilula(texto: motor.origem.rotulo, cor: motor.origem.cor, icone: "building.2")
                    Pilula(texto: motor.formato.rotulo, cor: Marca.azul, icone: icone)
                    Pilula(texto: motor.disponivel ? "disponível" : "indisponível", cor: motor.disponivel ? .green : .red,
                           icone: motor.disponivel ? "checkmark.circle" : "xmark.circle")
                }
                if !motor.descricao.isEmpty {
                    Text(motor.descricao).font(.callout).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer()
        }
    }

    private var icone: String {
        switch motor.formato {
        case .unico: "sparkle"
        case .profundo: "brain.head.profile"
        case .enxame: "square.stack.3d.up.fill"
        case .desconhecido: "cpu"
        }
    }
}

private struct SecaoMetricas: View {
    let metricas: MetricasMotor

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Métricas").tituloSecao()
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 150, maximum: 260), spacing: 12)], spacing: 12) {
                ForEach(Estatisticas.cartoes(metricas)) { c in
                    CartaoMetricaView(cartao: c)
                }
            }
        }
    }
}

struct CartaoMetricaView: View {
    let cartao: CartaoMetrica

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(cartao.titulo).font(.caption.weight(.medium)).foregroundStyle(.secondary)
            Text(cartao.valor)
                .font(.title2.weight(.semibold).monospacedDigit())
                .foregroundStyle(cartao.tom == .normal ? AnyShapeStyle(.primary) : AnyShapeStyle(cartao.tom.cor))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(cartao.detalhe ?? " ").font(.caption2).foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cartao(padding: 12)
    }
}

private enum MetricaGrafico: String, CaseIterable, Identifiable {
    case duracao = "Duração (s)"
    case custo = "Custo (US$)"
    var id: String { rawValue }
}

private struct SecaoGrafico: View {
    let tarefas: [ResumoTarefa]
    @State private var metrica: MetricaGrafico = .duracao

    var body: some View {
        let pontos = Estatisticas.pontosGrafico(tarefas, limite: 20)
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Últimas tarefas").tituloSecao()
                Spacer()
                Picker("Métrica", selection: $metrica) {
                    ForEach(MetricaGrafico.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .frame(width: 240)
            }
            if pontos.isEmpty {
                Text("Nenhuma tarefa terminada ainda.").font(.callout).foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 120).cartao()
            } else {
                Chart(pontos) { p in
                    BarMark(
                        x: .value("Tarefa", p.rotulo),
                        y: .value(metrica.rawValue, metrica == .duracao ? p.segundos : p.custoUsd)
                    )
                    .foregroundStyle(p.status == .concluida ? AnyShapeStyle(Marca.gradiente) : AnyShapeStyle(p.status.cor))
                    .cornerRadius(4)
                }
                .frame(height: 200)
                .cartao(padding: 16)
                HStack(spacing: 14) {
                    Legenda(cor: Marca.ciano, texto: "concluída")
                    Legenda(cor: .orange, texto: "fallback")
                    Legenda(cor: .red, texto: "falhou")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        }
    }
}

private struct Legenda: View {
    let cor: Color
    let texto: String
    var body: some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 2).fill(cor).frame(width: 10, height: 10)
            Text(texto)
        }
    }
}

private struct SecaoModelos: View {
    let modelos: [ModeloMotor]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Modelos e rotas").tituloSecao()
            if modelos.isEmpty {
                Text("Nenhum modelo informado.").foregroundStyle(.secondary)
            }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 320), spacing: 12, alignment: .top)], spacing: 12) {
                ForEach(modelos) { m in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(m.nome).font(.headline)
                            Spacer()
                            if let f = m.familia { Pilula(texto: f, cor: .secondary) }
                        }
                        Text(m.id).font(.caption.monospaced()).foregroundStyle(.secondary)
                        if let p = m.preco {
                            HStack(spacing: 12) {
                                Preco(rotulo: "prompt", valor: p.prompt)
                                Preco(rotulo: "completion", valor: p.completion)
                                Preco(rotulo: "cached", valor: p.cached)
                            }
                        }
                        Divider()
                        ForEach(m.rotas) { r in
                            HStack(spacing: 8) {
                                Image(systemName: r.configurado ? "checkmark.circle.fill" : "xmark.circle.fill")
                                    .foregroundStyle(r.configurado ? .green : .red)
                                    .help(r.configurado ? "Chave configurada no servidor" : "Sem chave no servidor")
                                Text(r.provedor).font(.callout.weight(.medium))
                                Text(r.modelo).font(.caption.monospaced()).foregroundStyle(.secondary).lineLimit(1).truncationMode(.middle)
                                Spacer()
                            }
                        }
                        if m.rotas.isEmpty { Text("Sem rotas").font(.caption).foregroundStyle(.secondary) }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .cartao()
                }
            }
        }
    }
}

private struct Preco: View {
    let rotulo: String
    let valor: Double?
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(rotulo).font(.caption2).foregroundStyle(.secondary)
            Text(Fmt.precoPorMilhao(valor)).font(.caption.weight(.medium).monospacedDigit())
        }
    }
}

private struct SecaoFerramentas: View {
    let nomes: [String]
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Ferramentas").tituloSecao()
            VStack(alignment: .leading, spacing: 8) {
                if nomes.isEmpty { Text("Nenhuma").foregroundStyle(.secondary) }
                ForEach(nomes, id: \.self) { n in
                    let f = estado.painel?.ferramentas.first { $0.nome == n }
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "wrench.and.screwdriver").foregroundStyle(Marca.ciano).frame(width: 18)
                        VStack(alignment: .leading, spacing: 1) {
                            HStack(spacing: 6) {
                                Text(n).font(.callout.monospaced())
                                if let r = f?.risco { Pilula(texto: r, cor: r == "read" ? .green : .orange) }
                            }
                            if let d = f?.descricao, !d.isEmpty { Text(d).font(.caption).foregroundStyle(.secondary) }
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .cartao()
        }
        .frame(maxWidth: .infinity, alignment: .top)
    }
}

private struct SecaoDatasets: View {
    let ids: [String]
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Datasets").tituloSecao()
            VStack(alignment: .leading, spacing: 8) {
                if ids.isEmpty { Text("Nenhum").foregroundStyle(.secondary) }
                ForEach(ids, id: \.self) { id in
                    let d = estado.painel?.datasets.first { $0.id == id }
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "cylinder.split.1x2")
                            .foregroundStyle(d?.conectado == true ? Color.green : Color.secondary)
                            .frame(width: 18)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(d?.nome ?? id).font(.callout)
                            Text(d.map { "\($0.tipo.rotulo) · \(Fmt.inteiro($0.trechos)) trechos" } ?? id)
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .cartao()
        }
        .frame(maxWidth: .infinity, alignment: .top)
    }
}

private struct SecaoPrompt: View {
    let prompt: String
    @State private var copiado = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("System prompt").tituloSecao()
                Text("renderizado para uma tarefa de exemplo").font(.caption).foregroundStyle(.secondary)
                Spacer()
                Button {
                    copiar(prompt)
                    copiado = true
                    Task {
                        try? await Task.sleep(for: .seconds(1.5))
                        copiado = false
                    }
                } label: {
                    Label(copiado ? "Copiado" : "Copiar", systemImage: copiado ? "checkmark" : "doc.on.doc")
                }
                .disabled(prompt.isEmpty)
            }
            ScrollView {
                Text(prompt.isEmpty ? "(vazio)" : prompt)
                    .font(.system(.callout, design: .monospaced))
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
            }
            .frame(minHeight: 160, maxHeight: 300)
            .background(Color.black.opacity(0.18), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.primary.opacity(0.08)))
        }
    }
}

private struct SecaoUltimasTarefas: View {
    let tarefas: [ResumoTarefa]
    let carregando: Bool
    let erro: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Tarefas deste motor").tituloSecao()
                if let erro {
                    Label(erro, systemImage: "exclamationmark.triangle").font(.caption).foregroundStyle(.orange).lineLimit(1)
                }
            }
            if carregando {
                EsqueletoCartoes(quantidade: 3, altura: 44)
            } else if tarefas.isEmpty {
                Text("Nenhuma tarefa ainda.").foregroundStyle(.secondary)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(tarefas.prefix(20).enumerated()), id: \.element.id) { i, t in
                        NavigationLink(value: RotaTarefa(id: t.id)) {
                            LinhaTarefa(tarefa: t)
                        }
                        .buttonStyle(.plain)
                        if i < min(tarefas.count, 20) - 1 { Divider().padding(.leading, 34) }
                    }
                }
                .cartao(padding: 4)
            }
        }
    }
}

/// Linha compacta de tarefa (dashboard do motor).
struct LinhaTarefa: View {
    let tarefa: ResumoTarefa

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: tarefa.status.icone).foregroundStyle(tarefa.status.cor).frame(width: 20)
            VStack(alignment: .leading, spacing: 2) {
                Text(tarefa.objetivo).lineLimit(1)
                Text("\(Fmt.intent(tarefa.intent)) · \(tarefa.origem.bruto) · \(Fmt.ha(tarefa.criadaEm))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(Fmt.ms(tarefa.ms)).font(.caption.monospacedDigit()).foregroundStyle(.secondary).frame(width: 80, alignment: .trailing)
            Text(Fmt.usd(tarefa.custoUsd)).font(.caption.monospacedDigit()).frame(width: 90, alignment: .trailing)
            Text((tarefa.invalidas ?? 0) > 0 ? "\(tarefa.invalidas!) inv." : "")
                .font(.caption.monospacedDigit()).foregroundStyle(.red).frame(width: 44, alignment: .trailing)
            Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }
}
