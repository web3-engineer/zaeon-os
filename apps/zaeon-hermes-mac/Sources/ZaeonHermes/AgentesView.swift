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

/// Tela de UM agente da casa (a lista mora na barra lateral, seção "Agentes da casa"). Os dados vêm do
/// `EstadoApp` (`GET /agentes`, atualizado a cada 30 s); a janela do uso fica na barra de ferramentas.
struct AgenteTela: View {
    @Environment(EstadoApp.self) private var estado
    let agenteId: String

    var body: some View {
        @Bindable var estado = estado
        Group {
            if let a = estado.agentes?.agentes.first(where: { $0.id == agenteId }) {
                DetalheAgente(agente: a, janela: estado.janelaAgentes)
                    .id(a.id)
            } else if let erro = estado.erroAgentes {
                TelaVazia(titulo: "Não deu para ler os agentes", mensagem: erro, icone: "person.3")
            } else if estado.agentes != nil {
                TelaVazia(titulo: "Agente não encontrado", mensagem: "\(agenteId) não está mais no elenco.", icone: "person.crop.circle.badge.questionmark")
            } else {
                EsqueletoCartoes(quantidade: 4, altura: 120).padding(24)
            }
        }
        .navigationTitle(estado.agentes?.agentes.first(where: { $0.id == agenteId })?.nome ?? "Agente")
        .toolbar {
            ToolbarItem(placement: .principal) {
                Picker("Janela", selection: $estado.janelaAgentes) {
                    ForEach(JanelaAgentes.allCases) { j in Text(j.rotulo).tag(j) }
                }
                .pickerStyle(.segmented)
                .help("Janela do uso (TokenLedger)")
            }
        }
    }
}

struct LinhaAgente: View {
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
