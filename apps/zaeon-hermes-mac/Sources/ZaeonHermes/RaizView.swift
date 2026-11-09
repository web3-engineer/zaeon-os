import HermesCore
import SwiftUI

/// Janela principal: barra lateral (seções + motores) e detalhe com pilha de navegação.
struct RaizView: View {
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        @Bindable var estado = estado
        NavigationSplitView {
            BarraLateral()
                .navigationSplitViewColumnWidth(min: 220, ideal: 250, max: 320)
        } detail: {
            NavigationStack(path: $estado.caminho) {
                conteudo
                    .navigationDestination(for: RotaTarefa.self) { rota in
                        TarefaDetalheView(id: rota.id)
                    }
            }
            .safeAreaInset(edge: .top, spacing: 0) {
                if let erro = estado.erro, estado.painel != nil {
                    FaixaErro(texto: erro)
                }
            }
        }
        .toolbar { barraFerramentas }
        .task { await estado.cicloPainel() }
        .task { await estado.atualizador.ciclo { estado.fonte } }
        .task(id: "\(estado.urlServidor)|\(estado.token.count)|\(estado.janelaAgentes.rawValue)") { await estado.cicloAgentes() }
        .onChange(of: estado.secao) {
            estado.caminho = []
        }
    }

    /// Barra de ferramentas: modo da orquestra, tarefas em voo e atualizar.
    @ToolbarContentBuilder
    private var barraFerramentas: some ToolbarContent {
        ToolbarItemGroup(placement: .primaryAction) {
            if let modo = estado.painel?.modo {
                Pilula(texto: "modo \(modo.bruto.isEmpty ? "?" : modo.bruto)", cor: modo.cor, icone: "dial.medium")
                    .help(modo.descricao)
            }
            if let p = estado.painel {
                Pilula(texto: "\(p.emVoo) em voo", cor: p.emVoo > 0 ? Marca.ciano : .gray, icone: "bolt.fill")
                    .monospacedDigit()
                    .help("Tarefas rodando agora (teto: \(p.config.maxSimultaneas.map(String.init) ?? "?") por processo)")
            }
            Button {
                Task { await estado.atualizar() }
            } label: {
                Label("Atualizar", systemImage: "arrow.clockwise")
            }
            .disabled(estado.carregando)
            .help("Atualizar o painel (⌘R). Ele também se atualiza sozinho a cada 10 s.")
        }
    }

    @ViewBuilder
    private var conteudo: some View {
        if estado.painel == nil, let erro = estado.erro, estado.secao != .configuracoes {
            TelaVazia(titulo: "Sem conexão com a orquestra", mensagem: erro, icone: "bolt.horizontal.circle",
                      acao: ("Abrir Configurações", { estado.secao = .configuracoes }))
        } else {
            switch estado.secao ?? .quadro {
            case .quadro: QuadroView()
            case .saude: SaudeView()
            case .agente(let id): AgenteTela(agenteId: id)
            case .motor(let id): MotorDashboardView(motorId: id)
            case .datasets: DatasetsView()
            case .arena: ArenaView()
            case .configuracoes: ConfiguracoesView()
            }
        }
    }
}

private struct BarraLateral: View {
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        @Bindable var estado = estado
        List(selection: $estado.secao) {
            Section("Orquestra") {
                Label("Quadro", systemImage: "rectangle.split.3x1").tag(Secao.quadro)
                Label("Saúde do chat", systemImage: "heart.text.square").tag(Secao.saude)
                Label("Arena", systemImage: "flag.2.crossed").tag(Secao.arena)
                Label("Datasets", systemImage: "externaldrive.connected.to.line.below").tag(Secao.datasets)
            }

            Section("Motores") {
                if let motores = estado.painel?.motores {
                    ForEach(motores) { m in
                        LinhaMotor(motor: m).tag(Secao.motor(m.id))
                    }
                } else {
                    ForEach(0..<4, id: \.self) { _ in
                        Text("motor carregando").redacted(reason: .placeholder)
                    }
                }
            }

            SecaoAgentesDaCasa()

            Section {
                Label("Configurações", systemImage: "gearshape").tag(Secao.configuracoes)
            }
        }
        .listStyle(.sidebar)
        .safeAreaInset(edge: .top, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                LetreiroZaeon(altura: 30)
                Text("HERMES · console da orquestra")
                    .font(.caption2.weight(.semibold))
                    .tracking(1.2)
                    .foregroundStyle(Marca.gradiente)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16)
            .padding(.top, 10)
            .padding(.bottom, 8)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            RodapeBarraLateral()
        }
    }
}

