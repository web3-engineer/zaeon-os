import XCTest
@testable import HermesCore

final class AgentesTests: XCTestCase {
    private let json = """
    {"geradoEm":"2026-11-09T08:00:00.000Z","janelaDias":7,"bancoOk":true,"agentes":[
      {"id":"aura","nome":"Aura","tipo":"persona","emoji":"⟁","bio":"A pesquisadora","curso":null,"ativo":true,"conversacional":true,
       "ondeTrabalha":["chat do lab"],"plugin":null,"distincao":"Pesquisa","habilidades":["literature"],"habilidadesDegradadas":["literature"],
       "ferramentas":["literature_search"],"datasets":["rag:area:geral"],"protocolo":{"ensemble":1,"reflexoes":2,"porque":"x"},
       "artefatos":[],"fontes":[],"guardrail":null,"nivel":null,"chavesLedger":["aura"],"prompt":"Você é a Aura",
       "uso":{"janelaDias":7,"chamadas":"12","falhas":1,"taxaFalha":0.0833,"turnos":5,"msP50":900,"msP90":0,"tokens":1200,"custoUsd":0.01,
              "ultimo":"2026-11-09T07:59:00.000Z","modelos":[{"modelo":"gemini-2.5-flash","chamadas":12}],"superficies":[{"superficie":"estudos","chamadas":12}],
              "erros":[{"erro":"timeout","chamadas":1}],"porDia":[{"dia":"2026-11-09","chamadas":12,"falhas":1}]}},
      {"id":"medicina","nome":"Osler","tipo":"mentor","curso":"Medicina","uso":{"chamadas":0}},
      {"id":"sistema","nome":"sistema","tipo":"sistema","uso":{"chamadas":3,"custoUsd":0.5}},
      {"id":"novo","nome":"Novo","tipo":"algo-novo"},
      {"nome":"sem id"}
    ]}
    """

    func testDecodificaTolerante() throws {
        let r = try JSONHermes.decodificador().decode(RespostaAgentes.self, from: Data(json.utf8))
        XCTAssertEqual(r.agentes.map(\.id), ["aura", "medicina", "sistema", "novo"], "item sem id é pulado")
        let aura = r.agentes[0]
        XCTAssertEqual(aura.uso.chamadas, 12)
        XCTAssertEqual(aura.uso.msP50, 900)
        XCTAssertNil(aura.uso.msP90, "0 vira nil (—)")
        XCTAssertEqual(aura.uso.modelos.first?.nome, "gemini-2.5-flash")
        XCTAssertEqual(aura.uso.erros.first?.nome, "timeout")
        XCTAssertEqual(aura.protocolo?.reflexoes, 2)
        XCTAssertNotNil(aura.uso.ultimo)
        XCTAssertEqual(r.agentes[3].tipo, .desconhecido("algo-novo"))
        XCTAssertFalse(r.agentes[1].ativoNaJanela)
    }

    func testGruposETotais() throws {
        let r = try JSONHermes.decodificador().decode(RespostaAgentes.self, from: Data(json.utf8))
        XCTAssertEqual(Elenco.grupos(r.agentes).map(\.id), ["persona", "mentor", "sistema", "outros"])
        XCTAssertEqual(Elenco.grupos(r.agentes, busca: "medic").flatMap(\.agentes).map(\.id), ["medicina"])
        let t = Elenco.totais(r.agentes)
        XCTAssertEqual(t.agentes, 4)
        XCTAssertEqual(t.trabalhando, 2)
        XCTAssertEqual(t.chamadas, 15)
        XCTAssertEqual(t.custoUsd, 0.51, accuracy: 1e-9)
    }
}
