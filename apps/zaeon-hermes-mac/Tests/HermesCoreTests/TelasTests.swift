import XCTest
@testable import HermesCore

final class QuadroTests: XCTestCase {
    var painel: Painel!

    override func setUpWithError() throws {
        painel = try Fixtures.decodificar(Painel.self, de: .painel)
    }

    func testColunasFixasEContagens() {
        let cols = Quadro.colunas(painel.tarefas)
        XCTAssertEqual(cols.map(\.coluna), [.rodando, .concluida, .fallback, .falhou])
        XCTAssertEqual(cols.map { $0.tarefas.count }, [2, 6, 2, 1])
        XCTAssertEqual(cols.map(\.titulo), ["Rodando", "Concluída", "Fallback (Aura assumiu)", "Falhou"])
        // dentro da coluna, a mais recente primeiro
        let concl = cols[1].tarefas
        XCTAssertEqual(concl, concl.sorted { $0.criadaEm > $1.criadaEm })
    }

    func testColunaOutrosSoComStatusNovo() throws {
        let tol = try Fixtures.decodificar(Painel.self, de: .painelTolerante)
        let cols = Quadro.colunas(tol.tarefas)
        XCTAssertEqual(cols.last?.coluna, .outros)
        XCTAssertEqual(cols.last?.tarefas.first?.status, .desconhecido("pausada"))
        XCTAssertEqual(cols.count, 5)
    }

    func testFiltroPorMotorEOrigem() {
        let soKimi = Quadro.colunas(painel.tarefas, filtro: FiltroTarefas(motor: "kimi-enxame"))
        XCTAssertEqual(soKimi.flatMap(\.tarefas).count, 3)
        let arena = FiltroTarefas(origem: .arena).aplicar(painel.tarefas)
        XCTAssertEqual(arena.count, 5)
        XCTAssertTrue(arena.allSatisfy { $0.origem == .arena })
        let ambos = FiltroTarefas(motor: "enxame-misto", origem: .arena).aplicar(painel.tarefas)
        XCTAssertEqual(ambos.count, 2)
    }

    func testBuscaIgnoraAcento() {
        let r = FiltroTarefas(busca: "amazonia").aplicar(painel.tarefas)
        XCTAssertEqual(r.map(\.id), ["6730a1f0c9e77b2a1d4e9f03"])
        XCTAssertEqual(FiltroTarefas(busca: "  ").aplicar(painel.tarefas).count, 11)
    }

    func testOrdenacoes() {
        let lentas = FiltroTarefas(ordem: .maisLentas).aplicar(painel.tarefas)
        XCTAssertEqual(lentas.first?.ms, 480_000)
        XCTAssertNil(lentas.last?.ms, "rodando (sem ms) vai para o fim")
        let caras = FiltroTarefas(ordem: .maisCaras).aplicar(painel.tarefas)
        XCTAssertEqual(caras.first?.custoUsd, 0.6118)
        let inv = FiltroTarefas(ordem: .maisInvalidas).aplicar(painel.tarefas)
        XCTAssertEqual(inv.first?.invalidas, 2)
    }

    func testMotoresPresentes() {
        let m = Quadro.motoresPresentes(painel.tarefas)
        XCTAssertEqual(m.count, 5)
        XCTAssertEqual(m.first?.nome, "Aura")
    }

    func testApresentacaoCartao() {
        let t = painel.tarefas.first { $0.id == "6730a1f0c9e77b2a1d4e9f05" }!
        let a = ApresentacaoCartao(t)
        XCTAssertEqual(a.ms, "3 min 06 s")
        XCTAssertEqual(a.custo, "US$ 0,09")
        XCTAssertEqual(a.invalidas, "2 inventadas")
        XCTAssertEqual(a.tomInvalidas, .ruim)
        XCTAssertEqual(a.cobertura, "71%")
        XCTAssertEqual(a.tomCobertura, .alerta)
        XCTAssertNil(a.subagentes)
        XCTAssertEqual(a.intent, "pesquisar fontes")

        let rodando = ApresentacaoCartao(painel.tarefas[0])
        XCTAssertEqual(rodando.ms, "—")
        XCTAssertEqual(rodando.custo, "—")
        XCTAssertEqual(rodando.invalidas, "—")
        XCTAssertEqual(rodando.tomInvalidas, .normal)

        let enxame = ApresentacaoCartao(painel.tarefas[2])
        XCTAssertEqual(enxame.subagentes, "3 subagentes")
        XCTAssertEqual(enxame.tomInvalidas, .normal)
    }
}

