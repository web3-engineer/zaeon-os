/**
 * ESTUDOS — a VITRINE dos blueprints (PURO). Pedido do dono (out/2026): todo conhecimento pode ser vendido — trabalhos
 * acadêmicos escritos, artigos nunca publicados, códigos, empresas, negócios, plantações, qualquer RWA —, validado e
 * vendido em FRAÇÕES, pago em SOL (Solana). No cyberespaço eles são
 * praticamente ITENS DE COLECIONADOR: a vitrine dá o chamariz visual (a raridade acende a moldura, o 3D do tema gira).
 * Foco em DYOM (do it yourself) — coisas que dá pra fazer hoje, de ponta a ponta, ou pagar um agente de IA pra fazer —,
 * algumas grátis (cursos open source, contribuições da comunidade) e algumas com ironia.
 *
 * Este é o CATÁLOGO SIMULADO (exemplos do que humanos vão colocar lá). Os preços estão em SOL (Solana), mas a compra
 * ainda NÃO está no ar: nada aqui cobra ninguém (comprar é um "em breve"). Um estudo de verdade entra na vitrine quando
 * o blueprint dele fica VENDÁVEL (lib/estudos/blueprint).
 */
import type { Raridade } from "./blueprint";
import { AGENTES_ORQUESTRA } from "@/lib/orquestra/catalogo";
import type { PluginChat } from "@/lib/plugins/chatPlugins";
import type { ParteResumo, Apoio } from "./pesquisas";
import { INICIANTES } from "@/lib/forja/catalogoIniciantes";
import { AVANCADOS, TEMA_AVANCADO, type TemaAvancado } from "@/lib/forja/catalogoAvancado";

/** o desenho 3D do tema (components/estudos/modelos3d) */
export type Modelo3D = "console" | "chip" | "planta" | "predio" | "drone" | "foguete" | "molecula" | "engrenagem" | "livro" | "graos" | "ondas" | "robo" | "pasta";
/** o tipo de conhecimento à venda */
/** o tipo de conhecimento à venda. `skill` = procedimento da casa (.claude/skills), plugável no chat.
 *  `pesquisa` = uma PASTA de pesquisa (lib/estudos/pesquisas): os papéis dentro dela são as partes. */
export type TipoProduto = "curso" | "codigo" | "artigo" | "negocio" | "rwa" | "agente" | "skill" | "pesquisa";
export const NOME_TIPO: Record<TipoProduto, string> = { curso: "Curso", codigo: "Código", artigo: "Trabalho acadêmico", negocio: "Negócio", rwa: "Ativo real (RWA)", agente: "Feito por agente de IA", skill: "Skill", pesquisa: "Pesquisa" };
/** quem executa: você mesmo (DYOM) ou um agente de IA que faz por você */
export type Execucao = "dyom" | "agente";

