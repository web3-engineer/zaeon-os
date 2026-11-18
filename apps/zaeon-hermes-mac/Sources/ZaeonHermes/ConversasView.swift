import HermesCore
import SwiftUI

// MARK: - Barra lateral

/// "Conversas" na barra lateral: "Nova conversa" + as conversas salvas (◌ = turno rodando).
struct SecaoConversas: View {
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        Section("Conversas") {
            Label("Nova conversa", systemImage: "square.and.pencil").tag(Secao.novaConversa)
            ForEach(estado.conversas.prefix(30)) { c in
                HStack(spacing: 8) {
                    Image(systemName: c.rodando ? "ellipsis.bubble.fill" : "bubble.left")
                        .foregroundStyle(c.rodando ? Marca.ciano : .secondary)
                        .imageScale(.small)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(c.titulo).lineLimit(1)
                        Text(estado.nomeDe(c.agente)).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                    }
                }
                .tag(Secao.conversa(c.id))
                .contextMenu {
                    Button("Apagar conversa", role: .destructive) { Task { await estado.apagarConversa(c.id) } }
                }
            }
        }
    }
}

// MARK: - Nova conversa

/// Escolher com quem falar: agentes da casa, mentores e motores da orquestra.
struct NovaConversaView: View {
    @Environment(EstadoApp.self) private var estado
    @State private var abrindo: String?
    @State private var erro: String?
    @State private var busca = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                CabecalhoTela(titulo: "Nova conversa", subtitulo: "Fale com qualquer agente pelo mesmo caminho do aluno, como admin (plano Max). O gasto entra no ledger como console.")
                TextField("Buscar agente, mentor ou motor", text: $busca)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 420)
                if let erro {
                    Label(erro, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.orange)
                }
                if estado.interlocutores.isEmpty {
                    if let e = estado.erroConversas {
                        TelaVazia(titulo: "Não deu para ler os agentes", mensagem: e, icone: "bubble.left.and.exclamationmark.bubble.right")
                    } else {
                        EsqueletoCartoes(quantidade: 3, altura: 70)
                    }
                }
                ForEach(Interlocutores.grupos(filtrados)) { g in
                    VStack(alignment: .leading, spacing: 10) {
                        Text("\(g.tipo.rotulo) · \(g.itens.count)").tituloSecao()
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 230), spacing: 10)], spacing: 10) {
                            ForEach(g.itens) { i in cartao(i) }
                        }
                    }
                }
            }
            .padding(24)
            .frame(maxWidth: 1_200, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Marca.gradienteSuave.opacity(0.25))
        .navigationTitle("Nova conversa")
        .task { if estado.interlocutores.isEmpty { await estado.atualizarConversas() } }
    }

    private var filtrados: [Interlocutor] {
        let q = busca.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return estado.interlocutores }
        return estado.interlocutores.filter { $0.nome.lowercased().contains(q) || $0.id.contains(q) || $0.descricao.lowercased().contains(q) }
    }

    private func cartao(_ i: Interlocutor) -> some View {
        Button {
            Task {
                abrindo = i.id
                defer { abrindo = nil }
                do { try await estado.novaConversa(com: i.id); erro = nil } catch {
                    erro = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
                }
            }
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: i.tipo == .motor ? "cpu" : i.tipo == .mentor ? "graduationcap" : "person.crop.circle")
                    .font(.title3)
                    .foregroundStyle(i.disponivel ? Marca.ciano : .secondary)
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(i.nome).font(.headline)
                        if abrindo == i.id { ProgressView().controlSize(.mini) }
                    }
                    Text(i.descricao).font(.caption).foregroundStyle(.secondary).lineLimit(2).multilineTextAlignment(.leading)
                    if !i.disponivel { Text("sem chave no servidor").font(.caption2).foregroundStyle(.orange) }
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .cartao(padding: 12)
        .disabled(!i.disponivel || abrindo != nil)
        .opacity(i.disponivel ? 1 : 0.55)
    }
}

// MARK: - A conversa

/// Uma conversa: mensagens, passos ao vivo do turno que está rodando e o campo de envio.
struct ConversaView: View {
    @Environment(EstadoApp.self) private var estado
    let conversaId: String

