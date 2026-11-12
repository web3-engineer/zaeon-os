/**
 * lib/octa/ideNav.ts — a navegação para a IDE do Octa, numa fonte só (client-safe, sem IO).
 *
 * A aba "octa" não abre por `?tab=` nem por `setActiveTab` (o research-lab só a abre via o agente da
 * IDE). Então quem está noutra parte do laboratório (ex.: o cartão do Blueprint REA) abre a IDE num
 * projeto específico assim: grava o id do projeto em `CHAVE_ULTIMO_PROJETO` (de onde a IDE faz boot)
 * e dispara `EVT_ABRIR_PROJETO`, que o research-lab escuta para trocar para a aba da IDE.
 */
export const CHAVE_ULTIMO_PROJETO = "zaeon.octa.projeto.ultimo";
export const EVT_ABRIR_PROJETO = "zaeon:octa:abrir-projeto";

/** Pede ao laboratório para abrir a IDE já neste projeto. Só no cliente. */
export function abrirProjetoNaOcta(projetoId: string): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(CHAVE_ULTIMO_PROJETO, projetoId); } catch { /* storage bloqueado: o evento ainda troca de aba */ }
  window.dispatchEvent(new CustomEvent(EVT_ABRIR_PROJETO, { detail: { projetoId } }));
}
