import AppKit
import HermesCore
import SwiftUI

// Identidade visual: letreiro original da Zaeon, acento ciano (#22D3EE / #00E5FF) e azul (#1D4ED8),
// materiais do macOS e modo escuro de primeira.

enum Marca {
    static let ciano = Color(hex: 0x22D3EE)
    static let cianoVivo = Color(hex: 0x00E5FF)
    static let azul = Color(hex: 0x1D4ED8)

    /// Gradiente sutil dos destaques.
    static let gradiente = LinearGradient(colors: [cianoVivo, azul], startPoint: .topLeading, endPoint: .bottomTrailing)
    static let gradienteSuave = LinearGradient(colors: [ciano.opacity(0.18), azul.opacity(0.12)],
                                               startPoint: .topLeading, endPoint: .bottomTrailing)
}

extension Color {
    init(hex: UInt32, opacidade: Double = 1) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: opacidade)
    }
}

// MARK: - Recursos do app (o letreiro)

enum RecursosApp {
    /// Bundle de recursos do alvo do app. No .app montado pelo `empacotar.sh` ele fica em
    /// Contents/Resources; o acessor gerado do `Bundle.module` só olha a raiz do .app (onde o
    /// codesign não deixa pôr nada) e, se não acha, cai num `fatalError`. Por isso a busca é nossa,
    /// e o `Bundle.module` fica só para `swift run`/Xcode, onde ele acha o bundle no diretório de build.
    static let bundle: Bundle? = {
        let fm = FileManager.default
        let bases = [Bundle.main.resourceURL, Bundle.main.bundleURL, Bundle.main.executableURL?.deletingLastPathComponent()]
        for base in bases.compactMap({ $0 }) {
            guard let itens = try? fm.contentsOfDirectory(at: base, includingPropertiesForKeys: nil) else { continue }
            if let b = itens.first(where: { $0.lastPathComponent.hasSuffix("_ZaeonHermes.bundle") }).flatMap(Bundle.init(url:)) {
                return b
            }
        }
        if Bundle.main.bundleURL.pathExtension == "app" { return nil }
        return Bundle.module
    }()

    static let letreiro: NSImage? = {
        if let url = bundle?.url(forResource: "zaeon-name", withExtension: "png"), let img = NSImage(contentsOf: url) { return img }
        // último recurso: o PNG solto em Contents/Resources
        if let url = Bundle.main.url(forResource: "zaeon-name", withExtension: "png") { return NSImage(contentsOf: url) }
        return nil
    }()
}

/// O letreiro "ZAEON" original (branco, fundo transparente). No tema claro é invertido, como no navbar do site.
struct LetreiroZaeon: View {
    var altura: CGFloat = 30
    @Environment(\.colorScheme) private var esquema

    var body: some View {
        Group {
            if let img = RecursosApp.letreiro {
                if esquema == .light {
                    Image(nsImage: img).resizable().scaledToFit().colorInvert()
                } else {
                    Image(nsImage: img).resizable().scaledToFit()
                }
            } else {
                // sem o PNG (build quebrado): o nome em texto, para nunca ficar vazio
                Text("ZAEON").font(.system(size: altura * 0.6, weight: .light)).tracking(altura * 0.2)
            }
        }
        .frame(height: altura)
        .accessibilityLabel("Zaeon")
    }
}

// MARK: - Estilos

/// Card com material, cantos arredondados, contorno fino e sombra suave.
struct EstiloCartao: ViewModifier {
    var raio: CGFloat = 12
    var destaque: Color? = nil
    var padding: CGFloat = 12

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: raio, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: raio, style: .continuous)
                    .strokeBorder(destaque?.opacity(0.55) ?? Color.primary.opacity(0.08), lineWidth: destaque == nil ? 0.5 : 1)
            }
            .shadow(color: .black.opacity(0.10), radius: 6, x: 0, y: 2)
    }
}

extension View {
    func cartao(raio: CGFloat = 12, destaque: Color? = nil, padding: CGFloat = 12) -> some View {
        modifier(EstiloCartao(raio: raio, destaque: destaque, padding: padding))
    }

    /// Título de seção dos dashboards.
    func tituloSecao() -> some View {
        font(.title3.weight(.semibold))
    }
}

/// Pílula pequena (status, formato, origem…).
struct Pilula: View {
    var texto: String
    var cor: Color
    var icone: String? = nil
    var cheia = false

    var body: some View {
        HStack(spacing: 4) {
            if let icone { Image(systemName: icone).imageScale(.small) }
            Text(texto).lineLimit(1)
        }
        .font(.caption.weight(.medium))
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .foregroundStyle(cheia ? Color.white : cor)
        .background(Capsule().fill(cheia ? cor : cor.opacity(0.15)))
    }
}

/// Selo do motor, colorido pela origem (laboratório).
struct SeloMotor: View {
    var nome: String
    var origem: OrigemMotor?

