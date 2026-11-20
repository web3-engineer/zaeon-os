/**
 * lib/paper-orquestra/texto.ts — as peças PURAS do PaperOrchestra na Zaeon (nada de rede, Prisma nem modelo).
 *
 * Tudo o que decide o resultado e dá pra provar em teste mora aqui:
 *  - o registro de evidência (paper → chave [E#] → citação ABNT do documento, com 2020a/2020b em colisão);
 *  - as tarefas de busca tiradas do esboço (o `_collect_search_tasks` do HybridLiteratureAgent);
 *  - a injeção das candidatas de citação de volta no esboço (`_inject_citations_into_outline`);
 *  - a conversão do texto do modelo ([E3][E7] → (SILVA, 2020; SOUZA, 2021)) com corte de chave inventada;
 *  - a partição do markdown em seções do documento ("# TÍTULO");
 *  - a regra de aceite do laço de refinamento (a do ContentRefinementAgent: só fica a versão que melhora).
 */
import { fonteDePaper, type FonteDoc } from "@/lib/documento/fontes";
import type { FonteVerificada } from "@/lib/tcc/store";

// ───────────────────────────── tipos do esboço (outline.json) ─────────────────────────────
export type Subsecao = { subsection_title?: string; content_bullets?: string[]; citation_hints?: string[]; citation_candidates?: string[] };
export type Esboco = {
  plotting_plan?: Array<Record<string, unknown>>;
  intro_related_work_plan?: {
    introduction_strategy?: { hook_hypothesis?: string; problem_gap_hypothesis?: string; search_directions?: string[]; citation_candidates?: string[] };
    related_work_strategy?: {
      overview?: string;
      subsections?: Array<{
        subsection_title?: string; methodology_cluster?: string; sota_investigation_mission?: string;
        limitation_hypothesis?: string; limitation_search_queries?: string[]; bridge_to_our_method?: string; citation_candidates?: string[];
      }>;
    };
  };
  section_plan?: Array<{ section_title?: string; subsections?: Subsecao[] }>;
};

export type TarefaDeBusca = { secao: string; consulta: string; tipo: "exploracao" | "alvo" };

const str = (v: unknown, max = 400) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : []);

/**
 * As tarefas de busca do esboço, na ordem de prioridade do original: macro da introdução, micro da revisão,
 * e as citações obrigatórias do resto. Consulta repetida sai; o teto corta as ALVO primeiro (são as mais numerosas
 * e as menos estruturais — o PO roda todas porque tem Google Search barato; aqui cada uma bate em 5 bases).
 */
export function tarefasDoEsboco(e: Esboco, rotulos: { intro: string; revisao: string | null }, teto = 16): TarefaDeBusca[] {
  const out: TarefaDeBusca[] = [];
  const vistas = new Set<string>();
  const add = (secao: string, consulta: string, tipo: TarefaDeBusca["tipo"]) => {
    const c = str(consulta, 200);
    const k = c.toLowerCase();
    if (!c || vistas.has(k)) return;
    vistas.add(k);
    out.push({ secao, consulta: c, tipo });
  };
  const plano = e.intro_related_work_plan ?? {};
  for (const d of lista(plano.introduction_strategy?.search_directions)) add(rotulos.intro, d, "exploracao");
  for (const sub of plano.related_work_strategy?.subsections ?? []) {
    const secao = `${rotulos.revisao ?? rotulos.intro}: ${str(sub?.subsection_title, 120) || "Geral"}`;
    const qs = lista(sub?.limitation_search_queries);
    if (!qs.length) add(secao, `${str(sub?.subsection_title)} ${str(sub?.methodology_cluster)}`, "exploracao");
    for (const q of qs) add(secao, q, "exploracao");
  }
  for (const s of e.section_plan ?? []) {
    for (const sub of s?.subsections ?? []) {
      for (const h of lista(sub?.citation_hints)) {
        // "paper introducing 'X'" → "X": as bases acadêmicas buscam por termo, não por pedido em prosa
        const termo = h.match(/introducing\s+['"‘“]?([^'"’”]+)['"’”]?/i)?.[1] ?? h.replace(/^.*?\(([^)]+)\)\s*$/, "$1");
        add(`${str(s?.section_title, 120)} - ${str(sub?.subsection_title, 120) || "Geral"}`, termo, "alvo");
      }
    }
  }
  const exploracao = out.filter((t) => t.tipo === "exploracao");
  const alvo = out.filter((t) => t.tipo === "alvo");
  return [...exploracao, ...alvo].slice(0, Math.max(1, teto));
}

