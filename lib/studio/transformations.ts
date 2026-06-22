/**
 * Transformações de texto do ZAEON Studio — PURAS (sem rede): montam o prompt e
 * normalizam/validam o JSON que o Gemini devolve. Inspiradas nas "transformations"
 * do open-notebook (lfnovo/open-notebook, MIT — ver NOTICE), adaptadas pro pt-BR,
 * "mastigadas" e com saída JSON estruturada.
 *
 * Cada transformação expõe: build(content) → {system,user} e normalize(raw) → objeto
 * limpo (ou lança erro se o resultado for inútil → o pipeline tenta 1 retry).
 */

export type TextKind = "guide" | "faq" | "flashcards" | "mindmap" | "timeline";

export const TEXT_KINDS: TextKind[] = ["guide", "faq", "flashcards", "mindmap", "timeline"];

export function isTextKind(v: unknown): v is TextKind {
  return typeof v === "string" && (TEXT_KINDS as string[]).includes(v);
}

// ── helpers de coerção (Gemini às vezes troca nomes de campos / tipos) ──
const asArr = (v: any): any[] => (Array.isArray(v) ? v : []);
const asStr = (v: any): string => (typeof v === "string" ? v : v == null ? "" : String(v));

/** Limita o tamanho do material pra caber rápido no contexto (e baratear). */
export const MAX_CONTENT = 30000;

const BASE_SYSTEM = `Você é o assistente de aprendizagem da Zaeon. Transforma o material de estudo do aluno em formas mastigadas, claras e fiéis ao conteúdo.
REGRAS:
- Responda SEMPRE em português do Brasil.
- Seja FIEL ao material fornecido; não invente fatos que não estejam nele.
- Linguagem didática e direta, como se explicasse para um colega.
- Produza SOMENTE o JSON pedido — sem comentários, sem "Claro, aqui está", sem markdown ao redor.
- Não pare para perguntar; execute o pedido por completo.`;

function userPrompt(content: string, instruction: string): string {
  return `Material de estudo:\n<material>\n${content.slice(0, MAX_CONTENT)}\n</material>\n\n${instruction}`;
}

// ─────────────────────────── builders ───────────────────────────

function buildGuide(content: string) {
  return {
    system: `${BASE_SYSTEM}

FORMATO (JSON):
{
  "resumo": "1 parágrafo que resume o material de forma mastigada",
  "conceitos": [{ "termo": "nome do conceito", "definicao": "explicação curta e clara" }],
  "revisao": ["pergunta ou ponto de revisão rápida", "..."]
}
Inclua de 4 a 10 conceitos e de 3 a 6 itens de revisão.`,
    user: userPrompt(content, "Gere o guia de estudo em JSON."),
  };
}

function buildFaq(content: string) {
  return {
    system: `${BASE_SYSTEM}

FORMATO (JSON):
{ "faq": [{ "q": "pergunta frequente sobre o conteúdo", "a": "resposta clara e completa" }] }
Gere de 5 a 10 pares pergunta/resposta, cobrindo as dúvidas mais prováveis do aluno.`,
    user: userPrompt(content, "Gere o FAQ em JSON."),
  };
}

function buildFlashcards(content: string) {
  return {
    system: `${BASE_SYSTEM}

FORMATO (JSON):
{ "cards": [{ "front": "pergunta/termo (frente)", "back": "resposta/definição (verso)" }] }
Gere de 8 a 16 flashcards para memorização ativa. Frente curta; verso objetivo.`,
    user: userPrompt(content, "Gere os flashcards em JSON."),
  };
}

function buildMindmap(content: string) {
  return {
    system: `${BASE_SYSTEM}

FORMATO (JSON) — mapa mental como árvore de nós:
{ "nodes": [
    { "id": "1", "label": "Tema central" },
    { "id": "2", "label": "Sub-tópico", "parent": "1" }
] }
Regras: exatamente 1 nó raiz (sem "parent"); cada outro nó referencia o "id" do pai.
De 8 a 20 nós, 2 a 3 níveis de profundidade. "label" curto (1 a 5 palavras).`,
    user: userPrompt(content, "Gere o mapa mental em JSON."),
  };
}

function buildTimeline(content: string) {
  return {
    system: `${BASE_SYSTEM}

FORMATO (JSON) — eventos em ORDEM CRONOLÓGICA:
{ "events": [{ "when": "data/época/etapa", "title": "o que aconteceu", "detail": "explicação curta" }] }
Use isto para sequências temporais OU para etapas de um processo. De 4 a 12 eventos, já ordenados.`,
    user: userPrompt(content, "Gere a linha do tempo em JSON, em ordem cronológica."),
  };
}

// ───────────────────────── normalizers ──────────────────────────