    var body: some View {
        HStack(spacing: 5) {
            Circle().fill((origem ?? .outro).cor).frame(width: 7, height: 7)
            Text(nome).lineLimit(1)
        }
        .font(.caption.weight(.semibold))
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .foregroundStyle((origem ?? .outro).cor)
        .background(Capsule().fill((origem ?? .outro).cor.opacity(0.14)))
        .help(origem.map { "Origem: \($0.rotulo)" } ?? "")
    }
}

/// Cabeçalho da tela, com o título na hierarquia do sistema.
struct CabecalhoTela: View {
    var titulo: String
    var subtitulo: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(titulo).font(.title2.weight(.semibold))
            if let subtitulo { Text(subtitulo).font(.callout).foregroundStyle(.secondary) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Placeholder de carregamento inline (sem splash): blocos cinza no lugar dos cards.
struct EsqueletoCartoes: View {
    var quantidade = 3
    var altura: CGFloat = 92

    var body: some View {
        VStack(spacing: 10) {
            ForEach(0..<quantidade, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.primary.opacity(0.06))
                    .frame(height: altura)
            }
        }
        .redacted(reason: .placeholder)
    }
}

/// Tela vazia/sem conexão, com o letreiro.
struct TelaVazia: View {
    var titulo: String
    var mensagem: String?
    var icone: String = "bolt.horizontal.circle"
    var acao: (rotulo: String, executar: () -> Void)? = nil

    var body: some View {
        VStack(spacing: 18) {
            LetreiroZaeon(altura: 44).opacity(0.9)
            Image(systemName: icone)
                .font(.system(size: 30, weight: .light))
                .foregroundStyle(Marca.gradiente)
            Text(titulo).font(.title3.weight(.semibold))
            if let mensagem {
                Text(mensagem).font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center).frame(maxWidth: 440)
            }
            if let acao {
                Button(acao.rotulo, action: acao.executar).buttonStyle(.borderedProminent).tint(Marca.azul)
            }
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Cores do domínio

extension OrigemMotor {
    var cor: Color {
        switch self {
        case .zaeon: Marca.ciano
        case .alibaba: .orange
        case .deepseek: Color(hex: 0x4D6BFE)
        case .moonshot: .purple
        case .outro: .gray
        case .desconhecido: .gray
        }
    }
}

extension StatusTarefa {
    var cor: Color {
        switch self {
        case .rodando: Marca.ciano
        case .concluida: .green
        case .fallback: .orange
        case .falhou: .red
        case .desconhecido: .gray
        }
    }

    var icone: String {
        switch self {
        case .rodando: "bolt.fill"
        case .concluida: "checkmark.circle.fill"
        case .fallback: "arrow.uturn.backward.circle.fill"
        case .falhou: "xmark.octagon.fill"
        case .desconhecido: "questionmark.circle"
        }
    }
}

extension ColunaKanban {
    var cor: Color {
        switch self {
        case .rodando: Marca.ciano
        case .concluida: .green
        case .fallback: .orange
        case .falhou: .red
        case .outros: .gray
        }
    }

    var icone: String {
        switch self {
        case .rodando: "bolt.fill"
        case .concluida: "checkmark.circle.fill"
        case .fallback: "arrow.uturn.backward.circle.fill"
        case .falhou: "xmark.octagon.fill"
        case .outros: "questionmark.circle"
        }
    }
}

extension Tom {
    var cor: Color {
        switch self {
        case .normal: .primary
        case .bom: .green
        case .alerta: .orange
        case .ruim: .red
        }
    }
}

extension FaseEvento {
    var icone: String {
        switch self {
        case .orquestra: "point.3.connected.trianglepath.dotted"
        case .enxame: "square.stack.3d.up.fill"
        case .subagente: "person.2.fill"
        case .ferramenta: "wrench.and.screwdriver.fill"
        case .verificador: "checkmark.seal.fill"
        case .desconhecido: "circle.dotted"
        }
    }

    var cor: Color {
        switch self {
        case .orquestra: Marca.azul
        case .enxame: .purple
        case .subagente: .indigo
        case .ferramenta: Marca.ciano
        case .verificador: .green
        case .desconhecido: .gray
        }
    }
}

extension ModoOrquestra {
    var cor: Color {
        switch self {
        case .off: .gray
        case .sombra: .orange
        case .on: .green
        case .desconhecido: .gray
        }
    }

    var descricao: String {
        switch self {
        case .off: "ORQUESTRA=off: tudo vai para a Aura, como antes."
        case .sombra: "ORQUESTRA=sombra: os logs mostram o que mudaria, sem mudar nada."
        case .on: "ORQUESTRA=on: o roteador decide quem trabalha."
        case .desconhecido(let s): "Modo desconhecido: \(s)"
        }
    }
}

/// Copia para a área de transferência.
func copiar(_ texto: String) {
    NSPasteboard.general.clearContents()
    NSPasteboard.general.setString(texto, forType: .string)
}
