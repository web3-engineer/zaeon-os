/**
 * lib/estudos/desbloqueioSkill.ts — o mesmo laço do desbloqueio da Forja/jornadas, mas para as SKILLS-curso
 * da vitrine (astropy, biopython, pandas, blender, …). Quando o aluno pega uma skill, a Sala de Estudos abre
 * o CHAT e a Zaeon começa a aula ativando a skill — em vez de deixar a tela nos estudos antigos.
 *
 * Itens de skill têm id `skill:<slug>` e `execucao: "agente"` (ver lib/estudos/vitrineSkills). O Aura do chat
 * tem a skill no cardápio (lib/agent/aura-harness registra `activate_skill`), então basta DISPARAR o turno.
 * `skillDoItem` é PURO (testável); o resto mora em window/localStorage, como os outros desbloqueios.
 */
export const EVT_ABRIR_SKILL = "zaeon:skill:abrir";
const CHAVE_PENDENTE = "zaeon.skill.pendente";
const PREFIXO = "skill:";

export type SkillPendente = { slug: string; titulo: string };

/** O {slug,titulo} da skill que um item da vitrine abre, ou null. Só itens `skill:<slug>`. PURA. */
export function skillDoItem(item: { id?: string; titulo?: string } | null | undefined): SkillPendente | null {
  if (!item?.id || !item.id.startsWith(PREFIXO)) return null;
  const slug = item.id.slice(PREFIXO.length).trim();
  if (!slug) return null;
  return { slug, titulo: (item.titulo || "").trim() || slug }; // título em branco cai no slug

}

/** Marca a skill como pendente (sobrevive à navegação) e avisa quem estiver ouvindo. No-op se null. */
export function marcarSkillPendente(skill: SkillPendente | null): void {
  if (!skill || typeof window === "undefined") return;
  try { localStorage.setItem(CHAVE_PENDENTE, JSON.stringify(skill)); } catch { /* storage bloqueado: o evento ainda avisa */ }
  window.dispatchEvent(new CustomEvent(EVT_ABRIR_SKILL, { detail: skill }));
}

/** Lê e LIMPA a skill pendente (o chat chama no mount). null = nada pendente. */
export function consumirSkillPendente(): SkillPendente | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CHAVE_PENDENTE);
    if (v) localStorage.removeItem(CHAVE_PENDENTE);
    return v ? (JSON.parse(v) as SkillPendente) : null;
  } catch {
    return null;
  }
}

/** A mensagem inicial que a Zaeon recebe pra começar a aula ativando a skill certa. PURA. */
export function primeiraMensagemDaSkill(skill: SkillPendente): string {
  return `Quero estudar "${skill.titulo}". Ative a skill ${skill.slug} (activate_skill) e comece a aula por ela, do começo.`;
}
