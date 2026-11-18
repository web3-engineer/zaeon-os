/**
 * lib/forja/esqueletoResolver.ts — SERVIDOR: resolve um cursoId em um EsqueletoRepo, vindo do catálogo
 * CURADO da Forja (lib/forja/cursoRepo) OU de uma SKILL-CURSO de código da vitrine (astropy, pandas…).
 *
 * As skill-cursos não moram em `ESQUELETOS` (aquilo é puro, sem fs). Aqui a gente lê o `.claude/skills`,
 * monta um esqueleto on-the-fly a partir do card (título, subtítulo) + o `zaeon-repo`, e o board da Forja
 * passa a servir a skill igual a um curso curado — graphify roda no repo da skill. Só skill de MÓDULO
 * "board" (curso/procedimento-com-repo) vira esqueleto; o resto não tem repo e não abre board.
 *
 * Fica FORA de cursoRepo.ts de propósito: `fsDeDisco()` usa node:fs e quebraria no cliente. Só as rotas
 * /api/studio/forja* (runtime nodejs) importam este módulo.
 */
import { esqueletoPorId } from "./cursoRepo";
import type { EsqueletoRepo } from "./tipos";
import { carregarSkillsDaCasa, fsDeDisco, cardDaSkill } from "@/lib/agent/skills-dir";
import { moduloDaSkill } from "@/lib/estudos/moduloDoItem";

/** Esqueleto derivado de uma skill-curso de código (slug da pasta), ou undefined se ela não for board. */
export function esqueletoDaSkill(slug: string): EsqueletoRepo | undefined {
  const chave = slug.trim();
  if (!chave) return undefined;
  const s = carregarSkillsDaCasa(fsDeDisco()).skills.find((x) => x.manifest.name === chave);
  if (!s) return undefined;
  const card = cardDaSkill(s);
  if (!card || moduloDaSkill(card) !== "board" || !card.repo) return undefined; // só board tem repo
  return { id: chave, repo: card.repo, titulo: card.titulo, resumo: card.subtitulo, modo: "curso" };
}

/** Resolve um cursoId: primeiro o catálogo curado, depois as skill-cursos. undefined = não existe. */
export function resolverEsqueleto(pedido: string | null | undefined): EsqueletoRepo | undefined {
  const chave = String(pedido || "").trim();
  if (!chave) return esqueletoPorId(chave); // vazio → o fallback curado (exemplo), como antes
  return esqueletoPorId(chave) ?? esqueletoDaSkill(chave);
}
