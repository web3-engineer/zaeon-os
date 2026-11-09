import AppKit
import HermesCore
import Observation
import SwiftUI

/// Uma linha do terminal.
struct LinhaTerminal: Identifiable, Hashable {
    enum Tipo: Hashable { case entrada, saida, erro, sistema, agente, passo }
    let id: Int
    let texto: String
    let tipo: Tipo
}

/// O estado do terminal sobrevive à troca de tela (a conversa continua rodando no servidor).
@MainActor
@Observable
final class EstadoTerminal {
    private(set) var linhas: [LinhaTerminal] = []
    private(set) var agente = Terminal.agentePadrao
    private(set) var ocupado = false
    var entrada = ""
    @ObservationIgnored private var historico: [String] = []
    @ObservationIgnored private var indiceHistorico: Int?
    @ObservationIgnored private var conversaId: String?
    @ObservationIgnored private var proximoId = 0

    static let maxLinhas = 3_000

    init() { boasVindas() }

    func reiniciar() {
        linhas = []
        conversaId = nil
        agente = Terminal.agentePadrao
        boasVindas()
    }

    private func boasVindas() {
        escrever("Terminal da orquestra · fala com a Zaeon, não executa nada na sua máquina nem no servidor.", .sistema)
        escrever("Agente em uso: \(agente). Escreva para conversar ou /ajuda para ver os comandos.", .sistema)
    }

    func escrever(_ texto: String, _ tipo: LinhaTerminal.Tipo = .saida) {
        for l in texto.components(separatedBy: "\n") {
            linhas.append(LinhaTerminal(id: proximoId, texto: l, tipo: tipo))
            proximoId += 1
        }
        if linhas.count > Self.maxLinhas { linhas.removeFirst(linhas.count - Self.maxLinhas) }
    }

    // MARK: histórico (↑/↓)

    func anterior() {
        guard !historico.isEmpty else { return }
        let i = max(0, (indiceHistorico ?? historico.count) - 1)
        indiceHistorico = i
        entrada = historico[i]
    }

    func seguinte() {
        guard let i = indiceHistorico else { return }
        if i + 1 < historico.count { indiceHistorico = i + 1; entrada = historico[i + 1] } else { indiceHistorico = nil; entrada = "" }
    }

    // MARK: execução

    func enviar(_ estado: EstadoApp) async {
        let linha = entrada
        entrada = ""
        indiceHistorico = nil
        let t = linha.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, !ocupado else { return }
        if historico.last != t { historico.append(t) }
        escrever("\(agente) ❯ \(t)", .entrada)
        ocupado = true
        defer { ocupado = false }
        await executar(Terminal.interpretar(t), estado)
    }

    private func executar(_ c: ComandoTerminal, _ estado: EstadoApp) async {
        let fonte = estado.fonte
        do {
            switch c {
            case .vazio: break
            case .ajuda: Terminal.ajuda.forEach { escrever($0, .sistema) }
            case .limpar: linhas = []
            case .quem: escrever("Agente em uso: \(estado.nomeDe(agente)) (\(agente))", .sistema)
            case .nova:
                conversaId = nil
                escrever("A próxima mensagem abre uma conversa nova com \(estado.nomeDe(agente)).", .sistema)
            case .usar(let a):
                if estado.interlocutores.isEmpty { await estado.atualizarConversas() }
                guard let i = estado.interlocutores.first(where: { $0.id == a }) else {
                    escrever("Agente desconhecido: \(a). Veja /agentes e /motores.", .erro)
                    return
                }
                guard i.disponivel else { escrever("\(i.nome) está sem chave no servidor.", .erro); return }
                agente = i.id
                conversaId = nil
                escrever("Agora você fala com \(i.nome).", .sistema)
            case .falar(let alvo, let texto):
                try await falar(alvo ?? agente, texto, estado)
            case .agentes:
                let r = try await fonte.agentes(dias: 7)
                Terminal.linhas(agentes: r.agentes).forEach { escrever($0) }
            case .motores:
                let p = try await fonte.painel()
                Terminal.linhas(motores: p.motores).forEach { escrever($0) }
            case .conversas:
                let l = try await fonte.conversas()
                if estado.interlocutores.isEmpty { await estado.atualizarConversas() }
                Terminal.linhas(conversas: l, nomes: estado.interlocutores).forEach { escrever($0) }
            case .tarefas(let n):
                Terminal.linhas(tarefas: try await fonte.tarefas(motor: nil, status: nil, limite: n)).forEach { escrever($0) }
            case .tarefa(let id):
                try await mostrarTarefa(id, fonte)
            case .saude(let h):
                Terminal.linhas(saude: try await fonte.saude(horas: h)).forEach { escrever($0) }
            case .desconhecido(let msg):
                escrever(msg, .erro)
            }
        } catch {
            escrever((error as? LocalizedError)?.errorDescription ?? error.localizedDescription, .erro)
        }
    }

