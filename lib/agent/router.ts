/**
 * lib/agent/router.ts — PR02 do runbook (§13.1; encarna §11.2). O ROUTER do harness.
 *
 * classify(objective, ctx) → { intent, mode, academicMode, kind? }:
 *   1 chamada Gemini Flash (JSON forçado, temp 0) + FALLBACK HEURÍSTICO sem rede.
 * Barato por design (§7.4): o classificador NUNCA usa deep-think. Rede/credencial/timeout
 * → cai na heurística determinística (nunca derruba o laço). Tipos: importe de contracts.ts.
 */
import type { AgentContext } from "@/lib/agent/context";
import { pedeAula } from "@/lib/agent/aprender";
import { pedeGraficoMatematico } from "@/lib/agent/matematica";
import { pedeLivro } from "@/lib/livros/busca";
import {
  INTENTS,
  INTENT_IDS,
  isIntentId,
  academicModeForSurface,
  type IntentId,
  type Mode,
  type AcademicMode,
  type WorkKind,
} from "@/lib/agent/contracts";

export type RouterResult = {
  intent: IntentId;
  mode: Mode;
  academicMode: AcademicMode;
  kind?: WorkKind;
};

// ───────────────────────────── léxico da heurística (PT) ─────────────────────────────

/** minúsculas sem acento — casa "gerá"/"redação"/"análise" sem depender de diacrítico. */
const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** verbos de geração ("gere/cria/escreva um…") — palavra inteira p/ não casar substring. */
const GEN_VERB_RE =
  /(^|\s)(gere|gerar|gera|crie|criar|cria|faca|fazer|faz|monte|montar|produza|produzir|escreva|escrever|redija|redigir|elabore|elaborar|desenvolva|desenvolver|quero (?:um|uma)|preciso de (?:um|uma))(\s|$)/;

/** saudações / small talk — palavra inteira (evita "coisa"→"oi"). */
const GREETING_RE =
  /(^|\s)(oi|ola|opa|eai|e ai|salve|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|beleza|blz|tudo bem|tchau)(\s|,|!|\?|$)/;

const WORK_NOUNS = ["artigo", "tcc", "monografia", "dissertacao", "tese", "redacao", "ensaio", "relatorio", "paper", "resenha", "trabalho academico"];
const STUDIO_NOUNS = ["mapa mental", "mindmap", "mapa conceitual", "mapa de estudo", "fluxograma", "flashcard", "linha do tempo", "timeline", "podcast", "video", "quiz", "infografico", "slides", "apresentacao", "resumo visual", "guia de estudo", "guia de estudos", "imagem", "figura", "ilustracao", "molecula", "estrutura molecular", "estrutura quimica", "diagrama", "esquema", "desenho", "grafico", "formula estrutural"];
const SOURCE_SIGNALS = ["fontes", "referencias", "bibliografia", "papers", "artigos sobre", "literatura sobre", "estado da arte", "cite fontes"];
const REVISE_SIGNALS = ["revise", "revisar", "revisao", "critique", "avalie meu", "avalie este", "avalie esse", "corrija", "corrigir", "de feedback", "melhore meu"];
const EXPLAIN_SIGNALS = ["explique", "explicar", "explica", "o que e", "o que sao", "como funciona", "por que", "porque", "defina", "definir", "qual a diferenca", "diferenca entre", "me ensine", "me ensina", "quero aprender", "quero entender", "entender melhor", "aprender sobre", "engenharia reversa"];
const DEEP_SIGNALS = /(a fundo|aprofund|detalhad|minucios|exaustiv|bem completo|passo a passo)/;

const has = (t: string, arr: string[]) => arr.some((k) => t.includes(k));
const WORK_KINDS: WorkKind[] = ["estudo", "pesquisa", "artigo", "tcc", "relatorio", "aula"];

function normalizeKind(k?: string): WorkKind | undefined {
  const n = (k || "").toLowerCase().trim();
  return (WORK_KINDS as string[]).includes(n) ? (n as WorkKind) : undefined;
}

/** infere o WorkKind pelo texto (fallback quando o Flash não devolve `kind`). */
function workKindFrom(t: string): WorkKind | undefined {
  if (/\btcc\b|monografia/.test(t)) return "tcc";
  if (/relatorio/.test(t)) return "relatorio";
  if (/\baula\b/.test(t)) return "aula";
  if (/artigo|paper|dissertacao|tese|ensaio|resenha|redacao/.test(t)) return "artigo";
  if (/pesquisa/.test(t)) return "pesquisa";
  if (/estudo/.test(t)) return "estudo";
  return undefined;
}

/** ≤ 8 palavras = prompt "rápido" (handoff PR02). Vazio não conta. */
export function isQuickPrompt(objective: string): boolean {
  const words = norm(objective).split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 8;
}

/** modo base da intenção; o usuário pode FORÇAR mais fundo (§8) — bump quick→elaborated→research. */
function modeFor(intent: IntentId, t: string): Mode {
  const base = INTENTS[intent].mode;
  if (DEEP_SIGNALS.test(t)) {
    if (base === "quick") return "elaborated";
    if (base === "elaborated") return "research";
  }
  return base;
}

/**
 * Classificação SEM rede — fallback determinístico e testável (o gate do PR02).
 * Precedência: criação forte → busca/revisão → geração genérica → explicação → curto → default.
 */
