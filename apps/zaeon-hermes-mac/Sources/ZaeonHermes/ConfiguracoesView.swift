import HermesCore
import SwiftUI

/// Servidor + token (arquivo só do usuário), teste de conexão e exportação para o Hugging Face. Só dado real — sem DEMO.
struct ConfiguracoesView: View {
    @Environment(EstadoApp.self) private var estado

    @State private var url = ""
    @State private var token = ""
    @State private var carregou = false

    @State private var testando = false
    @State private var resultadoTeste: Resultado?

    @State private var usarDesde = false
    @State private var desde = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
    @State private var exportando = false
    @State private var exportacao: ResultadoExportacao?
    @State private var erroExportacao: String?

    private enum Resultado {
        case ok(String)
        case erro(String)
    }

    var body: some View {
        Form {
            Section {
                HStack(spacing: 14) {
                    LetreiroZaeon(altura: 32)
                    Divider().frame(height: 28)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Console").font(.title2.weight(.semibold))
                        Text("Console interno da orquestra de agentes. Nada daqui chega ao aluno.")
                            .font(.callout).foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 6)
            }

            Section {
                TextField("URL do servidor", text: $url, prompt: Text(EstadoApp.urlPadrao))
                SecureField("Token do console", text: $token, prompt: Text("ORQUESTRA_CONSOLE_TOKEN (32+ caracteres)"))
                HStack(spacing: 10) {
                    Button("Salvar") {
                        estado.salvarConfiguracao(url: url, token: token)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Marca.azul)
                    .disabled(!mudou)
                    .keyboardShortcut("s", modifiers: .command)

                    Button {
                        Task { await testar() }
                    } label: {
                        Label("Testar conexão", systemImage: "antenna.radiowaves.left.and.right")
                    }
                    .disabled(testando || APIClient.normalizarURL(url) == nil || token.isEmpty)

                    if testando { ProgressView().controlSize(.small) }
                    Spacer()
                }
                if case .ok(let m)? = resultadoTeste {
                    Label(m, systemImage: "checkmark.circle.fill").foregroundStyle(.green)
                } else if case .erro(let m)? = resultadoTeste {
                    Label(m, systemImage: "xmark.octagon.fill").foregroundStyle(.red)
                }
                if !token.isEmpty && token.count < 32 {
                    Label("O servidor exige pelo menos 32 caracteres no ORQUESTRA_CONSOLE_TOKEN.", systemImage: "exclamationmark.triangle")
                        .font(.caption).foregroundStyle(.orange)
                }
            } header: {
                Text("Servidor")
            } footer: {
                Text("URL e token ficam num arquivo de configuração que só o seu usuário do Mac lê, e sobrevivem a toda atualização. Toda chamada vai com Authorization: Bearer <token>.")
                    .font(.caption).foregroundStyle(.secondary)
            }

            Section {
                Toggle("Exportar só desde uma data", isOn: $usarDesde)
                if usarDesde {
                    DatePicker("Desde", selection: $desde, displayedComponents: [.date, .hourAndMinute])
                }
                HStack(spacing: 10) {
                    Button {
                        Task { await exportar() }
                    } label: {
                        Label("Exportar trajetórias para o Hugging Face", systemImage: "square.and.arrow.up.on.square")
                    }
                    .disabled(exportando)
                    if exportando { ProgressView().controlSize(.small) }
                }
                if let r = exportacao {
                    VStack(alignment: .leading, spacing: 4) {
                        Label("\(r.exportadas) trajetória\(r.exportadas == 1 ? "" : "s") exportada\(r.exportadas == 1 ? "" : "s")",
                              systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("\(r.repo) · \(r.arquivo)").font(.caption.monospaced()).textSelection(.enabled)
                        if let u = r.urlRepo {
                            Link("Abrir o dataset no Hugging Face", destination: u).font(.callout)
                        }
                    }
                }
                if let e = erroExportacao {
                    Label(e, systemImage: "xmark.octagon.fill").foregroundStyle(.red)
                }
            } header: {
                Text("Exportar")
            } footer: {
                Text("Vai para o dataset: pedido, motor, decisão, eventos, evidências, texto e métricas. Nunca userId nem e-mail. "
                    + "O servidor precisa de HF_DATASETS_TOKEN e HF_DATASETS_ORG (sem eles: 503 datasets_desligados).")
                    .font(.caption).foregroundStyle(.secondary)
            }

            Section("Como ligar o console no servidor") {
                VStack(alignment: .leading, spacing: 6) {
                    Text("1. No .env da VPS, defina um token aleatório com 32+ caracteres:")
                    Text("ORQUESTRA_CONSOLE_TOKEN=$(openssl rand -hex 32)")
                        .font(.system(.callout, design: .monospaced))
                        .textSelection(.enabled)
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 8))
                    Text("2. Refaça o deploy e cole o mesmo valor no campo Token acima.")
                    Text("Sem a variável, o caminho por token fica desligado e só a sessão de super-admin entra.")
                        .foregroundStyle(.secondary)
                }
                .font(.callout)
            }
        }
        .formStyle(.grouped)
        .navigationTitle("Configurações")
        .onAppear {
            guard !carregou else { return }
            url = estado.urlServidor
            token = estado.token
            carregou = true
        }
    }

    private var mudou: Bool {
        url != estado.urlServidor || token != estado.token
    }

    /// Testa com o que está no formulário (antes de salvar).
    private func testar() async {
        testando = true
        resultadoTeste = nil
        defer { testando = false }
        let fonte: any FonteHermes
        do {
            fonte = try APIClient(urlServidor: url, token: token)
        } catch {
            resultadoTeste = .erro((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)
            return
        }
        do {
            let p = try await fonte.painel()
            let disp = p.motores.filter(\.disponivel).count
            resultadoTeste = .ok("Conectado: modo \(p.modo.bruto), \(disp)/\(p.motores.count) motores disponíveis, "
                + "\(p.tarefas.count) tarefas, \(p.emVoo) em voo.")
        } catch {
            resultadoTeste = .erro((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)
        }
    }

    private func exportar() async {
        exportando = true
        exportacao = nil
        erroExportacao = nil
        defer { exportando = false }
        do {
            exportacao = try await estado.fonte.exportar(desde: usarDesde ? desde : nil)
        } catch {
            erroExportacao = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