final class FormatacaoTests: XCTestCase {
    func testDuracao() {
        XCTAssertEqual(Fmt.ms(nil), "—")
        XCTAssertEqual(Fmt.ms(850), "850 ms")
        XCTAssertEqual(Fmt.ms(12_345), "12,3 s")
        XCTAssertEqual(Fmt.ms(125_000), "2 min 05 s")
        XCTAssertEqual(Fmt.ms(3_725_000), "1 h 02 min")
        XCTAssertEqual(Fmt.ms(-1), "—")
    }

    func testDinheiroENumeros() {
        XCTAssertEqual(Fmt.usd(0.42), "US$ 0,42")
        XCTAssertEqual(Fmt.usd(0.0031), "US$ 0,0031")
        XCTAssertEqual(Fmt.usd(0), "US$ 0,00")
        XCTAssertEqual(Fmt.usd(1234.5), "US$ 1.234,50")
        XCTAssertEqual(Fmt.usd(nil), "—")
        XCTAssertEqual(Fmt.inteiro(56_789), "56.789")
        XCTAssertEqual(Fmt.inteiro(412_907), "412.907")
        XCTAssertEqual(Fmt.inteiro(1_234_567), "1.234.567")
        XCTAssertEqual(Fmt.inteiro(12), "12")
        XCTAssertEqual(Fmt.inteiro(nil), "—")
        XCTAssertEqual(Fmt.pct(0.834), "83%")
        XCTAssertEqual(Fmt.pct(1), "100%")
        XCTAssertEqual(Fmt.pct(nil), "—")
        XCTAssertEqual(Fmt.decimal(-2.5, casas: 1), "-2,5")
        XCTAssertEqual(Fmt.tokens(1_234_567), "1,2 mi")
        XCTAssertEqual(Fmt.precoPorMilhao(0.95), "US$ 0,95/M")
    }

    func testTempoRelativo() {
        let agora = Date(timeIntervalSince1970: 1_000_000)
        XCTAssertEqual(Fmt.ha(agora, agora: agora), "agora")
        XCTAssertEqual(Fmt.ha(agora.addingTimeInterval(-30), agora: agora), "há 30 s")
        XCTAssertEqual(Fmt.ha(agora.addingTimeInterval(-180), agora: agora), "há 3 min")
        XCTAssertEqual(Fmt.ha(agora.addingTimeInterval(-7_200), agora: agora), "há 2 h")
        XCTAssertEqual(Fmt.ha(agora.addingTimeInterval(-86_400), agora: agora), "há 1 dia")
        XCTAssertEqual(Fmt.ha(agora.addingTimeInterval(60), agora: agora), "agora")
        XCTAssertEqual(Fmt.relativoTarefa(0), "+0,0 s")
        XCTAssertEqual(Fmt.relativoTarefa(18_660), "+18,7 s")
        XCTAssertEqual(Fmt.relativoTarefa(251_020), "+4 min 11 s")
    }
}

final class EstatisticasTests: XCTestCase {
    func testCartoesDoMotor() throws {
        let p = try Fixtures.decodificar(Painel.self, de: .painel)
        let c = Estatisticas.cartoes(try XCTUnwrap(p.motor("kimi-enxame")).metricas)
        XCTAssertEqual(c.map(\.id), ["tarefas", "concluidas", "fallbacks", "degradadas", "p50", "p90", "custoMedio", "custoTotal",
                                     "invalidas", "cobertura", "subagentes"])
        let porId = Dictionary(uniqueKeysWithValues: c.map { ($0.id, $0) })
        XCTAssertEqual(porId["tarefas"]?.valor, "14")
        XCTAssertEqual(porId["concluidas"]?.detalhe, "79% do total")
        XCTAssertEqual(porId["p50"]?.valor, "5 min 12 s")
        XCTAssertEqual(porId["custoTotal"]?.valor, "US$ 6,02")
        XCTAssertEqual(porId["invalidas"]?.tom, .ruim)
        XCTAssertEqual(porId["cobertura"]?.valor, "84%")
        XCTAssertEqual(porId["cobertura"]?.tom, .bom)
        XCTAssertEqual(porId["subagentes"]?.valor, "4,6")
        XCTAssertEqual(porId["fallbacks"]?.tom, .alerta)

        let vazio = Estatisticas.cartoes(MetricasMotor())
        XCTAssertEqual(vazio.first { $0.id == "p50" }?.valor, "—")
        XCTAssertNil(vazio.first { $0.id == "concluidas" }?.detalhe)
        XCTAssertEqual(vazio.first { $0.id == "invalidas" }?.tom, .bom)
    }

