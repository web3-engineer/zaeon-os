/**
 * lib/paper-orquestra/avaliar.ts — MEDIR um documento e COMPARAR dois (o gerado pela Zaeon × uma referência). PURO.
 *
 * Quatro eixos, os que o dono pediu:
 *  - QUANTIDADE   palavras no total e por seção, seções vazias;
 *  - RIQUEZA      subseções, citações distintas no texto, densidade de citação, referências, tabelas, fórmulas, listas;
 *  - REGRAS       ABNT: resumo com 150–250 palavras + palavras-chave, citação autor-data, voz impessoal (sem 1ª pessoa),
 *                 nenhuma chave interna ([E3]) ou marcador sobrando, referências citadas no texto;
 *  - ENTREGA      título, todas as seções do esqueleto preenchidas, seção de referências não vazia.
 *
 * `comparar` devolve, por métrica, a razão gerado/referência e se está dentro da faixa. "Similares" = todas as
 * métricas de quantidade e riqueza dentro de ±25% (ou diferença absoluta pequena em contagens baixas) e as regras e a
 * entrega batendo.
 */
export type Documento = { titulo: string; secoes: Array<{ titulo: string; corpo: string }> };

export type Medidas = {
  palavras: number;
  palavrasPorSecao: Record<string, number>;
  secoesVazias: string[];
  subsecoes: number;
  citacoesDistintas: number;
  citacoesNoTexto: number;
  citacoesPor1000: number;
  referencias: number;
  tabelas: number;
  formulas: number;
  listas: number;
  paragrafos: number;
  palavrasPorParagrafo: number;
  resumoPalavras: number;
  temPalavrasChave: boolean;
  primeiraPessoa: number;
  chavesSobrando: number;
  temTitulo: boolean;
};

