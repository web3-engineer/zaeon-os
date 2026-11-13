/**
 * lib/guia/comportamentos/examinadora.ts — o comportamento da Zaeon EXAMINADORA nas lições da Forja.
 *
 * É a "variedade de comportamento" que o dono pediu depois da ociosidade: distinguir QUEM DIGITA de QUEM
 * COLA. No codebox a cola é bloqueada pela UI, mas uma TENTATIVA de colar ainda vira um sinal `colou` —
 * e aí a Zaeon aparece pra lembrar, com carinho, que é digitando que o dedo aprende. Quando o aluno
 * ALCANÇA o objetivo, ela celebra. Determinístico (testável com sinais sintéticos).
 *
 * Cutuca no máximo uma vez a cada `janelaMs` por tipo de evento, pra não virar tagarela.
 */
import type { Comportamento, EstadoGuia, Nudge, Sinal } from "../tipos";

const FALAS_COLA = [
  "Opa — aqui a gente digita, não cola 😄 É no dedo que fixa.",
  "Cola bloqueada de propósito: escreve você mesmo, uma linha de cada vez.",
  "Sei que dá preguiça, mas digitar é metade do aprendizado. Bora?",
];
const FALAS_CELEBRA = [
  "Isso! Objetivo alcançado ✦ Você escreveu de verdade.",
  "Mandou bem — e tudo digitado. É assim que gruda.",
];

export function examinadora(opts?: { janelaMs?: number }): Comportamento {
  const janelaMs = opts?.janelaMs ?? 8_000;
  let ultimaCola = -Infinity;
  let ultimaCelebra = -Infinity;
  let i = 0, j = 0;

  return {
    nome: "examinadora",
    aoSinal(sinal: Sinal, estado: EstadoGuia): Nudge[] {
      if (sinal.tipo === "atividade" && sinal.fonte === "colou") {
        if (estado.agora - ultimaCola < janelaMs) return [];
        ultimaCola = estado.agora;
        const texto = FALAS_COLA[i++ % FALAS_COLA.length];
        return [{ id: "exam-cola", texto, tom: "dica", voz: true, prioridade: 3, em: estado.agora }];
      }
      if (sinal.tipo === "objetivo" && sinal.estado === "alcancou") {
        if (estado.agora - ultimaCelebra < janelaMs) return [];
        ultimaCelebra = estado.agora;
        const texto = FALAS_CELEBRA[j++ % FALAS_CELEBRA.length];
        return [{ id: "exam-celebra", texto, tom: "celebra", voz: true, prioridade: 2, em: estado.agora }];
      }
      return [];
    },
  };
}