    func testCalcularAPartirDasTarefas() throws {
        let p = try Fixtures.decodificar(Painel.self, de: .painel)
        let kimi = p.tarefas.filter { $0.motor == "kimi-enxame" }
        let m = Estatisticas.calcular(kimi)
        XCTAssertEqual(m.tarefas, 3)
        XCTAssertEqual(m.concluidas, 1)
        XCTAssertEqual(m.msP50, 15_200)
        XCTAssertEqual(m.msP90, 312_480)
        XCTAssertEqual(try XCTUnwrap(m.custoTotalUsd), 0.4472, accuracy: 0.00001)
        XCTAssertEqual(try XCTUnwrap(m.coberturaMedia), 0.43, accuracy: 0.00001)
        XCTAssertEqual(m.subagentesMedia, 1.5)

        let vazio = Estatisticas.calcular([])
        XCTAssertNil(vazio.msP50)
        XCTAssertNil(vazio.custoTotalUsd)
    }

    func testPercentil() {
        XCTAssertNil(Estatisticas.percentil([], 0.5))
        XCTAssertEqual(Estatisticas.percentil([1, 2, 3, 4], 0.5), 2)
        XCTAssertEqual(Estatisticas.percentil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9), 9)
        XCTAssertEqual(Estatisticas.percentil([7], 0.9), 7)
    }

    func testPontosDoGrafico() throws {
        let p = try Fixtures.decodificar(Painel.self, de: .painel)
        let pts = Estatisticas.pontosGrafico(p.tarefas, limite: 4)
        XCTAssertEqual(pts.count, 4)
        XCTAssertEqual(pts.map(\.rotulo), ["#1", "#2", "#3", "#4"])
        XCTAssertEqual(pts.last?.id, "6730a1f0c9e77b2a1d4e9f03", "a mais nova fica à direita")
        XCTAssertEqual(try XCTUnwrap(pts.last?.segundos), 312.48, accuracy: 0.001)
    }

    func testComparacaoDaArena() throws {
        let p = try Fixtures.decodificar(Painel.self, de: .painel)
        let arena = p.tarefas.filter { $0.origem == .arena }
        let linhas = Arena.comparar(arena)
        XCTAssertEqual(linhas.count, 5)
        XCTAssertEqual(linhas.first { $0.maisRapida }?.motor, "tongyi-deepresearch")
        XCTAssertEqual(linhas.first { $0.maisBarata }?.motor, "tongyi-deepresearch")
        XCTAssertEqual(linhas.first { $0.maiorCobertura }?.motor, "enxame-misto")
        XCTAssertTrue(Arena.algumaRodando(arena))
        // uma só concluída: ninguém ganha selo
        XCTAssertFalse(Arena.comparar([p.tarefas[2]]).contains { $0.maisRapida || $0.maisBarata })
    }
}

final class TrilhaTests: XCTestCase {
    var t: TarefaDetalhe!

    override func setUpWithError() throws {
        t = try Fixtures.decodificar(RespostaTarefa.self, de: .tarefaEnxame).tarefa
    }

    func testLinhaDoTempo() {
        let itens = LinhaDoTempo.itens(t.eventos)
        XCTAssertEqual(itens.count, 16)
        XCTAssertEqual(itens.first?.quando, "+0,0 s")
        XCTAssertNil(itens.first?.delta)
        XCTAssertEqual(itens[1].delta, "Δ 4,1 s")
        XCTAssertEqual(itens.map(\.t), itens.map(\.t).sorted())
        // o prefixo do agente sai do rótulo do subagente
        XCTAssertEqual(itens[3].rotulo, "Contexto e marco legal da telessaúde")
        XCTAssertEqual(itens.last?.quando, "+5 min 12 s")
    }

    func testLinhaDoTempoOrdenaForaDeOrdem() {
        let ev = [EventoTarefa(t: 500, fase: .ferramenta, rotulo: "b"), EventoTarefa(t: 100, fase: .orquestra, rotulo: "a"),
                  EventoTarefa(t: 500, fase: .verificador, rotulo: "c")]
        let d = TarefaDetalhe(resumo: ResumoTarefa(id: "x", criadaEm: Date(), status: .rodando, motor: "aura"), eventos: ev)
        XCTAssertEqual(LinhaDoTempo.itens(d.eventos).map(\.rotulo), ["a", "b", "c"])
        XCTAssertEqual(LinhaDoTempo.itens(d.eventos).map(\.id), [1, 0, 2])
    }