    /// Manda a mensagem e acompanha o turno: cada passo novo vira uma linha "·", e no fim vem a resposta.
    private func falar(_ alvo: String, _ texto: String, _ estado: EstadoApp) async throws {
        let fonte = estado.fonte
        var conversa = alvo == agente ? conversaId : nil
        if conversa == nil {
            let c = try await estado.novaConversaSemNavegar(com: alvo)
            conversa = c
            if alvo == agente { conversaId = c }
        }
        guard let id = conversa else { return }
        let tarefa = try await fonte.enviarMensagem(conversa: id, texto: texto)
        var vistos = 0
        let inicio = Date()
        while !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(1_200))
            let c = try await fonte.conversa(id: id)
            guard let m = c.mensagens.last(where: { $0.tarefaId == tarefa }) else { continue }
            let eventos = m.aoVivo?.eventos ?? []
            if eventos.count > vistos {
                eventos[vistos...].forEach { escrever("  · \($0.rotulo)", .passo) }
                vistos = eventos.count
            }
            if !m.rodando {
                if m.status == .falhou { escrever(m.texto.isEmpty ? "O turno falhou." : m.texto, .erro) }
                else { escrever("\(estado.nomeDe(alvo)):", .sistema); escrever(m.texto, .agente) }
                let pe = [m.ms.map { Fmt.ms($0) }, m.modelo, "tarefa \(tarefa)"].compactMap { $0 }
                escrever("  " + pe.joined(separator: " · "), .sistema)
                await estado.atualizarConversas()
                return
            }
            if Date().timeIntervalSince(inicio) > 15 * 60 {
                escrever("Ainda rodando depois de 15 min. Acompanhe com /tarefa \(tarefa).", .erro)
                return
            }
        }
    }

    private func mostrarTarefa(_ id: String, _ fonte: any FonteHermes) async throws {
        let d = try await fonte.tarefa(id: id)
        let r = d.resumo
        escrever("\(r.nomeMotor) · \(r.status.bruto) · \(Fmt.ms(r.ms)) · \(Fmt.usd(r.custoUsd))", .sistema)
        escrever("pedido: \(r.objetivo)")
        if !d.eventos.isEmpty {
            escrever("passos:", .sistema)
            d.eventos.forEach { escrever("  \(Terminal.coluna(Fmt.ms($0.t), 10)) \($0.agente.map { "\($0) · " } ?? "")\($0.rotulo)", .passo) }
        }
        if !d.ledger.isEmpty {
            escrever("ledger:", .sistema)
            d.ledger.forEach { l in
                escrever("  \(l.ok ? "✓" : "✗") \(Terminal.coluna(l.model, 28)) \(Terminal.coluna(l.provedor ?? "?", 12)) \(l.promptTokens)+\(l.completionTokens) tok · \(Fmt.ms(l.ms)) · \(Fmt.usd(l.custoUsd))\(l.erro.map { " · \($0)" } ?? "")")
            }
        }
        if !d.texto.isEmpty {
            escrever("texto:", .sistema)
            let linhas = d.texto.components(separatedBy: "\n")
            escrever(linhas.prefix(40).joined(separator: "\n"), .agente)
            if linhas.count > 40 { escrever("  … (+\(linhas.count - 40) linhas — veja a tarefa no Quadro)", .sistema) }
        }
        if let e = d.erro { escrever("erro: \(e)", .erro) }
    }
}

/// O terminal: tela monoespaçada, fundo escuro, prompt com o agente em uso.
struct TerminalView: View {
    @Environment(EstadoApp.self) private var estado
    @FocusState private var focado: Bool

    var body: some View {
        @Bindable var t = estado.terminal
        VStack(spacing: 0) {
            ScrollViewReader { rolar in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 1) {
                        ForEach(t.linhas) { l in
                            Text(l.texto.isEmpty ? " " : l.texto)
                                .font(.system(size: 12.5, design: .monospaced))
                                .foregroundStyle(cor(l.tipo))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .id(l.id)
                        }
                    }
                    .textSelection(.enabled)
                    .padding(14)
                }
                .onChange(of: t.linhas.last?.id) {
                    if let id = t.linhas.last?.id { rolar.scrollTo(id, anchor: .bottom) }
                }
            }
            HStack(spacing: 8) {
                Text("\(t.agente) ❯")
                    .font(.system(size: 12.5, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Marca.cianoVivo)
                TextField("", text: $t.entrada)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12.5, design: .monospaced))
                    .foregroundStyle(.white)
                    .focused($focado)
                    .disabled(t.ocupado)
                    .onSubmit { Task { await t.enviar(estado); focado = true } }
                    .onKeyPress(.upArrow) { t.anterior(); return .handled }
                    .onKeyPress(.downArrow) { t.seguinte(); return .handled }
                if t.ocupado { ProgressView().controlSize(.mini).tint(.white) }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.white.opacity(0.04))
        }
        .background(Color(hex: 0x0B0F14))
        .environment(\.colorScheme, .dark)
        .navigationTitle("Terminal")
        .onAppear { focado = true }
        .onTapGesture { focado = true }
    }

    private func cor(_ tipo: LinhaTerminal.Tipo) -> Color {
        switch tipo {
        case .entrada: Marca.cianoVivo
        case .saida: Color.white.opacity(0.88)
        case .erro: Color.orange
        case .sistema: Color.white.opacity(0.5)
        case .agente: Color.white
        case .passo: Marca.ciano.opacity(0.75)
        }
    }
}
