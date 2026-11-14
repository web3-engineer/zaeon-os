/**
 * lib/forja/conteudoCurado.ts — SERVER: lê a BASE CURADA de um curso do disco (camada 0).
 *
 * Primeiro o `curso.json` ao lado do SKILL.md (família `course`: estudo/prova/sandbox reais); na falta
 * dele, o corpo do SKILL.md em seções. O resultado é a `ArvoreEntendimento` que o board renderiza SEM
 * depender do motor (graphify/understand) — estes só enriquecem por cima (camada 1). A lógica pura vive
 * em `licaoCurada.ts`; aqui só o acesso a disco, por isso só as rotas /api/studio/forja* importam.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ArvoreEntendimento, EsqueletoRepo } from "./tipos";
import { arvoreELicoesDeCurso, arvoreDoCorpoSkill, type CursoJsonCru, type LicaoCurada } from "./licaoCurada";
import { carregarSkillsDaCasa, fsDeDisco, DIR_SKILLS_CASA } from "@/lib/agent/skills-dir";

export type ConteudoCurado = { arvore: ArvoreEntendimento; licoesPorNo: Record<string, LicaoCurada> };

/**
 * A base curada de um esqueleto, ou null se não houver nenhuma (aí o curso depende só do motor).
 * `esq.id` casa com o slug da pasta da skill (`.claude/skills/<id>/`).
 */
export function conteudoCuradoDoCurso(esq: EsqueletoRepo): ConteudoCurado | null {
  const slug = String(esq?.id || "").trim();
  if (!slug) return null;

  // 1) curso.json autoral (estudo + prova + sandbox) — a base mais rica.
  const caminho = join(process.cwd(), DIR_SKILLS_CASA, slug, "curso.json");
  if (existsSync(caminho)) {
    try {
      const cru = JSON.parse(readFileSync(caminho, "utf8")) as CursoJsonCru;
      const r = arvoreELicoesDeCurso(cru, esq.titulo, esq.resumo);
      if (r) return r;
    } catch {
      /* JSON corrompido → cai no fallback do corpo */
    }
  }

  // 2) fallback: o corpo do SKILL.md em seções (ensina algo, mesmo sem conteúdo estruturado).
  try {
    const s = carregarSkillsDaCasa(fsDeDisco()).skills.find((x) => x.manifest.name === slug || x.pasta === slug);
    if (s?.corpo) {
      const arvore = arvoreDoCorpoSkill(s.corpo, esq.titulo, esq.resumo);
      if (arvore && (arvore.raiz.filhos?.length ?? 0) > 0) return { arvore, licoesPorNo: {} };
    }
  } catch {
    /* sem skill no disco → sem base curada */
  }
  return null;
}
