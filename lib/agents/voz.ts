/**
 * lib/agents/voz.ts — a IDENTIDADE de um turno do harness.
 *
 * O harness foi escrito "em Aura": os prompts de raciocínio e de rascunho dizem "Você é a Aura"
 * em texto, e `HarnessOpts.transformarSystem` existe pra trocar isso sem mexer no harness (o canal
 * já usava: lib/canal/agent-turn.ts). O chat não usava — era por isso que mandar `agent:"zenita"`
 * não mudava a voz, só o rosto.
 *
 * Este módulo é o lugar ÚNICO dessa troca. Antes o regex vivia solto no canal; agora canal e chat
 * usam o mesmo, e `MARCA_DE_IDENTIDADE` é testada contra os prompts REAIS do harness — porque um
 * `replace` que não casa falha em silêncio: a resposta sai assinada por quem não é. É o tipo de
 * acoplamento que só é seguro se um teste o vigiar.
 */

/** O texto que os prompts do harness usam pra se identificar. Vigiado por lib/agents/voz.test.ts. */
export const MARCA_DE_IDENTIDADE = /Você é a Aura/g;

/**
 * A troca pra `HarnessOpts.transformarSystem`. `null` quando quem fala É a Aura — devolver
 * `undefined` em vez de uma função identidade mantém o caminho dela byte a byte igual ao de antes.
 */
export function vozDoTurno(nome: string): ((system: string) => string) | undefined {
  if (!nome.trim() || /^aura$/i.test(nome.trim())) return undefined;
  const assinatura = `\nIDENTIDADE DESTE TURNO: você é ${nome} (não a Aura). Mantenha a voz e o nome de ${nome} em toda a resposta.`;
  return (system: string) => system.replace(MARCA_DE_IDENTIDADE, `Você é ${nome}`) + assinatura;
}
