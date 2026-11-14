/**
 * lib/estudos/desbloqueioEstudo.ts — o laço do desbloqueio das SKILLS/CURSOS da vitrine, agora
 * MODULAR. Quando o aluno pega um card, a Sala de Estudos abre o MÓDULO certo (não tudo no chat):
 *
 *   · "board"  → board da Forja (graphify + cards + repo) do curso de código.
 *   · "device" → painel de download + instruções do app de dispositivo.
 *   · "agente" → a Aura abre uma conversa NOVA e inicia a aula (ativando a skill).
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

export type EstudoPendente = { modulo: ModuloEstudo; slug: string; titulo: string };

/** O estudo pendente que um item da vitrine abre, ou null. Só itens de skill da casa (`skill:<slug>`). PURA. */
export function estudoDoItem(item: Pick<ItemVitrine, "id" | "titulo" | "modulo"> | null | undefined): EstudoPendente | null {
  if (!item?.id || !item.id.startsWith(PREFIXO) || !item.modulo) return null;
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

/** A mensagem inicial da aula no módulo "agente": pede a aula NOMEANDO a skill a ativar. PURA. */
export function primeiraMensagemDaEstudo(e: EstudoPendente): string {
  return `Quero estudar "${e.titulo}". Ative a skill ${e.slug} (activate_skill) e comece a aula por ela, do começo.`;
}
