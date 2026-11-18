import HermesCore
import SwiftUI
import UniformTypeIdentifiers

/// PESQUISAS da vitrine (`/api/admin/vitrine/pesquisas`): à esquerda, PUBLICAR uma pesquisa — ela vira uma PASTA na
/// vitrine e cada parte (artigo, dados, protocolo…) é um papel dentro dela; o texto de uma parte pode vir de um
/// arquivo (.md, .txt, .csv…). À direita, a FILA: o que os usuários mandaram da Sala de Pesquisa, pra aprovar ou
/// recusar com um motivo, e as já publicadas/recusadas. Tudo com o Bearer do console (origem "console").
struct PesquisasView: View {
    @Environment(EstadoApp.self) private var estado

    // o formulário
    @State private var rascunho = RascunhoPesquisa()
    @State private var tentou = false
    @State private var publicando = false
    @State private var aviso: Aviso?
    @State private var importandoPara: UUID?
    @State private var mostraImportar = false

    // a fila
    @State private var status: StatusPesquisa = .pendente
    @State private var lista: [PesquisaVitrine] = []
    @State private var carregando = false
    @State private var erroLista: String?
    @State private var moderando: String?
    @State private var recusando: PesquisaVitrine?
    @State private var motivo = ""

    struct Aviso: Equatable { var ok: Bool; var texto: String }

