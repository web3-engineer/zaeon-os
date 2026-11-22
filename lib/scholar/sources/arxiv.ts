import type { Paper } from "../types";
import { fetchWithRetry } from "../http";

/** O Atom do arXiv vem com entidades XML ("Cinema, Fermi Problems, &amp; General Education" ia cru pra referência ABNT). */
const desentidade = (t: string) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");

export function parseArxiv(xml: string): Paper[] {
  const entries = xml.split("<entry>").slice(1);
  return entries.map((e): Paper => {
    const get = (tag: string) => desentidade((e.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? "").trim());
    const idUrl = get("id");
    const arxivId = idUrl.match(/abs\/([^v]+)(v\d+)?/)?.[1] ?? idUrl.split("/").pop() ?? "";
    const authors = Array.from(e.matchAll(/<name>([\s\S]*?)<\/name>/g)).map((m) => desentidade(m[1].trim()));
    const pdf = (e.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/) ?? [])[1];
    return {
      id: `arxiv:${arxivId}`,
      title: get("title").replace(/\s+/g, " "),
      authors,
      year: Number(get("published").slice(0, 4)) || undefined,
      venue: "arXiv",
      arxivId,
      url: idUrl,
      pdfUrl: pdf ? pdf.replace(/^http:/, "https:") : `https://arxiv.org/pdf/${arxivId}.pdf`,
      abstract: get("summary").replace(/\s+/g, " "),
      openAccess: true,
      sources: ["arxiv"],
    };
  });
}

export async function searchArxiv(query: string, limit = 15): Promise<{ papers: Paper[]; status: "ok" | "rate_limited" | "error" }> {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=${limit}&sortBy=relevance`;
    const res = await fetchWithRetry(url, {}, { retries: 3 });
    if (!res.ok) return { papers: [], status: res.status === 429 ? "rate_limited" : "error" };
    return { papers: parseArxiv(await res.text()), status: "ok" };
  } catch { return { papers: [], status: "error" }; }
}
