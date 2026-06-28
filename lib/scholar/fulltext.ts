import type { Paper } from "./types";
import { isSafePublicHttpUrl } from "./ssrf";
import { extractPdfParagraphs, extractPdfStructured } from "./pdf";
import { unpaywallPdfUrl } from "./sources/unpaywall";
import { europePmcFullText } from "./sources/europepmc";

async function fetchPdfBytes(url: string): Promise<Uint8Array | null> {
  if (!isSafePublicHttpUrl(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/pdf/i.test(ct)) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch { return null; }
}

// Returns a new paper with retrievedText filled by the best available source.
export async function resolveFullText(paper: Paper): Promise<Paper> {
  // 1) Try a PDF (arXiv / existing pdfUrl / Unpaywall) → page-attributed paragraphs (best proof)
  let pdfUrl = paper.pdfUrl;
  if (!pdfUrl && paper.doi) pdfUrl = (await unpaywallPdfUrl(paper.doi)) ?? undefined;
  if (pdfUrl) {
    const bytes = await fetchPdfBytes(pdfUrl);
    if (bytes) {
      // 1a) Leitura ESTRUTURADA (pdf-loader): ordem multi-coluna, tabelas, markdown + bbox.
      const structured = await extractPdfStructured(bytes);
      if (structured?.paragraphs.length) {
        return {
          ...paper,
          pdfUrl,
          openAccess: true,
          retrievedText: {
            kind: "pdf",
            paragraphs: structured.paragraphs,
            markdown: structured.markdown,
            blocks: structured.blocks,
          },
        };
      }
      // 1b) Fallback: pdf.js cru (serviço indisponível/timeout → nunca derruba a pesquisa).
      const paragraphs = await extractPdfParagraphs(bytes).catch(() => []);
      if (paragraphs.length) {
        return { ...paper, pdfUrl, openAccess: true, retrievedText: { kind: "pdf", paragraphs } };
      }
    }
  }
  // 2) Europe PMC sectioned full text
  if (paper.doi) {
    const paras = await europePmcFullText(paper.doi);
    if (paras?.length) return { ...paper, retrievedText: { kind: "fulltext", paragraphs: paras } };
  }
  // 3) Abstract-only fallback
  if (paper.abstract) {
    return { ...paper, retrievedText: { kind: "abstract", paragraphs: [{ idx: 0, text: paper.abstract }] } };
  }
  return paper; // no text at all → cannot ground any claim
}
