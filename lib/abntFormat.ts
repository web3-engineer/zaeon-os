/**
 * Formatação ABNT determinística (NBR 6023 referência / NBR 10520 chamada).
 * Tudo em código puro — sem LLM — pra ser ESTÁVEL e testável.
 * O "inteligente" é o cruzamento de metadados (CrossRef/arXiv) que alimenta isto.
 */

export interface Author {
  family?: string;
  given?: string;
}

export interface CiteMeta {
  authors?: Author[];
  title?: string;
  container?: string; // periódico / veículo
  year?: number | string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
}

/** Parse de um nome solto ("Ashby, Matthew P. J." ou "Matthew Ashby") → {family, given}. */
export function parseAuthorName(raw: string): Author {
  const s = (raw || "").trim();
  if (!s) return {};
  if (s.includes(",")) {
    const [family, given] = s.split(",", 2);
    return { family: family.trim(), given: (given || "").trim() };
  }
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { family: parts[0] };
  const family = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(" ");
  return { family, given };
}

/** Normaliza autores de string[] OU Author[] para Author[]. */
export function normalizeAuthors(input: unknown): Author[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((a) => {
      if (typeof a === "string") return parseAuthorName(a);
      if (a && typeof a === "object") {
        const o = a as any;
        if (o.family || o.given) return { family: o.family, given: o.given };
        if (o.name) return parseAuthorName(o.name);
      }
      return {};
    })
    .filter((a) => a.family || a.given);
}

const MESES = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
function acessoHoje(): string {
  const d = new Date();
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "SOBRENOME, Nome; SOBRENOME, Nome." (até 3; 4+ → primeiro + et al.) */
function authorsRef(authors: Author[]): string {
  const list = authors.filter((a) => a.family || a.given);
  if (list.length === 0) return "";
  const fmt = (a: Author) => {
    const fam = (a.family || "").toUpperCase().trim();
    const giv = (a.given || "").trim();
    return giv ? `${fam}, ${giv}` : fam;
  };
  if (list.length > 3) return `${fmt(list[0])} et al.`;
  return list.map(fmt).join("; ");
}

/** Chamada no texto: (SOBRENOME, ano) · (SOBRENOME; SOBRENOME, ano) · (SOBRENOME et al., ano) */
function authorsInline(authors: Author[]): string {
  const fams = authors.map((a) => (a.family || "").toUpperCase().trim()).filter(Boolean);
  if (fams.length === 0) return "";
  if (fams.length === 1) return fams[0];
  if (fams.length === 2) return `${fams[0]}; ${fams[1]}`;
  return `${fams[0]} et al.`;
}

/** Tem o mínimo pra montar uma referência ABNT crível? (autor + título + ano) */
export function hasEnoughMeta(m: CiteMeta): boolean {
  const hasAuthor = (m.authors || []).some((a) => a.family || a.given);
  return !!(hasAuthor && (m.title && m.title.trim()) && m.year);
}

/** O que falta — pra orientar o preenchimento manual. */
export function missingMeta(m: CiteMeta): string[] {
  const miss: string[] = [];
  if (!(m.authors || []).some((a) => a.family || a.given)) miss.push("autores");
  if (!(m.title && m.title.trim())) miss.push("título");
  if (!m.year) miss.push("ano");
  return miss;
}

/** Referência ABNT completa (NBR 6023). */
export function buildAbnt(m: CiteMeta): string {
  const parts: string[] = [];
  const aut = authorsRef(m.authors || []);
  if (aut) parts.push(aut.endsWith(".") ? aut : `${aut}.`);
  if (m.title) parts.push(`${m.title.trim().replace(/\.$/, "")}.`);

  // Veículo, volume/número, páginas, ano
  const pub: string[] = [];
  if (m.container) pub.push(m.container.trim());
  if (m.volume) pub.push(`v. ${m.volume}`);
  if (m.issue) pub.push(`n. ${m.issue}`);
  if (m.pages) pub.push(`p. ${m.pages}`);
  if (m.year) pub.push(String(m.year));
  if (pub.length) parts.push(`${pub.join(", ")}.`);
  else if (m.publisher) parts.push(`${m.publisher}, ${m.year ?? ""}.`.trim());

  if (m.doi) parts.push(`DOI: ${m.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")}.`);
  if (m.url) parts.push(`Disponível em: ${m.url}. Acesso em: ${acessoHoje()}.`);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Citação no texto (NBR 10520): "trecho" (SOBRENOME, ano, p. X). */
export function buildInline(quote: string, m: CiteMeta, page?: string | number): string {
  const aut = authorsInline(m.authors || []);
  const bits = [aut, m.year ? String(m.year) : ""].filter(Boolean);
  if (page) bits.push(`p. ${page}`);
  const cham = bits.length ? ` (${bits.join(", ")})` : "";
  const q = quote.trim().replace(/\s+/g, " ");
  return `"${q}"${cham}`;
}

/**
 * Heurística de recorte: se a seleção parece cortada (começa minúscula / termina sem pontuação),
 * sugere uma versão aparada nas fronteiras de frase. Retorna "" se já estiver boa.
 */
export function suggestBoundary(text: string): { suggestion: string; suggestedText: string } {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return { suggestion: "", suggestedText: "" };
  const startsLow = /^[a-zà-ÿ]/.test(t);
  const endsOpen = !/[.!?]"?$/.test(t);
  if (!startsLow && !endsOpen) return { suggestion: "", suggestedText: "" };

  let s = t;
  // apara início até o começo de uma frase (após . ! ?), se houver
  if (startsLow) {
    const m = s.match(/[.!?]\s+([A-ZÀ-Ý])/);
    if (m && m.index !== undefined) s = s.slice(m.index + m[0].length - 1);
  }
  // apara fim até o último fim de frase
  if (endsOpen) {
    const idx = Math.max(s.lastIndexOf("."), s.lastIndexOf("!"), s.lastIndexOf("?"));
    if (idx > 20) s = s.slice(0, idx + 1);
  }
  s = s.trim();
  if (!s || s === t) return { suggestion: "", suggestedText: "" };
  return {
    suggestion: "O trecho parece cortado. Sugiro ajustar para começar e terminar numa frase completa.",
    suggestedText: s,
  };
}
