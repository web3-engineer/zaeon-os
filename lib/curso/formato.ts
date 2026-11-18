/**
 * lib/curso/formato.ts — o CONTRATO de um curso da vitrine. Puro.
 *
 * ────────────────────────── a correção do dono que manda aqui ──────────────────────────
 * O curso NÃO é gerado pela Zaeon no momento de exibir. Ele é AUTORADO (aqui no Claude, como as
 * skills) e a Zaeon só EXPÕE. Então a validação é 100% estática: o `curso.json` que acompanha a
 * skill carrega o curso inteiro, e o portão confere que ele está completo — sem nenhuma chamada de
 * modelo. É o que torna "passar na suíte = pronto para produção" verdadeiro: não há parte do curso
 * que só nasça em runtime e possa falhar depois do teste.
 *
 * (A Zaeon continua podendo CRIAR curso ao vivo — gerarAula/generateMap — e cuspir no mesmo
 * formato; isso é a "opção de criar lá", um caminho à parte, não o que o card de course precisa.)
 *
 * ────────────────────────── reuso, não reinvenção ──────────────────────────
 * Uma PROVA ou um DESAFIO de curso é um bloco de aula igual ao que um professor cria. Então a
 * validação de cada bloco é `buildQuestionBlock` de `lib/aulas/generateParse` — O MESMO código que
 * valida o bloco do professor. Um bloco que o player não saberia renderizar não entra num curso:
 * o validador é um só. E o tipo tem de ser AVALIÁVEL e PRONTO (`EVALUABLE_KINDS` ∩ `READY_BLOCKS`):
 * um curso pontua, então um "jogo da memória" (não avaliável) não serve de prova.
 */
import { buildQuestionBlock, type ParsedBlock } from "@/lib/aulas/generateParse";
import { EVALUABLE_KINDS, READY_BLOCKS } from "@/lib/aulas/blockTypes";

/** Pisos mínimos — um curso não é uma aula só, e um módulo não é um parágrafo. */
export const MIN_MODULOS = 2;
export const MIN_ESTUDO_CHARS = 280;
export const MIN_PROVA_BLOCOS = 2;

/** Os tipos de bloco que podem servir de prova/desafio: avaliáveis E prontos ponta-a-ponta. */
export const KINDS_DE_PROVA: ReadonlySet<string> = new Set(
  READY_BLOCKS.map((b) => b.kind).filter((k) => EVALUABLE_KINDS.has(k)),
);

/** O sandbox de um módulo: onde o aluno põe a mão. `none` = módulo sem prática de código. */
export const TIPOS_SANDBOX = ["python", "react", "none"] as const;
export type TipoSandbox = (typeof TIPOS_SANDBOX)[number];

/** Um bloco autorado: o tipo (kind de AULA_BLOCKS) e o conteúdo (a forma que `buildQuestionBlock` lê). */
export type BlocoAutorado = { kind: string; block: unknown };

export type Sandbox = {
  tipo: TipoSandbox;
  /** código inicial que o aluno recebe (vazio em `none`) */
  inicial?: string;
  /** o teste que diz se a prática passou (vazio em `none`) */
  teste?: string;
};

export type Modulo = {
  titulo: string;
  /** o conteúdo de estudo, em markdown — autorado, não gerado */
  estudo: string;
  /** a prova: blocos avaliáveis que o player corrige */
  prova: BlocoAutorado[];
  /** o desafio: um bloco mais difícil, o passo além da prova */
  desafio: BlocoAutorado;
  sandbox: Sandbox;
};

export type Curso = { modulos: Modulo[] };

/** O que falhou na validação, com o caminho até o ponto exato (ex.: "módulo 2 · prova[1]"). */
export type ProblemaCurso = { onde: string; motivo: string };

/** Um bloco autorado é válido se o MESMO validador do professor o aceita, e o kind serve de prova. */
export function blocoValido(b: BlocoAutorado): ParsedBlock | null {
  if (!b || typeof b.kind !== "string" || !KINDS_DE_PROVA.has(b.kind)) return null;
  // `buildQuestionBlock` lê uma STRING (a resposta do modelo); aqui o bloco já é objeto, então
  // serializamos para passar pelo mesmo caminho — a validação é idêntica à do professor.
  try {
    return buildQuestionBlock(JSON.stringify(b.block ?? {}), b.kind);
  } catch {
    return null;
  }
}

/** Lê e valida um `curso.json` já parseado. Devolve o curso tipado OU a lista de problemas. */
export function validarCurso(cru: unknown): { curso: Curso } | { problemas: ProblemaCurso[] } {
  const problemas: ProblemaCurso[] = [];
  const ruim = (onde: string, motivo: string) => problemas.push({ onde, motivo });

  const modulos = (cru as { modulos?: unknown })?.modulos;
  if (!Array.isArray(modulos)) {
    return { problemas: [{ onde: "curso", motivo: "falta a lista `modulos`" }] };
  }
  if (modulos.length < MIN_MODULOS) {
    ruim("curso", `tem ${modulos.length} módulo(s); um curso precisa de pelo menos ${MIN_MODULOS}`);
  }

  modulos.forEach((m: any, i: number) => {
    const tag = `módulo ${i + 1}`;
    if (typeof m?.titulo !== "string" || !m.titulo.trim()) ruim(tag, "sem título");
    if (typeof m?.estudo !== "string" || m.estudo.trim().length < MIN_ESTUDO_CHARS) {
      ruim(tag, `conteúdo de estudo curto (< ${MIN_ESTUDO_CHARS} caracteres) — um módulo ensina, não resume`);
    }

    const prova = Array.isArray(m?.prova) ? m.prova : [];
    if (prova.length < MIN_PROVA_BLOCOS) {
      ruim(`${tag} · prova`, `tem ${prova.length} bloco(s); a prova precisa de pelo menos ${MIN_PROVA_BLOCOS}`);
    }
    prova.forEach((b: BlocoAutorado, j: number) => {
      if (!blocoValido(b)) ruim(`${tag} · prova[${j}]`, `bloco inválido (kind "${b?.kind}") — não passa no validador do player`);
    });

    if (!m?.desafio) ruim(`${tag} · desafio`, "sem desafio — o passo além da prova");
    else if (!blocoValido(m.desafio)) ruim(`${tag} · desafio`, `desafio inválido (kind "${m.desafio?.kind}")`);

    const s = m?.sandbox;
    if (!s || !(TIPOS_SANDBOX as readonly string[]).includes(s.tipo)) {
      ruim(`${tag} · sandbox`, `tipo inválido: ${s?.tipo ?? "<ausente>"} (use ${TIPOS_SANDBOX.join(" | ")})`);
    } else if (s.tipo !== "none") {
      // sandbox de verdade precisa do código inicial E do teste que diz se passou.
      if (typeof s.inicial !== "string" || !s.inicial.trim()) ruim(`${tag} · sandbox`, "sem código inicial");
      if (typeof s.teste !== "string" || !s.teste.trim()) ruim(`${tag} · sandbox`, "sem teste — o sandbox tem de poder dizer se a prática passou");
    }
  });

  if (problemas.length) return { problemas };
  return { curso: cru as Curso };
}

/** Resumo para o card: quantos módulos, se tem prática de código, total de blocos de prova. */
export function resumoDoCurso(c: Curso): { modulos: number; comSandbox: number; blocosDeProva: number } {
  return {
    modulos: c.modulos.length,
    comSandbox: c.modulos.filter((m) => m.sandbox.tipo !== "none").length,
    blocosDeProva: c.modulos.reduce((n, m) => n + m.prova.length, 0),
  };
}
