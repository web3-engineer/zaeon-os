/**
 * lib/forja/desbloqueioForja.ts — o mesmo laço do desbloqueio das jornadas, para os estudos de REPOSITÓRIO
 * da Forja: quando o aluno pega um curso OSS da vitrine (grátis — código aberto não cobra), o board da
 * Forja daquele projeto passa a ESPERAR por ele na Sala de Estudos, sem precisar digitar nada.
 *
 * Os itens da vitrine desses cursos têm id `forja:<cursoId>` (ver lib/estudos/vitrine). `forjaDoItem` é
 * PURO (testável); o resto é guardado em window/localStorage, como o das jornadas.
 */
import { esqueletoPorId } from "./cursoRepo";

export const EVT_ABRIR_FORJA = "zaeon:forja:abrir";
const CHAVE_PENDENTE = "zaeon.forja.pendente";
const PREFIXO = "forja:";

/** o cursoId (esqueleto) que um item da vitrine desbloqueia, ou null. PURA. */
export function forjaDoItem(item: { id?: string; tags?: string[] } | null | undefined): string | null {
  if (!item?.id || !item.id.startsWith(PREFIXO)) return null;
  const cursoId = item.id.slice(PREFIXO.length);
  return esqueletoPorId(cursoId)?.id ?? null; // só abre se o curso existe no catálogo
}

/** Marca o curso como pendente (sobrevive à navegação) e avisa quem já estiver ouvindo. No-op se null. */
export function marcarForjaPendente(cursoId: string | null): void {
  if (!cursoId || typeof window === "undefined") return;
  try { localStorage.setItem(CHAVE_PENDENTE, cursoId); } catch { /* storage bloqueado: o evento ainda avisa */ }
  window.dispatchEvent(new CustomEvent(EVT_ABRIR_FORJA, { detail: cursoId }));
}

/** Lê e LIMPA o curso pendente (a Sala de Estudos chama no mount). null = nada pendente. */
export function consumirForjaPendente(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CHAVE_PENDENTE);
    if (v) localStorage.removeItem(CHAVE_PENDENTE);
    return v || null;
  } catch {
    return null;
  }
}
