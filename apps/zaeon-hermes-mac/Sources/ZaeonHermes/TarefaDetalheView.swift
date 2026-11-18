import HermesCore
import SwiftUI

private enum AbaTarefa: String, CaseIterable, Identifiable {
    case texto = "Texto"
    case linhaDoTempo = "Linha do tempo"
    case subagentes = "Subagentes"
    case evidencias = "Evidências"
    case ledger = "Ledger"
    var id: String { rawValue }

    var icone: String {
        switch self {
        case .texto: "doc.richtext"
        case .linhaDoTempo: "clock.arrow.circlepath"
        case .subagentes: "person.3.sequence"
        case .evidencias: "quote.opening"
        case .ledger: "list.bullet.rectangle"
        }
    }
}

/// A trilha completa de uma tarefa. Enquanto ela roda, recarrega a cada 3 s.
struct TarefaDetalheView: View {
    let id: String
    @Environment(EstadoApp.self) private var estado
    @State private var detalhe: TarefaDetalhe?
    @State private var erro: String?
    @State private var aba: AbaTarefa = .texto
    @State private var evidenciaSelecionada: Evidencia.ID?

    static let intervalo: Duration = .seconds(3)

    var body: some View {
        Group {
            if let d = detalhe {
                conteudo(d)
            } else if let erro {
                TelaVazia(titulo: "Não deu para abrir a tarefa", mensagem: erro, icone: "exclamationmark.triangle")
            } else {
                VStack(alignment: .leading, spacing: 16) {
                    EsqueletoCartoes(quantidade: 1, altura: 140)
                    EsqueletoCartoes(quantidade: 3, altura: 60)
                    Spacer()
                }
                .padding(24)
            }
        }
        .navigationTitle(detalhe.map { "Tarefa · \($0.resumo.nomeMotor)" } ?? "Tarefa")
        .navigationSubtitle(id)
        .toolbar {
            ToolbarItem {
                Button { copiar(id) } label: { Label("Copiar id", systemImage: "doc.on.doc") }
                    .help("Copiar o id da tarefa")
            }
        }
        .task(id: id) { await ciclo() }
    }

