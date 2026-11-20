import type { Paper } from "../types";
import { fetchWithRetry } from "../http";

export function reconstructAbstract(inv?: Record<string, number[]>): string | undefined {
  if (!inv) return undefined;
  const words: string[] = [];
  for (const [w, positions] of Object.entries(inv)) for (const pos of positions) words[pos] = w;
  return words.filter(Boolean).join(" ") || undefined;
}

export function parseOpenAlex(json: any): Paper[] {
  return (json?.results ?? []).map((w: any): Paper => {
    const doi = w.doi ? String(w.doi).replace(/^https?:\/\/doi\.org\//, "") : undefined;
    const pdf = w.open_access?.oa_url || w.primary_location?.pdf_url || undefined;
    return {
      id: doi ? `doi:${doi}` : `openalex:${w.id}`,
      title: w.title ?? "",
      authors: (w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean),
      year: w.publication_year ?? undefined,
      venue: w.primary_location?.source?.display_name || undefined,
      doi,
      url: w.id,
      pdfUrl: pdf,
      abstract: reconstructAbstract(w.abstract_inverted_index),
      citationCount: w.cited_by_count ?? undefined,
      openAccess: !!w.open_access?.is_oa,
      sources: ["openalex"],
    };
  });
}

export async function searchOpenAlex(query: string, limit = 15): Promise<{ papers: Paper[]; status: "ok" | "rate_limited" | "error" }> {
  try {
    const email = process.env.UNPAYWALL_EMAIL ? `&mailto=${encodeURIComponent(process.env.UNPAYWALL_EMAIL)}` : "";
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}${email}`;
    const res = await fetchWithRetry(url, {}, { retries: 3 });
    if (!res.ok) return { papers: [], status: res.status === 429 ? "rate_limited" : "error" };
    return { papers: parseOpenAlex(await res.json()), status: "ok" };
  } catch { return { papers: [], status: "error" }; }
}

/**
 * Resumos por DOI, em lote (OpenAlex `filter=doi:a|b|…`, 50 por pedido). É o "enrichment" do PaperOrchestra: Crossref e
 * PubMed muitas vezes devolvem o paper SEM resumo, e sem resumo o escritor não sabe o que a fonte diz. Nunca lança.
 */
export async function resumosPorDoi(dois: readonly string[], fetchImpl: typeof fetch = fetch): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const limpos = [...new Set(dois.map((d) => String(d ?? "").trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "")).filter((d) => /^10\.\d{3,}\//.test(d) && !/[|,]/.test(d)))];
  const email = process.env.UNPAYWALL_EMAIL ? `&mailto=${encodeURIComponent(process.env.UNPAYWALL_EMAIL)}` : "";
  for (let i = 0; i < limpos.length; i += 50) {
    const lote = limpos.slice(i, i + 50);
    try {
      const url = `https://api.openalex.org/works?filter=doi:${lote.map(encodeURIComponent).join("|")}&per-page=50&select=doi,abstract_inverted_index${email}`;
      const res = await fetchImpl(url);
      if (!res.ok) continue;
      const json: any = await res.json();
      for (const w of json?.results ?? []) {
        const doi = String(w?.doi ?? "").toLowerCase().replace(/^https?:\/\/doi\.org\//, "");
        const resumo = reconstructAbstract(w?.abstract_inverted_index);
        if (doi && resumo) out.set(doi, resumo);
      }
    } catch { /* lote perdido: os papers seguem sem resumo */ }
  }
  return out;
}
