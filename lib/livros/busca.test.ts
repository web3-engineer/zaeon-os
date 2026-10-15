import { describe, it, expect, vi } from "vitest";
import {
  pedeLivro, consultaDoLivro, parseOpenStax, parseGutendex, parseOpenLibrary, parseGoogleBooks, consolidar,
  markdownDosLivros, buscarLivros, diretrizLivros, nomeDireto, DOMINIOS_PROIBIDOS, type LivroAchado,
} from "./busca";

const OPENSTAX = { items: [
  { title: "Calculus Volume 1", book_state: "live", high_resolution_pdf_url: "https://assets.openstax.org/calc1.pdf", meta: { slug: "calculus-volume-1", html_url: "https://openstax.org/details/books/calculus-volume-1", first_published_at: "2016-03-10", locale: "en" } },
  { title: "Calculus Volume 2", book_state: "retired", high_resolution_pdf_url: "https://assets.openstax.org/calc2.pdf", meta: { slug: "c2" } },
  { title: "Biology 2e", book_state: "live", high_resolution_pdf_url: "https://assets.openstax.org/bio.pdf", meta: { slug: "bio" } },
] };
const GUTENDEX = { results: [
  { id: 55752, title: "Dom Casmurro", authors: [{ name: "Assis, Machado de" }], languages: ["pt"], copyright: false, formats: { "text/html": "https://www.gutenberg.org/ebooks/55752.html.images", "application/epub+zip": "https://www.gutenberg.org/ebooks/55752.epub3.images" } },
  { id: 1, title: "Livro com copyright", authors: [], languages: ["en"], copyright: true, formats: {} },
] };
const OL = { docs: [
  { key: "/works/OL1W", title: "Dom Casmurro", author_name: ["Machado de Assis"], first_publish_year: 1899, ebook_access: "public", ia: ["domcasmurro_pub", "outro"], language: ["por"] },
  { key: "/works/OL2W", title: "Sapiens", author_name: ["Yuval Noah Harari"], first_publish_year: 2011, ebook_access: "borrowable", ia: ["sapiens0000"] },
  { key: "/works/OL3W", title: "Livro Novo", author_name: ["Fulano"], ebook_access: "no_ebook" },
] };
const GB = { items: [
  { id: "abc", volumeInfo: { title: "Cálculo", subtitle: "Volume 1", authors: ["James Stewart"], publishedDate: "2013-01-01", language: "pt", previewLink: "http://books.google.com/books?id=abc&pg=PP1", infoLink: "http://books.google.com/books?id=abc" }, accessInfo: { viewability: "PARTIAL", publicDomain: false, pdf: { isAvailable: true } } },
] };

describe("pedido e consulta", () => {
  it.each([
    "procura o livro Dom Casmurro em pdf", "me manda o pdf do livro Cálculo do Stewart", "onde acho o livro Sapiens?",
    "quero baixar o ebook de Orgulho e Preconceito", "tem o livro O Capital em pdf?",
  ])("pedeLivro(%s) = true", (s) => expect(pedeLivro(s)).toBe(true));
  it.each(["me explica a ideia central do livro Sapiens", "resume o livro 1984", "quais as fontes sobre cálculo?", "faz um mapa mental"])(
    "pedeLivro(%s) = false", (s) => expect(pedeLivro(s)).toBe(false));
  it("consultaDoLivro tira o pedido e deixa título + autor", () => {
    expect(consultaDoLivro("procura o livro Dom Casmurro do Machado de Assis em pdf pra mim")).toBe("Dom Casmurro Machado Assis");
    expect(consultaDoLivro("me manda o pdf do livro calculus volume 1")).toBe("calculus volume 1");
    expect(consultaDoLivro("você pode achar o ebook Sapiens?")).toBe("Sapiens");
  });
  it("nomeDireto", () => { expect(nomeDireto("Austen, Jane")).toBe("Jane Austen"); expect(nomeDireto("Platão")).toBe("Platão"); });
});

describe("parsers", () => {
  it("OpenStax: só live, casa o título, PDF CC BY", () => {
    const r = parseOpenStax(OPENSTAX, "calculus volume");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ titulo: "Calculus Volume 1", acesso: "pdf_livre", pdfUrl: "https://assets.openstax.org/calc1.pdf", licenca: "CC BY 4.0" });
  });
  it("Gutendex: só domínio público; sem PDF = leitura online; autor sobrenome-primeiro corrigido", () => {
    const r = parseGutendex(GUTENDEX);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ acesso: "ler_online", lerUrl: "https://www.gutenberg.org/ebooks/55752.html.images", autores: ["Machado de Assis"], licenca: "domínio público" });
  });
  it("Open Library: public → candidatos do IA; borrowable → empréstimo; no_ebook → sem acesso", () => {
    const r = parseOpenLibrary(OL);
    expect(r[0]).toMatchObject({ acesso: "ler_online", iaCandidatos: ["domcasmurro_pub", "outro"] });
    expect(r[1]).toMatchObject({ acesso: "emprestimo", lerUrl: "https://openlibrary.org/works/OL2W/borrow", iaCandidatos: [] });
    expect(r[2].acesso).toBe("sem_acesso_livre");
  });
  it("Google Books: PDF só se domínio público; PARTIAL = prévia; http → https", () => {
    const r = parseGoogleBooks(GB);
    expect(r[0]).toMatchObject({ titulo: "Cálculo: Volume 1", acesso: "previa", pdfUrl: null });
    expect(r[0].lerUrl).toMatch(/^https:\/\//);
  });
});

