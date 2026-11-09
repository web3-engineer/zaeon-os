/**
 * Tool registry da Aura (Fase 0 do harness).
 *
 * Fonte-da-verdade das ferramentas que a Aura pode CHAMAR (function-calling do
 * Gemini). Fase 0 tem uma tool só: `studio_generate` — transforma o pedido
 * ("gere um podcast sobre X") numa AÇÃO que o cliente executa reusando o Studio
 * que já existe, e o artefato cai na conversa. Sem geração no servidor: mantém
 * o Studio client-orchestrated como já é (mesmo padrão do summon/plan).
 *
 * `literature_search` é real (lib/agent/runtime.ts → lib/scholar/retrieve, bases gratuitas);
 * memory_search e examiner seguem como stubs no runtime.
 */
import type { FunctionDeclaration } from "@google-cloud/vertexai";

// Kinds canônicos aceitos pelo Studio (bate com os endpoints /api/studio/*):
//   texto (síncrono): guide | mindmap | timeline | flashcards | faq
//   imagem (síncrono): image
//   assíncrono (polling): podcast | video
export type StudioKind =
  | "guide" | "mindmap" | "timeline" | "flashcards" | "faq"
  // `molecule` entrou na lista e nos ALIASES quando o viewer 3D nasceu, mas NÃO aqui nem
  // no STUDIO_LABEL. Em runtime passava (a lista é quem filtra), só que `studioLabel`
  // caía no fallback e o artefato se chamava "artefato: cafeína" em vez de
  // "molécula: cafeína". Sete erros do tsc apontavam pra isto, escondidos pelo
  // ignoreBuildErrors.
  | "image" | "podcast" | "video" | "molecule"
  // diagrama INTERATIVO (archify — lib/studio/diagram.ts): "como funciona X", esquema, fluxograma.
  // O "mapa mental" continua `mindmap` no pedido, mas o cliente o desenha com o archify também.
  | "diagram"
  // AULA interativa (Papermorph, Opção A — lib/aula-interativa/*): "me dá uma aula sobre X". Também é o
  // substituto do vídeo explicativo (auditoria do video-pipeline: docs/APRENDER_INTERATIVO.md).
  | "aula"
  // PEÇA CAD paramétrica (Eiffel, SolidCraft — lib/cad/mcp): o payload leva o script JSON + glTF (a
  // miniatura, no CadView) + STEP (baixar) + PNG. O editor de verdade é o embed WASM (modo edição).
  | "cad"
  // ESTRUTURA ANATÔMICA (Zenita, BodyParts3D — lib/anatomia/cena-do-conceito): o payload NÃO é imagem,
  // é o `EstadoCena` que determina o que o visualizador desenha. Ver o cabeçalho daquele módulo para
  // por que estado e não PNG — resumo: o atlas não tem pipeline de captura, e não precisa de um.
  | "anatomia";

export const STUDIO_KINDS: StudioKind[] = [
  "guide", "mindmap", "timeline", "flashcards", "faq", "image", "podcast", "video", "molecule", "diagram", "aula", "cad",
  "anatomia",
];

// Rótulo humano (PT-BR) por kind — usado na confirmação e no provenance.
export const STUDIO_LABEL: Record<StudioKind, string> = {
  guide: "guia de estudo",
  mindmap: "mapa mental",
  timeline: "linha do tempo",
  flashcards: "flashcards",
  faq: "FAQ",
  image: "imagem",
  podcast: "podcast",
  video: "vídeo",
  molecule: "molécula",
  diagram: "diagrama interativo",
  aula: "aula interativa",
  cad: "peça CAD",
  anatomia: "estrutura anatômica",
};

// Aceita sinônimos/PT que o modelo possa devolver → normaliza pro kind canônico.
const ALIASES: Record<string, StudioKind> = {
  guia: "guide", guide: "guide",
  mapa: "mindmap", "mapa mental": "mindmap", mindmap: "mindmap", mapamental: "mindmap",
  "linha do tempo": "timeline", linha_do_tempo: "timeline", timeline: "timeline",
  flashcard: "flashcards", flashcards: "flashcards", cartoes: "flashcards",
  faq: "faq", perguntas: "faq",
  imagem: "image", image: "image", figura: "image",
  podcast: "podcast", audio: "podcast", "áudio": "podcast",
  video: "video", "vídeo": "video",
  molecula: "molecule", "molécula": "molecule", molecule: "molecule",
  "estrutura molecular": "molecule", "estrutura 3d": "molecule", "modelo 3d": "molecule",
  diagrama: "diagram", diagram: "diagram", esquema: "diagram", fluxograma: "diagram",
  aula: "aula", "aula interativa": "aula", licao: "aula", "lição": "aula",
  "mapa conceitual": "mindmap", "mapa de estudo": "mindmap", "mapa de estudos": "mindmap",
  // CAD — NÃO reusar "modelo 3d": já é molecule acima. "peça" é a palavra do Eiffel.
  cad: "cad", "peça cad": "cad", "peca cad": "cad", "peça": "cad", "peca": "cad", "modelo cad": "cad",
  // ANATOMIA — palavras ESPECÍFICAS do corpo, e de propósito NÃO rouba "modelo 3d" nem "estrutura 3d"
  // de `molecule`: molécula também é modelo 3D, e tomar o termo ambíguo quebraria o pedido que já
  // funciona para trocá-lo por outro que passa a falhar. Quem desambigua é a palavra do campo.
  anatomia: "anatomia", "anatomico": "anatomia", "anatômico": "anatomia",
  corpo: "anatomia", "corpo humano": "anatomia", "atlas do corpo": "anatomia",
  orgao: "anatomia", "órgão": "anatomia", "estrutura anatomica": "anatomia", "estrutura anatômica": "anatomia",
};

