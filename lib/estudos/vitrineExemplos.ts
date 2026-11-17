import { temCaderno } from "./cadernosEstudo";
import type { SkinVitrine } from "./skinVitrine";
import type { ItemVitrine, Modelo3D } from "./vitrine";

type Exemplo = readonly [id: string, titulo: string, modelo: Modelo3D, imagem?: string];
const exemplos = {
  tecnologia: [
    ["reaproveitamento-solar", "Placas solares: raspagem, riscos e alternativas para recuperar rendimento", "chip", "/assets/landing/estudos/solar.webp"],
    ["monitor-energia", "Monitor de consumo elétrico para uma casa", "chip", "/assets/landing/estudos/eletrica.webp"],
    ["sensor-irrigacao", "Sensor de umidade para irrigação de pequenos cultivos", "engrenagem"],
  ],
  dossie: [
    ["biogas-local", "Biogás de resíduos orgânicos: viabilidade e usos na comunidade", "molecula", "/assets/landing/estudos/quimica.webp"],
    ["rios-urbanos", "Qualidade da água em rios urbanos", "pasta", "/assets/landing/estudos/ambiental.webp"],
    ["sono-aprendizagem", "Sono e aprendizagem: uma revisão da literatura", "pasta", "/models/cerebro-landing.webp"],
  ],
  caderno: [
    ["captacao-chuva", "Dimensionamento de uma cisterna para água da chuva", "livro", "/assets/landing/estudos/cisternas.webp"],
    ["isolamento-termico", "Comparação de materiais para isolamento térmico", "livro", "/assets/landing/estudos/materiais.webp"],
    ["luz-natural", "Luz natural e ventilação no projeto de uma residência", "livro"],
  ],
  portfolio: [
    ["ecovila", "Ecovila sustentável: moradia, água e energia compartilhadas", "predio", "/assets/landing/estudos/ecovilas.webp"],
    ["estacao-reparo", "Projeto de uma oficina comunitária de reparo", "engrenagem"],
    ["sinalizacao-parque", "Sinalização acessível para um parque público", "livro"],
  ],
  dados: [
    ["geracao-fotovoltaica", "Geração fotovoltaica ao longo do ano em dados abertos", "ondas", "/assets/landing/estudos/solar.webp"],
    ["sazonalidade-feiras", "Sazonalidade e preços em feiras livres", "graos"],
    ["temperatura-bairros", "Ilhas de calor: comparação de temperaturas entre bairros", "livro"],
  ],
  historia: [
    ["memoria-ferrovia", "Memória de uma ferrovia a partir de mapas e fotografias", "predio"],
    ["mercados-municipais", "A história dos mercados municipais e das feiras livres", "livro"],
    ["cooperativas", "Como surgiram as cooperativas de trabalho no Brasil", "livro", "/assets/landing/estudos/comunidades.webp"],
  ],
  geografia: [
    ["corredores-verdes", "Mapeamento de corredores verdes num bairro", "planta"],
    ["bacia-urbana", "Leitura de uma bacia hidrográfica urbana", "ondas", "/assets/landing/estudos/oceanografia.webp"],
    ["acesso-transporte", "Tempo de acesso ao transporte público por bairro", "livro"],
  ],
  agronomia: [
    ["comedouros", "Comedouros para animais: ergonomia, higiene e desperdício", "graos"],
    ["horta-comunitaria", "Planejamento de uma horta comunitária com irrigação por gotejamento", "planta", "/assets/landing/estudos/hortas.webp"],
    ["cobertura-solo", "Cobertura do solo para reduzir perda de água no cultivo", "planta"],
  ],
  estudo: [
    ["governanca-comunitaria", "Como uma comunidade descentralizada toma decisões", "livro", "/assets/landing/estudos/comunidades.webp"],
    ["cardiovascular", "Como coração e vasos mantêm a circulação", "livro", "/models/coracao-landing.webp"],
    ["fluxo-caixa", "Fluxo de caixa de uma cooperativa de energia", "livro"],
  ],
} as const satisfies Record<SkinVitrine, readonly [Exemplo, Exemplo, Exemplo]>;

export const ESTUDOS_EXEMPLO: readonly ItemVitrine[] = Object.entries(exemplos).flatMap(([skin, itens]) =>
  (itens as readonly Exemplo[]).map(([id, titulo, modelo, imagem]): ItemVitrine => ({
    id: `estudo-exemplo:${id}`,
    titulo,
    subtitulo: "",
    skin: skin as SkinVitrine,
    tipo: "artigo",
    execucao: "dyom",
    modelo,
    imagem,
    autor: "Zaeon",
    raridade: "comum",
    profundidade: 0,
    preco: 0,
    fracoes: { total: 1, vendidas: 0 },
    selos: { supervisionado: false, linksOk: false, codigoPrivado: false },
    entrega: [],
    tags: [],
    exemploEstudo: true,
    ...(temCaderno(id) ? { cadernoEstudoId: id } : {}),
  })),
);
