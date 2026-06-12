// Motor de CITAÇÃO ESTÁVEL.
// Estratégia: metadados → ABNT/inline montados em CÓDIGO (determinístico = estável).
// O "inteligente" é o cruzamento de metadados via CrossRef (DOI + título) e arXiv.
// Se não houver metadados suficientes, devolve { needsMetadata } pra o app pedir manualmente —
// NUNCA devolve uma citação quebrada.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import {
  buildAbnt,
  buildInline,
  hasEnoughMeta,
  missingMeta,
  normalizeAuthors,
  suggestBoundary,
  type Author,
  type CiteMeta,
} from "@/lib/abntFormat";

export const runtime = "nodejs";
export const maxDuration = 30;

const CR = "https://api.crossref.org";
const UA = "Zaeon/1.0 (https://zaeon; mailto:contato@zaeon.com.br)";

function parseCrossref(msg: any): CiteMeta {
  if (!msg) return {};
  const authors: Author[] = Array.isArray(msg.author)
    ? msg.author.map((a: any) => ({ family: a.family, given: a.given })).filter((a: Author) => a.family || a.given)
    : [];
  const dateParts =
    msg.published?.["date-parts"]?.[0] ||
    msg["published-print"]?.["date-parts"]?.[0] ||
    msg["published-online"]?.["date-parts"]?.[0] ||
    msg.issued?.["date-parts"]?.[0];
  return {
    authors,
    title: Array.isArray(msg.title) ? msg.title[0] : msg.title,
    container: Array.isArray(msg["container-title"]) ? msg["container-title"][0] : msg["container-title"],
    year: dateParts?.[0],
    volume: msg.volume,
    issue: msg.issue,
    pages: msg.page,
    doi: msg.DOI,
    url: msg.URL,
    publisher: msg.publisher,
  };
}

async function crossrefByDoi(doi: string): Promise<CiteMeta | null> {
  try {
    const clean = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").trim();
    const r = await fetch(`${CR}/works/${encodeURIComponent(clean)}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return parseCrossref(j?.message);
  } catch {
    return null;
  }
}

async function crossrefByTitle(title: string): Promise<CiteMeta | null> {
  try {
    const r = await fetch(
      `${CR}/works?query.bibliographic=${encodeURIComponent(title)}&rows=1&select=author,title,container-title,published,published-print,issued,volume,issue,page,DOI,URL,publisher`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) },
    );
    if (!r.ok) return null;
    const j = await r.json();
    const item = j?.message?.items?.[0];
    if (!item) return null;
    // só confia se o título bate razoavelmente (evita match aleatório)
    const got = (Array.isArray(item.title) ? item.title[0] : item.title || "").toLowerCase();
    const want = title.toLowerCase();
    const overlap = got && (got.includes(want.slice(0, 25)) || want.includes(got.slice(0, 25)));
    if (!overlap) return null;
    return parseCrossref(item);
  } catch {
    return null;
  }
}

function detectArxivId(...hay: (string | undefined)[]): string | null {
  const s = hay.filter(Boolean).join(" ");
  const m = s.match(/arxiv[:\s/]*(\d{4}\.\d{4,5})/i) || s.match(/\b(\d{4}\.\d{4,5})\b/);
  return m ? m[1] : null;
}

function mergeMeta(base: CiteMeta, extra: CiteMeta | null): CiteMeta {
  if (!extra) return base;
  const out: CiteMeta = { ...base };
  const hasAuthors = (base.authors || []).some((a) => a.family || a.given);
  if (!hasAuthors && (extra.authors || []).length) out.authors = extra.authors;
  out.title = base.title || extra.title;
  out.container = base.container || extra.container;
  out.year = base.year || extra.year;
  out.volume = base.volume || extra.volume;
  out.issue = base.issue || extra.issue;
  out.pages = base.pages || extra.pages;
  out.doi = base.doi || extra.doi;
  out.url = base.url || extra.url;
  out.publisher = base.publisher || extra.publisher;
  return out;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const text: string = (body.text || "").toString().trim();
  const page = body.page;
  const source = body.source || {};
  const manual = body.manual; // metadados digitados manualmente (string[] em authors)

  if (!text) return NextResponse.json({ error: "no_text", message: "Selecione um trecho." }, { status: 400 });

  // 1) metadados base — do source (PDF/arquivo) ou do preenchimento manual
  let meta: CiteMeta = {
    authors: normalizeAuthors(source.authors),
    title: source.title,
    year: source.year,
    container: source.venue || source.container,
    doi: source.doi,
    url: source.url,
  };
  if (manual) {
    meta = {
      authors: normalizeAuthors(manual.authors),
      title: manual.title || meta.title,
      year: manual.year || meta.year,
      container: manual.container || manual.venue || meta.container,
      publisher: manual.publisher,
      doi: manual.doi || meta.doi,
      url: manual.url || meta.url,
    };
  }

  // 2) cruzamento de metadados (CrossRef / arXiv) — só quando não veio manual
  if (!manual) {
    if (meta.doi) meta = mergeMeta(meta, await crossrefByDoi(meta.doi));
    if (!hasEnoughMeta(meta)) {
      const arx = detectArxivId(source.url, source.title, meta.title);
      if (arx) meta = mergeMeta(meta, await crossrefByDoi(`10.48550/arXiv.${arx}`));
    }
    if (!hasEnoughMeta(meta) && meta.title) {
      meta = mergeMeta(meta, await crossrefByTitle(meta.title));
    }
  }

  // 3) ainda insuficiente → pede metadados manuais (não inventa referência)
  if (!hasEnoughMeta(meta)) {
    return NextResponse.json({
      needsMetadata: true,
      have: {
        authors: (meta.authors || []).map((a) => [a.family, a.given].filter(Boolean).join(", ")),
        title: meta.title || "",
        year: meta.year || "",
        container: meta.container || "",
        doi: meta.doi || "",
        url: meta.url || "",
      },
      missing: missingMeta(meta),
      message: "Faltam dados pra montar a referência ABNT deste material.",
    });
  }

  // 4) monta ABNT + inline em código (estável) + sugestão de recorte (heurística)
  const abnt = buildAbnt(meta);
  const inline = buildInline(text, meta, page);
  const { suggestion, suggestedText } = suggestBoundary(text);

  return NextResponse.json({
    ok: true,
    abnt,
    inline,
    suggestion,
    suggestedText,
    resolved: meta,
  });
}