export function normalizeStudioKind(raw: string): StudioKind {
  const k = (raw || "").trim().toLowerCase();
  return ALIASES[k] || (STUDIO_KINDS.includes(k as StudioKind) ? (k as StudioKind) : "guide");
}

export function studioLabel(kind: StudioKind): string {
  return STUDIO_LABEL[kind] || "artefato";
}

// ── Sala de Pesquisa: gerar um TRABALHO (aparece no documento). Espelha o studio. ──
export type ResearchKind = "pesquisa" | "artigo" | "relatorio" | "tcc";
export const RESEARCH_KINDS: ResearchKind[] = ["pesquisa", "artigo", "relatorio", "tcc"];

// kind → WorkType do editor (Artigo | Relatório | TCC); "pesquisa" cai em Artigo.
export function researchWorkType(kind: string): "Artigo" | "Relatório" | "TCC" {
  const k = (kind || "").trim().toLowerCase();
  if (k === "tcc") return "TCC";
  if (k === "relatorio" || k === "relatório") return "Relatório";
  return "Artigo"; // artigo | pesquisa | desconhecido
}

export const researchGenerateTool: FunctionDeclaration = {
  name: "research_generate",
  description:
    "Gera um TRABALHO ACADÊMICO (artigo, relatório, TCC ou pesquisa) sobre um tema e o encaixa " +
    "no documento da Sala de Pesquisa. Use quando a pessoa PEDIR pra gerar/criar/redigir um " +
    "trabalho (ex.: 'gera um artigo sobre X', 'faz um TCC sobre Y', 'monta uma pesquisa disso'). " +
    "Para conversar, tirar dúvida ou revisar um trecho, NÃO chame — responda em texto.",
  parameters: {
    type: "OBJECT" as any,
    properties: {
      kind: {
        type: "STRING" as any,
        description: "O tipo: artigo, relatorio, tcc ou pesquisa (paper geral).",
      },
      topic: {
        type: "STRING" as any,
        description: "O tema/assunto do trabalho em linguagem natural (ex.: 'fotossíntese').",
      },
    },
    required: ["kind", "topic"],
  },
};

// A FunctionDeclaration que a Aura enxerga. Descrição precisa = menos gatilho errado.
export const studioGenerateTool: FunctionDeclaration = {
  name: "studio_generate",
  description:
    "Gera um ARTEFATO do Studio a partir do estudo em foco e o encaixa na conversa. " +
    "Chame quando a pessoa PEDIR para gerar/criar/fazer um artefato " +
    "(ex.: 'gere um podcast sobre fotossíntese', 'faz um mapa mental disso', 'cria flashcards') " +
    "E TAMBÉM quando ela ACEITAR uma oferta que você mesmo fez ('ótima ideia', 'sim', 'pode gerar', " +
    "'vamos'): aceitar é pedir. Nunca ofereça o mesmo artefato duas vezes — se já ofereceu e a " +
    "pessoa topou, GERE. Para conversa normal ou dúvida, NÃO chame — responda em texto.",
  parameters: {
    type: "OBJECT" as any,
    properties: {
      kind: {
        type: "STRING" as any,
        description:
          "O tipo do artefato. Um de: guide (guia), mindmap (mapa mental), timeline (linha do tempo), " +
          "flashcards, faq, image (imagem), podcast (áudio 2 vozes), video (vídeo-resumo), " +
          "molecule (estrutura molecular 3D de verdade, vinda do PubChem — use quando a pessoa quiser VER " +
          "uma substância química: 'mostra a molécula da cafeína', 'como é a estrutura da glicose').",
      },
      topic: {
        type: "STRING" as any,
        description: "O assunto/tema em linguagem natural (ex.: 'fotossíntese'). Use o foco da conversa.",
      },
    },
    required: ["kind"],
  },
};