    private func ciclo() async {
        detalhe = nil
        erro = nil
        while !Task.isCancelled {
            do {
                let d = try await estado.fonte.tarefa(id: id)
                detalhe = d
                erro = nil
                if d.resumo.estaRodando, aba == .texto, d.texto.isEmpty { aba = .linhaDoTempo }
            } catch {
                // falha no meio do polling não apaga o que já está na tela
                if detalhe == nil { self.erro = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
            }
            guard detalhe?.resumo.estaRodando == true else { break }
            try? await Task.sleep(for: Self.intervalo)
        }
    }

    @ViewBuilder
    private func conteudo(_ d: TarefaDetalhe) -> some View {
        VStack(spacing: 0) {
            CabecalhoTarefa(d: d)
                .padding(.horizontal, 24)
                .padding(.top, 18)
                .padding(.bottom, 12)

            Picker("Aba", selection: $aba) {
                ForEach(AbaTarefa.allCases) { a in
                    Label(a.rawValue + contagem(a, d), systemImage: a.icone).tag(a)
                }
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .padding(.horizontal, 24)
            .padding(.bottom, 12)

            Divider()

            Group {
                switch aba {
                case .texto:
                    AbaTexto(d: d, selecionada: $evidenciaSelecionada) { aba = .evidencias }
                case .linhaDoTempo:
                    AbaLinhaDoTempo(d: d)
                case .subagentes:
                    AbaSubagentes(d: d) { chave in
                        evidenciaSelecionada = chave
                        aba = .evidencias
                    }
                case .evidencias:
                    AbaEvidencias(d: d, selecionada: $evidenciaSelecionada)
                case .ledger:
                    AbaLedger(d: d)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func contagem(_ a: AbaTarefa, _ d: TarefaDetalhe) -> String {
        switch a {
        case .linhaDoTempo: d.eventos.isEmpty ? "" : " (\(d.eventos.count))"
        case .evidencias: d.listaEvidencias.isEmpty ? "" : " (\(d.listaEvidencias.count))"
        case .ledger: d.ledger.isEmpty ? "" : " (\(d.ledger.count))"
        case .subagentes: (d.resumo.subagentes ?? 0) > 0 ? " (\(d.resumo.subagentes!))" : ""
        case .texto: ""
        }
    }
}

// MARK: - Cabeçalho (resumo + decisão)

private struct CabecalhoTarefa: View {
    let d: TarefaDetalhe
    @Environment(EstadoApp.self) private var estado

    var body: some View {
        let r = d.resumo
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Pilula(texto: r.status.rotulo, cor: r.status.cor, icone: r.status.icone, cheia: true)
                SeloMotor(nome: r.nomeMotor, origem: estado.motor(r.motor)?.origem)
                Pilula(texto: r.formato.rotulo, cor: Marca.azul)
                Pilula(texto: Fmt.intent(r.intent), cor: .secondary)
                if let p = r.plano { Pilula(texto: "plano \(p)", cor: .secondary) }
                Pilula(texto: r.origem.bruto, cor: r.origem == .arena ? Marca.azul : .secondary,
                       icone: r.origem == .arena ? "flag.2.crossed" : "bubble.left")
                if r.estaRodando { ProgressView().controlSize(.small).padding(.leading, 4) }
                Spacer()
                Text(r.criadaEm.formatted(date: .abbreviated, time: .standard))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(r.objetivo)
                .font(.title3.weight(.semibold))
                .textSelection(.enabled)
                .fixedSize(horizontal: false, vertical: true)

            ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                Numero(titulo: "Tempo", valor: Fmt.ms(r.ms))
                Numero(titulo: "Custo", valor: Fmt.usd(r.custoUsd ?? d.uso?.custoUsd))
                Numero(titulo: "Subagentes", valor: r.subagentes.map(String.init) ?? Fmt.vazio)
                Numero(titulo: "Evidências", valor: r.evidencias.map(String.init) ?? Fmt.vazio)
                Numero(titulo: "Citadas", valor: r.citadas.map(String.init) ?? Fmt.vazio)
                Numero(titulo: "Inventadas", valor: r.invalidas.map(String.init) ?? Fmt.vazio,
                       cor: (r.invalidas ?? 0) > 0 ? Color.red : nil)
                Numero(titulo: "Cobertura", valor: Fmt.pct(r.cobertura), cor: Apresentacao.tomCobertura(r.cobertura).corOuNil)
                Numero(titulo: "Verificador", valor: r.aprovado.map { $0 ? "aprovado" : "reprovado" } ?? Fmt.vazio,
                       cor: r.aprovado == false ? Color.orange : nil)
            }
            }

            if let dec = d.decisao {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "arrow.triangle.branch").foregroundStyle(Marca.gradiente)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Decisão: \(dec.motor) · \(dec.formato.rotulo)").font(.callout.weight(.semibold))
                        Text(dec.motivo).font(.callout).foregroundStyle(.secondary).textSelection(.enabled)
                        HStack(spacing: 12) {
                            if let m = dec.maxSubagentes { Text("até \(m) subagentes") }
                            if let p = dec.prazoMs { Text("prazo \(Fmt.ms(p))") }
                            Text(dec.verificadorGlobal ? "verificador global ligado" : "só portão de citação")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                    Spacer()
                }
                .cartao(raio: 10, padding: 10)
            }

            if d.motivo != nil || d.erro != nil {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: r.status == .falhou ? "xmark.octagon.fill" : "exclamationmark.triangle.fill")
                        .foregroundStyle(r.status == .falhou ? .red : .orange)
                    VStack(alignment: .leading, spacing: 2) {
                        if let m = d.motivo { Text("Motivo: \(m)").font(.callout) }
                        if let e = d.erro { Text(e).font(.caption.monospaced()).foregroundStyle(.secondary).textSelection(.enabled) }
                    }
                    Spacer()
                }
                .padding(10)
                .background((r.status == .falhou ? Color.red : Color.orange).opacity(0.10),
                            in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
        }
    }
}

private extension Tom {
    var corOuNil: Color? { self == .normal ? nil : cor }
}

private struct Numero: View {
    let titulo: String
    let valor: String
    var cor: Color? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(titulo).font(.caption2.weight(.medium)).foregroundStyle(.secondary)
            Text(valor)
                .font(.headline.monospacedDigit())
                .foregroundStyle(cor.map { AnyShapeStyle($0) } ?? AnyShapeStyle(.primary))
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .frame(minWidth: 82, alignment: .leading)
        .background(Color.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

// MARK: - Texto final (markdown com [E#] clicável)

private struct AbaTexto: View {
    let d: TarefaDetalhe
    @Binding var selecionada: Evidencia.ID?
    var verNaTabela: () -> Void

    var body: some View {
        let blocos = TextoFinal.blocos(d.texto)
        let conhecidas = Set(d.listaEvidencias.map(\.chave))
        HStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    if !d.texto.isEmpty {
                        HStack {
                            Spacer()
                            Button { copiar(d.texto) } label: { Label("Copiar markdown", systemImage: "doc.on.doc") }
                                .buttonStyle(.borderless)
                                .font(.caption)
                        }
                    }
                    if blocos.isEmpty {
                        Text(d.resumo.estaRodando ? "O texto final aparece quando a tarefa terminar." : "(sem texto)")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(blocos) { b in
                        BlocoView(bloco: b, conhecidas: conhecidas, selecionada: selecionada)
                    }
                }
                // sem .textSelection aqui: no macOS, Text selecionável pode engolir o clique nos links [E#]
                .frame(maxWidth: 760, alignment: .leading)
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .environment(\.openURL, OpenURLAction { url in
                if let chave = TextoFinal.chave(da: url) {
                    selecionada = chave
                    return .handled
                }
                return .systemAction
            })

            Divider()

            InspetorEvidencia(evidencia: d.listaEvidencias.first { $0.chave == selecionada }, chave: selecionada,
                              verNaTabela: verNaTabela)
                .frame(width: 300)
        }
    }
}

struct BlocoView: View {
    let bloco: BlocoTexto
    let conhecidas: Set<String>
    let selecionada: String?

    var body: some View {
        switch bloco.tipo {
        case .titulo(let nivel):
            Text(atribuido)
                .font(nivel <= 1 ? .title2.weight(.semibold) : (nivel == 2 ? .title3.weight(.semibold) : .headline))
                .padding(.top, nivel <= 2 ? 8 : 4)
        case .paragrafo:
            Text(atribuido).font(.body).lineSpacing(3)
        case .item:
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                if bloco.markdown.first?.isNumber != true { Text("•").foregroundStyle(Marca.ciano) }
                Text(atribuido).lineSpacing(3)
            }
            .padding(.leading, 6)
        case .citacao:
            Text(atribuido)
                .italic()
                .foregroundStyle(.secondary)
                .padding(.leading, 12)
                .overlay(alignment: .leading) { Rectangle().fill(Marca.ciano.opacity(0.6)).frame(width: 3) }
        case .codigo:
            Text(bloco.markdown)
                .font(.system(.callout, design: .monospaced))
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 8))
        }
    }

