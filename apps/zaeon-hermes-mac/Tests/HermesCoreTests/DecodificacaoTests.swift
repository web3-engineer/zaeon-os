import XCTest
@testable import HermesCore

final class DecodificacaoTests: XCTestCase {
    func testPainelCompleto() throws {
        let p = try Fixtures.decodificar(Painel.self, de: .painel)
        XCTAssertEqual(p.modo, .sombra)
        XCTAssertEqual(p.emVoo, 2)
        XCTAssertEqual(p.config.verificador, .max)
        XCTAssertEqual(p.config.subagentesMax, 12)
        XCTAssertNil(p.config.motorForcado)
        XCTAssertFalse(p.config.sorteio)
        XCTAssertNotNil(p.geradoEm)

        XCTAssertEqual(p.motores.map(\.id), ["aura", "deepseek-v4-profundo", "tongyi-deepresearch", "kimi-enxame", "enxame-misto"])
        let kimi = try XCTUnwrap(p.motor("kimi-enxame"))
        XCTAssertEqual(kimi.origem, .moonshot)
        XCTAssertEqual(kimi.formato, .enxame)
        XCTAssertTrue(kimi.disponivel)
        XCTAssertEqual(kimi.modelos.first?.rotas.count, 2)
        XCTAssertEqual(kimi.modelos.first?.preco?.completion, 4.0)
        XCTAssertTrue(kimi.ferramentas.contains("delegar"))
        XCTAssertEqual(kimi.metricas.tarefas, 14)
        XCTAssertEqual(kimi.metricas.subagentesMedia, 4.6)
        XCTAssertFalse(kimi.prompt.isEmpty)

        let tongyi = try XCTUnwrap(p.motor("tongyi-deepresearch"))
        XCTAssertNil(tongyi.modelos.first?.preco?.cached, "preço cached nulo")
        XCTAssertEqual(tongyi.modelos.first?.rotas.map(\.configurado), [true, false])
        XCTAssertFalse(try XCTUnwrap(p.motor("enxame-misto")).disponivel)

        XCTAssertEqual(p.datasets.count, 5)
        let pessoal = try XCTUnwrap(p.datasets.first { $0.id == "rag:pessoal" })
        XCTAssertNil(pessoal.documentos)
        XCTAssertNil(pessoal.trechos)
        XCTAssertEqual(pessoal.tipo, .ragPessoal)
        XCTAssertEqual(p.datasets.first { $0.id == "hf:scielo-pt" }?.tipo, .hfDataset)

        XCTAssertEqual(p.ferramentas.count, 6)
        XCTAssertEqual(p.tarefas.count, 11)
        let rodando = p.tarefas[0]
        XCTAssertEqual(rodando.status, .rodando)
        XCTAssertNil(rodando.ms)
        XCTAssertNil(rodando.custoUsd)
        XCTAssertNil(rodando.cobertura)
        XCTAssertNil(rodando.aprovado)
        XCTAssertEqual(p.tarefas[1].origem, .arena)
        XCTAssertEqual(p.tarefas[2].ms, 312_480)
        XCTAssertEqual(p.tarefas[2].cobertura, 0.86)
    }

    func testDatasComESemFracao() throws {
        let p = try Fixtures.decodificar(Painel.self, de: .painel)
        // "2026-11-08T04:58:12.311Z" (com fração) e "2026-11-08T04:57:03Z" (sem)
        let a = p.tarefas[0].criadaEm.timeIntervalSince1970
        let b = p.tarefas[1].criadaEm.timeIntervalSince1970
        XCTAssertEqual(a - b, 69.311, accuracy: 0.001)
        XCTAssertEqual(Datas.ler("2026-11-08T05:00:00Z")?.timeIntervalSince1970, 1_794_114_000)
        XCTAssertEqual(Datas.ler("2026-11-08T05:00:00.000Z")?.timeIntervalSince1970, 1_794_114_000)
        XCTAssertEqual(try XCTUnwrap(Datas.ler("2026-11-08T05:00:00.123456Z")).timeIntervalSince1970, 1_794_114_000.123, accuracy: 0.001)
        XCTAssertEqual(try XCTUnwrap(Datas.ler("2026-11-08T05:00:00.5Z")).timeIntervalSince1970, 1_794_114_000.5, accuracy: 0.001)
        XCTAssertNotNil(Datas.ler("2026-11-08T02:00:00-03:00"))
        XCTAssertNil(Datas.ler("ontem"))
    }

