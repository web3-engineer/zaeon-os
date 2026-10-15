/**
 * lib/livros/busca.ts — achar um LIVRO e o caminho LEGAL até ele (PDF livre, leitura online,
 * empréstimo digital, prévia). Parsers PUROS + fetch injetável.
 *
 * Fontes (todas abertas, sem chave obrigatória):
 *   - OpenStax          → livros didáticos CC-BY (Cálculo, Álgebra, Física…): PDF direto
 *   - Project Gutenberg → domínio público (Gutendex): ler online / EPUB / PDF quando houver
 *   - Open Library      → catálogo + Internet Archive: PDF só se "public" E o item do IA não é de
 *                          empréstimo; "borrowable" vira link de EMPRÉSTIMO (legal, controlado)
 *   - Google Books      → prévia / PDF de domínio público (GOOGLE_BOOKS_API_KEY opcional: sem ela
 *                          a cota anônima compartilhada estoura fácil — falha é silenciosa)
 *
 * NUNCA: biblioteca-sombra (LibGen, Anna's Archive, Z-Library, Sci-Hub…). Livro com direito autoral
 * sem cópia livre = "sem acesso livre" + onde achar legalmente. Está pinado em teste.
 */
export type Acesso = "pdf_livre" | "ler_online" | "emprestimo" | "previa" | "sem_acesso_livre";
export type FonteLivro = "openstax" | "gutenberg" | "openlibrary" | "google_books";

export type LivroAchado = {
  titulo: string;
  autores: string[];
  ano: number | null;
  idiomas: string[];
  fonte: FonteLivro;
  acesso: Acesso;
  pdfUrl: string | null;       // download direto (só quando é livre de verdade)
  lerUrl: string | null;       // leitura online / EPUB / empréstimo
  paginaUrl: string;           // página do livro na fonte
  licenca: string | null;      // "CC BY 4.0", "domínio público"…
};

export const ORDEM_ACESSO: Record<Acesso, number> = { pdf_livre: 0, ler_online: 1, emprestimo: 2, previa: 3, sem_acesso_livre: 4 };
export const ROTULO_ACESSO: Record<Acesso, string> = {
  pdf_livre: "PDF livre", ler_online: "leitura livre online", emprestimo: "empréstimo digital gratuito",
  previa: "prévia", sem_acesso_livre: "sem cópia livre",
};
const NOME_FONTE: Record<FonteLivro, string> = { openstax: "OpenStax", gutenberg: "Project Gutenberg", openlibrary: "Open Library / Internet Archive", google_books: "Google Books" };
export const nomeDaFonte = (f: FonteLivro) => NOME_FONTE[f];