    /// Markdown inline → AttributedString; cada [E#] vira link destacado (vermelho se a chave não
    /// existe na tabela de evidências). Se o markdown não parsear, cai no texto puro.
    private var atribuido: AttributedString {
        let opcoes = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        var a = (try? AttributedString(markdown: bloco.markdown, options: opcoes)) ?? AttributedString(bloco.markdown)
        let alvos: [(Range<AttributedString.Index>, String)] = a.runs.compactMap { run in
            guard let url = run.link, let chave = TextoFinal.chave(da: url) else { return nil }
            return (run.range, chave)
        }
        for (faixa, chave) in alvos {
            // valores com tipo explícito (Font/Color): no macOS, `.font`/`.foregroundColor` existem
            // também no escopo do AppKit (NSFont/NSColor) e o literal implícito ficaria ambíguo
            let fonte: Font = Font.body.monospacedDigit().weight(.semibold)
            a[faixa].font = fonte
            if !conhecidas.contains(chave) {
                let vermelho: Color = Color.red
                a[faixa].foregroundColor = vermelho
            } else {
                let ciano: Color = Marca.ciano
                a[faixa].foregroundColor = ciano
                if chave == selecionada {
                    let fundo: Color = Marca.ciano.opacity(0.22)
                    a[faixa].backgroundColor = fundo
                }
            }
        }
        return a
    }
}

