/**
 * Inserção de IMAGENS no editor de pesquisa como marcador de figura da engine ABNT.
 *
 * O worker (`abnt-service/formatter.py`) reconhece o marcador
 *   ![Título|Fonte](url-ou-data-uri)
 * e o transforma em "Figura N — Título" (legenda no topo, 10 pt) + imagem
 * centralizada + "Fonte: …". Aqui apenas montamos esse marcador como um bloco
 * isolado (parágrafo próprio), sem React — função pura e testável.
 */

/** Título a partir do nome do arquivo: tira a extensão, normaliza separadores. */
export function sanitizeFigureTitle(filename: string): string {
  const base = (filename || "").replace(/\.[^./\\]+$/, ""); // remove a extensão
  const title = base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return title || "Figura";
}

export interface ImageMarkerOpts {
  title: string;
  /** "própria" → o worker emite "elaborado pelo próprio autor". */
  fonte?: string;
  /** data URI (data:image/...;base64,...) ou URL pública. */
  dataUri: string;
}

/**
 * Insere o marcador de figura na posição `cursor`, garantindo que ele fique como
 * um bloco isolado (separado por linha em branco), como a engine espera.
 */
export function insertImageMarker(doc: string, cursor: number, opts: ImageMarkerOpts): string {
  const uri = (opts.dataUri ?? "").trim();
  if (!uri) return doc;
  const title = (opts.title ?? "").trim() || "Figura";
  const fonte = (opts.fonte ?? "").trim() || "própria";
  const marker = `![${title}|${fonte}](${uri})`;

  const len = doc.length;
  const pos = Math.max(0, Math.min(Number.isFinite(cursor) ? cursor : len, len));
  const before = doc.slice(0, pos);
  const after = doc.slice(pos);

  const lead = before.length === 0
    ? ""
    : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after.length === 0
    ? ""
    : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";

  return before + lead + marker + trail + after;
}
