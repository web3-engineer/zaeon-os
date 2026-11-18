/**
 * lib/cad/roteiro.ts — o PROMPT que faz o modelo escrever comandos de CAD, e nada além.
 *
 * Mora separado de `construir.ts` porque são responsabilidades diferentes e falham diferente: aqui
 * é texto (e o teste pode afirmá-lo sem modelo nenhum); lá é processo. Separado, dá pra mudar o
 * prompt sem tocar na orquestração, que é o que mais vai acontecer.
 *
 * O vocabulário abaixo é o do README do SolidCraft (handoff §2, "Um design é um JSON") — as quatro
 * formas do exemplo verificado. NÃO listamos o registro inteiro de comandos: ele é do SolidCraft,
 * muda com a versão dele, e copiá-lo aqui criaria uma segunda fonte da verdade que envelhece
 * calada. O modelo recebe a FORMA e um exemplo real; quem julga o conteúdo é o binário.
 */

export const SYSTEM_ROTEIRO = [
  "Você é um projetista mecânico que escreve roteiros para o kernel CAD paramétrico SolidCraft.",
  "Responda APENAS com JSON no formato {\"commands\":[{\"command\":\"...\",\"params\":{...}}]}.",
  "Modele UMA peça sólida, simples e didática. Sem texto, sem explicação, sem markdown.",
  "Todas as medidas em MILÍMETROS e numéricas — nunca strings, nunca expressões.",
  "Comece sempre por um esboço num plano, feche o perfil e extrude antes de qualquer acabamento.",
  "",
  "A forma do roteiro, verificada no SolidCraft 0.40:",
  JSON.stringify({
    commands: [
      { command: "sketch.create", params: { plane: "XY" } },
      { command: "sketch.rectangle.two_point", params: { p0: [0, 0], p1: [40, 30] } },
      { command: "solid.extrude", params: { distance: 20 } },
      { command: "solid.fillet", params: { edges: [[0, 0, 10]], radius: 3 } },
    ],
  }),
].join("\n");

/** O pedido. O tema vem do aluno; o resto é contorno pra peça caber numa aula. */
export function userRoteiro(tema: string): string {
  return [
    `Peça: ${tema}`,
    "",
    "Restrições:",
    "- uma peça só, entre 4 e 20 comandos;",
    "- dimensões plausíveis para a peça descrita, entre 1 mm e 2000 mm;",
    "- prefira o mais simples que ainda represente a peça: quem olha é um aluno, não uma fábrica.",
  ].join("\n");
}

/** O título do artefato. Curto, com o tema do aluno — não o nome do comando. */
export function tituloDaPeca(tema: string): string {
  const t = (tema || "").trim().replace(/\s+/g, " ");
  return `Peça — ${t.length > 60 ? `${t.slice(0, 57)}…` : t || "CAD"}`;
}
