/**
 * lib/estudos/desbloqueioEstudo.ts — o laço do desbloqueio das SKILLS/CURSOS da vitrine, agora
 * MODULAR. Quando o aluno pega um card, a Sala de Estudos ABRE o módulo certo — mas só os que de fato
 * abrem algo:
 *
 *   · "board"  → board da Forja (graphify + cards + repo) do curso de código. ABRE.
 *   · "device" → painel de download + instruções do app de dispositivo. ABRE.
 *   · "agente" → NÃO abre nada: a skill já está no cardápio da Aura (activate_skill), disponível VIA
 *                PROMPT. Cuspir uma mensagem "comece a aula" era tosco — o aluno invoca quando quiser,
 *                com as próprias palavras. Por isso `estudoDoItem` devolve null pra agente.
 *
 * Substitui o desbloqueioSkill (que mandava TODA skill pro chat — o erro do #803). `estudoDoItem` é
 * PURO (testável); o resto mora em window/localStorage, como os outros desbloqueios. O módulo já vem
 * decidido no `ItemVitrine.modulo` (lib/estudos/moduloDoItem), então aqui é só transportar.
 */
import type { ItemVitrine } from "@/lib/estudos/vitrine";
import type { ModuloEstudo } from "@/lib/estudos/moduloDoItem";

export const EVT_ABRIR_ESTUDO = "zaeon:estudo:abrir";
const CHAVE_PENDENTE = "zaeon.estudo.pendente";
const PREFIXO = "skill:";

/** Só os módulos que ABREM algo na sala entram como pendente. "agente" fica disponível via prompt. */
export type ModuloQueAbre = Extract<ModuloEstudo, "board" | "device">;
export type EstudoPendente = { modulo: ModuloQueAbre; slug: string; titulo: string };

/**
 * O estudo pendente que um item da vitrine ABRE, ou null. Só itens de skill da casa (`skill:<slug>`) de
 * módulo "board"/"device"; "agente" devolve null de propósito (a skill já está disponível via prompt,
 * nada a abrir). PURA.
 */
export function estudoDoItem(item: Pick<ItemVitrine, "id" | "titulo" | "modulo"> | null | undefined): EstudoPendente | null {
  if (!item?.id || !item.id.startsWith(PREFIXO)) return null;
  if (item.modulo !== "board" && item.modulo !== "device") return null; // agente = disponível via prompt, não abre
  const slug = item.id.slice(PREFIXO.length).trim();
  if (!slug) return null;
  return { modulo: item.modulo, slug, titulo: (item.titulo || "").trim() || slug };
}

/** Marca o estudo como pendente (sobrevive à navegação) e avisa a Sala. No-op se null. */
export function marcarEstudoPendente(estudo: EstudoPendente | null): void {
  if (!estudo || typeof window === "undefined") return;
  try { localStorage.setItem(CHAVE_PENDENTE, JSON.stringify(estudo)); } catch { /* storage bloqueado: o evento ainda avisa */ }
  window.dispatchEvent(new CustomEvent(EVT_ABRIR_ESTUDO, { detail: estudo }));
}

/** Lê e LIMPA o estudo pendente (a Sala chama no mount). null = nada pendente. */
export function consumirEstudoPendente(): EstudoPendente | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CHAVE_PENDENTE);
    if (v) localStorage.removeItem(CHAVE_PENDENTE);
    return v ? (JSON.parse(v) as EstudoPendente) : null;
  } catch {
    return null;
  }
}