private struct LinhaMotor: View {
    let motor: MotorPainel

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(motor.disponivel ? Color.green : Color.red.opacity(0.85))
                .frame(width: 8, height: 8)
                .shadow(color: motor.disponivel ? .green.opacity(0.6) : .clear, radius: 3)
                .help(motor.disponivel ? "Disponível" : "Indisponível (sem chave ou desligado)")
            VStack(alignment: .leading, spacing: 1) {
                Text(motor.nome).lineLimit(1)
                Text("\(motor.origem.rotulo) · \(motor.formato.rotulo)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 4)
            if motor.metricas.tarefas > 0 {
                Text("\(motor.metricas.tarefas)")
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct RodapeBarraLateral: View {
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            FaixaAtualizacao()
            linhaStatus
        }
    }

    private var linhaStatus: some View {
        HStack(spacing: 6) {
            if estado.carregando {
                ProgressView().controlSize(.mini)
            } else {
                Circle().fill(estado.erro == nil ? Color.green : Color.orange).frame(width: 6, height: 6)
            }
            Group {
                if let d = estado.ultimaAtualizacao {
                    Text("Atualizado \(Fmt.ha(d))")
                } else {
                    Text("Conectando…")
                }
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }
}

private struct FaixaErro: View {
    let texto: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
            Text(texto).font(.callout).lineLimit(2)
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(.orange.opacity(0.12))
        .background(.bar)
    }
}

/// "Atualização disponível" no pé da barra lateral: um clique baixa, troca o app e reabre.
private struct FaixaAtualizacao: View {
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        let a = estado.atualizador
        if a.disponivel, let m = a.manifesto {
            VStack(alignment: .leading, spacing: 6) {
                Label("Atualização disponível", systemImage: "arrow.down.app.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Marca.ciano)
                Text("build \(a.buildAtual.map(String.init) ?? "?") → \(m.build)\(m.shaCurto.map { " · \($0)" } ?? "")")
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(.secondary)
                switch a.fase {
                case .baixando:
                    HStack(spacing: 6) { ProgressView().controlSize(.mini); Text("Baixando…").font(.caption) }
                case .instalando:
                    HStack(spacing: 6) { ProgressView().controlSize(.mini); Text("Instalando e reabrindo…").font(.caption) }
                default:
                    Button("Atualizar e reabrir") {
                        Task { await a.instalar(estado.fonte) }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Marca.azul)
                    .controlSize(.small)
                }
                if case .falhou(let msg) = a.fase {
                    Text(msg).font(.caption2).foregroundStyle(.orange).fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(10)
            .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Marca.ciano.opacity(0.12)))
            .padding(.horizontal, 10)
            .padding(.top, 6)
        }
    }
}


/// Os agentes da casa na barra lateral, como os motores: agentes (personas e criados no admin), os mentores
/// num grupo recolhível, e o gasto "sistema" por último. Clicar abre `AgenteTela`.
private struct SecaoAgentesDaCasa: View {
    @Environment(EstadoApp.self) private var estado
    @State private var mentoresAbertos = true

    var body: some View {
        Section {
            if let r = estado.agentes {
                let grupos = Elenco.grupos(r.agentes)
                ForEach(grupos.filter { $0.tipo != .mentor }.flatMap(\.agentes)) { a in
                    LinhaAgente(agente: a).tag(Secao.agente(a.id))
                }
                if let mentores = grupos.first(where: { $0.tipo == .mentor }) {
                    DisclosureGroup(isExpanded: $mentoresAbertos) {
                        ForEach(mentores.agentes) { a in
                            LinhaAgente(agente: a).tag(Secao.agente(a.id))
                        }
                    } label: {
                        Label("Mentores · \(mentores.agentes.count)", systemImage: "graduationcap")
                    }
                }
            } else if let erro = estado.erroAgentes {
                Label("Sem a lista de agentes", systemImage: "exclamationmark.triangle")
                    .foregroundStyle(.orange)
                    .help(erro)
            } else {
                ForEach(0..<4, id: \.self) { _ in
                    Text("agente carregando").redacted(reason: .placeholder)
                }
            }
        } header: {
            if let r = estado.agentes {
                let t = Elenco.totais(r.agentes)
                Text("Agentes da casa · \(t.agentes)")
                    .help("\(t.trabalhando) trabalharam na janela de \(estado.janelaAgentes.rotulo) · \(Fmt.inteiro(t.chamadas)) chamadas · \(Fmt.usd(t.custoUsd))")
            } else {
                Text("Agentes da casa")
            }
        }
    }
}
