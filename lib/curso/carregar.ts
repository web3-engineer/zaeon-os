/**
 * lib/curso/carregar.ts — lê o `curso.json` que acompanha uma skill de família "course".
 *
 * O curso mora ao lado da SKILL.md: `.claude/skills/<nome>/curso.json`. É conteúdo autorado (aqui,
 * no Claude), e viaja para produção junto com a skill — o `.dockerignore` e o `.gitignore` já
 * reincluem `.claude/skills/**`, então um .json dentro dessa pasta chega à imagem como o .md chega.
 *
 * O fs é injetável, como no loader de skills, para o teste exercitar curso ausente / JSON torto /
 * curso incompleto sem arquivos de mentira no repo.
 */
import { validarCurso, type Curso, type ProblemaCurso } from "@/lib/curso/formato";

export const ARQUIVO_CURSO = "curso.json";

export type LeitorDeCurso = {
  /** conteúdo de `.claude/skills/<pasta>/curso.json`, ou `null` se não existir */
  ler: (pasta: string) => string | null;
};

export type CursoCarregado =
  | { ok: true; curso: Curso }
  | { ok: false; problemas: ProblemaCurso[] };

/** Carrega e valida o curso de uma skill. NUNCA lança. */
export function carregarCurso(leitor: LeitorDeCurso, pasta: string): CursoCarregado {
  let cru: string | null;
  try {
    cru = leitor.ler(pasta);
  } catch (e: unknown) {
    return { ok: false, problemas: [{ onde: "curso", motivo: `falha ao ler: ${(e as Error)?.message ?? e}` }] };
  }
  if (cru === null) {
    return { ok: false, problemas: [{ onde: "curso", motivo: `família "course" sem ${ARQUIVO_CURSO}` }] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cru);
  } catch (e: unknown) {
    return { ok: false, problemas: [{ onde: "curso", motivo: `${ARQUIVO_CURSO} não é JSON válido: ${(e as Error)?.message ?? e}` }] };
  }

  const v = validarCurso(parsed);
  if ("problemas" in v) return { ok: false, problemas: v.problemas };
  return { ok: true, curso: v.curso };
}

/** O leitor de disco. Só servidor e teste chamam. */
export function leitorDeDisco(dir = ".claude/skills"): LeitorDeCurso {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const nodeFs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    ler: (pasta) => {
      const p = path.join(dir, pasta, ARQUIVO_CURSO);
      return nodeFs.existsSync(p) ? nodeFs.readFileSync(p, "utf8") : null;
    },
  };
}
