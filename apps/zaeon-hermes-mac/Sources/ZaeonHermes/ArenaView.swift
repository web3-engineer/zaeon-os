import HermesCore
import SwiftUI

/// Arena: o mesmo pedido para até 4 motores, lado a lado, antes de qualquer um chegar ao aluno.
struct ArenaView: View {
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            FormularioArena()
                .frame(width: 400)
            Divider()
            ResultadosArena()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .navigationTitle("Arena")
    }
}

private struct FormularioArena: View {
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        @Bindable var arena = estado.arena
        Form {
            Section {
                TextField("Objetivo", text: $arena.objetivo, prompt: Text("O pedido, como um aluno escreveria"), axis: .vertical)
                    .lineLimit(4...10)
                Picker("Intent", selection: $arena.intent) {
                    ForEach(IntentArena.allCases) { i in Text(i.rotulo).tag(i) }
                }
                TextField("Kind (opcional)", text: $arena.kind, prompt: Text("artigo, tcc, resumo…"))
            } header: {
                Text("Pedido")
            }

            Section {
                if let motores = estado.painel?.motores, !motores.isEmpty {
                    ForEach(motores) { m in
                        Toggle(isOn: marcado(m.id)) {
                            HStack(spacing: 8) {
                                SeloMotor(nome: m.nome, origem: m.origem)
                                Text(m.formato.rotulo).font(.caption).foregroundStyle(.secondary)
                                if !m.disponivel {
                                    Text("indisponível").font(.caption).foregroundStyle(.red)
                                }
                            }
                        }
                        .disabled(!arena.escolhidos.contains(m.id) && arena.escolhidos.count >= PedidoArena.maxMotores)
                    }
                } else {
                    Text("Carregando os motores…").foregroundStyle(.secondary)
                }
            } header: {
                Text("Motores (até \(PedidoArena.maxMotores))")
            } footer: {
                Text("Cada motor roda em segundo plano numa tarefa com origem arena, respeitando o teto ORQ_MAX_SIMULTANEAS.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section {
                HStack {
                    Button {
                        Task { await estado.arena.disparar(com: estado.fonte) }
                    } label: {
                        Label("Disparar na arena", systemImage: "flag.2.crossed.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Marca.azul)
                    .controlSize(.large)
                    .disabled(arena.enviando || arena.pedido.problema != nil)
                    .keyboardShortcut(.return, modifiers: .command)
                    if arena.enviando { ProgressView().controlSize(.small) }
                }
                if let p = arena.pedido.problema, !arena.objetivo.isEmpty || !arena.escolhidos.isEmpty {
                    Text(p).font(.caption).foregroundStyle(.secondary)
                }
                if let e = arena.erro {
                    Label(e, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red).font(.callout)
                }
            }
        }
        .formStyle(.grouped)
    }

    private func marcado(_ id: String) -> Binding<Bool> {
        Binding {
            estado.arena.escolhidos.contains(id)
        } set: { novo in
            if novo { estado.arena.escolhidos.insert(id) } else { estado.arena.escolhidos.remove(id) }
        }
    }
}

private struct ResultadosArena: View {
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        let arena = estado.arena
        let linhas = Arena.comparar(arena.rodada)
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    CabecalhoTela(titulo: "Rodada", subtitulo: arena.ids.isEmpty
                        ? "Dispare um pedido para comparar os motores lado a lado."
                        : "\(arena.ids.count) tarefa\(arena.ids.count == 1 ? "" : "s") · atualiza a cada 3 s enquanto alguma roda")
                    if arena.acompanhando { ProgressView().controlSize(.small) }
                }

                if arena.ids.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "flag.2.crossed").font(.system(size: 34, weight: .light)).foregroundStyle(Marca.gradiente)
                        Text("Nenhuma rodada ainda").font(.headline)
                        Text("Os cartões aparecem aqui com tempo, custo, subagentes, citações inventadas e cobertura.")
                            .font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, minHeight: 260)
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 230), spacing: 14, alignment: .top)], spacing: 14) {
                        ForEach(arena.ids, id: \.self) { id in
                            if let l = linhas.first(where: { $0.id == id }) {
                                CartaoArena(linha: l, origem: estado.motor(l.motor)?.origem)
                            } else {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(id).font(.caption.monospaced()).foregroundStyle(.secondary)
                                    ProgressView().controlSize(.small)
                                }
                                .frame(maxWidth: .infinity, minHeight: 200, alignment: .topLeading)
                                .cartao()
                            }
                        }
                    }
                }
            }
            .padding(24)
        }
    }
}

private struct CartaoArena: View {
    let linha: LinhaArena
    let origem: OrigemMotor?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                SeloMotor(nome: linha.nomeMotor, origem: origem)
                Spacer()
                Pilula(texto: linha.status.rotulo, cor: linha.status.cor, icone: linha.status.icone)
            }
            if linha.status == .rodando {
                HStack(spacing: 6) {
                    ProgressView().controlSize(.small)
                    Text("rodando…").font(.caption).foregroundStyle(.secondary)
                }
            }
            VStack(alignment: .leading, spacing: 6) {
                LinhaGrid(titulo: "Tempo", valor: linha.ms, selo: linha.maisRapida ? "mais rápida" : nil)
                LinhaGrid(titulo: "Custo", valor: linha.custo, selo: linha.maisBarata ? "mais barata" : nil)
                LinhaGrid(titulo: "Subagentes", valor: linha.subagentes)
                LinhaGrid(titulo: "Evidências", valor: linha.evidencias)
                LinhaGrid(titulo: "Inventadas", valor: linha.invalidas,
                          cor: (Int(linha.invalidas) ?? 0) > 0 ? Color.red : nil)
                LinhaGrid(titulo: "Cobertura", valor: linha.cobertura, selo: linha.maiorCobertura ? "maior" : nil)
            }
            NavigationLink(value: RotaTarefa(id: linha.id)) {
                Label("Abrir a trilha", systemImage: "arrow.up.right.square")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
        }
        .cartao(destaque: linha.maisRapida || linha.maisBarata || linha.maiorCobertura ? Marca.ciano : nil)
    }
}

private struct LinhaGrid: View {
    let titulo: String
    let valor: String
    var selo: String? = nil
    var cor: Color? = nil

    var body: some View {
        HStack(spacing: 10) {
            Text(titulo).font(.caption).foregroundStyle(.secondary).frame(width: 78, alignment: .leading)
            Text(valor).font(.callout.weight(.semibold).monospacedDigit())
                .foregroundStyle(cor.map { AnyShapeStyle($0) } ?? AnyShapeStyle(.primary))
            Spacer(minLength: 4)
            if let selo {
                Text(selo).font(.caption2.weight(.semibold)).foregroundStyle(Marca.ciano)
            }
        }
    }
}