    private var tiposImportaveis: [UTType] {
        var t: [UTType] = [.plainText, .commaSeparatedText, .tabSeparatedText, .json, .sourceCode]
        for ext in Pesquisas.extensoesTexto { if let u = UTType(filenameExtension: ext), !t.contains(u) { t.append(u) } }
        return t
    }

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            ScrollView {
                formulario.padding(24)
            }
            .frame(minWidth: 460, idealWidth: 580, maxWidth: .infinity)
            Divider()
            fila
                .frame(minWidth: 340, idealWidth: 420, maxWidth: 520)
        }
        .task(id: "\(estado.urlServidor)|\(estado.token.count)|\(status.bruto)") { await carregar() }
        .fileImporter(isPresented: $mostraImportar, allowedContentTypes: tiposImportaveis, allowsMultipleSelection: false) { r in
            importar(r)
        }
        .alert("Recusar pesquisa", isPresented: Binding(get: { recusando != nil }, set: { if !$0 { recusando = nil } })) {
            TextField("Motivo (a pessoa vê)", text: $motivo)
            Button("Recusar", role: .destructive) {
                if let p = recusando { Task { await moderar(p, .recusada, motivo: motivo) } }
                recusando = nil
            }
            Button("Cancelar", role: .cancel) { recusando = nil }
        } message: {
            Text(recusando.map { "\"\($0.titulo)\" sai da vitrine (ou não entra). O motivo aparece pra quem mandou." } ?? "")
        }
    }

    // MARK: - Formulário

    private var formulario: some View {
        VStack(alignment: .leading, spacing: 18) {
            CabecalhoTela(titulo: "Publicar pesquisa",
                          subtitulo: "Vira uma pasta na vitrine e cada parte é um papel dentro dela. Pelo console, entra publicada na hora.")

            if let aviso {
                Label(aviso.texto, systemImage: aviso.ok ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
                    .foregroundStyle(aviso.ok ? Color.green : Color.orange)
                    .font(.callout)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(alignment: .leading, spacing: 10) {
                campo("Título") { TextField("ex.: O microbioma do solo do sertão", text: $rascunho.titulo) }
                HStack(spacing: 12) {
                    campo("Nicho") { TextField("ex.: Biologia do solo", text: $rascunho.nicho) }
                    campo("Tags (vírgula)") { TextField("solo, semiárido, 16S", text: $rascunho.tags) }
                }
                campo("Resumo — o que quem abrir a pasta lê primeiro") {
                    TextEditor(text: $rascunho.resumo)
                        .font(.body)
                        .frame(minHeight: 80, maxHeight: 140)
                        .scrollContentBackground(.hidden)
                        .padding(6)
                        .background(RoundedRectangle(cornerRadius: 8).fill(Color.primary.opacity(0.04)))
                        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Color.primary.opacity(0.12)))
                }
                campo("Publicar em nome de (e-mail da conta, opcional)") {
                    TextField("vazio = autor Zaeon", text: $rascunho.contaEmail)
                }
            }
            .textFieldStyle(.roundedBorder)

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Partes · \(rascunho.partes.count)").tituloSecao()
                    Spacer()
                    if rascunho.partes.count < LimitesPesquisa.partes {
                        Button {
                            rascunho.partes.append(ParteRascunho(tipo: rascunho.partes.isEmpty ? .artigo : .dados))
                        } label: { Label("Outra parte", systemImage: "plus") }
                    }
                }
                ForEach(Array(rascunho.partes.enumerated()), id: \.element.id) { i, parte in
                    CartaoParte(
                        indice: i,
                        parte: binding(parte.id),
                        podeRemover: rascunho.partes.count > 1,
                        importar: { importandoPara = parte.id; mostraImportar = true },
                        remover: { rascunho.partes.removeAll { $0.id == parte.id } }
                    )
                }
            }

            let problemas = rascunho.problemas()
            if tentou && !problemas.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(problemas, id: \.self) { Label($0, systemImage: "exclamationmark.circle").foregroundStyle(.orange) }
                }
                .font(.callout)
            }

            HStack {
                Button {
                    Task { await publicar() }
                } label: {
                    if publicando {
                        HStack(spacing: 6) { ProgressView().controlSize(.small); Text("Publicando…") }
                    } else {
                        Label("Publicar na vitrine", systemImage: "folder.badge.plus")
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Marca.azul)
                .controlSize(.large)
                .disabled(publicando)
                .keyboardShortcut(.return, modifiers: .command)
                .help("Publicar (⌘↩)")
                Spacer()
                Button("Limpar") { rascunho = RascunhoPesquisa(); tentou = false; aviso = nil }
                    .disabled(publicando)
            }
        }
        .frame(maxWidth: 760, alignment: .leading)
    }

    private func campo<C: View>(_ rotulo: String, @ViewBuilder _ conteudo: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(rotulo).font(.caption.weight(.medium)).foregroundStyle(.secondary)
            conteudo()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// binding de uma parte pelo id (o índice muda quando uma parte sai)
    private func binding(_ id: UUID) -> Binding<ParteRascunho> {
        Binding(
            get: { rascunho.partes.first { $0.id == id } ?? ParteRascunho() },
            set: { nova in if let i = rascunho.partes.firstIndex(where: { $0.id == id }) { rascunho.partes[i] = nova } }
        )
    }

    // MARK: - Fila

    private var fila: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Vitrine").tituloSecao()
                Spacer()
                if carregando { ProgressView().controlSize(.small) }
                Button {
                    Task { await carregar() }
                } label: { Image(systemName: "arrow.clockwise") }
                .buttonStyle(.borderless)
                .help("Atualizar a lista")
            }
            Picker("", selection: $status) {
                ForEach(StatusPesquisa.conhecidos, id: \.self) { Text($0.rotulo).tag($0) }
            }
            .pickerStyle(.segmented)
            .labelsHidden()

            if let erroLista {
                Label(erroLista, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.orange).font(.callout)
            }
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 10) {
                    if lista.isEmpty && !carregando && erroLista == nil {
                        Text(status == .pendente ? "A fila está vazia." : "Nada aqui ainda.")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, 30)
                    }
                    ForEach(lista) { p in linhaFila(p) }
                }
                .padding(.bottom, 16)
            }
        }
        .padding(16)
    }

    private func linhaFila(_ p: PesquisaVitrine) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "folder.fill").foregroundStyle(Marca.gradiente)
                VStack(alignment: .leading, spacing: 2) {
                    Text(p.titulo).font(.headline).lineLimit(2)
                    Text("\(p.quem) · via \(p.rotuloOrigem) · \(p.partes.count) \(p.partes.count == 1 ? "parte" : "partes")\(p.nicho.isEmpty ? "" : " · \(p.nicho)")")
                        .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    if let d = p.criadoEm { Text(Fmt.ha(d)).font(.caption2).foregroundStyle(.tertiary) }
                }
            }
            if !p.resumo.isEmpty {
                Text(p.resumo).font(.callout).foregroundStyle(.secondary).lineLimit(3)
            }
            if !p.partes.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(Array(p.partes.enumerated()), id: \.offset) { _, parte in
                            Pilula(texto: "\(parte.nomeTipo): \(parte.titulo)", cor: parte.link ? .purple : Marca.ciano,
                                   icone: parte.link ? "link" : "doc.text")
                                .help(parte.link ? "link externo" : "\(Fmt.inteiro(parte.caracteres)) caracteres")
                        }
                    }
                }
            }
            if p.status == .recusada, let m = p.motivo, !m.isEmpty {
                Label("Motivo: \(m)", systemImage: "text.bubble").font(.caption).foregroundStyle(.orange)
            }
            HStack(spacing: 8) {
                if moderando == p.id { ProgressView().controlSize(.small) }
                Spacer()
                if p.status != .publicada {
                    Button { Task { await moderar(p, .publicada, motivo: nil) } } label: { Label("Aprovar", systemImage: "checkmark") }
                        .buttonStyle(.borderedProminent).tint(.green).controlSize(.small)
                }
                if p.status != .recusada {
                    Button { motivo = ""; recusando = p } label: {
                        Label(p.status == .publicada ? "Tirar da vitrine" : "Recusar", systemImage: "xmark")
                    }
                    .controlSize(.small)
                }
            }
            .disabled(moderando != nil)
        }
        .cartao()
    }

    // MARK: - Ações

    private func carregar() async {
        carregando = true
        defer { carregando = false }
        do {
            lista = try await estado.fonte.pesquisas(status: status)
            erroLista = nil
        } catch {
            lista = []
            erroLista = error.localizedDescription
        }
    }

    private func publicar() async {
        tentou = true
        aviso = nil
        guard rascunho.problemas().isEmpty else { return }
        publicando = true
        defer { publicando = false }
        do {
            let p = try await estado.fonte.publicarPesquisa(rascunho.pedido())
            aviso = Aviso(ok: true, texto: "Publicada: \"\(p.titulo)\" já está na vitrine como pasta, com \(p.partes.count) \(p.partes.count == 1 ? "papel" : "papéis").")
            rascunho = RascunhoPesquisa()
            tentou = false
            if status == .publicada { await carregar() } else { status = .publicada }
        } catch {
            aviso = Aviso(ok: false, texto: error.localizedDescription)
        }
    }

    private func moderar(_ p: PesquisaVitrine, _ novo: StatusPesquisa, motivo: String?) async {
        moderando = p.id
        defer { moderando = nil }
        do {
            let m = motivo?.trimmingCharacters(in: .whitespacesAndNewlines)
            _ = try await estado.fonte.moderarPesquisa(id: p.id, status: novo, motivo: (m?.isEmpty ?? true) ? nil : m)
            lista.removeAll { $0.id == p.id }
            erroLista = nil
        } catch {
            erroLista = error.localizedDescription
        }
    }

    /// o texto do arquivo vai pra parte que pediu (e o tipo é sugerido pelo nome, se a parte ainda está vazia)
    private func importar(_ r: Result<[URL], Error>) {
        guard let id = importandoPara else { return }
        importandoPara = nil
        switch r {
        case .failure(let e):
            aviso = Aviso(ok: false, texto: "Não deu pra abrir o arquivo: \(e.localizedDescription)")
        case .success(let urls):
            guard let url = urls.first else { return }
            let acesso = url.startAccessingSecurityScopedResource()
            defer { if acesso { url.stopAccessingSecurityScopedResource() } }
            guard let dados = try? Data(contentsOf: url) else {
                aviso = Aviso(ok: false, texto: "Não deu pra ler \(url.lastPathComponent)."); return
            }
            guard let texto = Pesquisas.textoDoArquivo(dados) else {
                aviso = Aviso(ok: false, texto: "\(url.lastPathComponent) não é texto (PDF, imagem…). Suba o arquivo num repositório (Zenodo, OSF) e cole o link https na parte.")
                return
            }
            guard let i = rascunho.partes.firstIndex(where: { $0.id == id }) else { return }
            var p = rascunho.partes[i]
            let vazia = p.conteudo.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && p.titulo.isEmpty
            p.conteudo = texto
            p.arquivo = url.lastPathComponent
            if p.titulo.isEmpty { p.titulo = String(url.deletingPathExtension().lastPathComponent.prefix(LimitesPesquisa.tituloParte)) }
            if vazia, let t = Pesquisas.tipoSugerido(arquivo: url.lastPathComponent) { p.tipo = t }
            rascunho.partes[i] = p
            aviso = texto.count > LimitesPesquisa.conteudo
                ? Aviso(ok: false, texto: "\(url.lastPathComponent) tem \(Fmt.inteiro(texto.count)) caracteres — passa do limite de \(Fmt.inteiro(LimitesPesquisa.conteudo)). Mande como link.")
                : nil
        }
    }
}