export type ItemVitrine = {
  id: string; titulo: string; subtitulo: string;
  tipo: TipoProduto; execucao: Execucao; modelo: Modelo3D;
  autor: string; raridade: Raridade; profundidade: number;
  /** preço de UMA fração, em SOL (Solana) (0 = grátis: open source / comunidade) */
  preco: number;
  /** as frações: quantas existem e quantas já foram vendidas (o vetor fracionado do conhecimento) */
  fracoes: { total: number; vendidas: number };
  selos: { supervisionado: boolean; linksOk: boolean; codigoPrivado: boolean };
  /** o que vem no blueprint (as entregas) */
  entrega: string[];
  /** um toque de ironia (o dono: "outras tipificações profundas — ou não — contêm ironia") */
  ironia?: boolean;
  /**
   * preço FIXO em reais, quando o item é pago. `undefined` = o preço vem de `preco` (SOL, catálogo
   * simulado). Itens de skill (pago/curso) usam ESTE campo: o dono quis o preço fixo em reais, com
   * a conversão para SOL feita ao vivo na exibição (lib/solana/cotacao).
   */
  precoBRL?: number;
  /**
   * a conta DONA do item. Todo item pago e todo curso pertencem ao fundador (DONO_VITRINE) — regra
   * do dono, verificada no portão das skills. `undefined` nos itens grátis e no catálogo simulado.
   */
  dono?: string;
  /**
   * DEVICE: o que o aluno baixa e roda na máquina dele. Presente só nos itens de família "device".
   * É o que a UI usa para mostrar o botão de download (o espelho) e as instruções APÓS o plug.
   */
  device?: { plataforma: string; mirror: string; sha256: string | null };
  tags: string[];
  /** blueprint que vira AGENTE no seletor da sidebar (não espera a moeda: adicionar é grátis e instantâneo) */
  plugavel?: PluginChat;
  // ── os DETALHES (painel "detalhes" do card — components/estudos/DetalhesBuild). Vêm da API, ligados à conta. ──
  /** a CONTA que publicou (quando o card está ligado a um usuário) */
  conta?: { id: string; nome: string; handle?: string | null; avatarUrl?: string | null; verificada?: boolean };
  /** o nicho da build (ex.: "Aeroespacial"); sem ele, o painel mostra o tipo */
  nicho?: string;
  /** a descrição longa, escrita por quem publicou (sem limite de tamanho; parágrafos separados por linha em branco) */
  descricao?: string;
  /** quantas pessoas validaram a build */
  validadores?: number;
  /** a FOTO do card, posta pelo dono na curadoria (lib/estudos/curadoria) — no lugar do emoji do tema */
  imagem?: string;
  /** PESQUISA: o card é uma PASTA e estes são os papéis dentro dela (o texto de cada um vem sob demanda, pelo slug) */
  pasta?: { slug: string; partes: ParteResumo[] };
  /** PESQUISA aberta a APOIO (financiamento em SOL) — lib/estudos/pesquisas */
  apoio?: Apoio;
};

export const MOEDA = { simbolo: "SOL", nome: "Solana (SOL)", ativa: false } as const;

/**
 * Os 10 projetos OSS para iniciantes (Forja, Fase C) como itens da vitrine — GRÁTIS (código aberto não
 * cobra). Cada um abre o board da Forja daquele repo na Sala de Estudos (id `forja:<cursoId>`, consumido
 * por lib/forja/desbloqueioForja). Autor e licença são os REAIS do repo estudado (atribuição preservada).
 */
const MODELO_INICIANTE: Record<string, Modelo3D> = {
  "jogo-da-velha": "console", "portfolio": "livro", "api-rest-crud": "engrenagem",
  "encurtador-de-url": "engrenagem", "app-de-clima": "ondas", "pomodoro": "engrenagem",
};
export const ITENS_FORJA_INICIANTES: readonly ItemVitrine[] = INICIANTES.map((e): ItemVitrine => ({
  id: `forja:${e.id}`, titulo: e.titulo, subtitulo: e.resumo,
  tipo: "curso", execucao: "dyom", modelo: MODELO_INICIANTE[e.id] ?? "chip",
  autor: e.licenca?.titular ?? "comunidade open source", raridade: "comum", profundidade: 34,
  preco: 0, fracoes: { total: 1, vendidas: 0 },
  selos: { supervisionado: false, linksOk: true, codigoPrivado: false },
  entrega: [
    "o curso interativo da Forja: board (entender → espelho → entregar), temperatura e lições",
    `o repositório-referência estudado de verdade (${e.repo}, ${e.licenca?.spdx ?? "open source"})`,
    "publique o SEU primeiro projeto no GitHub pela Octa",
  ],
  tags: ["forja", "código aberto", "iniciante", "grátis", e.conceito ?? "projeto"],
}));

/**
 * A trilha AVANÇADA da Forja (card #793, lib/forja/catalogoAvancado) como itens da vitrine — também GRÁTIS e
 * abrindo o board `forja:<cursoId>`, mas marcados "avançado" (nunca "iniciante") e com o entregável certo
 * do nível: estudar e rodar/simular/treinar, não publicar o primeiro projeto. Autor/licença = os do repo.
 */