private struct InspetorEvidencia: View {
    let evidencia: Evidencia?
    let chave: String?
    var verNaTabela: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Evidência").font(.headline)
            if let e = evidencia {
                Text("[\(e.chave)]").font(.title2.weight(.semibold).monospacedDigit()).foregroundStyle(Marca.gradiente)
                Text(e.claim).font(.callout).textSelection(.enabled)
                Divider()
                FonteEvidenciaView(fonte: e.source)
                VStack(alignment: .leading, spacing: 4) {
                    if let f = e.ferramenta { Label(f, systemImage: "wrench.and.screwdriver").font(.caption) }
                    if let a = e.agente { Label(a, systemImage: "person.fill").font(.caption) }
                }
                .foregroundStyle(.secondary)
                Button("Ver na tabela de evidências", action: verNaTabela).buttonStyle(.link)
            } else if let chave {
                Label("[\(chave)] não está na tabela de evidências: é uma citação sem lastro.", systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red)
                    .font(.callout)
            } else {
                Text("Clique numa chave [E#] do texto para ver a evidência que a sustenta.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(18)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(.regularMaterial)
    }
}

private struct FonteEvidenciaView: View {
    let fonte: FonteEvidencia?

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            if let u = fonte?.urlValida {
                Link(destination: u) {
                    Label(fonte?.title ?? u.absoluteString, systemImage: "link")
                        .multilineTextAlignment(.leading)
                }
                .font(.callout.weight(.medium))
            } else {
                Text(fonte?.title ?? "(fonte sem título)").font(.callout.weight(.medium))
            }
            let meta = [fonte?.authors, fonte?.year.map(String.init)].compactMap { $0 }.joined(separator: " · ")
            if !meta.isEmpty { Text(meta).font(.caption).foregroundStyle(.secondary) }
        }
    }
}

// MARK: - Linha do tempo

private struct AbaLinhaDoTempo: View {
    let d: TarefaDetalhe

    var body: some View {
        let itens = LinhaDoTempo.itens(d.eventos)
        if itens.isEmpty {
            TelaVazia(titulo: "Sem eventos", mensagem: nil, icone: "clock")
        } else {
            List(itens) { item in
                HStack(alignment: .top, spacing: 12) {
                    Text(item.quando)
                        .font(.callout.monospacedDigit())
                        .foregroundStyle(.secondary)
                        .frame(width: 96, alignment: .trailing)
                    ZStack {
                        Circle().fill(item.fase.cor.opacity(0.16)).frame(width: 26, height: 26)
                        Image(systemName: item.fase.icone).font(.system(size: 11, weight: .semibold)).foregroundStyle(item.fase.cor)
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.rotulo).textSelection(.enabled)
                        HStack(spacing: 8) {
                            Text(item.fase.bruto.isEmpty ? "?" : item.fase.bruto)
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(item.fase.cor)
                            if let a = item.agente { Text(a).font(.caption).foregroundStyle(.secondary) }
                            if let delta = item.delta { Text(delta).font(.caption.monospacedDigit()).foregroundStyle(.tertiary) }
                        }
                    }
                    Spacer()
                }
                .padding(.vertical, 3)
            }
            .listStyle(.inset)
            .scrollContentBackground(.hidden)
            .overlay(alignment: .bottom) {
                if d.resumo.estaRodando {
                    HStack(spacing: 6) {
                        ProgressView().controlSize(.small)
                        Text("Rodando · atualiza a cada 3 s").font(.caption)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.regularMaterial, in: Capsule())
                    .padding(12)
                }
            }
        }
    }
}

