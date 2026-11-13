/**
 * lib/octa/ideNav.ts — a navegação para a IDE do Octa, numa fonte só (client-safe, sem IO).
 *
 * A aba "octa" não abre por `?tab=` nem por `setActiveTab` (o research-lab só a abre via o agente da
 * IDE). Então quem está noutra parte do laboratório (ex.: o cartão do Blueprint REA) abre a IDE num
 * projeto específico assim: grava o id do projeto em `CHAVE_ULTIMO_PROJETO` (de onde a IDE faz boot)
 * e dispara `EVT_ABRIR_PROJETO`, que o research-lab escuta para trocar para a aba da IDE.
 */
export const CHAVE_ULTIMO_PROJETO = "zaeon.octa.projeto.ultimo";
/**
 * Handoff CRU, de uso único: o id do projeto que a IDE deve abrir ASSIM QUE montar.
 * Por que uma chave separada e NÃO a `CHAVE_ULTIMO_PROJETO`: a IDE guarda o "último projeto" com
 * ESCOPO DE CONTA (zaeon.conta.<id>.…) — se gravássemos a chave crua, ela nunca seria lida, e a IDE
 * abria o projeto antigo (o bug: "abrir no Octa cai num repo qualquer, sem contexto"). Esta chave é
 * lida e apagada direto no window.localStorage (sem escopo), nos dois lados, então sempre casa.
 */
export const CHAVE_ABRIR_PENDENTE = "zaeon.octa.abrir.pendente";
export const EVT_ABRIR_PROJETO = "zaeon:octa:abrir-projeto";

/** Pede ao laboratório para abrir a IDE JÁ NESTE projeto. Só no cliente.
 *  - grava o id num handoff cru de uso único (pra IDE que ainda vai montar ler no boot);
 *  - dispara o evento com o projetoId (pra IDE já montada abrir na hora, e pro lab trocar de aba). */
export function abrirProjetoNaOcta(projetoId: string): void {
  if (typeof window === "undefined" || !projetoId) return;
  try { window.localStorage.setItem(CHAVE_ABRIR_PENDENTE, projetoId); } catch { /* storage bloqueado: o evento ainda abre a IDE já montada */ }
  window.dispatchEvent(new CustomEvent(EVT_ABRIR_PROJETO, { detail: { projetoId } }));
}

/** Lê e APAGA o handoff pendente (uso único). A IDE chama isto no boot. Cru de propósito. */
export function consumirAberturaPendente(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CHAVE_ABRIR_PENDENTE);
    if (v) window.localStorage.removeItem(CHAVE_ABRIR_PENDENTE);
    return v || null;
  } catch { return null; }
}
