import AppKit
import CryptoKit
import Foundation
import HermesCore
import Observation

/// Atualização automática: pergunta ao servidor qual o último build (`GET /app`), e com um clique baixa
/// (`/app/baixar`, com a chave do console), confere o sha256 e a assinatura, troca o .app no lugar e reabre.
///
/// Sem Gatekeeper de novo: o "Abrir Mesmo Assim" vem da marca de quarentena que o NAVEGADOR põe no download.
/// Baixado por aqui, o zip não leva a marca (e o script ainda remove, por garantia).
/// Erro da atualização, com a mensagem pronta para a tela.
struct FalhaAtualizacao: LocalizedError, Sendable {
    let errorDescription: String?
    init(_ m: String) { errorDescription = m }
}

@MainActor
@Observable
final class Atualizador {
    enum Fase: Equatable {
        case parado
        case verificando
        case baixando
        case instalando
        case falhou(String)
    }

    /// o build deste app; nil rodando por `swift run` (não há .app para trocar)
    let buildAtual: Int? = Atualizacao.buildAtual(Bundle.main.infoDictionary)
    private(set) var manifesto: ManifestoApp?
    private(set) var fase: Fase = .parado
    private(set) var verificadoEm: Date?

    var disponivel: Bool { Atualizacao.disponivel(atual: buildAtual, manifesto: manifesto) }

    /// de quanto em quanto tempo perguntar ao servidor
    static let intervalo: Duration = .seconds(30 * 60)
    nonisolated static let identificador = "space.zaeon.hermes"

    /// Laço: verifica ao abrir e a cada 30 min, enquanto a janela existir.
    func ciclo(_ fonte: @escaping @MainActor () -> any FonteHermes) async {
        while !Task.isCancelled {
            await verificar(fonte())
            try? await Task.sleep(for: Self.intervalo)
        }
    }

    func verificar(_ fonte: any FonteHermes) async {
        guard buildAtual != nil, fase != .baixando, fase != .instalando else { return }
        fase = .verificando
        do {
            manifesto = try await fonte.manifestoApp()
            fase = .parado
        } catch ErroAPI.naoEncontrado {
            manifesto = nil // nada publicado ainda
            fase = .parado
        } catch {
            // sem rede/sem chave: não é falha da atualização, só fica sem saber (tenta de novo no próximo ciclo)
            fase = .parado
        }
        verificadoEm = Date()
    }

    func instalar(_ fonte: any FonteHermes) async {
        guard let m = manifesto, disponivel else { return }
        fase = .baixando
        do {
            let dados = try await fonte.baixarApp()
            let hash = SHA256.hash(data: dados).map { String(format: "%02x", $0) }.joined()
            guard hash == m.sha256 else { throw FalhaAtualizacao("o arquivo baixado não bate com o sha256 publicado") }
            fase = .instalando
            let novo = try await Task.detached { try Self.preparar(zip: dados) }.value
            try Self.trocarEReabrir(novo: novo)
        } catch {
            fase = .falhou((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)
        }
    }

    // MARK: - Instalação (fora da main actor)

    /// Descompacta e confere: tem que ser o Hermes (identificador) e a assinatura tem que fechar.
    nonisolated static func preparar(zip dados: Data) throws -> URL {
        let fm = FileManager.default
        let pasta = fm.temporaryDirectory.appendingPathComponent("zaeon-hermes-\(UUID().uuidString)", isDirectory: true)
        try fm.createDirectory(at: pasta, withIntermediateDirectories: true)
        let zip = pasta.appendingPathComponent("ZaeonHermes.app.zip")
        try dados.write(to: zip)
        try rodar("/usr/bin/ditto", ["-x", "-k", zip.path, pasta.path])
        let app = pasta.appendingPathComponent("ZaeonHermes.app")
        guard fm.fileExists(atPath: app.appendingPathComponent("Contents/MacOS/ZaeonHermes").path) else {
            throw FalhaAtualizacao("o pacote não tem o ZaeonHermes.app")
        }
        try rodar("/usr/bin/codesign", ["--verify", "--strict", app.path])
        let info = NSDictionary(contentsOf: app.appendingPathComponent("Contents/Info.plist")) as? [String: Any]
        guard info?["CFBundleIdentifier"] as? String == identificador else { throw FalhaAtualizacao("o pacote não é o Zaeon Hermes") }
        return app
    }

    /// Troca o .app em uso pelo novo DEPOIS que este processo sair, e reabre. Se a troca falhar, devolve o antigo.
    static func trocarEReabrir(novo: URL) throws {
        let atual = Bundle.main.bundleURL
        guard atual.pathExtension == "app" else { throw FalhaAtualizacao("o Hermes não está rodando de um .app") }
        let pai = atual.deletingLastPathComponent()
        guard FileManager.default.isWritableFile(atPath: pai.path) else {
            throw FalhaAtualizacao("sem permissão para escrever em \(pai.path). Mova o Hermes para a pasta Aplicativos e tente de novo.")
        }
        let q = { (s: String) in "'" + s.replacingOccurrences(of: "'", with: "'\\''") + "'" }
        let antigo = atual.path + ".antigo"
        let script = """
        while kill -0 \(ProcessInfo.processInfo.processIdentifier) 2>/dev/null; do sleep 0.2; done
        rm -rf \(q(antigo))
        if mv \(q(atual.path)) \(q(antigo)) && mv \(q(novo.path)) \(q(atual.path)); then
          rm -rf \(q(antigo))
        else
          [ -e \(q(atual.path)) ] || mv \(q(antigo)) \(q(atual.path))
        fi
        xattr -dr com.apple.quarantine \(q(atual.path)) 2>/dev/null
        open \(q(atual.path))
        """
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/sh")
        p.arguments = ["-c", script]
        try p.run()
        NSApp.terminate(nil)
    }

    nonisolated private static func rodar(_ executavel: String, _ argumentos: [String]) throws {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: executavel)
        p.arguments = argumentos
        let erro = Pipe()
        p.standardError = erro
        p.standardOutput = Pipe()
        try p.run()
        p.waitUntilExit()
        guard p.terminationStatus == 0 else {
            let msg = String(data: erro.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
            throw FalhaAtualizacao("\(URL(fileURLWithPath: executavel).lastPathComponent) falhou: \(msg.trimmingCharacters(in: .whitespacesAndNewlines))")
        }
    }
}
