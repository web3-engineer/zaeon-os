import HermesCore
import SwiftUI

/// As bases de conhecimento que os motores podem consultar.
struct DatasetsView: View {
    @Environment(EstadoApp.self) private var estado
    @State private var selecionado: DatasetPainel.ID?

    var body: some View {
        let datasets = estado.painel?.datasets ?? []
        VStack(alignment: .leading, spacing: 14) {
            CabecalhoTela(titulo: "Datasets",
                          subtitulo: "\(datasets.filter(\.conectado).count) de \(datasets.count) conectados · "
                              + "documentos/trechos aparecem como — quando o banco do RAG não respondeu")
                .padding(.horizontal, 20)
                .padding(.top, 16)

            if estado.painel == nil {
                EsqueletoCartoes(quantidade: 5, altura: 34).padding(.horizontal, 20)
                Spacer()
            } else {
                Table(datasets, selection: $selecionado) {
                    TableColumn("Nome") { (d: DatasetPainel) in
                        VStack(alignment: .leading, spacing: 1) {
                            Text(d.nome).font(.callout.weight(.medium))
                            Text(d.id).font(.caption.monospaced()).foregroundStyle(.secondary)
                        }
                        .help(d.descricao)
                    }
                    .width(min: 160, ideal: 210)
                    TableColumn("Tipo") { (d: DatasetPainel) in
                        Pilula(texto: d.tipo.rotulo, cor: cor(d.tipo))
                    }
                    .width(min: 100, ideal: 120)
                    TableColumn("Fonte") { (d: DatasetPainel) in
                        Text(d.fonte).lineLimit(2).help(d.fonte)
                    }
                    .width(min: 160, ideal: 280)
                    TableColumn("Licença") { (d: DatasetPainel) in
                        Text(d.licenca.isEmpty ? Fmt.vazio : d.licenca).lineLimit(2).foregroundStyle(.secondary)
                    }
                    .width(min: 110, ideal: 180)
                    TableColumn("Documentos") { (d: DatasetPainel) in
                        Text(Fmt.inteiro(d.documentos)).monospacedDigit().frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    .width(90)
                    TableColumn("Trechos") { (d: DatasetPainel) in
                        Text(Fmt.inteiro(d.trechos)).monospacedDigit().frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    .width(90)
                    TableColumn("Conectado") { (d: DatasetPainel) in
                        Label(d.conectado ? "sim" : "não", systemImage: d.conectado ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .foregroundStyle(d.conectado ? .green : .red)
                    }
                    .width(90)
                }
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .padding(.horizontal, 20)

                if let d = datasets.first(where: { $0.id == selecionado }) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(d.nome).font(.headline)
                        Text(d.descricao.isEmpty ? "(sem descrição)" : d.descricao).foregroundStyle(.secondary)
                        let usam = (estado.painel?.motores ?? []).filter { $0.datasets.contains(d.id) }.map(\.nome)
                        Text(usam.isEmpty ? "Nenhum motor usa este dataset." : "Usado por: " + usam.joined(separator: ", "))
                            .font(.caption)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .cartao()
                    .padding(.horizontal, 20)
                }
            }
        }
        .padding(.bottom, 16)
        .navigationTitle("Datasets")
    }

    private func cor(_ t: TipoDataset) -> Color {
        switch t {
        case .ragArea: Marca.ciano
        case .ragTurma: .indigo
        case .ragPessoal: .pink
        case .hfDataset: .yellow
        case .desconhecido: .gray
        }
    }
}
