import XCTest
@testable import HermesCore

final class AtualizacaoTests: XCTestCase {
    private let sha = String(repeating: "a", count: 64)

    func testManifesto() throws {
        let json = #"{"build": "42", "versao": "0.1.0", "sha": "abcdef1234567", "criadoEm": "2026-11-09T08:00:00Z", "sha256": "\#(sha.uppercased())", "tamanho": 1264573}"#
        let m = try JSONHermes.decodificador().decode(ManifestoApp.self, from: Data(json.utf8))
        XCTAssertEqual(m.build, 42)
        XCTAssertEqual(m.sha256, sha, "sha256 normalizado para minúsculas")
        XCTAssertEqual(m.shaCurto, "abcdef1")
        XCTAssertNotNil(m.criadoEm)
        XCTAssertThrowsError(try JSONHermes.decodificador().decode(ManifestoApp.self, from: Data(#"{"sha256":"x"}"#.utf8)))
    }

    func testBuildAtual() {
        XCTAssertEqual(Atualizacao.buildAtual(["CFBundleVersion": "17"]), 17)
        XCTAssertNil(Atualizacao.buildAtual(["CFBundleVersion": "abc"]))
        XCTAssertNil(Atualizacao.buildAtual(nil), "swift run: sem .app, sem atualização")
    }

    func testSoAtualizaParaFrente() {
        let m = ManifestoApp(build: 50, sha256: sha)
        XCTAssertTrue(Atualizacao.disponivel(atual: 49, manifesto: m))
        XCTAssertFalse(Atualizacao.disponivel(atual: 50, manifesto: m))
        XCTAssertFalse(Atualizacao.disponivel(atual: 60, manifesto: m), "nunca volta pra trás")
        XCTAssertFalse(Atualizacao.disponivel(atual: nil, manifesto: m))
        XCTAssertFalse(Atualizacao.disponivel(atual: 1, manifesto: ManifestoApp(build: 50, sha256: "curto")))
    }
}
