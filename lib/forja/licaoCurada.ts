/**
 * lib/forja/licaoCurada.ts — a BASE CURADA de um curso (camada 0 do método em camadas). PURO.
 *
 * O conteúdo que ENSINA de verdade já existe ao lado de cada skill: o `curso.json` (família `course`)
 * traz `modulos[]` com `estudo` (a lição), `prova` (quiz com gabarito), `desafio` e `sandbox` (teste).
 * Aqui a gente normaliza esse JSON cru numa `ArvoreEntendimento` (os módulos viram ramos, o `estudo`
 * vira o resumo da lição) + um mapa lateral `licoesPorNo` com as provas/sandbox — sem poluir o contrato
 * dos engines em `tipos.ts`. Na falta do `curso.json`, `arvoreDoCorpoSkill` quebra o corpo do SKILL.md
 * em seções, pra a skill ensinar algo mesmo sem conteúdo estruturado.
 *
 * NADA aqui toca disco: recebe o JSON/texto já lido (o leitor de disco é `conteudoCurado.ts`, server).
 */
import type { ArvoreEntendimento, NoEntendimento, Temperatura } from "./tipos";

// ─────────────────────────── a lição curada (quiz + sandbox) ───────────────────────────

export type OpcaoProva = { texto: string; correta: boolean; explicacao?: string };
export type QuestaoProva =
  | { tipo: "escolha"; enunciado: string; opcoes: OpcaoProva[]; pontos?: number }
  | { tipo: "escrita"; enunciado: string; aceitas: string[]; pontos?: number };
export type SandboxCurado = { linguagem: string; inicial: string; teste: string };

/** Tudo que o board precisa pra ENSINAR um nó, sem inventar nada. */
export type LicaoCurada = {
  estudo: string;
  prova: QuestaoProva[];
  desafio?: QuestaoProva;
  sandbox?: SandboxCurado;
};

// ─────────────────────────── shape CRU do curso.json (no disco) ───────────────────────────

type ProvaCrua = { kind?: string; block?: Record<string, unknown> } | undefined;
type ModuloCru = {
  titulo?: string;
  estudo?: string;
  prova?: ProvaCrua[];
  desafio?: ProvaCrua;
  sandbox?: { tipo?: string; inicial?: string; teste?: string };
};
export type CursoJsonCru = { modulos?: ModuloCru[] };

const num = (x: unknown): number | undefined => (typeof x === "number" && Number.isFinite(x) ? x : undefined);

/** Normaliza uma questão crua (q-choice | q-written) do curso.json. Devolve null se malformada. PURA. */
export function questaoDoCru(p: ProvaCrua): QuestaoProva | null {
  const b = p?.block as Record<string, unknown> | undefined;
  if (!b || typeof b.text !== "string") return null;
  if (p?.kind === "q-choice" && Array.isArray(b.options)) {
    const opcoes = (b.options as unknown[])
      .filter((o): o is Record<string, unknown> => !!o && typeof (o as Record<string, unknown>).text === "string")
      .map((o) => ({
        texto: o.text as string,
        correta: !!o.isCorrect,
        ...(typeof o.explanation === "string" ? { explicacao: o.explanation } : {}),
      }));
    if (!opcoes.length) return null;
    return { tipo: "escolha", enunciado: b.text, opcoes, ...(num(b.marks) !== undefined ? { pontos: num(b.marks) } : {}) };
  }
  if (p?.kind === "q-written" && Array.isArray(b.accepted)) {
    const aceitas = (b.accepted as unknown[]).filter((x): x is string => typeof x === "string");
    return { tipo: "escrita", enunciado: b.text, aceitas, ...(num(b.marks) !== undefined ? { pontos: num(b.marks) } : {}) };
  }
  return null;
}

const NIVEIS: Temperatura[] = ["basico", "basico", "medio", "medio", "avancado", "avancado"];
const nivelDe = (i: number): Temperatura => NIVEIS[i] ?? "avancado";

/**
 * Constrói a árvore curada + o mapa de lições a partir do curso.json JÁ PARSEADO. PURA.
 * Cada módulo vira um ramo (resumo = o texto do `estudo`), e sua prova/sandbox vão pro `licoesPorNo`.
 * Devolve null se não houver módulo nenhum (aí o chamador tenta o fallback do corpo).
 */
export function arvoreELicoesDeCurso(
  cru: CursoJsonCru,
  titulo: string,
  resumo = "",
): { arvore: ArvoreEntendimento; licoesPorNo: Record<string, LicaoCurada> } | null {
  const mods = Array.isArray(cru?.modulos) ? cru.modulos : [];
  if (!mods.length) return null;
  const licoesPorNo: Record<string, LicaoCurada> = {};
  const filhos: NoEntendimento[] = mods.map((m, i) => {
    const id = `mod:${i}`;
    const estudo = String(m.estudo || "").trim();
    const prova = (Array.isArray(m.prova) ? m.prova : []).map(questaoDoCru).filter((q): q is QuestaoProva => q !== null);
    const desafio = questaoDoCru(m.desafio) ?? undefined;
    const sb = m.sandbox;
    const sandbox: SandboxCurado | undefined =
      sb && (sb.inicial || sb.teste) ? { linguagem: String(sb.tipo || "texto"), inicial: String(sb.inicial || ""), teste: String(sb.teste || "") } : undefined;
    licoesPorNo[id] = { estudo, prova, ...(desafio ? { desafio } : {}), ...(sandbox ? { sandbox } : {}) };
    return { id, titulo: String(m.titulo || `Módulo ${i + 1}`), resumo: estudo, desde: nivelDe(i), refs: [], filhos: [] };
  });
  return { arvore: { raiz: { id: "raiz", titulo, resumo, desde: "basico", refs: [], filhos } }, licoesPorNo };
}

// ─────────────────────────── fallback: corpo do SKILL.md em seções ───────────────────────────

const SECAO_IGNORADA = /^(o que esta skill n[aã]o faz|licen[cç]a|cr[eé]dito|refer[eê]ncias?)/i;

/**
 * Sem `curso.json`, usa o corpo do SKILL.md: cada seção `## ` vira um módulo (resumo = o texto dela).
 * Menos rico que o curso.json (sem prova/sandbox), mas ensina — nunca uma raiz solitária. PURA.
 */
export function arvoreDoCorpoSkill(corpo: string, titulo: string, resumo = ""): ArvoreEntendimento | null {
  const secoes: { titulo: string; linhas: string[] }[] = [];
  let atual: { titulo: string; linhas: string[] } | null = null;
  for (const linha of String(corpo || "").split("\n")) {
    const h = /^##\s+(.+?)\s*$/.exec(linha);
    if (h) { atual = { titulo: h[1].trim(), linhas: [] }; secoes.push(atual); }
    else if (atual) atual.linhas.push(linha);
  }
  const uteis = secoes.filter((s) => s.titulo && !SECAO_IGNORADA.test(s.titulo)).slice(0, 8);
  if (!uteis.length) return null;
  const filhos: NoEntendimento[] = uteis.map((s, i) => ({
    id: `sec:${i}`,
    titulo: s.titulo,
    resumo: s.linhas.join("\n").trim(),
    desde: nivelDe(i),
    refs: [],
    filhos: [],
  }));
  return { raiz: { id: "raiz", titulo, resumo, desde: "basico", refs: [], filhos } };
}
