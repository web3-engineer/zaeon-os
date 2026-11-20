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
/** "Eric D. Klopfer" → { sobrenome: "KLOPFER", iniciais: "E. D." } (nome de um token só vira sobrenome) */
function partesDoNome(nome: string): { sobrenome: string; iniciais: string } {
  const limpo = String(nome ?? "").replace(/\s*\bet\s+al\.?/gi, "").replace(/[*†‡§0-9]+/g, "").replace(/[.,]+$/, "").trim();
  if (limpo.includes(",")) { // "Klopfer, Eric D." já vem invertido
    const [sob, resto] = limpo.split(",", 2);
    return { sobrenome: sob!.trim().toUpperCase(), iniciais: iniciaisDe(resto ?? "") };
  }
  const t = limpo.split(/\s+/).filter(Boolean);
  if (t.length <= 1) return { sobrenome: (t[0] ?? "").toUpperCase(), iniciais: "" };
  // formato PubMed/Vancouver: "Schmidt MJ" — sobrenome primeiro, iniciais (1–3 maiúsculas, sem ponto) no fim
  const ultimo = t[t.length - 1]!;
  if (/^[A-Z]{1,3}$/.test(ultimo) && /[a-zà-ÿ]/.test(t.slice(0, -1).join(" "))) {
    return { sobrenome: t.slice(0, -1).join(" ").toUpperCase(), iniciais: ultimo.split("").map((c) => `${c}.`).join(" ") };
  }
  return { sobrenome: t[t.length - 1]!.toUpperCase(), iniciais: iniciaisDe(t.slice(0, -1).join(" ")) };
}
const iniciaisDe = (s: string) => s.split(/[\s.-]+/).filter(Boolean).map((p) => `${p[0]!.toUpperCase()}.`).join(" ");

/**
 * Citação autor-data e referência no padrão ABNT (NBR 10520:2023 e 6023:2018): até 3 autores na citação, separados por
 * ";" — 4 ou mais, o primeiro + "et al."; na referência, "SOBRENOME, I." dos três primeiros (+ "et al." quando há mais),
 * título, veículo em negrito, ano e DOI (ou URL).
 */