export function normalizeGuide(raw: any) {
  const resumo = asStr(raw?.resumo ?? raw?.summary ?? raw?.resumo_geral).trim();
  const conceitos = asArr(raw?.conceitos ?? raw?.concepts ?? raw?.conceitos_chave)
    .map((c: any) => ({
      termo: asStr(c?.termo ?? c?.term ?? c?.name ?? c?.titulo).trim(),
      definicao: asStr(c?.definicao ?? c?.definition ?? c?.desc ?? c?.descricao).trim(),
    }))
    .filter((c) => c.termo && c.definicao);
  const revisao = asArr(raw?.revisao ?? raw?.review ?? raw?.revisao_rapida ?? raw?.perguntas)
    .map((r: any) => asStr(typeof r === "object" ? r?.q ?? r?.pergunta ?? r?.text : r).trim())
    .filter(Boolean);
  if (!resumo && !conceitos.length) throw new Error("Guia vazio");
  return { resumo, conceitos, revisao };
}

export function normalizeFaq(raw: any) {
  const faq = asArr(raw?.faq ?? raw?.items ?? raw?.perguntas ?? raw?.questions)
    .map((f: any) => ({
      q: asStr(f?.q ?? f?.question ?? f?.pergunta).trim(),
      a: asStr(f?.a ?? f?.answer ?? f?.resposta).trim(),
    }))
    .filter((f) => f.q && f.a);
  if (!faq.length) throw new Error("FAQ vazio");
  return { faq };
}

export function normalizeFlashcards(raw: any) {
  const cards = asArr(raw?.cards ?? raw?.flashcards ?? raw?.cartoes)
    .map((c: any) => ({
      front: asStr(c?.front ?? c?.frente ?? c?.q ?? c?.term ?? c?.pergunta).trim(),
      back: asStr(c?.back ?? c?.verso ?? c?.a ?? c?.definition ?? c?.resposta).trim(),
    }))
    .filter((c) => c.front && c.back);
  if (!cards.length) throw new Error("Sem flashcards");
  return { cards };
}

export function normalizeMindmap(raw: any) {
  const nodes = asArr(raw?.nodes ?? raw?.nodos ?? raw?.map ?? raw?.mapa)
    .map((n: any, i: number) => ({
      id: asStr(n?.id ?? n?.key ?? i) || String(i),
      label: asStr(n?.label ?? n?.text ?? n?.name ?? n?.titulo).trim(),
      parent: n?.parent ?? n?.parentId ?? n?.pai ?? null,
    }))
    .filter((n) => n.label);
  if (nodes.length < 2) throw new Error("Mapa mental sem nós suficientes");
  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    n.parent = n.parent != null ? asStr(n.parent) : null;
    // parent precisa existir e não pode ser o próprio nó → senão vira raiz
    if (n.parent !== null && (!ids.has(n.parent) || n.parent === n.id)) n.parent = null;
  }
  const edges = nodes
    .filter((n) => n.parent !== null)
    .map((n) => ({ from: n.parent as string, to: n.id }));
  return { nodes, edges };
}

export function normalizeTimeline(raw: any) {
  const events = asArr(raw?.events ?? raw?.eventos ?? raw?.timeline ?? raw?.linha_do_tempo)
    .map((e: any) => ({
      when: asStr(e?.when ?? e?.date ?? e?.data ?? e?.ano ?? e?.year ?? e?.quando).trim(),
      title: asStr(e?.title ?? e?.titulo ?? e?.event ?? e?.evento).trim(),
      detail: asStr(e?.detail ?? e?.detalhe ?? e?.description ?? e?.descricao).trim(),
    }))
    .filter((e) => e.title);
  if (!events.length) throw new Error("Linha do tempo vazia");
  return { events };
}

// ─────────────────────────── registry ───────────────────────────

export interface TextTransform {
  kind: TextKind;
  title: (studyTitle: string) => string;
  build: (content: string) => { system: string; user: string };
  normalize: (raw: any) => unknown;
}

export const TEXT_TRANSFORMS: Record<TextKind, TextTransform> = {
  guide: { kind: "guide", title: (t) => `Guia de estudo — ${t}`, build: buildGuide, normalize: normalizeGuide },
  faq: { kind: "faq", title: (t) => `FAQ — ${t}`, build: buildFaq, normalize: normalizeFaq },
  flashcards: { kind: "flashcards", title: (t) => `Flashcards — ${t}`, build: buildFlashcards, normalize: normalizeFlashcards },
  mindmap: { kind: "mindmap", title: (t) => `Mapa mental — ${t}`, build: buildMindmap, normalize: normalizeMindmap },
  timeline: { kind: "timeline", title: (t) => `Linha do tempo — ${t}`, build: buildTimeline, normalize: normalizeTimeline },
};