// MARK: - Subagentes

private struct AbaSubagentes: View {
    let d: TarefaDetalhe
    var abrirEvidencia: (String) -> Void

    var body: some View {
        if let raiz = ArvoreSubagentes.construir(eventos: d.eventos, evidencias: d.listaEvidencias, nomeMotor: d.resumo.nomeMotor) {
            List {
                Section {
                    LinhaNo(no: raiz, abrirEvidencia: abrirEvidencia)
                }
                Section("Subagentes") {
                    ForEach(raiz.filhos ?? []) { sub in
                        if let chamadas = sub.filhos, !chamadas.isEmpty {
                            DisclosureGroup {
                                ForEach(chamadas) { c in LinhaNo(no: c, abrirEvidencia: abrirEvidencia) }
                            } label: {
                                LinhaNo(no: sub, abrirEvidencia: abrirEvidencia)
                            }
                        } else {
                            LinhaNo(no: sub, abrirEvidencia: abrirEvidencia)
                        }
                    }
                }
            }
            .listStyle(.inset)
        } else {
            TelaVazia(titulo: "Sem subagentes",
                      mensagem: d.resumo.formato == .enxame
                          ? "O orquestrador ainda não delegou nenhuma parte."
                          : "Este motor trabalha sozinho (formato \(d.resumo.formato.rotulo)).",
                      icone: "person.3.sequence")
        }
    }
}

private struct LinhaNo: View {
    let no: NoAgente
    var abrirEvidencia: (String) -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icone)
                .foregroundStyle(cor)
                .frame(width: 22)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(no.tipo == .subagente ? (no.numero.map { "Subagente \($0)" } ?? no.nome) : no.nome)
                        .font(no.tipo == .chamada ? .callout : .callout.weight(.semibold))
                    if let m = no.modelo { Pilula(texto: m, cor: .indigo) }
                    if let l = no.lote, no.tipo == .subagente { Text("lote \(l)").font(.caption2).foregroundStyle(.tertiary) }
                }
                if let t = no.titulo { Text(t).font(.callout).foregroundStyle(.secondary) }
                if !no.evidencias.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(no.evidencias, id: \.self) { c in
                            Button("[\(c)]") { abrirEvidencia(c) }
                                .buttonStyle(.plain)
                                .font(.caption.monospacedDigit().weight(.semibold))
                                .foregroundStyle(Marca.ciano)
                        }
                    }
                }
            }
            Spacer()
            if let t = no.inicio {
                Text(Fmt.relativoTarefa(t)).font(.caption.monospacedDigit()).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }

    private var icone: String {
        switch no.tipo {
        case .orquestrador: "point.3.connected.trianglepath.dotted"
        case .subagente: "person.fill"
        case .chamada: "wrench.and.screwdriver"
        }
    }

    private var cor: Color {
        switch no.tipo {
        case .orquestrador: Marca.azul
        case .subagente: .indigo
        case .chamada: Marca.ciano
        }
    }
}

// MARK: - Evidências

private struct AbaEvidencias: View {
    let d: TarefaDetalhe
    @Binding var selecionada: Evidencia.ID?

    var body: some View {
        if d.listaEvidencias.isEmpty {
            TelaVazia(titulo: "Sem evidências", mensagem: "Nenhuma ferramenta devolveu achados (ainda).", icone: "quote.opening")
        } else {
            ScrollViewReader { proxy in
                Table(d.listaEvidencias, selection: $selecionada) {
                    TableColumn("Chave") { (e: Evidencia) in
                        Text("[\(e.chave)]").font(.body.monospacedDigit().weight(.semibold)).foregroundStyle(Marca.ciano)
                    }
                    .width(56)
                    TableColumn("Afirmação") { (e: Evidencia) in
                        Text(e.claim).lineLimit(3).help(e.claim)
                    }
                    .width(min: 220, ideal: 360)
                    TableColumn("Fonte") { (e: Evidencia) in
                        FonteEvidenciaView(fonte: e.source)
                    }
                    .width(min: 200, ideal: 280)
                    TableColumn("Ferramenta") { (e: Evidencia) in
                        Text(e.ferramenta ?? Fmt.vazio).font(.callout.monospaced())
                    }
                    .width(min: 100, ideal: 130)
                    TableColumn("Agente") { (e: Evidencia) in
                        Text(e.agente ?? Fmt.vazio).foregroundStyle(.secondary)
                    }
                    .width(min: 100, ideal: 170)
                }
                .onAppear {
                    if let s = selecionada { proxy.scrollTo(s, anchor: .center) }
                }
                .onChange(of: selecionada) {
                    if let s = selecionada { withAnimation { proxy.scrollTo(s, anchor: .center) } }
                }
            }
        }
    }
}

