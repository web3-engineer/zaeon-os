// swift-tools-version:5.10
// Zaeon Hermes: o console interno da orquestra (docs/HERMES_ZAEON.md).
//
// - HermesCore: modelos do contrato, cliente HTTP e lógica pura de tela. Compila em macOS e Linux
//   (é o que o sandbox de dev consegue testar).
// - ZaeonHermes: o app SwiftUI. Só existe em macOS: no Linux o alvo nem é declarado, então
//   `swift build`/`swift test` lá cuidam só do núcleo.
import PackageDescription

var produtos: [Product] = [
    .library(name: "HermesCore", targets: ["HermesCore"]),
]

var alvos: [Target] = [
    .target(
        name: "HermesCore",
        path: "Sources/HermesCore",
        // As fixtures servem aos testes E ao modo DEMO do app (sem servidor).
        resources: [.copy("Resources/fixtures")]
    ),
    .testTarget(
        name: "HermesCoreTests",
        dependencies: ["HermesCore"],
        path: "Tests/HermesCoreTests"
    ),
]

#if os(macOS)
produtos.append(.executable(name: "ZaeonHermes", targets: ["ZaeonHermes"]))
alvos.append(
    .executableTarget(
        name: "ZaeonHermes",
        dependencies: ["HermesCore"],
        path: "Sources/ZaeonHermes",
        // O letreiro original da Zaeon (cópia de app/zaeon-name.png: branco, fundo transparente).
        resources: [.process("Resources")]
    )
)
#endif

let package = Package(
    name: "ZaeonHermes",
    defaultLocalization: "pt",
    platforms: [.macOS(.v14)],
    products: produtos,
    targets: alvos
)