const palavras = (s: string) => String(s ?? "").replace(/[#*_`>|$\\-]/g, " ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const ehRefs = (t: string) => /^refer[eê]ncias/i.test(t.trim());
const ehResumo = (t: string) => /^(resumo|abstract)$/i.test(t.trim());
/** (SILVA, 2020) · (SILVA, 2020; SOUZA, 2021) · (SILVA; SOUZA, 2020) · Silva (2020) · (Apostila…, p. 12) */
const RE_CITACAO = /\(([A-ZÀ-Ý][A-ZÀ-Ý' .\-]+(?:;\s*[A-ZÀ-Ý][A-ZÀ-Ý' .\-]+)*|[^()]{3,80}?),\s*(?:\d{4}[a-z]?|\[s\.d\.\]|p\.\s*\d+[–-]?\d*)[^()]{0,40}\)|\b[A-ZÀ-Ý][a-zà-ÿ]+(?: et al\.)? \(\d{4}[a-z]?\)/g;
// "nos" fica de fora de propósito: em português quase sempre é a contração "em + os" ("nos estudos"), não pronome
const RE_PRIMEIRA = /(?<![\p{L}])(eu|nós|nosso|nossa|nossos|nossas|meu|minha|fizemos|realizamos|propomos|analisamos|observamos|conclu[ií]mos|acreditamos)(?![\p{L}])/giu;

export function medir(d: Documento): Medidas {
  const corpoTexto = d.secoes.filter((s) => !ehRefs(s.titulo));
  const texto = corpoTexto.map((s) => s.corpo).join("\n\n");
  const refs = d.secoes.find((s) => ehRefs(s.titulo));
  const resumo = d.secoes.find((s) => ehResumo(s.titulo));
  // a unidade é a OBRA, não o autor: "(SILVA; SOUZA, 2020)" é uma obra de dois autores; "(SILVA, 2020; SOUZA, 2021)" são duas
  const citacoes = [...texto.matchAll(RE_CITACAO)].flatMap((m) => {
    if (!m[0].startsWith("(")) return [m[0].trim()]; // narrativa: "Costa (2019)"
    const dentro = m[0].replace(/^\(|\)$/g, "");
    if (/p\.\s*\d/.test(dentro) || !/\d{4}|\[s\.d\.\]/.test(dentro)) return [dentro.trim()];
    return [...dentro.matchAll(/([^;]+?),\s*(\d{4}[a-z]?|\[s\.d\.\])/g)].map((x) => `${x[1]!.replace(/^[;\s]+/, "").trim()}, ${x[2]}`);
  });
  // a linha de subtítulo sai ANTES de partir: "### Título\nTexto…" (sem linha em branco) é um parágrafo, não um título
  const paras = texto.replace(/^#{1,6}\s.*$/gm, "").split(/\n{2,}/).map((p) => p.trim()).filter((p) => p && !p.startsWith("|") && palavras(p) >= 12);
  const total = palavras(texto);
  const linhasRef = (refs?.corpo ?? "").split("\n").map((l) => l.trim()).filter((l) => l.length > 20);
  const porSecao: Record<string, number> = {};
  for (const s of corpoTexto) porSecao[s.titulo] = palavras(s.corpo);
  return {
    palavras: total,
    palavrasPorSecao: porSecao,
    secoesVazias: d.secoes.filter((s) => !s.corpo.trim()).map((s) => s.titulo),
    subsecoes: (texto.match(/^#{2,3}\s+\S/gm) ?? []).length,
    citacoesDistintas: new Set(citacoes.map((c) => c.toUpperCase().replace(/\s+/g, " "))).size,
    citacoesNoTexto: citacoes.length,
    citacoesPor1000: total ? Math.round((citacoes.length / total) * 10000) / 10 : 0,
    referencias: linhasRef.length,
    tabelas: (texto.match(/^\|.*\|\s*\n\|\s*:?-{3,}/gm) ?? []).length,
    // equação DESTACADA ($$…$$): símbolo solto no texto ($x_i$, $r^2$) explica a equação, não é outra equação
    formulas: (texto.match(/\$\$[\s\S]+?\$\$/g) ?? []).length,
    listas: (texto.match(/^\s*(?:[-*]|\d+\.)\s+\S/gm) ?? []).length,
    paragrafos: paras.length,
    palavrasPorParagrafo: paras.length ? Math.round(paras.reduce((x, p) => x + palavras(p), 0) / paras.length) : 0,
    resumoPalavras: resumo ? palavras(resumo.corpo.split(/\*\*Palavras-chave/i)[0] ?? "") : 0,
    temPalavrasChave: /palavras-chave/i.test(resumo?.corpo ?? texto),
    primeiraPessoa: (texto.match(RE_PRIMEIRA) ?? []).length,
    chavesSobrando: (texto.match(/\[\[?\s*[ET]\d+\s*\]?\]/g) ?? []).length,
    temTitulo: !!d.titulo.trim(),
  };
}

export type LinhaComparacao = { metrica: string; gerado: number | string; referencia: number | string; razao: number | null; ok: boolean };

/** dentro da faixa: razão em [1−tol, 1+tol], ou diferença absoluta ≤ `folga` (contagens pequenas: 2 tabelas × 3 não é 33%) */
function perto(a: number, b: number, tol: number, folga: number): { razao: number | null; ok: boolean } {
  if (b === 0) return { razao: null, ok: a <= folga };
  const r = Math.round((a / b) * 100) / 100;
  return { razao: r, ok: Math.abs(a - b) <= folga || (r >= 1 - tol && r <= 1 + tol) };
}

export function comparar(gerado: Documento, referencia: Documento, tol = 0.25): { linhas: LinhaComparacao[]; similares: boolean; gerado: Medidas; referencia: Medidas } {
  const g = medir(gerado), r = medir(referencia);
  const linhas: LinhaComparacao[] = [];
  const num = (metrica: string, a: number, b: number, folga = 0) => { const p = perto(a, b, tol, folga); linhas.push({ metrica, gerado: a, referencia: b, ...p }); };
  const bool = (metrica: string, a: boolean, b: boolean) => linhas.push({ metrica, gerado: a ? "sim" : "não", referencia: b ? "sim" : "não", razao: null, ok: a === b || a });
  // quantidade
  num("palavras (total)", g.palavras, r.palavras);
  for (const t of Object.keys(r.palavrasPorSecao)) num(`palavras · ${t}`, g.palavrasPorSecao[t] ?? 0, r.palavrasPorSecao[t]!, 40);
  num("parágrafos", g.paragrafos, r.paragrafos, 3);
  num("palavras por parágrafo", g.palavrasPorParagrafo, r.palavrasPorParagrafo, 15);
  // riqueza
  num("subseções", g.subsecoes, r.subsecoes, 2);
  num("citações distintas", g.citacoesDistintas, r.citacoesDistintas, 3);
  num("citações por mil palavras", g.citacoesPor1000, r.citacoesPor1000, 2);
  num("referências", g.referencias, r.referencias, 3);
  num("tabelas", g.tabelas, r.tabelas, 1);
  num("fórmulas", g.formulas, r.formulas, 2);
  // regras
  num("resumo (palavras)", g.resumoPalavras, r.resumoPalavras, 50);
  bool("palavras-chave", g.temPalavrasChave, r.temPalavrasChave);
  linhas.push({ metrica: "1ª pessoa (ocorrências)", gerado: g.primeiraPessoa, referencia: r.primeiraPessoa, razao: null, ok: g.primeiraPessoa <= Math.max(2, r.primeiraPessoa) });
  linhas.push({ metrica: "chaves internas sobrando", gerado: g.chavesSobrando, referencia: r.chavesSobrando, razao: null, ok: g.chavesSobrando === 0 });
  // entrega
  bool("título", g.temTitulo, r.temTitulo);
  linhas.push({ metrica: "seções vazias", gerado: g.secoesVazias.join(", ") || "nenhuma", referencia: r.secoesVazias.join(", ") || "nenhuma", razao: null, ok: g.secoesVazias.length === 0 });
  return { linhas, similares: linhas.every((l) => l.ok), gerado: g, referencia: r };
}

/** Markdown "# TÍTULO DO DOC\n\n## SEÇÃO\n…" → Documento (o formato em que os documentos da avaliação são gravados). */
export function documentoDoMarkdown(md: string): Documento {
  const linhas = String(md ?? "").split("\n");
  const titulo = (linhas.find((l) => /^#\s/.test(l)) ?? "").replace(/^#\s+/, "").trim();
  const secoes: Documento["secoes"] = [];
  let atual: { titulo: string; corpo: string[] } | null = null;
  for (const l of linhas) {
    if (/^##\s(?!#)/.test(l)) {
      if (atual) secoes.push({ titulo: atual.titulo, corpo: atual.corpo.join("\n").trim() });
      atual = { titulo: l.replace(/^##\s+/, "").trim(), corpo: [] };
    } else if (atual && !/^#\s/.test(l)) {
      // subtítulo do corpo (### no arquivo) volta a ser ## dentro da seção, como o editor guarda
      atual.corpo.push(l.replace(/^###(#?)\s/, "##$1 "));
    }
  }
  if (atual) secoes.push({ titulo: atual.titulo, corpo: atual.corpo.join("\n").trim() });
  return { titulo, secoes };
}

export function markdownDoDocumento(d: Documento): string {
  return [`# ${d.titulo}`, ...d.secoes.map((s) => `## ${s.titulo}\n\n${s.corpo.replace(/^##(#?)\s/gm, "###$1 ")}`)].join("\n\n") + "\n";
}

export function tabelaDaComparacao(c: ReturnType<typeof comparar>): string {
  return ["| métrica | Zaeon | referência | razão | ok |", "|---|---|---|---|---|",
    ...c.linhas.map((l) => `| ${l.metrica} | ${l.gerado} | ${l.referencia} | ${l.razao ?? "—"} | ${l.ok ? "✅" : "❌"} |`)].join("\n");
}
