/**
 * lib/forja/abrirCurso.ts — o sinal de ABRIR UM CURSO DE CÓDIGO na ÁREA PRÓPRIA da Sala de Estudos
 * (não no chat, não no feed). A Sala (StudyRoomContent) escuta, troca pra aba "curso" e renderiza a
 * CursoCodigoView daquele cursoId. Vale pros cursos da Forja (forja:*) e pras skills-curso de código
 * (skill:* de módulo "board") — os dois viram board do mesmo jeito.
 */
export const EVT_ABRIR_CURSO = "zaeon:curso:abrir";

export type CursoAberto = { cursoId: string; titulo?: string };

export function abrirCurso(c: CursoAberto): void {
  if (typeof window === "undefined" || !c?.cursoId) return;
  window.dispatchEvent(new CustomEvent<CursoAberto>(EVT_ABRIR_CURSO, { detail: c }));
}

/** O cursoId de um item da vitrine que é CURSO DE CÓDIGO (forja:* ou skill:* de módulo "board"), ou null. PURA. */
export function cursoIdDoItem(item: { id?: string; modulo?: string } | null | undefined): string | null {
  if (!item?.id) return null;
  if (item.id.startsWith("forja:")) return item.id.slice("forja:".length) || null;         // curso OSS da Forja
  if (item.id.startsWith("skill:") && item.modulo === "board") return item.id.slice("skill:".length) || null; // skill-curso de código
  return null;
}