const MODELO_TEMA_AVANCADO: Record<TemaAvancado, Modelo3D> = {
  robotica: "robo", sistemas: "engrenagem", ia: "chip", "graficos-jogos": "console", "redes-distribuido": "ondas",
};
export const ITENS_FORJA_AVANCADOS: readonly ItemVitrine[] = AVANCADOS.map((e): ItemVitrine => ({
  id: `forja:${e.id}`, titulo: e.titulo, subtitulo: e.resumo,
  tipo: "curso", execucao: "dyom", modelo: MODELO_TEMA_AVANCADO[TEMA_AVANCADO[e.id]] ?? "chip",
  autor: e.licenca?.titular ?? "comunidade open source", raridade: "rara", profundidade: 72,
  preco: 0, fracoes: { total: 1, vendidas: 0 },
  selos: { supervisionado: false, linksOk: true, codigoPrivado: false },
  entrega: [
    "o curso interativo da Forja: board (entender → espelho → entregar), temperatura e lições",
    `o repositório-referência estudado de verdade (${e.repo}, ${e.licenca?.spdx ?? "open source"})`,
    "rode, simule ou treine o projeto você mesmo — e demonstre que funciona",
  ],
  tags: ["forja", "código aberto", "avançado", "grátis", e.conceito ?? "projeto"],
}));