    @State private var conversa: Conversa?
    @State private var erro: String?
    @State private var rascunho = ""
    @State private var enviando = false
    @FocusState private var focado: Bool

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { rolar in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 14) {
                        if let c = conversa {
                            if c.mensagens.isEmpty {
                                Text("Comece a conversa com \(estado.nomeDe(c.agente)). Respostas longas (motores profundos e enxames) rodam no servidor e aparecem aqui com os passos ao vivo.")
                                    .font(.callout)
                                    .foregroundStyle(.secondary)
                                    .padding(.top, 30)
                            }
                            ForEach(c.mensagens) { m in
                                BolhaMensagem(mensagem: m, nome: estado.nomeDe(c.agente))
                                    .id(m.id)
                            }
                        } else if let erro {
                            TelaVazia(titulo: "Não deu para abrir a conversa", mensagem: erro, icone: "bubble.left.and.exclamationmark.bubble.right")
                        } else {
                            EsqueletoCartoes(quantidade: 3, altura: 60)
                        }
                    }
                    .padding(24)
                    .frame(maxWidth: 860, alignment: .leading)
                    .frame(maxWidth: .infinity)
                }
                .onChange(of: conversa?.mensagens.last?.id) {
                    if let id = conversa?.mensagens.last?.id { withAnimation { rolar.scrollTo(id, anchor: .bottom) } }
                }
                .onChange(of: conversa?.mensagens.last?.aoVivo?.eventos.count) {
                    if let id = conversa?.mensagens.last?.id { rolar.scrollTo(id, anchor: .bottom) }
                }
            }
            Divider()
            campo
        }
        .background(Marca.gradienteSuave.opacity(0.2))
        .navigationTitle(conversa?.titulo ?? "Conversa")
        .navigationSubtitle(conversa.map { estado.nomeDe($0.agente) } ?? "")
        .toolbar {
            ToolbarItem {
                Button(role: .destructive) {
                    Task { await estado.apagarConversa(conversaId) }
                } label: { Label("Apagar", systemImage: "trash") }
                .help("Apagar esta conversa")
            }
        }
        .task { await ciclo() }
    }

    private var rodando: Bool { conversa?.rodando ?? false }

    private var campo: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField(rodando ? "Esperando a resposta…" : "Mensagem (⌘↩ envia)", text: $rascunho, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(1...8)
                .focused($focado)
                .padding(10)
                .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.primary.opacity(0.06)))
                .onSubmit { Task { await enviar() } }
            Button {
                Task { await enviar() }
            } label: {
                if enviando { ProgressView().controlSize(.small) } else { Image(systemName: "arrow.up.circle.fill").font(.title2) }
            }
            .buttonStyle(.plain)
            .foregroundStyle(podeEnviar ? Marca.ciano : .secondary)
            .keyboardShortcut(.return, modifiers: .command)
            .disabled(!podeEnviar)
        }
        .padding(12)
        .frame(maxWidth: 860)
        .frame(maxWidth: .infinity)
        .background(.bar)
    }

    private var podeEnviar: Bool {
        !enviando && !rodando && conversa != nil && !rascunho.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func enviar() async {
        guard podeEnviar else { return }
        let texto = rascunho.trimmingCharacters(in: .whitespacesAndNewlines)
        enviando = true
        defer { enviando = false }
        do {
            _ = try await estado.fonte.enviarMensagem(conversa: conversaId, texto: texto)
            rascunho = ""
            erro = nil
            await carregar()
        } catch {
            erro = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func carregar() async {
        do {
            let c = try await estado.fonte.conversa(id: conversaId)
            guard !Task.isCancelled else { return }
            conversa = c
            erro = nil
        } catch {
            guard !Task.isCancelled else { return }
            erro = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    /// 1,5 s enquanto há turno rodando (passos ao vivo); 10 s parado.
    private func ciclo() async {
        focado = true
        while !Task.isCancelled {
            let estava = rodando
            await carregar()
            if estava && !rodando { await estado.atualizarConversas() }
            try? await Task.sleep(for: rodando ? .milliseconds(1_500) : .seconds(10))
        }
    }
}

/// Uma mensagem: a sua à direita; a do agente à esquerda, com markdown, passos ao vivo enquanto roda e o rodapé
/// (tempo, modelo, tarefa).
private struct BolhaMensagem: View {
    let mensagem: MensagemConversa
    let nome: String

    var body: some View {
        if mensagem.doAdmin {
            HStack {
                Spacer(minLength: 80)
                Text(mensagem.texto)
                    .textSelection(.enabled)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Marca.azul.opacity(0.22)))
            }
        } else {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Circle().fill(cor).frame(width: 7, height: 7)
                    Text(nome).font(.caption.weight(.semibold))
                    if mensagem.rodando { ProgressView().controlSize(.mini) }
                }
                if mensagem.rodando {
                    PassosAoVivo(aoVivo: mensagem.aoVivo)
                } else if mensagem.status == .falhou {
                    Label(mensagem.texto.isEmpty ? "O turno falhou." : mensagem.texto, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(TextoFinal.blocos(mensagem.texto)) { b in
                            BlocoView(bloco: b, conhecidas: [], selecionada: nil)
                        }
                    }
                    .textSelection(.enabled)
                }
                rodape
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.primary.opacity(0.05)))
        }
    }

    private var cor: Color {
        mensagem.rodando ? Marca.ciano : mensagem.status == .falhou ? .orange : .green
    }

    @ViewBuilder
    private var rodape: some View {
        let partes = [
            mensagem.ms.map { Fmt.ms($0) },
            mensagem.modelo ?? mensagem.aoVivo?.modelo,
            mensagem.tarefaId.map { "tarefa \($0.suffix(6))" },
        ].compactMap { $0 }
        if !partes.isEmpty && !mensagem.rodando {
            HStack(spacing: 10) {
                Text(partes.joined(separator: " · ")).font(.caption2.monospaced()).foregroundStyle(.secondary)
                if !mensagem.texto.isEmpty {
                    Button { copiar(mensagem.texto) } label: { Image(systemName: "doc.on.doc") }
                        .buttonStyle(.borderless)
                        .font(.caption2)
                        .help("Copiar resposta")
                }
            }
        }
    }
}

/// Os passos do turno enquanto roda (o que o agente está fazendo: plano, buscas, subagentes…) e a prévia do texto.
struct PassosAoVivo: View {
    let aoVivo: AoVivo?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            let eventos = aoVivo?.eventos ?? []
            if eventos.isEmpty {
                Text("Pensando…").font(.callout).foregroundStyle(.secondary)
            }
            ForEach(eventos.suffix(8)) { e in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(Fmt.ms(e.t)).font(.caption2.monospacedDigit()).foregroundStyle(.secondary).frame(width: 56, alignment: .trailing)
                    Text(e.rotulo).font(.callout.monospaced()).lineLimit(2)
                }
            }
            if let p = aoVivo?.previa, !p.isEmpty {
                Text(p).font(.callout).foregroundStyle(.secondary).padding(.top, 4)
            }
        }
    }
}
