import HermesCore
import SwiftUI

/// O quadro (kanban): cada tarefa da orquestra é um cartão; a faixa é o motor.
struct QuadroView: View {
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        @Bindable var estado = estado
        let tarefas = estado.painel?.tarefas ?? []
        let colunas = Quadro.colunas(tarefas, filtro: estado.filtro)

        VStack(spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                CabecalhoTela(titulo: "Quadro",
                              subtitulo: estado.painel.map { "\($0.tarefas.count) tarefas recentes · \($0.motores.count) motores" })
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)

            BarraFiltros(filtro: $estado.filtro, tarefas: tarefas)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)

            ScrollView(.horizontal) {
                HStack(alignment: .top, spacing: 14) {
                    ForEach(colunas) { c in
                        ColunaView(coluna: c, carregando: estado.painel == nil)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 16)
                .frame(maxHeight: .infinity, alignment: .top)
            }
        }
        .background(Marca.gradienteSuave.opacity(0.35))
        .navigationTitle("Quadro")
    }
}

private struct BarraFiltros: View {
    @Binding var filtro: FiltroTarefas
    let tarefas: [ResumoTarefa]
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        HStack(spacing: 12) {
            Picker(selection: $filtro.motor) {
                Text("Todos os motores").tag(String?.none)
                Divider()
                ForEach(opcoesMotor) { m in
                    Text(m.nome).tag(String?.some(m.id))
                }
            } label: {
                Label("Motor", systemImage: "cpu")
            }
            .frame(maxWidth: 260)

            Picker("Origem", selection: $filtro.origem) {
                Text("Tudo").tag(OrigemTarefa?.none)
                Text("Chat").tag(OrigemTarefa?.some(.chat))
                Text("Arena").tag(OrigemTarefa?.some(.arena))
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .frame(width: 200)

            Picker("Ordem", selection: $filtro.ordem) {
                ForEach(OrdemTarefas.allCases) { o in Text(o.rotulo).tag(o) }
            }
            .frame(maxWidth: 240)

            TextField("Buscar objetivo, intent, id…", text: $filtro.busca)
                .textFieldStyle(.roundedBorder)
                .frame(minWidth: 180, maxWidth: 320)

            if filtro != FiltroTarefas() {
                Button("Limpar") { filtro = FiltroTarefas() }
                    .buttonStyle(.link)
            }
            Spacer()
        }
        .controlSize(.regular)
    }

    /// Motores do painel + os que só aparecem nas tarefas (motor removido, http:…).
    private var opcoesMotor: [OpcaoMotor] {
        var lista = (estado.painel?.motores ?? []).map { OpcaoMotor(id: $0.id, nome: $0.nome) }
        for m in Quadro.motoresPresentes(tarefas) where !lista.contains(where: { $0.id == m.id }) {
            lista.append(OpcaoMotor(id: m.id, nome: m.nome))
        }
        return lista
    }
}

private struct OpcaoMotor: Identifiable {
    let id: String
    let nome: String
}

private struct ColunaView: View {
    let coluna: ColunaQuadro
    let carregando: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: coluna.coluna.icone).foregroundStyle(coluna.coluna.cor)
                Text(coluna.titulo).font(.headline)
                Spacer()
                Text("\(coluna.tarefas.count)")
                    .font(.caption.weight(.semibold).monospacedDigit())
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(Capsule().fill(coluna.coluna.cor.opacity(0.15)))
                    .foregroundStyle(coluna.coluna.cor)
            }
            .padding(.horizontal, 4)

            ScrollView(.vertical) {
                LazyVStack(spacing: 10) {
                    if carregando {
                        EsqueletoCartoes(quantidade: 2, altura: 110)
                    } else if coluna.tarefas.isEmpty {
                        Text("Nenhuma tarefa")
                            .font(.callout)
                            .foregroundStyle(.tertiary)
                            .frame(maxWidth: .infinity, minHeight: 80)
                            .background(RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                                .foregroundStyle(.quaternary))
                    }
                    ForEach(coluna.tarefas) { t in
                        NavigationLink(value: RotaTarefa(id: t.id)) {
                            CartaoTarefaView(tarefa: t)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(4)
            }
            .scrollIndicators(.never)
        }
        .padding(10)
        .frame(width: 310)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

/// O cartão de uma tarefa no quadro.
struct CartaoTarefaView: View {
    let tarefa: ResumoTarefa
    @Environment(EstadoApp.self) private var estado
    @State private var sobre = false

    var body: some View {
        let a = ApresentacaoCartao(tarefa)
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                SeloMotor(nome: tarefa.nomeMotor, origem: estado.motor(tarefa.motor)?.origem)
                if tarefa.origem == .arena {
                    Pilula(texto: "arena", cor: Marca.azul, icone: "flag.2.crossed")
                }
                Spacer(minLength: 0)
                Text(Fmt.ha(tarefa.criadaEm))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Text(a.intent.prefix(1).uppercased() + a.intent.dropFirst())
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)

            Text(tarefa.objetivo)
                .font(.callout)
                .lineLimit(3)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)

            if tarefa.estaRodando {
                HStack(spacing: 6) {
                    ProgressView().controlSize(.small)
                    Text("rodando há \(Fmt.ms(max(0, Date().timeIntervalSince(tarefa.criadaEm) * 1_000)))")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
            } else {
                Grid(alignment: .leading, horizontalSpacing: 12, verticalSpacing: 4) {
                    GridRow {
                        Metrica(icone: "timer", texto: a.ms)
                        Metrica(icone: "dollarsign.circle", texto: a.custo)
                    }
                    GridRow {
                        Metrica(icone: "quote.bubble", texto: a.invalidas, cor: a.tomInvalidas.cor)
                            .help("Citações inventadas: chaves [E#] que nenhuma ferramenta devolveu (cortadas pelo portão)")
                        Metrica(icone: "text.badge.checkmark", texto: "cobertura \(a.cobertura)", cor: a.tomCobertura.cor)
                    }
                    if let s = a.subagentes {
                        GridRow {
                            Metrica(icone: "person.2", texto: s)
                            if tarefa.degradado == true {
                                Metrica(icone: "exclamationmark.triangle", texto: "degradada", cor: .orange)
                            }
                        }
                    } else if tarefa.degradado == true {
                        GridRow { Metrica(icone: "exclamationmark.triangle", texto: "degradada", cor: .orange) }
                    }
                }
            }
        }
        .cartao(destaque: sobre ? Marca.ciano : nil)
        .overlay(alignment: .leading) {
            UnevenRoundedRectangle(topLeadingRadius: 12, bottomLeadingRadius: 12, style: .continuous)
                .fill(tarefa.status.cor)
                .frame(width: 3)
        }
        .contentShape(Rectangle())
        .onHover { sobre = $0 }
        .animation(.easeOut(duration: 0.12), value: sobre)
        .contextMenu {
            Button("Copiar id da tarefa") { copiar(tarefa.id) }
        }
    }
}

private struct Metrica: View {
    let icone: String
    let texto: String
    var cor: Color = .secondary

    var body: some View {
        Label {
            Text(texto).monospacedDigit()
        } icon: {
            Image(systemName: icone)
        }
        .font(.caption)
        .foregroundStyle(cor == .primary ? Color.secondary : cor)
        .lineLimit(1)
    }
}