export const CATALOGO: readonly ItemVitrine[] = [
  { id: "octa-code", titulo: "Octa Code", subtitulo: "O agente de código da Zaeon, com a IDE dele — e freio de mão: não mexe onde você não pediu", tipo: "agente", execucao: "agente", modelo: "robo", autor: "Zaeon", raridade: "lendaria", profundidade: 90, preco: 0, fracoes: { total: 1, vendidas: 0 }, selos: { supervisionado: false, linksOk: true, codigoPrivado: false }, entrega: ["a IDE do Octa: editor, seu repositório do GitHub e execução no navegador", "revisão de código que aponta o trecho, sem reescrever o arquivo", "mudanças só no escopo pedido (as 4 perguntas antes de cada extra)", "telas mobile no padrão nativo (Expo/RN, Apple HIG)", "código colado é dado, nunca ordem — e segredo nunca vai pro modelo"], tags: ["código", "agente", "IDE", "grátis"], plugavel: "octa-code" },
  { id: "eiffel-cad", titulo: "Eiffel", subtitulo: "O engenheiro de estruturas da Zaeon — modela a peça em CAD paramétrico e te dá o STEP", tipo: "agente", execucao: "agente", modelo: "predio", autor: "Zaeon", raridade: "lendaria", profundidade: 88, preco: 0, fracoes: { total: 1, vendidas: 0 }, selos: { supervisionado: true, linksOk: true, codigoPrivado: false }, entrega: ["CAD paramétrico de verdade (SolidCraft, MIT/Apache-2.0): esboço, extrusão, filete, chanfro", "a peça vira ARTEFATO na conversa, com visualizador 3D e o STEP pra baixar", "modo edição: você mexe na peça, com timeline e parâmetros", "cada etapa verificada com medida real — volume, área, massa, centro de massa", "caminho de carga explicado: de onde a força vem, por onde desce, onde sai"], tags: ["engenharia", "CAD", "estruturas", "agente", "grátis"], plugavel: "eiffel-cad" },
  // A NOETHER: o card é o AGENTE, e as skills de matemática vêm dentro dele (as que são só dela não têm card próprio —
  // lib/estudos/vitrineSkills, metadado `zaeon-card: agente`). Um plug, e o seletor ganha a matemática com tudo no bolso.
  { id: "noether-matematica", titulo: "Noether", subtitulo: "A matemática da Zaeon — conduz a demonstração passo a passo e te deixa arrastar o teorema", tipo: "agente", execucao: "agente", modelo: "livro", autor: "Zaeon", raridade: "lendaria", profundidade: 87, preco: 0, fracoes: { total: 1, vendidas: 0 }, selos: { supervisionado: false, linksOk: true, codigoPrivado: false }, entrega: ["resolução passo a passo, uma regra por passo, tipografada na tela (KaTeX)", "geometria dinâmica: a construção com pontos que você arrasta (JSXGraph)", "conta simbólica exata e a conferência da SUA resposta (SymPy)", "o esqueleto da demonstração ou do algoritmo em diagrama (Mermaid)", "o curso de algoritmos clássicos, notebooks no navegador e cálculo numérico", "ela pede a sua tentativa antes de resolver — e não faz a prova por você"], tags: ["matemática", "cálculo", "geometria", "demonstração", "agente", "grátis"], plugavel: "noether-matematica" },
  // OS AGENTES DA ORQUESTRA (lib/orquestra/catalogo): blueprints que viram agente no seletor, como o Octa — o
  // estado de cada um (liberado / exige plano / em breve) vem do servidor no modal (GET /api/orquestra/agentes).
  ...AGENTES_ORQUESTRA.map((a): ItemVitrine => ({
    id: a.id, titulo: a.nome, subtitulo: a.resumo, tipo: "agente", execucao: "agente",
    // quem publica é a ZAEON (o agente é dela, orquestrando o modelo do laboratório — que segue nas tags)
    modelo: a.formato === "enxame" ? "ondas" : "robo", autor: "Zaeon",
    raridade: a.formato === "enxame" ? "lendaria" : "epica", profundidade: a.formato === "enxame" ? 95 : 85,
    preco: 0, fracoes: { total: 1, vendidas: 0 }, selos: { supervisionado: false, linksOk: true, codigoPrivado: false },
    entrega: [a.comoTrabalha, "fontes reais: bases acadêmicas, web e a base da Zaeon", "citações conferidas — chave que nenhuma busca devolveu é cortada", `incluso a partir do plano ${a.minPlan === "max" ? "Max" : "Pro"}`],
    tags: [a.laboratorio, a.formato === "enxame" ? "equipe de agentes" : "pesquisa profunda", "orquestra"],
    plugavel: a.id,
  })),
  { id: "ps5-rev", titulo: "Engenharia reversa do PS5", subtitulo: "Do boot ROM ao hypervisor — o mapa completo, com as fontes", tipo: "curso", execucao: "dyom", modelo: "console", autor: "Lia Monteiro", raridade: "lendaria", profundidade: 91, preco: 48, fracoes: { total: 1000, vendidas: 812 }, selos: { supervisionado: true, linksOk: true, codigoPrivado: true }, entrega: ["12 aulas em vídeo", "o dump comentado (privado)", "o blueprint do boot seguro", "laboratório com Raspberry Pi"], tags: ["hardware", "segurança", "consoles"] },
  { id: "horta-vertical", titulo: "Horta vertical que paga a conta de luz", subtitulo: "Hidroponia + painel solar num muro de 6 m² — com a planilha de retorno", tipo: "rwa", execucao: "dyom", modelo: "planta", autor: "Coletivo Raiz", raridade: "epica", profundidade: 74, preco: 12, fracoes: { total: 500, vendidas: 233 }, selos: { supervisionado: true, linksOk: true, codigoPrivado: false }, entrega: ["projeto elétrico e hidráulico", "lista de compras com preços", "a horta-piloto (fração do que ela produz)"], tags: ["agro", "energia", "RWA"] },
  { id: "llm-8gb", titulo: "Seu próprio LLM num notebook de 8 GB", subtitulo: "Quantização, RAG e um agente local — sem placa de vídeo", tipo: "codigo", execucao: "dyom", modelo: "chip", autor: "comunidade Zaeon", raridade: "rara", profundidade: 58, preco: 0, fracoes: { total: 1, vendidas: 0 }, selos: { supervisionado: false, linksOk: true, codigoPrivado: false }, entrega: ["repositório open source", "guia passo a passo", "benchmarks reais"], tags: ["IA", "open source", "grátis"] },
  { id: "drone-marmita", titulo: "Drone de entrega de marmita no condomínio", subtitulo: "Com a licença da ANAC, o síndico convencido e o feijão intacto", tipo: "negocio", execucao: "dyom", modelo: "drone", autor: "Beto Asas", raridade: "rara", profundidade: 47, preco: 9, fracoes: { total: 300, vendidas: 41 }, selos: { supervisionado: false, linksOk: true, codigoPrivado: true }, entrega: ["firmware de rota (privado)", "o modelo de negócio", "o roteiro da conversa com o síndico"], ironia: true, tags: ["drones", "logística", "ironia"] },
  { id: "microbioma-sertao", titulo: "O microbioma do solo do sertão", subtitulo: "Dissertação de mestrado nunca publicada — os dados brutos inclusos", tipo: "artigo", execucao: "dyom", modelo: "molecula", autor: "Dra. Iracema Lopes", raridade: "epica", profundidade: 82, preco: 6, fracoes: { total: 200, vendidas: 120 }, selos: { supervisionado: true, linksOk: true, codigoPrivado: false }, entrega: ["a dissertação completa", "os dados de sequenciamento", "o protocolo de coleta"], tags: ["biologia", "semiárido", "dados"] },
  { id: "saas-mei", titulo: "SaaS de nota fiscal pra MEI em um fim de semana", subtitulo: "Do schema ao primeiro cliente pagante — o código e o funil", tipo: "negocio", execucao: "agente", modelo: "engrenagem", autor: "Agente Deploy (Zaeon)", raridade: "epica", profundidade: 69, preco: 24, fracoes: { total: 400, vendidas: 87 }, selos: { supervisionado: true, linksOk: true, codigoPrivado: true }, entrega: ["o código (privado)", "a integração com a prefeitura", "o funil de vendas"], tags: ["negócio", "fiscal", "agente"] },
  { id: "foguete-pet", titulo: "Foguete de garrafa PET com telemetria", subtitulo: "Altímetro, paraquedas e os dados do voo no celular", tipo: "curso", execucao: "dyom", modelo: "foguete", autor: "comunidade Zaeon", raridade: "comum", profundidade: 38, preco: 0, fracoes: { total: 1, vendidas: 0 }, selos: { supervisionado: false, linksOk: true, codigoPrivado: false }, entrega: ["curso open source", "o código do altímetro", "a planilha dos voos"], tags: ["física", "escola", "grátis"] },
  { id: "cafe-cariri", titulo: "Café especial do Cariri — lote fracionado", subtitulo: "Um hectare de arábica a 900 m — a colheita de 2027 em frações", tipo: "rwa", execucao: "dyom", modelo: "graos", autor: "Sítio Boa Vista", raridade: "lendaria", profundidade: 88, preco: 30, fracoes: { total: 2000, vendidas: 1544 }, selos: { supervisionado: true, linksOk: true, codigoPrivado: false }, entrega: ["laudo do solo", "o contrato da safra", "rastreio do lote até a xícara"], tags: ["agro", "café", "RWA"] },
  { id: "pipoca-microondas", titulo: "Engenharia reversa do micro-ondas", subtitulo: "Pra fazer a pipoca perfeita. Sim, tem gráfico de pressão de vapor.", tipo: "curso", execucao: "dyom", modelo: "ondas", autor: "Prof. Estouro", raridade: "comum", profundidade: 31, preco: 2, fracoes: { total: 9999, vendidas: 3120 }, selos: { supervisionado: false, linksOk: true, codigoPrivado: false }, entrega: ["3 aulas", "a tabela de tempos por marca", "o gráfico que ninguém pediu"], ironia: true, tags: ["física", "cozinha", "ironia"] },
  { id: "agente-ir", titulo: "Um agente de IA que faz a sua declaração de IR", subtitulo: "Lê os informes, monta a declaração e explica cada linha", tipo: "agente", execucao: "agente", modelo: "robo", autor: "Agente Fisco (Zaeon)", raridade: "epica", profundidade: 66, preco: 15, fracoes: { total: 800, vendidas: 402 }, selos: { supervisionado: true, linksOk: true, codigoPrivado: true }, entrega: ["o agente pronto", "as regras de 2027 conferidas", "o relatório pra contador revisar"], tags: ["finanças", "agente", "impostos"] },
  { id: "predio-bambu", titulo: "Prédio de 4 andares em bambu", subtitulo: "O blueprint estrutural — cálculo, tratamento e as normas", tipo: "rwa", execucao: "dyom", modelo: "predio", autor: "Ateliê Taquara", raridade: "lendaria", profundidade: 86, preco: 60, fracoes: { total: 600, vendidas: 210 }, selos: { supervisionado: true, linksOk: true, codigoPrivado: false }, entrega: ["projeto estrutural", "o ensaio de flexão", "o prédio-piloto (fração do aluguel)"], tags: ["construção", "bambu", "RWA"] },
  { id: "tcc-ia-escrita", titulo: "TCC escrito com método (e sem plágio)", subtitulo: "O percurso, as fontes conferidas e a banca simulada", tipo: "artigo", execucao: "agente", modelo: "livro", autor: "Aura (Zaeon)", raridade: "rara", profundidade: 55, preco: 0, fracoes: { total: 1, vendidas: 0 }, selos: { supervisionado: true, linksOk: true, codigoPrivado: false }, entrega: ["o modelo do TCC", "o checklist ABNT", "a banca simulada"], tags: ["academia", "escrita", "grátis"] },
  // os 10 projetos OSS para iniciantes (Forja) — grátis, abrem o board da Forja (ver ITENS_FORJA_INICIANTES)
  ...ITENS_FORJA_INICIANTES,
  // a trilha avançada da Forja (card #793) — grátis, marcada "avançado" (ver ITENS_FORJA_AVANCADOS)
  ...ITENS_FORJA_AVANCADOS,
];