// MARK: - Ledger

private struct AbaLedger: View {
    let d: TarefaDetalhe

    var body: some View {
        let tot = Ledger.totais(d.ledger)
        VStack(spacing: 0) {
            Table(d.ledger) {
                TableColumn("Hora") { (l: LinhaLedger) in
                    Text(l.at.map { $0.formatted(date: .omitted, time: .standard) } ?? Fmt.vazio).monospacedDigit()
                }
                .width(72)
                TableColumn("Modelo") { (l: LinhaLedger) in Text(l.model).font(.callout.monospaced()) }
                    .width(min: 120, ideal: 170)
                TableColumn("Provedor") { (l: LinhaLedger) in Text(l.provedor ?? Fmt.vazio) }
                    .width(min: 70, ideal: 90)
                TableColumn("Fase") { (l: LinhaLedger) in Text(l.phase ?? Fmt.vazio).foregroundStyle(.secondary) }
                    .width(min: 70, ideal: 90)
                TableColumn("Prompt") { (l: LinhaLedger) in
                    Text(Fmt.inteiro(l.promptTokens)).monospacedDigit().frame(maxWidth: .infinity, alignment: .trailing)
                }
                .width(70)
                TableColumn("Completion") { (l: LinhaLedger) in
                    Text(Fmt.inteiro(l.completionTokens)).monospacedDigit().frame(maxWidth: .infinity, alignment: .trailing)
                }
                .width(80)
                TableColumn("Tempo") { (l: LinhaLedger) in
                    Text(Fmt.ms(l.ms)).monospacedDigit().frame(maxWidth: .infinity, alignment: .trailing)
                }
                .width(80)
                TableColumn("Status") { (l: LinhaLedger) in
                    if l.ok {
                        Label("ok", systemImage: "checkmark.circle.fill").foregroundStyle(.green)
                    } else {
                        Label(l.erro ?? "erro", systemImage: "xmark.circle.fill").foregroundStyle(.red).help(l.erro ?? "erro")
                    }
                }
                .width(min: 60, ideal: 140)
                TableColumn("Custo") { (l: LinhaLedger) in
                    Text(Fmt.usd(l.custoUsd)).monospacedDigit().frame(maxWidth: .infinity, alignment: .trailing)
                }
                .width(90)
            }

            HStack(spacing: 18) {
                Text("Totais").font(.headline)
                Total(titulo: "chamadas", valor: "\(tot.chamadas)")
                Total(titulo: "falhas", valor: "\(tot.falhas)", cor: tot.falhas > 0 ? Color.red : nil)
                Total(titulo: "prompt", valor: Fmt.tokens(tot.promptTokens))
                Total(titulo: "completion", valor: Fmt.tokens(tot.completionTokens))
                Total(titulo: "tempo somado", valor: Fmt.ms(tot.ms))
                Spacer()
                Total(titulo: "custo", valor: Fmt.usd(tot.custoUsd), cor: Marca.ciano)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.bar)
        }
    }
}

private struct Total: View {
    let titulo: String
    let valor: String
    var cor: Color? = nil

    var body: some View {
        HStack(spacing: 4) {
            Text(titulo).font(.caption).foregroundStyle(.secondary)
            Text(valor).font(.callout.weight(.semibold).monospacedDigit())
                .foregroundStyle(cor.map { AnyShapeStyle($0) } ?? AnyShapeStyle(.primary))
        }
    }
}