    func testArvoreDoEnxame() throws {
        let raiz = try XCTUnwrap(ArvoreSubagentes.construir(eventos: t.eventos, evidencias: t.listaEvidencias))
        XCTAssertEqual(raiz.tipo, .orquestrador)
        XCTAssertEqual(raiz.nome, "Kimi K2.6")
        XCTAssertEqual(raiz.titulo, "3 subagentes em 1 lote")
        XCTAssertEqual(raiz.totalSubagentes, 3)
        XCTAssertEqual(raiz.evidencias, ["E9"])

        let subs = try XCTUnwrap(raiz.filhos)
        XCTAssertEqual(subs.map(\.numero), [1, 2, 3])
        XCTAssertEqual(subs.map(\.titulo), ["Contexto e marco legal da telessaúde", "Evidências de efetividade na atenção primária",
                                            "Barreiras de conectividade e infraestrutura"])
        XCTAssertEqual(subs.map(\.modelo), ["Kimi K2.6", "Kimi K2.6", "Kimi K2.6"])
        XCTAssertEqual(subs.map { $0.filhos?.count ?? 0 }, [2, 2, 2])
        XCTAssertEqual(subs[0].filhos?.first?.nome, "literature_search: Lei 14.510/2022 telessaúde")
        XCTAssertEqual(subs[0].filhos?.first?.tipo, .chamada)
        XCTAssertEqual(subs[0].evidencias, ["E1", "E2", "E10"])
        XCTAssertEqual(subs[1].evidencias, ["E3", "E4", "E5"])
        XCTAssertEqual(subs[2].evidencias, ["E6", "E7", "E8"])
        XCTAssertEqual(subs.map(\.lote), [1, 1, 1])
        XCTAssertEqual(Set(([raiz] + subs + subs.flatMap { $0.filhos ?? [] }).map(\.id)).count, 10, "ids únicos")
    }

    func testArvoreComDoisLotesENumerosParecidos() throws {
        let ev = [
            EventoTarefa(t: 0, fase: .enxame, rotulo: "DeepSeek V4 Pro criou 1 subagente (total 1)", agente: "DeepSeek V4 Pro"),
            EventoTarefa(t: 10, fase: .subagente, rotulo: "subagente 1 · Qwen3 235B: A", agente: "subagente 1 · Qwen3 235B"),
            EventoTarefa(t: 20, fase: .enxame, rotulo: "DeepSeek V4 Pro criou 1 subagente (total 12)", agente: "DeepSeek V4 Pro"),
            EventoTarefa(t: 30, fase: .subagente, rotulo: "subagente 12 · Kimi K2.6: B", agente: "subagente 12 · Kimi K2.6"),
            EventoTarefa(t: 40, fase: .ferramenta, rotulo: "web_search: x", agente: "subagente 12 · Kimi K2.6"),
            // sem agente: o nome sai do rótulo
            EventoTarefa(t: 50, fase: .subagente, rotulo: "subagente 2 · DeepSeek V4 Flash: C"),
        ]
        let raiz = try XCTUnwrap(ArvoreSubagentes.construir(eventos: ev, evidencias: [
            Evidencia(chave: "E1", claim: "", agente: "subagente 1 · Qwen3 235B"),
            Evidencia(chave: "E2", claim: "", agente: "subagente 12 · Kimi K2.6"),
        ]))
        let subs = try XCTUnwrap(raiz.filhos)
        XCTAssertEqual(subs.map(\.numero), [1, 2, 12])
        XCTAssertEqual(subs.map(\.lote), [1, 2, 2])
        XCTAssertEqual(subs[1].titulo, "C")
        XCTAssertEqual(subs[0].evidencias, ["E1"])
        XCTAssertEqual(subs[2].evidencias, ["E2"], "subagente 1 não pega a evidência do 12")
        XCTAssertEqual(subs[2].filhos?.count, 1)
        XCTAssertEqual(raiz.titulo, "3 subagentes em 2 lotes")
    }

    func testSemEnxameNaoHaArvore() throws {
        let f = try Fixtures.decodificar(RespostaTarefa.self, de: .tarefaFallback).tarefa
        XCTAssertNil(ArvoreSubagentes.construir(eventos: f.eventos))
    }

    func testTotaisDoLedger() {
        let tot = Ledger.totais(t.ledger)
        XCTAssertEqual(tot.chamadas, 13)
        XCTAssertEqual(tot.falhas, 1)
        XCTAssertEqual(tot.promptTokens, t.uso?.promptTokens)
        XCTAssertEqual(tot.completionTokens, t.uso?.completionTokens)
        XCTAssertEqual(tot.custoUsd, 0.4431, accuracy: 0.00001)
        XCTAssertEqual(tot.porModelo["deepseek-v4-pro"] ?? 0, 0.0815, accuracy: 0.00001)
        XCTAssertEqual(tot.ms, 273_770)
    }

