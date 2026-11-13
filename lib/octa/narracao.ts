/**
 * lib/octa/narracao.ts — transforma os eventos de um turno do Octa numa frase curta pra Zaeon FALAR
 * (a voz da Octa, reusando useTTS → /api/ai/voice). PURO. A Octa é a casa do ENTREGÁVEL: ao fim de um
 * turno, a Zaeon conta em voz alta o que fez (escreveu N arquivos, publicou no GitHub, ou topou num erro).
 */
import { passosDoTurno, type EventoTurno } from "./passos";

/** Uma narração curta do que o turno fez, pra ler em voz alta. "" quando não há o que dizer. PURA. */
export function narracaoDoTurno(eventos: readonly EventoTurno[], status: string): string {
  const passos = passosDoTurno(eventos, true).filter((p) => p.tipo === "tool") as Array<Extract<ReturnType<typeof passosDoTurno>[number], { tipo: "tool" }>>;
  const gravados = new Set<string>();
  const apagados = new Set<string>();
  let publicou = false;
  let erro = status === "erro";
  for (const p of passos) {
    for (const a of p.arquivos) (a.acao === "apagado" ? apagados : gravados).add(a.path);
    if (p.estado === "falhou") erro = true;
    if (/publicar|publish|deploy|github/i.test(p.tool)) publicou = true;
  }
  if (erro) return "O Octa topou num erro nesse passo. Quer que eu tente de novo?";
  const partes: string[] = [];
  if (gravados.size) partes.push(`escrevi ${gravados.size} arquivo${gravados.size > 1 ? "s" : ""}`);
  if (apagados.size) partes.push(`removi ${apagados.size}`);
  if (publicou) partes.push("e publiquei no GitHub");
  if (!partes.length) return passos.length ? "Terminei o passo. Pode conferir." : "";
  return `Pronto: ${partes.join(", ")}. Dá uma olhada?`;
}
