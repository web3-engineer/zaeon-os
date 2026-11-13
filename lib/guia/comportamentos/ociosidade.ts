/**
 * lib/guia/comportamentos/ociosidade.ts — o PRIMEIRO comportamento do guia: o movimento travou.
 *
 * "Música é movimento." Enquanto o aluno está EM MOVIMENTO (tocando, estudando) e de repente para por
 * tempo demais, a Zaeon aparece pra retomar. Só em movimento: numa PAUSA entre objetivos o silêncio é
 * de propósito (descanso), e PARADO é antes de começar — não cutuca quem ainda nem entrou no ritmo.
 *
 * Cutuca UMA vez por episódio de ociosidade: quando o aluno volta a se mexer, o gatilho rearma.
 */
import type { Comportamento, EstadoGuia, Nudge, Sinal } from "../tipos";

const FALAS = [
  "Ainda por aí? Bora tocar mais um trechinho 🎵",
  "A música pede movimento — retoma de onde parou?",
  "Perdeu o compasso? Sem crise: começa devagar de novo.",
  "Tô aqui quando quiser seguir. Um compasso de cada vez.",
];

export function ociosidade(opts?: { limiteMs?: number; falas?: string[] }): Comportamento {
  const limiteMs = opts?.limiteMs ?? 25_000;
  const falas = opts?.falas?.length ? opts.falas : FALAS;

  let ultimaAtividadeVista = -1;
  let cutucado = false; // já cutuquei NESTE episódio de ociosidade?
  let i = 0;            // rotação das falas

  return {
    nome: "ociosidade",
    aoSinal(_sinal: Sinal, estado: EstadoGuia): Nudge[] {
      // o aluno se mexeu desde a última vez? então um novo episódio pode cutucar de novo.
      if (estado.ultimaAtividade !== ultimaAtividadeVista) {
        ultimaAtividadeVista = estado.ultimaAtividade;
        cutucado = false;
      }
      if (estado.movimento !== "movimento") return [];
      if (cutucado) return [];
      if (estado.agora - estado.ultimaAtividade < limiteMs) return [];

      cutucado = true;
      const texto = falas[i % falas.length];
      i++;
      return [{ id: "ociosidade", texto, tom: "retomada", voz: true, prioridade: 1, em: estado.agora }];
    },
  };
}
