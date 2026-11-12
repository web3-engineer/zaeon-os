/**
 * lib/chat/passos.ts — a resolução passo a passo que o MODELO escreve. PURO.
 *
 * A skill `formulas-katex` responde um array JSON, um passo por item
 * (`{passo, latex, explicacao}`), e a página o mostra tipografado (components/chat/
 * PassosMatematica, que renderiza cada fórmula com o KaTeX já usado no chat).
 *
 * A validação é estrita de propósito: é ela que decide se um bloco JSON qualquer vira "passos" ou
 * continua código. As três chaves têm de estar em TODO item — uma lista de outra skill não passa.
 * Nunca lança.
 */
export type PassoMatematico = { passo: number; latex: string; explicacao: string };

export type ResultadoPassos =
  | { ok: true; passos: PassoMatematico[] }
  | { ok: false; erro: string };

export const MAX_PASSOS = 40;
const MAX_LATEX = 600;

const semCerca = (s: string): string =>
  s.trim().replace(/^```[\w-]*[ \t]*\n?/, "").replace(/\n?```\s*$/, "").trim();

/** O modelo às vezes manda o LaTeX já entre `$…$` ou `\[…\]`, apesar de a skill pedir sem. */
const semDelimitador = (s: string): string =>
  s.trim().replace(/^\$\$?([\s\S]*?)\$?\$$/, "$1").replace(/^\\\[([\s\S]*?)\\\]$/, "$1").replace(/^\\\(([\s\S]*?)\\\)$/, "$1").trim();

export function parsePassos(texto: string): ResultadoPassos {
  let cru: unknown;
  try { cru = JSON.parse(semCerca(String(texto ?? ""))); } catch { return { ok: false, erro: "JSON inválido" }; }
  if (!Array.isArray(cru) || cru.length === 0) return { ok: false, erro: "a resolução tem de ser uma lista de passos" };
  if (cru.length > MAX_PASSOS) return { ok: false, erro: `passos demais (máximo ${MAX_PASSOS})` };

  const passos: PassoMatematico[] = [];
  for (let i = 0; i < cru.length; i++) {
    const o = cru[i] as Record<string, unknown> | null;
    if (!o || typeof o !== "object" || Array.isArray(o)) return { ok: false, erro: `passo ${i + 1}: não é um objeto` };
    if (!("passo" in o) || !("latex" in o) || !("explicacao" in o)) return { ok: false, erro: `passo ${i + 1}: faltam chaves` };
    if (typeof o.latex !== "string" || typeof o.explicacao !== "string") return { ok: false, erro: `passo ${i + 1}: latex e explicacao são texto` };
    const latex = semDelimitador(o.latex);
    if (!latex) return { ok: false, erro: `passo ${i + 1}: fórmula vazia` };
    if (latex.length > MAX_LATEX) return { ok: false, erro: `passo ${i + 1}: fórmula longa demais` };
    // a numeração é a da ordem: um "passo" repetido ou fora de ordem do modelo não bagunça a tela
    passos.push({ passo: i + 1, latex, explicacao: o.explicacao.trim().slice(0, 400) });
  }
  return { ok: true, passos };
}

export const ehPassos = (texto: string): boolean => parsePassos(texto).ok;