    func testChavesDoTexto() {
        let chaves = TextoFinal.chaves(t.texto)
        XCTAssertEqual(chaves, ["E1", "E2", "E9", "E10", "E3", "E4", "E5", "E6", "E8", "E7"])
        XCTAssertEqual(TextoFinal.chavesSemEvidencia(t.texto, evidencias: t.listaEvidencias), [])
        XCTAssertEqual(TextoFinal.chavesSemEvidencia("x [E99]", evidencias: t.listaEvidencias), ["E99"])
    }

    func testLinkarChaves() {
        XCTAssertEqual(TextoFinal.linkarChaves("a [E1] b [E6, E8]."),
                       "a [[E1](hermes-evidencia://E1)] b [[E6](hermes-evidencia://E6), [E8](hermes-evidencia://E8)].")
        XCTAssertEqual(TextoFinal.linkarChaves("[nota] [E1](http://x) [Ex]"), "[nota] [E1](http://x) [Ex]", "não mexe no que não é chave")
        let url = TextoFinal.url(da: "E10")!
        XCTAssertEqual(TextoFinal.chave(da: url), "E10")
        XCTAssertNil(TextoFinal.chave(da: URL(string: "https://zaeon.space")!))
    }

    func testBlocosDoMarkdown() {
        let b = TextoFinal.blocos(t.texto)
        XCTAssertEqual(b.first?.tipo, .titulo(1))
        XCTAssertEqual(b.filter { $0.tipo == .titulo(2) }.count, 5)
        XCTAssertEqual(b.filter { $0.tipo == .item }.count, 3)
        XCTAssertTrue(b.contains { $0.markdown.contains("(hermes-evidencia://E1)") })
        XCTAssertEqual(b.map(\.id), Array(0..<b.count))

        let c = TextoFinal.blocos("texto\n\n```\nlet x = [E1]\n```\n> citação [E2]\n1. item")
        XCTAssertEqual(c.map(\.tipo), [.paragrafo, .codigo, .citacao, .item])
        XCTAssertEqual(c[1].markdown, "let x = [E1]", "código não vira link")
        XCTAssertEqual(c[3].markdown, "1. item")
        XCTAssertEqual(TextoFinal.blocos(""), [])
    }
}

final class FonteDemoTests: XCTestCase {
    func testDemoServeAsFixtures() async throws {
        let d = FonteDemo()
        let p = try await d.painel()
        XCTAssertEqual(p.motores.count, 5)
        let det = try await d.tarefa(id: "6730a1f0c9e77b2a1d4e9f03")
        XCTAssertEqual(det.listaEvidencias.count, 10)
        let sintetico = try await d.tarefa(id: "6730a1f0c9e77b2a1d4e9f04")
        XCTAssertFalse(sintetico.eventos.isEmpty)
        do {
            _ = try await d.tarefa(id: "nao-existe")
            XCTFail("devia dar 404")
        } catch let e as ErroAPI {
            XCTAssertEqual(e, .naoEncontrado(codigo: "nao_encontrada"))
        }
        let kimi = try await d.tarefas(motor: "kimi-enxame", status: nil, limite: nil)
        XCTAssertEqual(kimi.count, 3)
        let exp = try await d.exportar(desde: nil)
        XCTAssertEqual(exp.exportadas, 12)
    }

    func testArenaDemoTerminaComOTempo() async throws {
        final class Relogio: @unchecked Sendable { var agora = Date(timeIntervalSince1970: 1_794_114_000) }
        let r = Relogio()
        let d = FonteDemo(agora: { r.agora })
        let ids = try await d.arena(PedidoArena(objetivo: "Explique entropia para o ensino médio", intent: .explicarConceito,
                                                motores: ["aura", "kimi-enxame"]))
        XCTAssertEqual(ids.count, 2)
        let antes = try await d.tarefa(id: ids[0])
        XCTAssertEqual(antes.resumo.status, .rodando)
        XCTAssertEqual(antes.resumo.origem, .arena)
        let emVooAntes = try await d.painel().emVoo
        XCTAssertEqual(emVooAntes, 4)
        r.agora = r.agora.addingTimeInterval(60)
        let depois = try await d.tarefa(id: ids[0])
        XCTAssertNotEqual(depois.resumo.status, .rodando)
        XCTAssertNotNil(depois.resumo.ms)
        let emVooDepois = try await d.painel().emVoo
        XCTAssertEqual(emVooDepois, 2)
    }
}
