import Charts
import HermesCore
import SwiftUI

/// Janela de uso da tela de agentes.
enum JanelaAgentes: Int, CaseIterable, Identifiable {
    case umDia = 1, seteDias = 7, trintaDias = 30
    var id: Int { rawValue }
    var rotulo: String {
        switch self {
        case .umDia: "24 h"
        case .seteDias: "7 dias"
        case .trintaDias: "30 dias"
        }
    }
}

/// Os AGENTES DA CASA (`GET /agentes`): personas, os 17 mentores e os criados no admin — o que cada um sabe
/// fazer, com que prompt, em que bases, e o que fez em produção (TokenLedger). Atualiza a cada 30 s.
struct AgentesView: View {
    @Environment(EstadoApp.self) private var estado
    @State private var janela: JanelaAgentes = .seteDias
    @State private var resposta: RespostaAgentes?
    @State private var erro: String?
    @State private var carregando = false
    @State private var atualizadoEm: Date?
    @State private var busca = ""
    @State private var selecionado: String?

    static let intervalo: Duration = .seconds(30)

    var body: some View {
        HStack(spacing: 0) {
            lista
                .frame(minWidth: 260, idealWidth: 300, maxWidth: 360)
            Divider()
            detalhe
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .navigationTitle("Agentes da casa")
        .toolbar {
            ToolbarItem(placement: .principal) {
                Picker("Janela", selection: $janela) {
                    ForEach(JanelaAgentes.allCases) { j in Text(j.rotulo).tag(j) }
                }
                .pickerStyle(.segmented)
                .help("Janela do uso (TokenLedger)")
            }
        }
        .task(id: "\(janela.rawValue)|\(estado.urlServidor)|\(estado.token.count)") { await ciclo() }
    }

    // MARK: Lista

    private var lista: some View {
        VStack(spacing: 0) {
            cabecalhoLista
            if let r = resposta {
                List(selection: $selecionado) {
                    ForEach(Elenco.grupos(r.agentes, busca: busca)) { g in
                        Section("\(g.tipo == .persona ? "Agentes" : g.tipo == .mentor ? "Mentores" : g.tipo.rotulo) · \(g.agentes.count)") {
                            ForEach(g.agentes) { a in
                                LinhaAgente(agente: a).tag(a.id)
                            }
                        }
                    }
                }
                .listStyle(.sidebar)
            } else if let erro {
                TelaVazia(titulo: "Não deu para ler os agentes", mensagem: erro, icone: "person.3")
            } else {
                EsqueletoCartoes(quantidade: 8, altura: 38).padding(12)
                Spacer()
            }
        }
    }

    private var cabecalhoLista: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let r = resposta {
                let t = Elenco.totais(r.agentes)
                Text("\(t.agentes) agentes · \(t.trabalhando) trabalharam em \(janela.rotulo)")
                    .font(.callout.weight(.semibold))
                Text("\(Fmt.inteiro(t.chamadas)) chamadas · \(Fmt.inteiro(t.falhas)) falhas · \(Fmt.usd(t.custoUsd))")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
                if !r.bancoOk {
                    Label("Banco fora: elenco do código, sem uso", systemImage: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
            }
            HStack(spacing: 6) {
                if carregando {
                    ProgressView().controlSize(.mini)
                } else if let atualizadoEm {
                    Text("atualizado \(Fmt.ha(atualizadoEm))").font(.caption2).foregroundStyle(.secondary)
                }
                if let erro, resposta != nil {
                    Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange).help(erro)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            TextField("Buscar agente ou curso", text: $busca)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
        }
    }

    // MARK: Detalhe

    @ViewBuilder
    private var detalhe: some View {
        if let id = selecionado, let a = resposta?.agentes.first(where: { $0.id == id }) {
            DetalheAgente(agente: a, janela: janela)
                .id(a.id)
        } else if resposta != nil {
            TelaVazia(titulo: "Escolha um agente", mensagem: "Cada agente mostra o que sabe fazer, o prompt, as bases que lê e o que fez em produção.",
                      icone: "person.crop.rectangle.stack")
        } else {
            Color.clear
        }
    }

    private func ciclo() async {
        while !Task.isCancelled {
            carregando = true
            do {
                let r = try await estado.fonte.agentes(dias: janela.rawValue)
                guard !Task.isCancelled else { return }
                resposta = r
                erro = nil
                atualizadoEm = Date()
                if selecionado == nil { selecionado = r.agentes.first?.id }
            } catch {
                guard !Task.isCancelled else { return }
                self.erro = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
            carregando = false
            try? await Task.sleep(for: Self.intervalo)
        }
    }
}

private struct LinhaAgente: View {
    let agente: AgenteCasa

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(!agente.ativo ? Color.gray : agente.ativoNaJanela ? Color.green : Color.secondary.opacity(0.35))
                .frame(width: 8, height: 8)
                .help(!agente.ativo ? "Desativado no Modo CEO" : agente.ativoNaJanela ? "Trabalhou na janela" : "Sem chamadas na janela")
            VStack(alignment: .leading, spacing: 1) {
                Text(agente.nome).lineLimit(1)
                Text(agente.curso ?? agente.ondeTrabalha.first ?? agente.id)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 4)
            if agente.uso.chamadas > 0 {
                Text(Fmt.inteiro(agente.uso.chamadas))
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(agente.uso.falhas > 0 ? .orange : .secondary)
            }
        }
    }
}

private struct DetalheAgente: View {
    let agente: AgenteCasa
    let janela: JanelaAgentes
    @State private var mostrarPrompt = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                cabecalho
                cartoes
                if !agente.uso.porDia.isEmpty { grafico }
                HStack(alignment: .top, spacing: 16) {
                    listaContagem("Modelos", agente.uso.modelos, icone: "cpu")
                    listaContagem("Onde", agente.uso.superficies, icone: "rectangle.on.rectangle")
                    listaContagem("Erros", agente.uso.erros, icone: "exclamationmark.triangle", cor: .orange)
                }
                capacidades
                if !agente.prompt.isEmpty { prompt }
            }
            .padding(24)
            .frame(maxWidth: 1_100, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Marca.gradienteSuave.opacity(0.25))
    }

    private var cabecalho: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(agente.nome).font(.largeTitle.weight(.semibold))
                Pilula(texto: agente.tipo.rotulo, cor: Marca.ciano)
                if !agente.ativo { Pilula(texto: "desativado", cor: .gray, icone: "pause.circle") }
                if !agente.conversacional { Pilula(texto: "silencioso", cor: .gray) }
                Spacer()
                Text(agente.id).font(.caption.monospaced()).foregroundStyle(.secondary).textSelection(.enabled)
            }
            if let curso = agente.curso { Text(curso).font(.title3).foregroundStyle(.secondary) }
            if !agente.bio.isEmpty { Text(agente.bio).font(.callout) }
            if let d = agente.distincao, d != agente.bio { Text(d).font(.callout).foregroundStyle(.secondary) }
            HStack(spacing: 6) {
                ForEach(agente.ondeTrabalha, id: \.self) { Pilula(texto: $0, cor: Marca.azul, icone: "mappin.and.ellipse") }
            }
        }
    }

    private var cartoes: some View {
        let u = agente.uso
        return LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
            Metrica(titulo: "Chamadas", valor: Fmt.inteiro(u.chamadas), detalhe: "\(Fmt.inteiro(u.turnos)) turnos")
            Metrica(titulo: "Falhas", valor: Fmt.pct(u.chamadas > 0 ? u.taxaFalha : nil), detalhe: "\(Fmt.inteiro(u.falhas)) chamadas",
                    cor: u.taxaFalha > 0.05 ? .orange : nil)
            Metrica(titulo: "Tempo p50 / p90", valor: Fmt.ms(u.msP50), detalhe: "p90 \(Fmt.ms(u.msP90))")
            Metrica(titulo: "Tokens", valor: Fmt.tokens(u.tokens), detalhe: "custo \(Fmt.usd(u.custoUsd))")
            Metrica(titulo: "Última chamada", valor: u.ultimo.map { Fmt.ha($0) } ?? Fmt.vazio, detalhe: "janela \(janela.rotulo)")
        }
    }

    private var grafico: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Chamadas por dia").tituloSecao()
            Chart(agente.uso.porDia) { d in
                BarMark(x: .value("Dia", String(d.dia.suffix(5))), y: .value("Chamadas", d.chamadas - d.falhas))
                    .foregroundStyle(by: .value("Resultado", "ok"))
                BarMark(x: .value("Dia", String(d.dia.suffix(5))), y: .value("Chamadas", d.falhas))
                    .foregroundStyle(by: .value("Resultado", "falha"))
            }
            .chartForegroundStyleScale(["ok": Marca.ciano, "falha": Color.orange])
            .frame(height: 160)
        }
        .cartao(padding: 14)
    }

    private func listaContagem(_ titulo: String, _ itens: [Contagem], icone: String, cor: Color = Marca.ciano) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(titulo, systemImage: icone).font(.headline)
            if itens.isEmpty {
                Text(Fmt.vazio).foregroundStyle(.secondary)
            } else {
                ForEach(itens) { i in
                    HStack {
                        Text(i.nome).font(.callout.monospaced()).lineLimit(1).truncationMode(.middle)
                        Spacer()
                        Text(Fmt.inteiro(i.chamadas)).font(.callout.monospacedDigit()).foregroundStyle(cor)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .cartao(padding: 14)
    }

    private var capacidades: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("O que sabe fazer").tituloSecao()
            grade("Habilidades", agente.habilidades, cor: Marca.ciano, vazio: "só a base")
            if !agente.habilidadesDegradadas.isEmpty {
                grade("Declaradas, ainda sem runtime", agente.habilidadesDegradadas, cor: .orange, vazio: "")
            }
            grade("Ferramentas (\(agente.ferramentas.count))", agente.ferramentas, cor: Marca.azul,
                  vazio: agente.tipo == .sistema ? "chamadas internas" : "nenhuma ferramenta do harness (fala no canal)")
            grade("Bases que lê", agente.datasets, cor: .green, vazio: "nenhuma base do RAG")
            if !agente.artefatos.isEmpty { grade("Artefatos assinatura", agente.artefatos, cor: .purple, vazio: "") }
            if !agente.fontes.isEmpty { grade("Fontes", agente.fontes, cor: .teal, vazio: "") }
            if let p = agente.protocolo {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Protocolo de raciocínio").font(.headline)
                    Text("\(p.ensemble) rascunho(s) · \(p.reflexoes) revisão(ões)").font(.callout.monospacedDigit())
                    if !p.porque.isEmpty { Text(p.porque).font(.callout).foregroundStyle(.secondary) }
                }
            }
            if let g = agente.guardrail {
                Label(g, systemImage: "shield.lefthalf.filled").font(.callout).foregroundStyle(.orange)
            }
            if agente.chavesLedger.count > 1 || agente.chavesLedger.first != agente.id {
                Text("Chaves do ledger: \(agente.chavesLedger.joined(separator: ", "))").font(.caption.monospaced()).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cartao(padding: 16)
    }

    private func grade(_ titulo: String, _ itens: [String], cor: Color, vazio: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(titulo).font(.headline)
            if itens.isEmpty {
                Text(vazio).font(.callout).foregroundStyle(.secondary)
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 6, alignment: .leading)], alignment: .leading, spacing: 6) {
                    ForEach(itens, id: \.self) { Pilula(texto: $0, cor: cor) }
                }
            }
        }
    }

    private var prompt: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Prompt").tituloSecao()
                Text("\(Fmt.inteiro(agente.prompt.count)) caracteres").font(.caption).foregroundStyle(.secondary)
                Spacer()
                Button("Copiar") { copiar(agente.prompt) }
                Button(mostrarPrompt ? "Recolher" : "Mostrar tudo") { mostrarPrompt.toggle() }
            }
            Text(mostrarPrompt ? agente.prompt : String(agente.prompt.prefix(600)) + (agente.prompt.count > 600 ? "…" : ""))
                .font(.callout.monospaced())
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .cartao(padding: 16)
    }
}

private struct Metrica: View {
    let titulo: String
    let valor: String
    var detalhe: String? = nil
    var cor: Color? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(titulo).font(.caption).foregroundStyle(.secondary)
            Text(valor).font(.title2.weight(.semibold).monospacedDigit()).foregroundStyle(cor ?? .primary)
            if let detalhe { Text(detalhe).font(.caption.monospacedDigit()).foregroundStyle(.secondary) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cartao(padding: 12)
    }
}