export type FiltroVitrine = "todos" | "gratis" | "dyom" | "agente" | "rwa" | "skill" | "pesquisa" | "ironia";
export const FILTROS: { id: FiltroVitrine; nome: string }[] = [
  { id: "todos", nome: "Tudo" }, { id: "dyom", nome: "Faça você mesmo" }, { id: "agente", nome: "Um agente faz" },
  { id: "rwa", nome: "Ativos reais" }, { id: "skill", nome: "Skills" }, { id: "pesquisa", nome: "Pesquisas" }, { id: "gratis", nome: "Grátis" }, { id: "ironia", nome: "Com ironia" },
];
/** abas cujo conteúdo só vem do BANCO (sem nada embutido): ficam escondidas enquanto não há item nelas */
export const FILTROS_DO_BANCO: readonly FiltroVitrine[] = ["pesquisa"];
/** as abas que a vitrine mostra: as fixas sempre; as do banco só quando têm o que mostrar */
export const filtrosVisiveis = (itens: readonly ItemVitrine[]) =>
  FILTROS.filter((f) => !FILTROS_DO_BANCO.includes(f.id) || filtrarVitrine(itens, f.id).length > 0);
export function filtrarVitrine(itens: readonly ItemVitrine[], f: FiltroVitrine, busca = ""): ItemVitrine[] {
  const q = busca.trim().toLowerCase();
  return itens.filter((i) =>
    (f === "todos" || (f === "gratis" && i.preco === 0) || (f === "dyom" && i.execucao === "dyom") || (f === "agente" && i.execucao === "agente") || (f === "rwa" && i.tipo === "rwa") || (f === "skill" && i.tipo === "skill") || (f === "pesquisa" && i.tipo === "pesquisa") || (f === "ironia" && !!i.ironia))
    && (!q || `${i.titulo} ${i.subtitulo} ${i.autor} ${i.tags.join(" ")}`.toLowerCase().includes(q)));
}
/** o quanto das frações já foi vendido (0..1) — e o preço "cheio" (todas as frações) */
export const vendido = (i: ItemVitrine) => (i.fracoes.total ? i.fracoes.vendidas / i.fracoes.total : 0);
export const valorTotal = (i: ItemVitrine) => i.preco * i.fracoes.total;
/** "48 SOL" / "Grátis" */
export const precoTexto = (p: number) => (p <= 0 ? "Grátis" : `${p.toLocaleString("pt-BR")} ${MOEDA.simbolo}`);

/** junta os cards do admin (preferidos) com o catálogo embutido SEM repetir id — se um item do admin usa o mesmo id de um
 *  embutido, fica só o do admin (senão a carta aparece duas vezes e as duas dividem o estado de "conectado", que é por id). */
export function mesclarCatalogo(doAdmin: readonly ItemVitrine[], base: readonly ItemVitrine[] = CATALOGO): ItemVitrine[] {
  const vistos = new Set<string>();
  const out: ItemVitrine[] = [];
  for (const it of [...doAdmin, ...base]) { if (!vistos.has(it.id)) { vistos.add(it.id); out.push(it); } }
  return out;
}
