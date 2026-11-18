/**
 * lib/guia/comportamentos/ociosidade.ts — o PRIMEIRO comportamento do guia: o movimento travou.
 *
 * Enquanto o aluno está EM MOVIMENTO (estudando, praticando) e de repente para por tempo demais, a Zaeon
 * aparece pra retomar. Só em movimento: numa PAUSA entre objetivos o silêncio é de propósito (descanso), e
 * PARADO é antes de começar — não cutuca quem ainda nem entrou no ritmo.
 *
 * Cutuca UMA vez por episódio de ociosidade: quando o aluno volta a se mexer, o gatilho rearma.
 *
 * As falas default são NEUTRAS — servem a QUALQUER assunto (código, medicina, música...). Quem quiser falas
 * temáticas passa `opts.falas` (ex.: o ForjaView passa falas de código). NÃO ponha falas de um domínio
 * específico neste default: este comportamento é reusado por todo caderno/curso, e uma fala musical já vazou
 * pra cursos de código (bug: a Zaeon falando "toca mais um trechinho 🎵" num curso de Pomodoro).
 */
import type { Comportamento, EstadoGuia, Nudge, Sinal } from "../tipos";

const FALAS = [
  "Ainda por aí? Bora retomar de onde parou.",
  "Travou? Sem crise: um passo de cada vez.",
  "Perdeu o fio? Volta pro ponto onde estava — devagar.",
  "Tô aqui quando quiser seguir.",
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