export function abntDoPaper(p: { title?: string; authors?: string[] | string; year?: number; venue?: string; doi?: string; url?: string }): { citacao: string; abnt: string; titulo: string } | null {
  const titulo = str(p.title, 300).replace(/\.$/, "");
  if (!titulo) return null;
  const nomes = (Array.isArray(p.authors) ? p.authors : String(p.authors ?? "").split(/\s*[;,]\s*(?=[A-ZÀ-Ý\u3040-\u9fff\uac00-\ud7af])/)).map((x) => String(x).trim()).filter(Boolean);
  // instituição listada como "autor" (sociedade, universidade, departamento) não é pessoa: sai da autoria de pessoa
  const instituicao = /\b(society|soci[eé]t[eé]|sociedade|university|universidade|universidad|institute|instituto|department|departamento|association|associa[cç][aã]o|council|conselho|ministry|minist[eé]rio|organization|organiza[cç][aã]o|unesco|oecd|ocde)\b/i;
  const pessoas = nomes.filter((n) => !instituicao.test(n));
  const partes = (pessoas.length ? pessoas : nomes).map(partesDoNome).filter((x) => x.sobrenome);
  const ano = Number.isInteger(p.year) ? String(p.year) : "[s.d.]";
  const curto = titulo.split(/\s+/).slice(0, 4).join(" ");
  const quem = !partes.length ? curto.toUpperCase()
    : partes.length >= 4 ? `${partes[0]!.sobrenome} et al.`
    : partes.map((x) => x.sobrenome).join("; ");
  const autoria = !partes.length ? ""
    : partes.slice(0, 3).map((x) => (x.iniciais ? `${x.sobrenome}, ${x.iniciais}` : x.sobrenome)).join("; ") + (partes.length > 3 ? " et al" : "");
  const veiculo = str(p.venue, 200);
  const abnt = [
    autoria ? (autoria.endsWith(".") ? autoria : `${autoria}.`) : "",
    `${titulo}.`,
    veiculo ? `**${veiculo}**,` : "",
    `${ano}.`,
    p.doi ? `DOI: ${str(p.doi, 160)}.` : p.url ? `Disponível em: ${str(p.url, 300)}.` : "",
  ].filter(Boolean).join(" ");
  return { citacao: `(${quem}, ${ano})`, abnt, titulo };
}

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
    // paper SEM RESUMO fica de fora (como no HybridLiteratureAgent): o escritor citaria sem saber o que a fonte diz
    if (!fontePronta && str(p.abstract, 40).length < 40) return null;
    const doPaper = fontePronta ? null : abntDoPaper(p);
    const base: FonteDoc | null = fontePronta ?? (doPaper
      ? { abnt: doPaper.abnt, titulo: doPaper.titulo, citacao: doPaper.citacao, origem: "literatura", ...(p.url ? { url: p.url } : {}), ...(p.doi ? { doi: p.doi } : {}) }
      : fonteDePaper({ title: p.title, authors: autores, year: p.year, url: p.url, doi: p.doi }));
    if (!base) return null;
    // paper: um por título. Documento da base (fonte pronta): um por PASSAGEM — dois trechos da mesma apostila são duas evidências
    const k = normalizarTitulo(base.titulo ?? base.citacao) + (fontePronta ? `|${normalizarTitulo(base.citacao)}|${normalizarTitulo(String(p.abstract ?? "")).slice(0, 80)}` : "");
    const ja = porTitulo.get(k);
    if (ja) return ja;
    if (itens.length >= teto) return null;
    let citacao = base.citacao;
    const n = citacoes.get(citacao) ?? 0;
    if (n > 0 && /\d{4}\)$/.test(citacao)) citacao = citacao.replace(/(\d{4})\)$/, `$1${String.fromCharCode(97 + n)})`);
    // a referência acompanha o desempate (2020b na citação = 2020b na lista)
    const abnt = citacao !== base.citacao ? base.abnt.replace(/\b(\d{4})\./, `$1${String.fromCharCode(97 + n)}.`) : base.abnt;
    citacoes.set(base.citacao, n + 1);
    const e: Evid = {
      chave: `E${itens.length + 1}`,
      fonte: { ...base, citacao, abnt, ...(p.abstract ? { extrato: str(p.abstract, 320) } : {}) },
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
  // [E1][E2] · [E1], [E2] · [E1; E2] · [E1] e [E2] → um grupo só, uma citação só
  const out = String(texto ?? "").replace(/\s*\[E\d+(?:\s*[,;]\s*E?\d+)*\](?:\s*(?:[,;]|\be\b)?\s*\[E\d+(?:\s*[,;]\s*E?\d+)*\])*/g, (grupo) => {
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

// ───────────────────────────── registro de busca (o "experimental log" de uma revisão) ─────────────────────────────
/** As bases que `retrievePapers` consulta (lib/scholar/sources) — é o que a metodologia pode dizer, e nada além. */
export const BASES_ACADEMICAS = ["OpenAlex", "Crossref", "arXiv", "PubMed", "Semantic Scholar"];

export type RegistroDeBusca = {
  origem: "busca" | "pedido";
  bases: string[];
  consultas: string[];
  data: string;
  encontrados: number;
  semResumo: number;
  excluidosTriagem: number;
  incluidos: number;
  motivosExclusao: string[];
  daBaseDoAluno?: number;
  /** quantos resumos o enrichment (OpenAlex por DOI) completou */
  resumosCompletados?: number;
};

/**
 * O registro em texto, pro escritor. É o equivalente do experimental_log.md do PaperOrchestra pra um trabalho de REVISÃO:
 * a metodologia descreve ISTO — e mais nada (sem PRISMA, Scopus ou "dois revisores" que não aconteceram).
 */
export function textoDoRegistro(r: RegistroDeBusca): string {
  if (r.origem === "pedido") {
    return `Fontes: as ${r.incluidos} referências indicadas pelo autor no pedido. Nenhuma busca em base de dados foi feita.`;
  }
  return [
    `Busca automatizada (assistida por IA) realizada em ${r.data} nas bases ${r.bases.slice(0, -1).join(", ")} e ${r.bases[r.bases.length - 1]}.`,
    `Consultas (${r.consultas.length}, em inglês): ${r.consultas.map((c) => `"${c}"`).join("; ")}.`,
    `Registros únicos recuperados: ${r.encontrados}.${r.resumosCompletados ? ` Resumos completados pelo DOI (OpenAlex): ${r.resumosCompletados}.` : ""} Excluídos por não terem resumo disponível: ${r.semResumo}.`,
    `Triagem por título e resumo quanto à pertinência ao tema (assistida por IA): ${r.excluidosTriagem} excluídos${r.motivosExclusao.length ? ` (exemplos de motivo: ${r.motivosExclusao.join("; ")})` : ""}.`,
    `Incluídos na síntese: ${r.incluidos}${r.daBaseDoAluno ? ` (dos quais ${r.daBaseDoAluno} documentos da base pessoal do autor)` : ""}.`,
    "Critérios de inclusão (os ÚNICOS aplicados): ter resumo disponível e ser pertinente ao tema por título e resumo. Não houve filtro por tipo de publicação, revisão por pares, idioma ou período.",
    "Não houve avaliação de risco de viés, extração por pares nem leitura do texto completo: a síntese se apoia nos resumos.",
  ].join("\n");
}

// ───────────────────────────── orçamento de palavras por seção ─────────────────────────────
/**
 * A faixa de palavras de cada seção, pelo tipo de trabalho (o "page limit" do conference_guidelines.md do PO, em
 * palavras e em ABNT). Sem faixa, o modelo enche: na avaliação de nov/2026 a metodologia saía com 2–3,6× o necessário
 * e a conclusão com até 3×, repetindo o que as outras seções já diziam.
 */
export function orcamentoDaSecao(titulo: string, tipo: string, temDados: boolean): [number, number] {
  // CALIBRADO na avaliação de nov/2026 (docs/PAPER_ORQUESTRA.md §Avaliação): ±12% em torno do tamanho de cada seção nos
  // documentos de referência escritos à mão com as mesmas fontes.
  const k = chaveSecao(titulo);
  const tcc = /tcc/i.test(tipo);
  if (/^(resumo|abstract)/.test(k)) return [190, 250];
  if (/^introducao/.test(k)) return tcc ? [390, 500] : temDados ? [350, 450] : [370, 490];
  if (/referencial|revisao (de|da) literatura|fundamentacao|estado da arte/.test(k)) return tcc ? [780, 1000] : temDados ? [630, 820] : [950, 1250];
  if (/metodo|metodologia|materiais/.test(k)) return tcc ? [300, 400] : temDados ? [220, 300] : [280, 380];
  if (/resultado|discussao|desenvolvimento/.test(k)) return tcc ? [1020, 1300] : temDados ? [640, 830] : [820, 1060];
  if (/conclus|consideracoes finais/.test(k)) return [190, 250];
  return [300, 700];
}

export const textoDoOrcamento = (titulos: readonly string[], tipo: string, temDados: boolean) =>
  titulos.map((t) => { const [a, b] = orcamentoDaSecao(t, tipo, temDados); return `${t}: ${a}–${b} palavras`; }).join("\n");

/**
 * Estatística simples escrita em LaTeX ($r = 0,58$, $n = 14$, $p < 0,001$, $r$) volta a ser texto: num trabalho ABNT o
 * número vai no corpo como texto, e o modelo insiste no cifrão mesmo instruído. Equação de verdade (com \\frac, ^, _,
 * \\sum…) fica intacta.
 */
export function numerosSemLatex(texto: string): string {
  return String(texto ?? "").replace(/(?<!\$)\$(?!\$)([^$\n]{1,40})\$(?!\$)/g, (m, dentro: string) => {
    const t = dentro.trim();
    if (/[\\^_{}]/.test(t)) return m;
    return /^[A-Za-zα-ωΑ-Ω]{1,3}(\s*[=<>≤≥]\s*-?[\d.,]+\s*%?)?$/.test(t) ? t.replace(/\s*([=<>≤≥])\s*/, " $1 ") : m;
  });
}

// ───────────────────────────── auditoria de entrega (o format_agent do PO, com as regras ABNT) ─────────────────────────────
/**
 * Faixa de citação da seção, em OBRAS citadas por mil palavras visíveis (null = a seção não é medida). Calibrada nos
 * documentos de referência da avaliação de nov/2026: em revisão, a discussão cita mais que a introdução; num trabalho com
 * dados, os resultados comentam os próprios números e citam pouco.
 */
export function faixaDeCitacao(titulo: string, temDados: boolean): [number, number] | null {
  const k = chaveSecao(titulo);
  if (/^introducao|referencial|revisao (de|da) literatura|fundamentacao/.test(k)) return temDados ? [13, 24] : [16, 30];
  if (/resultado|discussao/.test(k)) return temDados ? [8, 18] : [22, 38];
  // conclusão retoma os achados — quase não cita (as referências escritas à mão não citavam nenhuma vez ali)
  if (/conclus|consideracoes finais/.test(k)) return [0, 8];
  return null;
}

export const contarPalavras = (t: string) => String(t ?? "").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const RE_1A_PESSOA = /(?<![\p{L}])(eu|nós|nosso|nossa|nossos|nossas|meu|minha|fizemos|realizamos|propomos|analisamos|observamos|conclu[ií]mos)(?![\p{L}])/iu;

/**
 * O que falta numa seção pra ela estar ENTREGÁVEL — checagem de código, sem modelo. Cada pendência é uma instrução que o
 * passo de ajuste recebe literalmente. Vazio = seção pronta.
 */
export function pendenciasDaSecao(titulo: string, corpo: string, ctx: { tipo: string; dados: string; visivel?: (corpo: string) => string }): string[] {
  const k = chaveSecao(titulo);
  const temDados = !!ctx.dados.trim();
  const out: string[] = [];
  // o TAMANHO é o que o leitor vê: "[E2]" vira "(ARDILES-IRARRÁZABAL et al., 2026)" no documento
  const n = contarPalavras(ctx.visivel ? ctx.visivel(corpo) : corpo);
  const [piso, teto] = orcamentoDaSecao(titulo, ctx.tipo, temDados);
  if (n > teto * 1.05) out.push(`CONDENSE para ${piso}–${teto} palavras (tem ${n}): corte repetição, enfeite e citação repetida, sem perder resultado nem chave [E#] que sustenta afirmação.`);
  if (n < piso * 0.92) out.push(`APROFUNDE para ${piso}–${teto} palavras (tem ${n}), só com o que as evidências e os dados sustentam.`);
  const subs = (corpo.match(/^##\s+\S/gm) ?? []).length;
  if (/referencial|revisao (de|da) literatura|fundamentacao/.test(k) && subs < 3) out.push(`Organize em 3–4 subseções "## " (tem ${subs}).`);
  if (/resultado|discussao/.test(k) && subs < 3) out.push(`Organize em 3–4 subseções "## " (tem ${subs})${temDados ? ", a última de limitações" : ""}.`);
  if (/metodo|metodologia/.test(k)) {
    if (!temDados && !/^##\s+tipo de estudo/im.test(corpo)) out.push('Use exatamente as subseções "## Tipo de estudo", "## Busca e seleção das fontes" e "## Análise e limitações do método".');
    if (temDados && subs < 2) out.push(`Organize em 2–3 subseções "## " (tem ${subs}).`);
    if (temDados && /correla|pearson|m[ée]dia|desvio|regress|teste/i.test(ctx.dados) && !/\$\$[\s\S]+?\$\$/.test(corpo)) {
      out.push("Apresente a equação da medida estatística usada (ex.: correlação de Pearson) em $$…$$ e defina os símbolos em uma frase.");
    }
  }
  if (!temDados && /resultado|discussao/.test(k) && !/^\|.*\|\s*\n\|\s*:?-{3,}/m.test(corpo)) {
    out.push('Inclua UMA tabela-síntese em markdown dos estudos (estudo | contexto | achado principal), só com o que os resumos dizem, com "Tabela 1 — …" acima e "Fonte: elaborada pelo autor a partir dos resumos dos trabalhos incluídos." abaixo.');
  }
  if (/^(resumo|abstract)/.test(k) && !/palavras-chave/i.test(corpo)) out.push('Termine com a linha "**Palavras-chave:** a; b; c."');
  const faixaCit = faixaDeCitacao(titulo, temDados);
  const chavesNaSecao = (corpo.match(/E\d+/g) ?? []).length;
  if (faixaCit && n > 150) {
    // obras citadas por mil palavras VISÍVEIS (calibrado nos documentos de referência, contando obra e não autor)
    const porMil = (chavesNaSecao / n) * 1000;
    const [min, max] = faixaCit;
    if (porMil > max) out.push(`Cite MENOS: ${Math.round(porMil)} citações por mil palavras (alvo ${min}–${max}); tire citação repetida e de frase de síntese ou de comentário sobre os próprios dados.`);
    if (porMil < min) out.push(`Cite MAIS onde a afirmação vem da literatura: ${Math.round(porMil)} citações por mil palavras (alvo ${min}–${max}).`);
  }
  if (/^(resumo|abstract)/.test(k) && chavesNaSecao) out.push("Tire as citações do resumo (resumo ABNT não cita).");
  if (RE_1A_PESSOA.test(corpo)) out.push('Voz impessoal (ABNT): tire "nós", "nosso(a)", "eu" e verbos na 1ª pessoa.');
  const paras = corpo.replace(/^#{1,6}\s.*$/gm, "").split(/\n{2,}/).filter((p) => !/^(\||\$\$)/.test(p.trim()) && contarPalavras(p) >= 12);
  const media = paras.length ? paras.reduce((x, p) => x + contarPalavras(p), 0) / paras.length : 0;
  // faixa de parágrafo calibrada nas referências: revisão e TCC têm parágrafo mais longo que o artigo com dados
  const [pMin, pMax] = temDados ? [60, 115] : [70, 135];
  if (media > pMax) out.push(`Divida os parágrafos: média de ${Math.round(media)} palavras (alvo ${pMin}–${pMax}).`);
  if (paras.length >= 3 && media < pMin) out.push(`Junte parágrafos curtos: média de ${Math.round(media)} palavras (alvo ${pMin}–${pMax}).`);
  return out;
}

/**
 * QUANTO a seção está longe de entregável (0 = pronta). Mede o desvio de tamanho e de densidade de citação em relação à
 * faixa (normalizado pela largura dela) e soma 1 por elemento obrigatório faltando. É o que decide se um ajuste MELHOROU a
 * seção — o ajuste que reduz citação de 64 pra 52 por mil (alvo ≤ 44) melhorou, mesmo sem zerar a pendência.
 */
export function distanciaDaSecao(titulo: string, corpo: string, ctx: { tipo: string; dados: string; visivel?: (corpo: string) => string }): number {
  const pend = pendenciasDaSecao(titulo, corpo, ctx);
  const temDados = !!ctx.dados.trim();
  const fora = (v: number, [a, b]: [number, number]) => (v < a ? (a - v) / (b - a) : v > b ? (v - b) / (b - a) : 0);
  let d = fora(contarPalavras(ctx.visivel ? ctx.visivel(corpo) : corpo), orcamentoDaSecao(titulo, ctx.tipo, temDados));
  const n = contarPalavras(corpo);
  const faixaCit = faixaDeCitacao(titulo, temDados);
  const nVis = contarPalavras(ctx.visivel ? ctx.visivel(corpo) : corpo);
  if (faixaCit && nVis > 150) d += fora((((corpo.match(/E\d+/g) ?? []).length) / nVis) * 1000, faixaCit);
  // os demais itens (subseção, tabela, equação, palavras-chave, voz, parágrafo) contam 1 cada
  d += pend.filter((x) => !/^(CONDENSE|APROFUNDE|Cite (MENOS|MAIS))/.test(x)).length;
  void n;
  return Math.round(d * 1000) / 1000;
}

/**
 * TABELA SÓ NOS RESULTADOS. Medido na avaliação: a tabela de dados do aluno saía repetida na introdução, no referencial e
 * nos resultados, todas como "Tabela 1". Fora de RESULTADOS/DISCUSSÃO a tabela é retirada — com a linha de título
 * ("Tabela N — …") e a de fonte ("Fonte: …") que a acompanham. Determinístico: instrução não segurou.
 */
export function semTabelaForaDosResultados(titulo: string, corpo: string): string {
  if (/resultado|discussao/.test(chaveSecao(titulo))) return corpo;
  const linhas = String(corpo ?? "").split("\n");
  const out: string[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]!.trim();
    if (l.startsWith("|")) continue;
    if (/^(#{1,6}\s*)?(\*\*)?(tabela|quadro)\s+\d+/i.test(l)) continue;
    if (/^(\*\*)?fonte:/i.test(l) && (out.length && (linhas[i - 1] ?? "").trim().startsWith("|") || (linhas[i - 2] ?? "").trim().startsWith("|"))) continue;
    out.push(linhas[i]!);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * A mesma fonte citada de novo no MESMO parágrafo sai na segunda vez (ABNT: cita-se onde a fonte entra; o resto do
 * parágrafo continua falando dela). Determinístico — pedido ao modelo, "cite menos" virava "escreva menos". Opera no texto
 * interno, com as chaves [E#]; grupo que fica vazio some.
 */
export function semCitacaoRepetida(corpo: string): string {
  return String(corpo ?? "").split(/(\n{2,})/).map((bloco) => {
    if (/^\s*(#|\||\$\$)/.test(bloco)) return bloco;
    const vistas = new Set<string>();
    return bloco.replace(/\[(E\d+(?:\s*[,;]\s*E?\d+)*)\]/g, (_m, dentro: string) => {
      const chaves = [...dentro.matchAll(/E?(\d+)/g)].map((x) => `E${x[1]}`);
      const novas = chaves.filter((k) => !vistas.has(k));
      chaves.forEach((k) => vistas.add(k));
      return novas.length ? `[${novas.join("][")}]` : "";
    }).replace(/ +([.,;:])/g, "$1").replace(/ {2,}/g, " ");
  }).join("");
}

/**
 * Parágrafo com mais de `max` palavras é partido na fronteira de frase mais perto do meio — sem reescrever nada.
 * Cabeçalho, tabela, equação e lista ficam intactos.
 */
export function dividirParagrafosLongos(corpo: string, max = 180): string {
  return String(corpo ?? "").split(/(\n{2,})/).map((bloco) => {
    const t = bloco.trim();
    if (!t || /^(#|\||\$\$|[-*] |\d+\. )/.test(t) || bloco.includes("\n#")) return bloco;
    const partir = (p: string): string[] => {
      if (contarPalavras(p) <= max) return [p];
      const frases = p.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý(])/);
      if (frases.length < 2) return [p];
      const total = contarPalavras(p);
      let acc = 0, corte = 1, melhor = Infinity;
      for (let i = 0; i < frases.length - 1; i++) {
        acc += contarPalavras(frases[i]!);
        const d = Math.abs(acc - total / 2);
        if (d < melhor) { melhor = d; corte = i + 1; }
      }
      return [...partir(frases.slice(0, corte).join(" ")), ...partir(frases.slice(corte).join(" "))];
    };
    return partir(bloco).join("\n\n");
  }).join("");
}