// ───────────────────────────── registro de evidência ─────────────────────────────
export type PaperBusca = { title?: string; authors?: string[] | string; year?: number; url?: string; doi?: string; abstract?: string; venue?: string };
export type Evid = { chave: string; fonte: FonteDoc; autores: string; ano?: number; resumo: string; secao: string };

const normalizarTitulo = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/**
 * O registro: paper → [E#], deduplicado por título normalizado (dez buscas achando o mesmo paper = uma referência).
 * Colisão de citação entre papers DIFERENTES ("(SILVA, 2020)" duas vezes) vira 2020a/2020b, como manda a ABNT —
 * sem isso o rastreio por string da bibliografia juntaria os dois numa referência só.
 */
export function criarRegistro(teto = 40) {
  const itens: Evid[] = [];
  const porTitulo = new Map<string, Evid>();
  const citacoes = new Map<string, number>();

  function registrar(p: PaperBusca, secao: string, fontePronta?: FonteDoc | null): Evid | null {
    const autores = Array.isArray(p.authors) ? p.authors.join(", ") : str(p.authors, 300);
    const base = fontePronta ?? fonteDePaper({ title: p.title, authors: autores, year: p.year, url: p.url, doi: p.doi });
    if (!base) return null;
    // paper: um por título. Documento da base (fonte pronta): um por PASSAGEM — dois trechos da mesma apostila são duas evidências
    const k = normalizarTitulo(base.titulo ?? base.citacao) + (fontePronta ? `|${normalizarTitulo(base.citacao)}|${normalizarTitulo(String(p.abstract ?? "")).slice(0, 80)}` : "");
    const ja = porTitulo.get(k);
    if (ja) return ja;
    if (itens.length >= teto) return null;
    let citacao = base.citacao;
    const n = citacoes.get(citacao) ?? 0;
    if (n > 0 && /\d{4}\)$/.test(citacao)) citacao = citacao.replace(/(\d{4})\)$/, `$1${String.fromCharCode(97 + n)})`);
    citacoes.set(base.citacao, n + 1);
    const e: Evid = {
      chave: `E${itens.length + 1}`,
      fonte: { ...base, citacao, ...(p.abstract ? { extrato: str(p.abstract, 320) } : {}) },
      autores, ...(p.year ? { ano: p.year } : {}),
      resumo: str(p.abstract ?? base.extrato ?? "", 1200),
      secao,
    };
    itens.push(e);
    porTitulo.set(k, e);
    return e;
  }
  return { registrar, itens: () => [...itens], porChave: (c: string) => itens.find((e) => e.chave === c) };
}

