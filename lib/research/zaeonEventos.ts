/** os sinais pra AVATAR do painel dos documentos (components/research/ZaeonDocumentos), sem acoplar os componentes:
 *  `detail` = true quando a resposta da IA começa a sair (ela escreve no holograma), false quando acaba */
export const EVT_ZAEON_ESCREVENDO = "zaeon:escrevendo";
/** avisa que a resposta começou/acabou — e deixa o estado num global, pra quem montar no meio de uma resposta saber */
export function avisarEscrevendo(v: boolean) {
  (globalThis as { __zaeonGerando?: boolean }).__zaeonGerando = v;
  window.dispatchEvent(new CustomEvent(EVT_ZAEON_ESCREVENDO, { detail: v }));
}
export const gerandoAgora = () => !!(globalThis as { __zaeonGerando?: boolean }).__zaeonGerando;

/** QUEM aparece no painel dos documentos (out/2026, o dono: "a troca de avatares deve ser feita mediante o padrão lá no
 *  topo superior esquerdo") — é o AGENTE do chat escolhido no seletor da sidebar (lib/agents/chatAgentes): Aura, Zenita
 *  ou Nina, cada uma com o seu corpo VRM (lib/cyber/estiloAvatar → CORPOS_VRM). O Octa Code não tem avatar (null). */
export type PersonaId = "aura" | "zenita" | "nina";
export const PERSONAS: readonly { id: PersonaId; nome: string }[] = [
  { id: "aura", nome: "Aura" },
  { id: "zenita", nome: "Zenita" },
  { id: "nina", nome: "Nina" },
];
/** o agente do chat → a persona do painel (null = sem avatar: o Octa Code, ou qualquer outro) */
// agente da orquestra (orq-*) fala com a voz — e o avatar — da Aura
export const personaDoAgente = (agente: unknown): PersonaId | null =>
  PERSONAS.find((p) => p.id === agente)?.id ?? (typeof agente === "string" && agente.startsWith("orq-") ? PERSONAS.find((p) => p.id === "aura")?.id ?? null : null);
export const nomeDaPersona = (id: PersonaId) => PERSONAS.find((p) => p.id === id)?.nome ?? "Aura";
/** `detail` = a PersonaId do agente escolhido, ou null */
export const EVT_PERSONA = "zaeon:persona";
/** onde o lab guarda o agente escolhido (app/research-lab/page) */
export const CHAVE_AGENTE = "zaeon.lab.agente";

export function personaSalva(): PersonaId | null {
  try { const a = localStorage.getItem(CHAVE_AGENTE); return a === null ? "aura" : personaDoAgente(a); } catch { return "aura"; }
}
/** o seletor da sidebar trocou de agente: avisa o painel */
export function avisarPersona(agente: string) {
  window.dispatchEvent(new CustomEvent(EVT_PERSONA, { detail: personaDoAgente(agente) }));
}

/**
 * #756 · o MICROFONE do chat e a avatar. Com a avatar 3D desenhando na tela, o microfone ficava "Ouvindo…" e não
 * trazia texto (Edge e Chrome); com o painel dela recolhido, funcionava na hora. Então, ao ligar o microfone, a avatar
 * faz a pose de PENSATIVA e CONGELA (para de desenhar) — e só depois o microfone liga; ao desligar, ela volta.
 *
 * `detail.ligado` diz o que aconteceu; quem congela (ZaeonDocumentos) põe em `detail.esperar` uma promessa que
 * resolve quando ela já está parada. Sem avatar na tela, ninguém põe nada e o microfone liga na hora.
 */
export const EVT_ZAEON_MICROFONE = "zaeon:microfone";
export type DetalheMicrofone = { ligado: boolean; esperar: Promise<unknown>[] };
/** o teto da espera: a avatar travou ou demorou — o microfone liga mesmo assim */
export const TETO_ESPERA_AVATAR_MS = 1800;

export async function avisarMicrofone(ligado: boolean, teto = TETO_ESPERA_AVATAR_MS): Promise<void> {
  if (typeof window === "undefined") return;
  const detail: DetalheMicrofone = { ligado, esperar: [] };
  window.dispatchEvent(new CustomEvent<DetalheMicrofone>(EVT_ZAEON_MICROFONE, { detail }));
  if (!ligado || !detail.esperar.length) return;
  await Promise.race([Promise.allSettled(detail.esperar), new Promise((r) => setTimeout(r, teto))]);
}
