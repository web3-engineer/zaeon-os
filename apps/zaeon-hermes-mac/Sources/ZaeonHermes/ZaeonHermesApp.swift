import AppKit
import HermesCore
import SwiftUI

/// Zaeon Hermes: o console INTERNO da orquestra de agentes (docs/HERMES_ZAEON.md).
/// Nada daqui chega ao aluno.
@main
struct ZaeonHermesApp: App {
    @NSApplicationDelegateAdaptor(DelegadoApp.self) private var delegado
    @State private var estado = EstadoApp()

    var body: some Scene {
        WindowGroup("Zaeon Hermes") {
            RaizView()
                .environment(estado)
                .frame(minWidth: 1_040, minHeight: 660)
        }
        .defaultSize(width: 1_360, height: 860)
        .commands {
            CommandGroup(after: .toolbar) {
                Button("Atualizar painel") {
                    Task { await estado.atualizar() }
                }
                .keyboardShortcut("r", modifiers: .command)
            }
        }
    }
}

/// Rodando por `swift run` (sem .app), o processo nasce como "acessório": sem Dock e sem foco.
/// Isto o promove a app normal.
final class DelegadoApp: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}