/** Domínios que NUNCA aparecem (pirataria). */
export const DOMINIOS_PROIBIDOS = /(?:libgen|library\.lol|annas-archive|z-lib|zlibrary|singlelogin|b-ok\.|1lib\.|sci-hub|pdfdrive|ebook3000|vk\.com\/doc)/i;
const urlSegura = (u: unknown): string | null => (typeof u === "string" && /^https:\/\//i.test(u) && !DOMINIOS_PROIBIDOS.test(u) ? u : null);

// ───────────────────────────── consulta ─────────────────────────────

const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** "procura o livro Dom Casmurro do Machado em pdf pra mim" → "Dom Casmurro Machado". */
export function consultaDoLivro(pedido: string): string {
  let t = String(pedido ?? "").replace(/https?:\/\/\S+/g, " ");
  t = t.replace(/^[\s,]*(?:oi|ol[áa]|e a[ií])[\s,!.]+/i, "");
  t = t.replace(/\b(?:voc[eê]\s+)?(?:pode(?:ria)?|consegue|conseguiria)\s+/gi, "");
  t = t.replace(/\b(?:me\s+)?(?:procur\w*|ach\w*|encontr\w*|busc\w*|baix\w*|manda\w*|passa\w*|envi\w*|entreg\w*|arruma\w*|consegu\w*|quero|queria|preciso(?: d[eo])?|tem|teria|existe)\b/gi, " ");
  t = t.replace(/\b(?:o|a|os|as|um|uma)?\s*(?:livros?|e-?books?|obras?|edi[cç][aã]o|vers[aã]o|c[oó]pia|link|arquivo|pdf|epub)\b/gi, " ");
  t = t.replace(/\b(?:em|no|na|de|do|da|pra|para|pro|mim|me|por favor|favor|gr[aá]tis|gratuito|completo|inteiro|online|digital)\b/gi, " ");
  t = t.replace(/[?!.,;:"“”'`]+/g, " ").replace(/\s+/g, " ").trim();
  return (t || String(pedido ?? "").trim()).slice(0, 160);
}

/** Pedido de LIVRO (achar, baixar, PDF de um livro) — não "me explica o livro X". */
export function pedeLivro(pedido: string): boolean {
  const t = norm(pedido);
  if (!/\b(livros?|ebooks?|e books?|obra|edicao)\b/.test(t) && !/\bpdf d[oa] /.test(t)) return false;
  return /\b(procur\w*|ach\w*|encontr\w*|busc\w*|baix\w*|download|manda\w*|passa\w*|envi\w*|entreg\w*|link|pdf|epub|onde (?:acho|encontro|leio|baixo)|tem (?:o|a) (?:livro|pdf)|queria o|quero o|preciso do)\b/.test(t);
}

// ───────────────────────────── parsers PUROS ─────────────────────────────

const anoDe = (v: unknown): number | null => { const n = Number(String(v ?? "").slice(0, 4)); return Number.isFinite(n) && n > 1000 && n < 2200 ? n : null; };

/** OpenStax CMS (catálogo inteiro) → livros cujo título casa a consulta. */
export function parseOpenStax(json: any, consulta: string): LivroAchado[] {
  const q = norm(consulta).split(" ").filter((w) => w.length > 2);
  if (!q.length) return [];
  return (Array.isArray(json?.items) ? json.items : [])
    .filter((b: any) => b?.book_state === "live" && typeof b.title === "string")
    .filter((b: any) => { const t = norm(b.title); return q.filter((w) => t.includes(w)).length >= Math.min(2, q.length); })
    .slice(0, 4)
    .map((b: any): LivroAchado => {
      const pagina = urlSegura(b?.meta?.html_url) ?? `https://openstax.org/details/books/${b?.meta?.slug ?? ""}`;
      const pdf = urlSegura(b.high_resolution_pdf_url);
      return { titulo: b.title, autores: ["OpenStax"], ano: anoDe(b?.meta?.first_published_at), idiomas: [String(b?.meta?.locale ?? "en")], fonte: "openstax", acesso: pdf ? "pdf_livre" : "ler_online", pdfUrl: pdf, lerUrl: pagina, paginaUrl: pagina, licenca: "CC BY 4.0" };
    });
}

/** "Austen, Jane" → "Jane Austen" (o Gutenberg cataloga sobrenome primeiro). */
export const nomeDireto = (n: string) => { const m = /^([^,]+),\s*([^,(]+)/.exec(n.trim()); return m ? `${m[2].trim()} ${m[1].trim()}` : n.trim(); };

/** Gutendex → domínio público. PDF direto quando o Gutenberg tem; senão leitura online/EPUB. */
export function parseGutendex(json: any): LivroAchado[] {
  return (Array.isArray(json?.results) ? json.results : []).filter((b: any) => b && b.copyright === false).slice(0, 4).map((b: any): LivroAchado => {
    const f = (b.formats ?? {}) as Record<string, string>;
    const pdf = urlSegura(Object.entries(f).find(([k]) => k.startsWith("application/pdf"))?.[1]);
    const ler = urlSegura(f["text/html"] ?? f["text/html; charset=utf-8"] ?? f["application/epub+zip"]);
    const pagina = `https://www.gutenberg.org/ebooks/${Number(b.id)}`;
    return { titulo: String(b.title ?? "").slice(0, 200), autores: (b.authors ?? []).map((a: any) => nomeDireto(String(a?.name ?? ""))).filter(Boolean), ano: null, idiomas: (b.languages ?? []).map(String), fonte: "gutenberg", acesso: pdf ? "pdf_livre" : "ler_online", pdfUrl: pdf, lerUrl: ler ?? pagina, paginaUrl: pagina, licenca: "domínio público" };
  });
}

/** Open Library search.json → acesso pelo ebook_access (o PDF do IA é confirmado depois, por item). */
export function parseOpenLibrary(json: any): (LivroAchado & { iaCandidatos: string[] })[] {
  return (Array.isArray(json?.docs) ? json.docs : []).filter((d: any) => typeof d?.title === "string" && typeof d?.key === "string").slice(0, 6).map((d: any) => {
    const pagina = `https://openlibrary.org${d.key}`;
    const ea = String(d.ebook_access ?? "no_ebook");
    const ia: string[] = (Array.isArray(d.ia) ? d.ia : []).filter((x: unknown) => typeof x === "string" && /^[A-Za-z0-9._-]+$/.test(x as string)).slice(0, 3);
    const acesso: Acesso = ea === "public" ? "ler_online" : ea === "borrowable" ? "emprestimo" : "sem_acesso_livre";
    return {
      titulo: d.title.slice(0, 200), autores: (d.author_name ?? []).slice(0, 4).map(String), ano: anoDe(d.first_publish_year), idiomas: (d.language ?? []).slice(0, 4).map(String),
      fonte: "openlibrary" as const, acesso, pdfUrl: null,
      lerUrl: acesso === "ler_online" && ia[0] ? `https://archive.org/details/${ia[0]}` : acesso === "emprestimo" ? `${pagina}/borrow` : null,
      paginaUrl: pagina, licenca: ea === "public" ? "domínio público" : null, iaCandidatos: ea === "public" ? ia : [],
    };
  });
}

/** Google Books volumes → prévia / PDF de domínio público. */
export function parseGoogleBooks(json: any): LivroAchado[] {
  return (Array.isArray(json?.items) ? json.items : []).slice(0, 4).map((it: any): LivroAchado | null => {
    const v = it?.volumeInfo ?? {}, a = it?.accessInfo ?? {};
    if (typeof v.title !== "string") return null;
    const pagina = urlSegura(String(v.infoLink ?? "").replace(/^http:/, "https:")) ?? `https://books.google.com/books?id=${encodeURIComponent(String(it.id ?? ""))}`;
    const publico = a.publicDomain === true;
    const pdf = publico ? urlSegura(String(a?.pdf?.downloadLink ?? "").replace(/^http:/, "https:")) : null;
    const previa = urlSegura(String(v.previewLink ?? "").replace(/^http:/, "https:"));
    const acesso: Acesso = pdf ? "pdf_livre" : a.viewability === "ALL_PAGES" ? "ler_online" : a.viewability === "PARTIAL" ? "previa" : "sem_acesso_livre";
    return { titulo: (v.subtitle ? `${v.title}: ${v.subtitle}` : v.title).slice(0, 200), autores: (v.authors ?? []).slice(0, 4).map(String), ano: anoDe(v.publishedDate), idiomas: v.language ? [String(v.language)] : [], fonte: "google_books", acesso, pdfUrl: pdf, lerUrl: acesso === "previa" || acesso === "ler_online" ? previa : null, paginaUrl: pagina, licenca: publico ? "domínio público" : null };
  }).filter(Boolean) as LivroAchado[];
}

// ───────────────────────────── ranking e dedupe ─────────────────────────────

/** Quão bem o livro casa a consulta (palavras do título/autor presentes). */
export function relevancia(l: LivroAchado, consulta: string): number {
  const q = norm(consulta).split(" ").filter((w) => w.length > 2);
  if (!q.length) return 0;
  const alvo = norm(`${l.titulo} ${l.autores.join(" ")}`);
  return q.filter((w) => alvo.includes(w)).length / q.length;
}

const chaveDe = (l: LivroAchado) => `${norm(l.titulo).split(" ").slice(0, 5).join(" ")}|${norm(l.autores[0] ?? "").split(" ").pop() ?? ""}`;

/** Junta, deduplica (fica o melhor acesso) e ordena: relevância, depois acesso, depois fonte. */
export function consolidar(listas: LivroAchado[][], consulta: string, limite = 5): LivroAchado[] {
  const por = new Map<string, LivroAchado>();
  for (const l of listas.flat()) {
    if (!l.titulo || DOMINIOS_PROIBIDOS.test(`${l.pdfUrl ?? ""} ${l.lerUrl ?? ""} ${l.paginaUrl}`)) continue;
    const k = chaveDe(l);
    const ja = por.get(k);
    if (!ja || ORDEM_ACESSO[l.acesso] < ORDEM_ACESSO[ja.acesso]) por.set(k, l);
  }
  return [...por.values()]
    .map((l) => ({ l, r: relevancia(l, consulta) }))
    .filter((x) => x.r >= 0.5)
    .sort((a, b) => b.r - a.r || ORDEM_ACESSO[a.l.acesso] - ORDEM_ACESSO[b.l.acesso])
    .slice(0, limite)
    .map((x) => x.l);
}

/** Lista em markdown (o ChatMarkdown torna os links clicáveis). Entra no fim da resposta. */
export function markdownDosLivros(livros: LivroAchado[]): string {
  if (!livros.length) return "";
  const linhas = livros.map((l) => {
    const quem = l.autores.length ? ` — ${l.autores.slice(0, 2).join(", ")}` : "";
    const ano = l.ano ? ` (${l.ano})` : "";
    const links = [
      l.pdfUrl ? `[baixar PDF](${l.pdfUrl})` : null,
      l.lerUrl && l.acesso === "emprestimo" ? `[pegar emprestado](${l.lerUrl})` : null,
      l.lerUrl && l.acesso === "ler_online" ? `[ler online](${l.lerUrl})` : null,
      l.lerUrl && l.acesso === "previa" ? `[ver prévia](${l.lerUrl})` : null,
      `[página](${l.paginaUrl})`,
    ].filter(Boolean).join(" · ");
    return `- **${l.titulo}**${quem}${ano} — ${ROTULO_ACESSO[l.acesso]}${l.licenca ? `, ${l.licenca}` : ""} (${nomeDaFonte(l.fonte)}) · ${links}`;
  });
  return `**Livros encontrados:**\n${linhas.join("\n")}`;
}

// ───────────────────────────── a busca (rede) ─────────────────────────────

type Env = Record<string, string | undefined>;
export type BuscaDeps = { fetchImpl?: typeof fetch; env?: Env; timeoutMs?: number };
export type ResultadoBusca = { livros: LivroAchado[]; consultadas: FonteLivro[]; falhas: FonteLivro[] };

const UA = { "User-Agent": "ZaeonLivros/1.0 (+https://zaeon.com.br)", Accept: "application/json" };
let catalogoOpenStax: { at: number; json: any } | null = null;

async function getJson(f: typeof fetch, url: string, timeoutMs: number): Promise<any> {
  const r = await f(url, { headers: UA, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
  return r.json();
}

/** O item do Internet Archive é baixável (não é de empréstimo)? Só então o PDF é "livre". */
async function pdfDoIA(f: typeof fetch, ids: string[], timeoutMs: number): Promise<string | null> {
  for (const id of ids.slice(0, 2)) {
    try {
      const m = (await getJson(f, `https://archive.org/metadata/${encodeURIComponent(id)}/metadata`, timeoutMs))?.result ?? {};
      if (String(m["access-restricted-item"] ?? "") === "true") continue;
      return `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(id)}.pdf`;
    } catch { /* próximo */ }
  }
  return null;
}

/** Busca em paralelo nas 4 fontes; fonte que falha não derruba as outras. Nunca lança. */
export async function buscarLivros(pedido: string, d: BuscaDeps = {}): Promise<ResultadoBusca> {
  const f = d.fetchImpl ?? fetch, env = d.env ?? process.env, to = d.timeoutMs ?? 9_000;
  const q = consultaDoLivro(pedido);
  const enc = encodeURIComponent(q);
  const falhas: FonteLivro[] = [];
  const tenta = async (fonte: FonteLivro, fn: () => Promise<LivroAchado[]>): Promise<LivroAchado[]> => {
    try { return await fn(); } catch { falhas.push(fonte); return []; }
  };
  const gbKey = env.GOOGLE_BOOKS_API_KEY?.trim();
  const listas = await Promise.all([
    tenta("openstax", async () => {
      if (!catalogoOpenStax || Date.now() - catalogoOpenStax.at > 24 * 3_600_000) {
        catalogoOpenStax = { at: Date.now(), json: await getJson(f, "https://openstax.org/apps/cms/api/v2/pages/?type=books.Book&fields=title,high_resolution_pdf_url,book_state&limit=250", to) };
      }
      return parseOpenStax(catalogoOpenStax.json, q);
    }),
    // o Gutendex é lento (é um serviço comunitário): mais folga que as outras
    tenta("gutenberg", async () => parseGutendex(await getJson(f, `https://gutendex.com/books/?search=${enc}`, Math.max(to, 15_000)))),
    tenta("openlibrary", async () => {
      const docs = parseOpenLibrary(await getJson(f, `https://openlibrary.org/search.json?q=${enc}&fields=key,title,author_name,first_publish_year,ebook_access,ia,language&limit=8`, to));
      // só o mais relevante com cópia pública ganha a checagem do PDF (1–2 chamadas ao IA)
      const melhor = docs.filter((x) => x.iaCandidatos.length).sort((a, b) => relevancia(b, q) - relevancia(a, q))[0];
      if (melhor) { const pdf = await pdfDoIA(f, melhor.iaCandidatos, to); if (pdf) { melhor.pdfUrl = pdf; melhor.acesso = "pdf_livre"; } }
      return docs.map(({ iaCandidatos: _ia, ...l }) => l);
    }),
    tenta("google_books", async () => parseGoogleBooks(await getJson(f, `https://www.googleapis.com/books/v1/volumes?q=${enc}&maxResults=6&printType=books${gbKey ? `&key=${encodeURIComponent(gbKey)}` : ""}`, to))),
  ]);
  return { livros: consolidar(listas, q), consultadas: ["openstax", "gutenberg", "openlibrary", "google_books"], falhas };
}

// ───────────────────────────── prompt do draft ─────────────────────────────

/**
 * O que o modelo escreve num pedido de livro. A LISTA com os links é do código (markdownDosLivros,
 * anexada ao `nucleo` depois do draft) — o modelo só comenta, sem inventar link nem prometer arquivo.
 */
export function diretrizLivros(livros: LivroAchado[]): string {
  const regra = "PEDIDO DE LIVRO: a lista com os links (PDF, leitura, empréstimo) aparece LOGO ABAIXO do seu texto — não repita links nem invente URL. " +
    "Em 2–4 frases no `nucleo`, diga qual é a melhor opção e por quê (edição, idioma, se é o livro certo). " +
    "Nunca indique sites de pirataria (LibGen, Anna's Archive, Z-Library, Sci-Hub) nem como achar cópia ilegal.";
  if (!livros.length) {
    return regra + " A busca NÃO achou o livro nos acervos abertos: diga isso com honestidade em 1 frase e indique caminhos legais " +
      "(biblioteca da faculdade/Minha Biblioteca/Pearson, prévia no Google Books, comprar, pedir ao professor) — e, se ajudar, ofereça explicar o conteúdo do livro.";
  }
  const tem = (a: Acesso) => livros.some((l) => l.acesso === a);
  const resumo = livros.map((l, i) => `(${i + 1}) ${l.titulo}${l.autores.length ? ` — ${l.autores.slice(0, 2).join(", ")}` : ""}${l.ano ? ` (${l.ano})` : ""}: ${ROTULO_ACESSO[l.acesso]} via ${nomeDaFonte(l.fonte)}`).join("\n");
  const sobreAcesso = tem("pdf_livre") ? "Há PDF livre: deixe claro que pode baixar." :
    tem("ler_online") ? "Há leitura livre online, mas não PDF." :
    tem("emprestimo") ? "Não há PDF livre (o livro tem direito autoral): o caminho legal e gratuito é o empréstimo digital da Open Library — explique em 1 frase (conta grátis, empresta por um tempo)." :
    "Não há cópia livre (direito autoral): diga isso e indique a prévia/biblioteca/compra.";
  return `${regra} ${sobreAcesso}\nLivros achados:\n${resumo}`;
}