/** As evidências como o modelo as lê (o "REFERENCE LIBRARY" do SectionWritingAgent). */
export function bibliotecaParaPrompt(evs: readonly Evid[]): string {
  if (!evs.length) return "(nenhuma evidência encontrada — escreva sem citar e sem afirmar fato da literatura)";
  return evs.map((e) => [
    `[${e.chave}] ${e.fonte.titulo ?? e.fonte.citacao}`,
    e.autores ? `  Autores: ${e.autores.split(",").slice(0, 3).join(",")}${e.autores.split(",").length > 3 ? " et al." : ""}${e.ano ? ` (${e.ano})` : ""}` : "",
    e.resumo ? `  Resumo: ${e.resumo}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");
}

/** As candidatas de citação de volta no esboço, por seção onde foram achadas (`_inject_citations_into_outline`). */
export function injetarCandidatas(e: Esboco, evs: readonly Evid[], rotulos: { intro: string; revisao: string | null }): Esboco {
  const porSecao = new Map<string, string[]>();
  for (const ev of evs) porSecao.set(ev.secao, [...(porSecao.get(ev.secao) ?? []), ev.chave]);
  const copia: Esboco = JSON.parse(JSON.stringify(e ?? {}));
  const plano = copia.intro_related_work_plan;
  if (plano?.introduction_strategy) plano.introduction_strategy.citation_candidates = porSecao.get(rotulos.intro) ?? [];
  for (const sub of plano?.related_work_strategy?.subsections ?? []) {
    sub.citation_candidates = porSecao.get(`${rotulos.revisao ?? rotulos.intro}: ${str(sub?.subsection_title, 120) || "Geral"}`) ?? [];
  }
  for (const s of copia.section_plan ?? []) {
    for (const sub of s?.subsections ?? []) {
      sub.citation_candidates = porSecao.get(`${str(s?.section_title, 120)} - ${str(sub?.subsection_title, 120) || "Geral"}`) ?? [];
      delete sub.citation_hints;
    }
  }
  return copia;
}

// ───────────────────────────── citação: [E#] → ABNT do documento ─────────────────────────────
/**
 * [E3][E7] → (SILVA, 2020; SOUZA, 2021). Chave que não existe no registro é CORTADA (o portão de citação do
 * PaperQA2 que a orquestra já usa) e contada. Devolve também as chaves citadas, na ordem de aparição —
 * é daí que a bibliografia sai, sem casar string escrita à mão.
 */
export function converterCitacoes(texto: string, porChave: (c: string) => Evid | undefined): { texto: string; citadas: string[]; invalidas: string[] } {
  const citadas: string[] = [];
  const invalidas: string[] = [];
  const out = String(texto ?? "").replace(/(?:\s*\[E\d+(?:\s*[,;]\s*E?\d+)*\])+/g, (grupo) => {
    const chaves = [...grupo.matchAll(/E?(\d+)/g)].map((m) => `E${m[1]}`);
    const partes: string[] = [];
    for (const c of chaves) {
      const ev = porChave(c);
      if (!ev) { if (!invalidas.includes(c)) invalidas.push(c); continue; }
      if (!citadas.includes(c)) citadas.push(c);
      const dentro = ev.fonte.citacao.replace(/^\(|\)$/g, "");
      if (!partes.includes(dentro)) partes.push(dentro);
    }
    return partes.length ? ` (${partes.join("; ")})` : "";
  });
  return { texto: out.replace(/ +([.,;:])/g, "$1"), citadas, invalidas };
}

/** As chaves citadas → o formato que `referenciasNovas` consome. */
export function referenciasDasChaves(chaves: readonly string[], porChave: (c: string) => Evid | undefined): FonteVerificada[] {
  const out: FonteVerificada[] = [];
  for (const c of chaves) {
    const f = porChave(c)?.fonte;
    if (!f || out.some((o) => o.abnt === f.abnt)) continue;
    out.push({ abnt: f.abnt, ...(f.titulo ? { titulo: f.titulo } : {}), ...(f.url ? { url: f.url } : {}), ...(f.doi ? { doi: f.doi } : {}) });
  }
  return out;
}

// ───────────────────────────── markdown ↔ seções do documento ─────────────────────────────
export const chaveSecao = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^\s*\d+(\.\d+)*\s*[-.)]?\s*/, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * "# INTRODUÇÃO\n…\n# METODOLOGIA\n…" → corpo por título DO ESQUELETO. Casa por texto normalizado (o modelo troca
 * acento, caixa e numeração); título fora do esqueleto é descartado — o modelo não cria seção no documento de ninguém.
 */
export function secoesDoMarkdown(md: string, esqueleto: readonly string[]): Map<string, string> {
  const porChave = new Map(esqueleto.map((t) => [chaveSecao(t), t]));
  const out = new Map<string, string>();
  const limpo = String(md ?? "").replace(/^```(?:markdown|md)?\s*\n?|```\s*$/g, "");
  const partes = limpo.split(/^#[ \t]+(?!#)/m);
  partes.shift(); // texto antes da primeira seção: preâmbulo, fora
  for (const p of partes) {
    const [linha, ...resto] = p.split("\n");
    const titulo = porChave.get(chaveSecao(linha ?? ""));
    const corpo = resto.join("\n").trim();
    if (titulo && corpo && !out.has(titulo)) out.set(titulo, corpo);
  }
  return out;
}

export function markdownDasSecoes(esqueleto: readonly string[], corpos: ReadonlyMap<string, string>, vazias = "(vazia — a escrever)"): string {
  return esqueleto.map((t) => `# ${t}\n${corpos.get(t)?.trim() || vazias}`).join("\n\n");
}

const palavras = (s: string) => String(s ?? "").split(/\s+/).filter(Boolean).length;
/** Corpo que conta como escrito (o mínimo do PO é "profundidade de periódico"; abaixo disto, reescreve). */
export const secaoEscrita = (corpo: string | undefined, piso = 80) => palavras(corpo ?? "") >= piso;

// ───────────────────────────── papéis das seções do esqueleto ─────────────────────────────
const RE_REFS = /^referencias?( bibliograficas)?$/;
const RE_INTRO = /^introducao/;
const RE_REVISAO = /referencial|revisao (de|da) literatura|fundamentacao|estado da arte|trabalhos relacionados/;
export function papeisDoEsqueleto(esqueleto: readonly string[]): { intro: string; revisao: string | null; referencias: string | null; resto: string[] } {
  const refs = esqueleto.find((t) => RE_REFS.test(chaveSecao(t))) ?? null;
  const semRefs = esqueleto.filter((t) => t !== refs);
  const intro = semRefs.find((t) => RE_INTRO.test(chaveSecao(t))) ?? semRefs.find((t) => !/^resumo|abstract/.test(chaveSecao(t))) ?? semRefs[0] ?? "INTRODUÇÃO";
  const revisao = semRefs.find((t) => t !== intro && RE_REVISAO.test(chaveSecao(t))) ?? null;
  return { intro, revisao, referencias: refs, resto: semRefs.filter((t) => t !== intro && t !== revisao) };
}

// ───────────────────────────── JSON e blocos de código ─────────────────────────────
export function blocoDeCodigo(texto: string, linguagem: string): string | null {
  const re = new RegExp("```" + linguagem + "\\s*\\n([\\s\\S]*?)(?:\\n```|$)", "i");
  return String(texto ?? "").match(re)?.[1]?.trim() ?? null;
}

/** A resposta do refinamento: ```json (registro) + ```markdown (trabalho completo). Sem o markdown = sem revisão. */
export function lerRefinamento(texto: string): { worklog: unknown; trabalho: string } | null {
  const md = blocoDeCodigo(texto, "markdown") ?? blocoDeCodigo(texto, "md");
  if (!md || !/^#\s/m.test(md)) return null;
  let worklog: unknown = null;
  try { worklog = JSON.parse(blocoDeCodigo(texto, "json") ?? "null"); } catch { worklog = null; }
  return { worklog, trabalho: md };
}

// ───────────────────────────── parecer e regra de aceite (ContentRefinementAgent.run) ─────────────────────────────
export const EIXOS = ["Originality", "Quality", "Clarity", "Significance", "Soundness", "Presentation", "Contribution", "Overall"] as const;
export type Notas = Record<(typeof EIXOS)[number], number>;
export function notasDoParecer(p: unknown): Notas {
  const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
  return Object.fromEntries(EIXOS.map((k) => [k, Number.isFinite(Number(o[k])) ? Number(o[k]) : 0])) as Notas;
}

export type Veredito = "aceita" | "rejeita";
/**
 * A regra do original: nota geral SUBIU → aceita e continua; CAIU → descarta e para; IGUAL → aceita se os
 * sub-eixos ganharam pelo menos o que perderam, senão descarta e para.
 */
export function vereditoDaRevisao(antes: Notas, depois: Notas): { veredito: Veredito; ganho: number; perda: number } {
  let ganho = 0, perda = 0;
  for (const k of EIXOS) {
    if (k === "Overall") continue;
    const d = depois[k] - antes[k];
    if (d > 0) ganho += d; else perda -= d;
  }
  if (depois.Overall > antes.Overall) return { veredito: "aceita", ganho, perda };
  if (depois.Overall < antes.Overall) return { veredito: "rejeita", ganho, perda };
  return { veredito: perda > ganho ? "rejeita" : "aceita", ganho, perda };
}
