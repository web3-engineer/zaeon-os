/**
 * Helpers de CONTEXTO de documento interno (texto) para a IA — usados por
 * /api/ai/relate (modo texto) e /api/ai/doc/chat. Documentos GERADOS pelo usuário
 * (estudos/pesquisas) já têm o texto no app/banco (StudyItem.payload, CollabDoc.content,
 * markdown do editor) — NÃO precisam do proxy de PDF (que dá 403 p/ docs internos).
 *
 * Estes helpers são puros (sem rede/banco) para serem testáveis e reaproveitáveis.
 */

/** Limite seguro de chars por documento mandado ao Gemini (evita estourar tokens). */
export const DOC_TEXT_MAX = 12000;

/** Trunca preservando o início; marca com "…" quando cortou. */
export function clampDocText(text: string, max = DOC_TEXT_MAX): string {
  const t = (text || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

/**
 * Extrai o texto de um documento, qualquer que seja a forma:
 *  - string crua;
 *  - { content | text | markdown | body } (editor / CollabDoc);
 *  - { payload: {...} } (StudyItem — texto dentro do payload Json);
 *  - { summary } como último recurso.
 * Precedência: content → text → markdown → body → payload(recursivo) → summary.
 */
export function extractDocText(src: unknown): string {
  if (src == null) return "";
  if (typeof src === "string") return src.trim();
  if (typeof src === "object") {
    const o = src as Record<string, unknown>;
    for (const k of ["content", "text", "markdown", "body"]) {
      if (typeof o[k] === "string" && (o[k] as string).trim()) return (o[k] as string).trim();
    }
    if (o.payload != null) {
      const inner = extractDocText(o.payload);
      if (inner) return inner;
    }
    if (typeof o.summary === "string" && o.summary.trim()) return o.summary.trim();
  }
  return "";
}

/** Monta o contexto "TRABALHO A / TRABALHO B" a partir do texto interno dos dois docs. */
export function buildRelateTextContext(
  a: { title?: string; text?: string },
  b: { title?: string; text?: string },
): string {
  const block = (label: string, d: { title?: string; text?: string }) =>
    `TRABALHO ${label}:\nTítulo: ${d.title || "(sem título)"}\nConteúdo:\n${clampDocText(d.text || "(sem conteúdo)")}`;
  return `${block("A", a)}\n\n${block("B", b)}`;
}