describe("consolidar e markdown", () => {
  const L = (o: Partial<LivroAchado>): LivroAchado => ({ titulo: "Dom Casmurro", autores: ["Machado de Assis"], ano: null, idiomas: [], fonte: "openlibrary", acesso: "sem_acesso_livre", pdfUrl: null, lerUrl: null, paginaUrl: "https://openlibrary.org/x", licenca: null, ...o });
  it("dedupe fica com o melhor acesso; irrelevante sai", () => {
    const r = consolidar([[L({})], [L({ fonte: "gutenberg", acesso: "ler_online", lerUrl: "https://gutenberg.org/x" })], [L({ titulo: "Culinária", autores: ["X"] })]], "Dom Casmurro Machado");
    expect(r).toHaveLength(1);
    expect(r[0].acesso).toBe("ler_online");
  });
  it("pirataria NUNCA passa", () => {
    expect(DOMINIOS_PROIBIDOS.test("https://libgen.is/book/x")).toBe(true);
    expect(DOMINIOS_PROIBIDOS.test("https://annas-archive.org/md5/x")).toBe(true);
    const r = consolidar([[L({ pdfUrl: "https://libgen.rs/get?x", acesso: "pdf_livre" })]], "Dom Casmurro");
    expect(r).toHaveLength(0);
  });
  it("markdown com links por tipo de acesso", () => {
    const md = markdownDosLivros([
      L({ acesso: "pdf_livre", pdfUrl: "https://archive.org/download/a/a.pdf", ano: 1899, licenca: "domínio público" }),
      L({ titulo: "Sapiens", autores: ["Yuval Noah Harari"], acesso: "emprestimo", lerUrl: "https://openlibrary.org/works/OL2W/borrow" }),
    ]);
    expect(md).toContain("**Livros encontrados:**");
    expect(md).toContain("[baixar PDF](https://archive.org/download/a/a.pdf)");
    expect(md).toContain("[pegar emprestado](https://openlibrary.org/works/OL2W/borrow)");
    expect(markdownDosLivros([])).toBe("");
  });
});

describe("buscarLivros (fetch falso)", () => {
  function fake(over: Record<string, unknown> = {}) {
    return vi.fn(async (url: string) => {
      const u = String(url);
      const body = u.includes("openstax") ? OPENSTAX : u.includes("gutendex") ? GUTENDEX : u.includes("openlibrary") ? OL
        : u.includes("googleapis") ? (over.gb ?? GB) : u.includes("archive.org/metadata/domcasmurro_pub") ? (over.ia ?? { result: {} }) : u.includes("archive.org/metadata/outro") ? { result: {} } : null;
      if (body === "erro") return new Response("{}", { status: 429 });
      return new Response(JSON.stringify(body ?? {}), { status: body ? 200 : 404 });
    });
  }
  it("Dom Casmurro: PDF do IA (item público) vence; Google fora não derruba", async () => {
    const f = fake({ gb: "erro" });
    const r = await buscarLivros("procura o livro Dom Casmurro do Machado em pdf", { fetchImpl: f as any, env: {} });
    expect(r.falhas).toEqual(["google_books"]);
    expect(r.livros[0]).toMatchObject({ titulo: "Dom Casmurro", acesso: "pdf_livre", pdfUrl: "https://archive.org/download/domcasmurro_pub/domcasmurro_pub.pdf" });
  });
  it("item do IA de EMPRÉSTIMO não vira PDF livre (tenta o próximo)", async () => {
    const f = fake({ ia: { result: { "access-restricted-item": "true" } } });
    const r = await buscarLivros("Dom Casmurro Machado", { fetchImpl: f as any, env: {} });
    expect(r.livros[0].pdfUrl).toBe("https://archive.org/download/outro/outro.pdf");
  });
  it("GOOGLE_BOOKS_API_KEY entra na URL quando existe", async () => {
    const f = fake();
    await buscarLivros("Cálculo Stewart", { fetchImpl: f as any, env: { GOOGLE_BOOKS_API_KEY: "k123" } });
    expect(f.mock.calls.some(([u]) => String(u).includes("googleapis") && String(u).includes("key=k123"))).toBe(true);
  });
});

describe("diretrizLivros", () => {
  it("sem resultado: honestidade + caminhos legais; nunca pirataria", () => {
    const d = diretrizLivros([]);
    expect(d).toMatch(/NÃO achou/);
    expect(d).toMatch(/Nunca indique sites de pirataria/);
  });
  it("só empréstimo: explica o empréstimo digital", () => {
    const d = diretrizLivros([{ titulo: "Sapiens", autores: ["Harari"], ano: 2011, idiomas: [], fonte: "openlibrary", acesso: "emprestimo", pdfUrl: null, lerUrl: "https://openlibrary.org/x/borrow", paginaUrl: "https://openlibrary.org/x", licenca: null }]);
    expect(d).toMatch(/empréstimo digital/);
  });
});
