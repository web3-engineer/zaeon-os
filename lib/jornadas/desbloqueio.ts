/**
 * lib/jornadas/desbloqueio.ts — o LAÇO FINAL (P4): quando o aluno desbloqueia o card de música, o
 * Caderno de Ritmo passa a ESPERAR por ele na Sala de Estudos, sem precisar digitar nada.
 *
 * Era o problema que começou a reforma: "ao comprar o curso, caio na sala vazia, sem conteúdo à minha
 * espera". Aqui a vitrine MARCA o caderno pendente ao plugar o card; a Sala de Estudos CONSOME essa
 * marca (no mount ou pelo evento) e abre o caderno. Fonte da verdade continua curada (cadernoRitmo).
 *
 * `cadernoDoItem` é PURO (testável); o resto é guardado em `window`/localStorage.
 */

export const EVT_ABRIR_CADERNO = "zaeon:caderno:abrir";
const CHAVE_PENDENTE = "zaeon.caderno.pendente";

/** o id do Caderno que um item da vitrine desbloqueia, ou null (item que não é jornada de música). */
export function cadernoDoItem(item: { id?: string; tags?: string[] } | null | undefined): string | null {
  if (!item) return null;
  if (item.id === "skill:musescore-partituras") return "ritmo";
  const tags = (item.tags ?? []).map((t) => String(t).toLowerCase());
  if (tags.includes("musescore") || tags.includes("partitura")) return "ritmo";
  return null;
}

/** Marca o caderno como pendente (sobrevive à navegação) e avisa quem já estiver ouvindo. No-op se id null. */
export function marcarCadernoPendente(cadernoId: string | null): void {
  if (!cadernoId || typeof window === "undefined") return;
  try { localStorage.setItem(CHAVE_PENDENTE, cadernoId); } catch { /* storage bloqueado: o evento ainda avisa */ }
  window.dispatchEvent(new CustomEvent(EVT_ABRIR_CADERNO, { detail: cadernoId }));
}

/** Lê e LIMPA o caderno pendente (a Sala de Estudos chama no mount). null = nada pendente. */
export function consumirCadernoPendente(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CHAVE_PENDENTE);
    if (v) localStorage.removeItem(CHAVE_PENDENTE);
    return v || null;
  } catch {
    return null;
  }
}
