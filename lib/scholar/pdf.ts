import type { Paragraph, Block } from "./types";

export interface StructuredText {
  paragraphs: Paragraph[];
  markdown?: string;
  blocks?: Block[];
}

const VALID_BLOCK = new Set(["heading", "paragraph", "table", "figure"]);

/**
 * Normaliza/valida a resposta do pdf-loader. Pura e testável.
 * Retorna null se não houver texto útil (deixa o fallback pdf.js agir).
 */
export function parseLoaderResponse(json: any): StructuredText | null {
  if (!json || typeof json !== "object") return null;
  const rawParas = Array.isArray(json.paragraphs) ? json.paragraphs : [];
  const paragraphs: Paragraph[] = rawParas
    .map((p: any, i: number) => ({
      idx: typeof p?.idx === "number" ? p.idx : i,
      page: typeof p?.page === "number" ? p.page : undefined,
      text: typeof p?.text === "string" ? p.text.trim() : "",
    }))
    .filter((p: Paragraph) => p.text);
  if (!paragraphs.length) return null;

  const markdown =
    typeof json.markdown === "string" && json.markdown.trim() ? json.markdown : undefined;

  const blocks: Block[] | undefined = Array.isArray(json.blocks)
    ? json.blocks.map((b: any) => ({
        type: VALID_BLOCK.has(b?.type) ? b.type : "paragraph",
        page: typeof b?.page === "number" ? b.page : undefined,
        bbox:
          Array.isArray(b?.bbox) &&
          b.bbox.length === 4 &&
          b.bbox.every((n: any) => typeof n === "number")
            ? (b.bbox as [number, number, number, number])
            : undefined,
        text: typeof b?.text === "string" ? b.text : "",
      }))
    : undefined;

  return { paragraphs, markdown, blocks };
}

/**
 * Leitura ESTRUTURADA via microserviço pdf-loader (se PDF_LOADER_URL existir).
 * Nunca lança — retorna null pra que o chamador caia no pdf.js.
 */
export async function extractPdfStructured(data: Uint8Array): Promise<StructuredText | null> {
  const base = process.env.PDF_LOADER_URL;
  if (!base) return null;
  try {
    const form = new FormData();
    const blob = new Blob([data as unknown as BlobPart], { type: "application/pdf" });
    form.append("file", blob, "in.pdf");
    const res = await fetch(`${base.replace(/\/$/, "")}/extract`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(35000),
    });
    if (!res.ok) return null;
    return parseLoaderResponse(await res.json());
  } catch {
    return null; // serviço fora/timeout → fallback pro pdf.js (nunca derruba a pesquisa)
  }
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function paragraphsFromPages(pages: { page: number; text: string }[]): Paragraph[] {
  const out: Paragraph[] = [];
  let idx = 0;
  for (const pg of pages) {
    for (const para of splitParagraphs(pg.text)) {
      out.push({ idx: idx++, page: pg.page, text: para });
    }
  }
  return out;
}

// Impure: extract per-page text with pdfjs-dist (Node, no worker), then attribute.
export async function extractPdfParagraphs(data: Uint8Array): Promise<Paragraph[]> {
  // legacy build runs in Node without a worker (this build ships as pdf.js, not .mjs)
  // @ts-ignore - the legacy pdfjs build has no bundled type declarations
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.js");
  const doc = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, disableFontFace: true }).promise;
  const pages: { page: number; text: string }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    // pdfjs returns items per text run; join with spaces, insert breaks on large Y gaps is overkill here
    const text = content.items.map((it: any) => (it.str ?? "")).join(" ");
    pages.push({ page: n, text });
  }
  return paragraphsFromPages(pages);
}