    func testPainelTolerante() throws {
        let p = try Fixtures.decodificar(Painel.self, de: .painelTolerante)
        XCTAssertEqual(p.modo, .desconhecido("turbo"))
        XCTAssertTrue(p.modo.ehDesconhecido)
        XCTAssertEqual(p.emVoo, 0)
        XCTAssertEqual(p.config.verificador, .desconhecido("parcial"))
        XCTAssertEqual(p.config.subagentesMax, 12, "número como string")
        XCTAssertEqual(p.config.prazoEnxameMs, 480_000)
        XCTAssertEqual(p.config.motorForcado, "kimi-enxame")

        let storm = p.motores[0]
        XCTAssertEqual(storm.origem, .desconhecido("stanford"))
        XCTAssertEqual(storm.origem.rotulo, "stanford")
        XCTAssertEqual(storm.formato, .desconhecido("hibrido"))
        XCTAssertFalse(storm.disponivel)
        XCTAssertEqual(storm.descricao, "")
        XCTAssertEqual(storm.modelos.first?.nome, "mistral-large")
        XCTAssertEqual(storm.modelos.first?.rotas, [])
        XCTAssertEqual(storm.ferramentas, [])
        XCTAssertEqual(storm.metricas.concluidas, 0)
        XCTAssertNil(storm.metricas.msP50)
        XCTAssertEqual(p.motores[1].metricas, MetricasMotor(), "metricas nulas → zeradas")

        XCTAssertEqual(p.datasets.first?.tipo, .desconhecido("s3"))
        XCTAssertEqual(p.datasets.first?.licenca, "")
        XCTAssertEqual(p.ferramentas.first?.risco, "write")

        XCTAssertEqual(p.tarefas.count, 2, "a tarefa sem id é pulada, as outras ficam")
        let t = p.tarefas[0]
        XCTAssertEqual(t.status, .desconhecido("pausada"))
        XCTAssertEqual(t.origem, .desconhecido("api"))
        XCTAssertEqual(t.formato, .desconhecido("hibrido"))
        XCTAssertEqual(t.nomeMotor, "http:storm")
        XCTAssertEqual(t.ms, 1234)
        XCTAssertEqual(t.atualizadaEm, t.criadaEm)
        XCTAssertNil(t.plano)
        XCTAssertEqual(p.tarefas[1].ms, 4200.7)
        XCTAssertEqual(p.tarefas[1].cobertura, 1)
    }

    func testListaDeTarefas() throws {
        let l = try Fixtures.decodificar(ListaTarefas.self, de: .tarefas)
        XCTAssertEqual(l.tarefas.count, 3)
        XCTAssertTrue(l.tarefas.allSatisfy { $0.motor == "kimi-enxame" })
        XCTAssertEqual(Set(l.tarefas.map(\.status)), [.rodando, .concluida, .falhou])
    }

    func testTarefaEnxame() throws {
        let t = try Fixtures.decodificar(RespostaTarefa.self, de: .tarefaEnxame).tarefa
        XCTAssertEqual(t.id, "6730a1f0c9e77b2a1d4e9f03")
        XCTAssertEqual(t.resumo.status, .concluida)
        XCTAssertEqual(t.resumo.subagentes, 3)
        XCTAssertEqual(t.resumo.evidencias, 10, "a contagem sai do tamanho da lista")
        XCTAssertEqual(t.decisao?.formato, .enxame)
        XCTAssertEqual(t.decisao?.maxSubagentes, 12)
        XCTAssertEqual(t.decisao?.verificadorGlobal, true)
        XCTAssertEqual(t.eventos.count, 16)
        XCTAssertEqual(t.eventos.map(\.id), Array(0..<16), "id estável = posição")
        XCTAssertNil(t.eventos[0].agente)
        XCTAssertEqual(t.eventos.filter { $0.fase == .subagente }.count, 3)
        XCTAssertEqual(t.listaEvidencias.count, 10)
        XCTAssertEqual(t.listaEvidencias[0].chave, "E1")
        XCTAssertEqual(t.listaEvidencias[0].source?.year, 2022)
        XCTAssertNotNil(t.listaEvidencias[0].source?.urlValida)
        XCTAssertNil(t.listaEvidencias[9].source?.url, "url nula")
        XCTAssertNil(t.listaEvidencias[9].source?.urlValida)
        XCTAssertTrue(t.texto.contains("[E1]"))
        XCTAssertNil(t.motivo)
        XCTAssertNil(t.erro)
        XCTAssertEqual(t.ledger.count, 13)
        XCTAssertEqual(t.ledger.filter { !$0.ok }.count, 1)
        XCTAssertEqual(t.ledger[2].erro, "429 Too Many Requests (Retry-After 2s)")
        XCTAssertNotNil(t.ledger[0].at)
        XCTAssertEqual(t.uso?.chamadas, 13)
        XCTAssertEqual(try XCTUnwrap(t.uso?.custoUsd), Ledger.totais(t.ledger).custoUsd, accuracy: 0.0001)
    }

