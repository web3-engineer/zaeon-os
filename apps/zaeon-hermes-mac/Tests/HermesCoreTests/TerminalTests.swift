import XCTest
@testable import HermesCore

final class TerminalTests: XCTestCase {
    func testInterpretar() {
        XCTAssertEqual(Terminal.interpretar("   "), .vazio)
        XCTAssertEqual(Terminal.interpretar("o que é mitose?"), .falar(agente: nil, texto: "o que é mitose?"))
        XCTAssertEqual(Terminal.interpretar("/usar Zenita"), .usar("zenita"))
        XCTAssertEqual(Terminal.interpretar("/falar kimi-enxame faça um levantamento sobre CRISPR"),
                       .falar(agente: "kimi-enxame", texto: "faça um levantamento sobre CRISPR"))
        XCTAssertEqual(Terminal.interpretar("/tarefas"), .tarefas(limite: 10))
        XCTAssertEqual(Terminal.interpretar("/tarefas 999"), .tarefas(limite: 50))
        XCTAssertEqual(Terminal.interpretar("/saude 48"), .saude(horas: 48))
        XCTAssertEqual(Terminal.interpretar("/saúde"), .saude(horas: 24))
        XCTAssertEqual(Terminal.interpretar("/tarefa abc"), .tarefa("abc"))
        XCTAssertEqual(Terminal.interpretar("/clear"), .limpar)
        if case .desconhecido = Terminal.interpretar("/falar zenita") {} else { XCTFail("falar sem mensagem") }
        if case .desconhecido = Terminal.interpretar("/xyz") {} else { XCTFail("comando desconhecido") }
    }

    func testColuna() {
        XCTAssertEqual(Terminal.coluna("abc", 5), "abc  ")
        XCTAssertEqual(Terminal.coluna("abcdefgh", 5), "abcd…")
    }

    func testConversaDecodifica() throws {
        let json = """
        {"conversa":{"id":"c1","titulo":"Mitose","agente":"zenita","criadaEm":"2026-11-09T10:00:00.000Z","atualizadaEm":"2026-11-09T10:01:00.000Z",
         "mensagens":[{"id":"m1","papel":"voce","texto":"o que é mitose?","em":"2026-11-09T10:00:00.000Z"},
                      {"id":"m2","papel":"agente","texto":"","em":"2026-11-09T10:00:00.000Z","tarefaId":"t1","status":"rodando",
                       "aoVivo":{"eventos":[{"t":120,"fase":"plan","rotulo":"Planejando"}],"previa":"Mitose é","modelo":null,"ms":900}},
                      {"papel":"agente","texto":"sem id"}]}}
        """
        let r = try JSONHermes.decodificador().decode(RespostaConversa.self, from: Data(json.utf8))
        XCTAssertEqual(r.conversa.mensagens.count, 2, "mensagem sem id é pulada")
        XCTAssertTrue(r.conversa.mensagens[0].doAdmin)
        XCTAssertTrue(r.conversa.rodando)
        XCTAssertEqual(r.conversa.mensagens[1].aoVivo?.eventos.first?.rotulo, "Planejando")
        XCTAssertEqual(r.conversa.mensagens[1].aoVivo?.previa, "Mitose é")
    }

    func testResumoEGrupos() throws {
        let json = #"{"conversas":[{"id":"c1","titulo":"T","agente":"aura","mensagens":4,"ultima":{"papel":"agente","texto":"oi","status":"rodando"}}]}"#
        let l = try JSONHermes.decodificador().decode(ListaConversas.self, from: Data(json.utf8))
        XCTAssertEqual(l.conversas.first?.rodando, true)
        let xs = [Interlocutor(id: "kimi", nome: "Kimi", tipo: .motor), Interlocutor(id: "aura", nome: "Aura"),
                  Interlocutor(id: "medicina", nome: "Osler", tipo: .mentor), Interlocutor(id: "x", nome: "X", tipo: .desconhecido("novo"))]
        XCTAssertEqual(Interlocutores.grupos(xs).map(\.id), ["agente", "mentor", "motor", "outros"])
        XCTAssertEqual(Interlocutores.nome("medicina", em: xs), "Osler")
        XCTAssertEqual(Interlocutores.nome("zzz", em: xs), "zzz")
    }
}