export function classifyHeuristic(objective: string, ctx: AgentContext): RouterResult {
  const academicMode = academicModeForSurface(ctx.activeTab);
  const t = norm(objective);
  const genVerb = GEN_VERB_RE.test(t);

  const decide = (intent: IntentId, kind?: WorkKind): RouterResult => ({
    intent,
    mode: modeFor(intent, t),
    academicMode,
    kind,
  });

  // 0) AULA interativa (Papermorph) — "me dá uma aula sobre X": é artefato, não trabalho escrito
  if (pedeAula(t)) return decide("gerar_artefato");
  // 0.4) achar um LIVRO (PDF/link/onde ler) — antes de "fontes": "me manda o pdf do livro X" não é bibliografia
  if (pedeLivro(objective)) return decide("buscar_livro");
  // 0.5) gráfico de FUNÇÃO / figura de geometria — sai no texto como ```grafico, NÃO como imagem gerada
  if (pedeGraficoMatematico(objective)) return decide("explicar_conceito");
  // 1) trabalho acadêmico completo — "escreva um artigo sobre X"
  if (genVerb && has(t, WORK_NOUNS)) return decide("criar_trabalho", workKindFrom(t) ?? "artigo");
  // 2) artefato de estudo — "crie um mapa mental sobre X"
  if (genVerb && has(t, STUDIO_NOUNS)) return decide("gerar_artefato");
  // 3) fontes / bibliografia
  if (has(t, SOURCE_SIGNALS)) return decide("pesquisar_fontes");
  // 4) revisão / crítica de algo do usuário
  if (has(t, REVISE_SIGNALS)) return decide("revisar");
  // 5) verbo de geração com tema, sem substantivo específico → artefato genérico
  if (genVerb && /(^|\s)(sobre|acerca|a respeito)(\s|$)/.test(t)) return decide("gerar_artefato");
  // 6) explicação de conceito
  if (has(t, EXPLAIN_SIGNALS)) return decide("explicar_conceito");
  // 7) prompt curto → conversa (saudação) | dúvida rápida
  if (isQuickPrompt(objective)) return decide(GREETING_RE.test(t) ? "conversa" : "duvida_rapida");
  // 8) default elaborado
  return decide("explicar_conceito");
}

// ───────────────────────────── caminho principal (Gemini Flash) ─────────────────────────────

const SYSTEM = [
  "Você é o ROTEADOR de intenção da Aura (assistente de estudos e pesquisa acadêmica).",
  "Classifique o pedido do usuário em UMA intenção. Responda SOMENTE JSON válido:",
  '{"intent":"<intenção>","kind":"<estudo|pesquisa|artigo|tcc|relatorio|aula|null>"}',
  `intenções válidas: ${INTENT_IDS.join(" | ")}.`,
  "- conversa: saudação / small talk, sem tarefa.",
  "- duvida_rapida: pergunta objetiva e curta.",
  "- explicar_conceito: pedir explicação / entendimento de um tema — inclui 'quero aprender/entender X', 'como funciona X' e 'faz engenharia reversa de X'.",
  "- gerar_artefato: pedir artefato de estudo (mapa mental, diagrama, esquema, fluxograma, flashcards, resumo, timeline, podcast, vídeo, quiz) — e também pedir uma AULA ('me dá uma aula sobre X', 'explica a fundo'),",
  "- criar_trabalho: pedir trabalho acadêmico completo (artigo, TCC, monografia, relatório, redação).",
  "- pesquisar_fontes: pedir fontes / referências / bibliografia / papers.",
  "- revisar: pedir revisão / crítica / correção de algo do usuário.",
  "- buscar_livro: pedir um LIVRO específico — achar, link, PDF, baixar, onde ler ('me manda o pdf do livro X').",
  '"kind" só quando intent="criar_trabalho"; senão null.',
].join("\n");

/**
 * classify (§11.2): 1 chamada Flash barata (JSON forçado) com heurística de fallback.
 * `academicMode` vem SEMPRE da sala (§8.8), nunca do modelo.
 */
export async function classify(objective: string, ctx: AgentContext): Promise<RouterResult> {
  const fallback = classifyHeuristic(objective, ctx);
  const text = (objective || "").trim();
  if (!text) return fallback;
  try {
    // import tardio: mantém o router (e o teste da heurística) SEM carregar o Vertex/rede.
    const { geminiJson } = await import("@/lib/scholar/gemini");
    const out = await geminiJson<{ intent?: string; kind?: string }>(
      SYSTEM,
      `Sala="${ctx.activeTab ?? "?"}". Pedido:\n${text}`,
      { temperature: 0, timeoutMs: 8000 },
    );
    const cand = out?.intent;
    // Pedido explícito de aula manda mais que o palpite do modelo (que às vezes lê "aula" como trabalho escrito).
    // Gráfico de função/geometria manda mais que o palpite do modelo (que lê "gráfico" como artefato de imagem).
    const intent: IntentId = pedeAula(norm(text)) ? "gerar_artefato" : pedeLivro(text) ? "buscar_livro" : pedeGraficoMatematico(text) ? "explicar_conceito" : isIntentId(cand) ? cand : fallback.intent;
    const nt = norm(text);
    const kind =
      intent === "criar_trabalho"
        ? normalizeKind(out?.kind) ?? workKindFrom(nt) ?? "artigo"
        : undefined;
    return { intent, mode: modeFor(intent, nt), academicMode: academicModeForSurface(ctx.activeTab), kind };
  } catch {
    return fallback; // rede/credencial/timeout → heurística (nunca derruba o laço)
  }
}