    func testTarefaRodandoComFaseNova() throws {
        let t = try Fixtures.decodificar(RespostaTarefa.self, de: .tarefaRodando).tarefa
        XCTAssertTrue(t.resumo.estaRodando)
        XCTAssertNil(t.resumo.ms)
        XCTAssertEqual(t.eventos[1].fase, .desconhecido("planejamento"))
        XCTAssertNil(t.eventos[0].agente, "agente ausente")
        XCTAssertNil(t.uso?.custoUsd)
        XCTAssertEqual(t.texto, "")
    }

    func testTarefaFallback() throws {
        let t = try Fixtures.decodificar(RespostaTarefa.self, de: .tarefaFallback).tarefa
        XCTAssertEqual(t.resumo.status, .fallback)
        XCTAssertEqual(t.resumo.degradado, true)
        XCTAssertNotNil(t.motivo)
        XCTAssertNotNil(t.erro)
        XCTAssertNil(t.ledger[1].custoUsd)
        XCTAssertFalse(t.ledger[1].ok)
    }

    func testArenaExportarEErros() throws {
        XCTAssertEqual(try Fixtures.decodificar(RespostaArena.self, de: .arena).tarefas.count, 3)
        let e = try Fixtures.decodificar(ResultadoExportacao.self, de: .exportar)
        XCTAssertEqual(e.exportadas, 12)
        XCTAssertEqual(e.urlRepo?.absoluteString, "https://huggingface.co/datasets/zaeon-ai/zaeon-orquestra-trajetorias")
        XCTAssertEqual(try Fixtures.decodificar(CorpoErro.self, de: .erroNaoAutorizado).erro, "nao_autorizado")
        XCTAssertEqual(try Fixtures.decodificar(CorpoErro.self, de: .erroNaoEncontrada).erro, "nao_encontrada")
        XCTAssertEqual(try Fixtures.decodificar(CorpoErro.self, de: .erroDatasets).erro, "datasets_desligados")
    }

    func testTodasAsFixturesExistem() throws {
        for n in Fixtures.Nome.allCases {
            XCTAssertFalse(try Fixtures.dados(n).isEmpty, n.rawValue)
        }
    }

    func testEnumToleranteIdaEVolta() throws {
        let json = #"["rodando","concluida","fallback","falhou","pausada"]"#.data(using: .utf8)!
        let s = try JSONDecoder().decode([StatusTarefa].self, from: json)
        XCTAssertEqual(s, [.rodando, .concluida, .fallback, .falhou, .desconhecido("pausada")])
        let volta = try JSONEncoder().encode(s)
        XCTAssertEqual(String(data: volta, encoding: .utf8), #"["rodando","concluida","fallback","falhou","pausada"]"#)
        XCTAssertEqual(TipoDataset(bruto: "rag-area"), .ragArea)
        XCTAssertEqual(StatusTarefa.desconhecido("x").rotulo, "x")
    }

    func testPedidoArenaCodifica() throws {
        let p = PedidoArena(objetivo: "Explique a teoria da deriva continental", intent: .explicarConceito, kind: "  ", motores: ["aura", "kimi-enxame"])
        XCTAssertNil(p.kind, "kind vazio não vai")
        XCTAssertNil(p.problema)
        let s = String(data: try JSONHermes.codificador().encode(p), encoding: .utf8)!
        XCTAssertEqual(s, #"{"intent":"explicar_conceito","motores":["aura","kimi-enxame"],"objetivo":"Explique a teoria da deriva continental"}"#)
        XCTAssertNotNil(PedidoArena(objetivo: "curto", intent: .revisar, motores: ["aura"]).problema)
        XCTAssertNotNil(PedidoArena(objetivo: "um objetivo longo o bastante", intent: .revisar, motores: ["a", "b", "c", "d", "e"]).problema)
        XCTAssertNotNil(PedidoArena(objetivo: "um objetivo longo o bastante", intent: .revisar, motores: []).problema)
    }

    func testPedidoExportacao() throws {
        let vazio = String(data: try JSONHermes.codificador().encode(PedidoExportacao()), encoding: .utf8)
        XCTAssertEqual(vazio, "{}")
        let d = try XCTUnwrap(Datas.ler("2026-11-01T00:00:00Z"))
        let s = String(data: try JSONHermes.codificador().encode(PedidoExportacao(desde: d)), encoding: .utf8)
        XCTAssertEqual(s, #"{"desde":"2026-11-01T00:00:00.000Z"}"#)
    }
}