/// Uma parte da pesquisa no formulário: tipo, título, o texto (ou um arquivo importado) e/ou um link.
private struct CartaoParte: View {
    let indice: Int
    @Binding var parte: ParteRascunho
    let podeRemover: Bool
    let importar: () -> Void
    let remover: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text("\(indice + 1)")
                    .font(.caption.monospacedDigit().weight(.bold))
                    .frame(width: 20, height: 20)
                    .background(Circle().fill(Marca.ciano.opacity(0.2)))
                Picker("", selection: $parte.tipo) {
                    ForEach(TipoParte.allCases) { Text($0.nome).tag($0) }
                }
                .labelsHidden()
                .frame(width: 130)
                TextField("título (padrão: \(parte.tipo.nome))", text: $parte.titulo)
                    .textFieldStyle(.roundedBorder)
                if podeRemover {
                    Button(role: .destructive, action: remover) { Image(systemName: "trash") }
                        .buttonStyle(.borderless)
                        .help("Tirar esta parte")
                }
            }
            TextEditor(text: $parte.conteudo)
                .font(.system(.callout, design: .monospaced))
                .frame(minHeight: 110, maxHeight: 220)
                .scrollContentBackground(.hidden)
                .padding(6)
                .background(RoundedRectangle(cornerRadius: 8).fill(Color.primary.opacity(0.04)))
                .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Color.primary.opacity(0.12)))
            HStack(spacing: 10) {
                Button(action: importar) { Label("Importar arquivo…", systemImage: "doc.badge.plus") }
                    .controlSize(.small)
                    .help("Lê um .md, .txt, .csv, .json… como o texto desta parte")
                Text(legenda).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                Spacer()
            }
            TextField("…ou um link https (Zenodo, OSF, GitHub…)", text: $parte.url)
                .textFieldStyle(.roundedBorder)
        }
        .cartao(destaque: parte.conteudo.isEmpty && parte.url.isEmpty ? nil : Marca.ciano)
    }

    private var legenda: String {
        let n = parte.conteudo.count
        let tamanho = n == 0 ? "sem texto" : "\(Fmt.inteiro(n)) caracteres"
        return parte.arquivo.map { "\($0) · \(tamanho)" } ?? tamanho
    }
}
