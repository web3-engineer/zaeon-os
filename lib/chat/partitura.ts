/**
 * lib/chat/partitura.ts — a melodia em notação ABC que o MODELO escreve. PURO.
 *
 * A skill `partitura-abc` responde "apenas um objeto JSON" com EXATAMENTE as chaves
 * `{titulo, tom, abc, conceito}` (o mesmo contrato nos três modelos: Claude, Codex, Octa). A página
 * renderiza e TOCA com o abcjs (components/chat/Partitura). Este módulo é o portão entre os dois:
 * nada do que o modelo mandou vira partitura sem passar por aqui.
 *
 *   · as quatro chaves têm de existir e ser string;
 *   · `abc` tem de ter cara de ABC de verdade — cabeçalho `X:` e tom `K:` (o abcjs faz o parse
 *     real; aqui só barramos lixo antes de carregar a biblioteca);
 *   · tudo é texto: `titulo`/`conceito` vão pra tela (o React escapa) e `abc` vai pro abcjs, que
 *     interpreta NOTAÇÃO, não HTML. Mesmo assim limitamos o tamanho — um exercício é curto.
 *
 * Devolve a partitura normalizada ou um motivo curto. Nunca lança.
 */

export type Partitura = { titulo: string; tom: string; abc: string; conceito: string };
export type ParsePartitura = { ok: true } & Partitura | { ok: false; erro: string };

const MAX_TITULO = 140;
const MAX_CONCEITO = 400;
const MAX_ABC = 8_000; // uma melodia de 4–8 compassos cabe de sobra; acima disso é outra coisa

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** Normaliza e valida o objeto cru. Nunca lança. */
export function parsePartitura(texto: string): ParsePartitura {
  let obj: unknown;
  try {
    obj = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "json inválido" };
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, erro: "não é objeto" };
  const o = obj as Record<string, unknown>;

  const titulo = str(o.titulo)?.trim();
  const tom = str(o.tom)?.trim();
  const abc = str(o.abc);
  const conceito = str(o.conceito)?.trim();
  if (!titulo || tom === undefined || tom === null || abc === null || conceito === undefined) {
    return { ok: false, erro: "faltam chaves (titulo, tom, abc, conceito)" };
  }
  const abcLimpo = abc.trim();
  if (abcLimpo.length > MAX_ABC) return { ok: false, erro: "abc grande demais" };
  // cara de ABC: precisa do início de referência (X:) e de um tom (K:) — os dois cabeçalhos
  // obrigatórios. Sem eles o abcjs desenha vazio e o aluno não entende por quê.
  if (!/(^|\n)\s*X:/.test(abcLimpo) || !/(^|\n)\s*K:/.test(abcLimpo)) {
    return { ok: false, erro: "abc sem cabeçalho (X:/K:)" };
  }

  return {
    ok: true,
    titulo: titulo.slice(0, MAX_TITULO),
    tom: tom.slice(0, 40),
    abc: abcLimpo,
    conceito: (conceito || "").slice(0, MAX_CONCEITO),
  };
}

/** `texto` é uma partitura da skill? (pela FORMA, pro dispatch de figuras.) */
export const ehPartitura = (texto: string): boolean => parsePartitura(texto).ok;
