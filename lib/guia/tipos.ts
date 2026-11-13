/**
 * lib/guia/tipos.ts — o vocabulário do GUIA da Zaeon na Sala de Estudos. PURO (sem React, sem IO).
 *
 * A ideia-mãe, que o dono deu: "música é movimento". Um ciclo de estudo é MOVIMENTO contínuo até um
 * OBJETIVO, e então uma PAUSA antes do próximo. O guia observa SINAIS do aluno (ele tocou, digitou,
 * colou, alcançou um objetivo…) e um relógio, mantém esse estado de movimento, e deixa COMPORTAMENTOS
 * plugáveis decidirem quando a Zaeon deve falar — um NUDGE, que a UI mostra num balão de quadrinhos.
 *
 * Fundação modular de propósito: o primeiro comportamento é só a ociosidade (o movimento travou). Os
 * próximos (distinguir quem digita de quem cola, celebrar um objetivo, puxar a próxima canção) entram
 * como novos Comportamentos, sem tocar no motor.
 */

/** De onde veio a atividade do aluno. É a semente da "variedade de comportamento" (digitou ≠ colou). */
export type FonteAtividade = "digitou" | "colou" | "tocou" | "clicou" | "ouviu" | "rolou";

/** Um sinal que chega ao guia. `tick` é o relógio interno; o resto vem da página/aluno. */
export type Sinal =
  | { tipo: "atividade"; fonte: FonteAtividade; em: number }
  | { tipo: "objetivo"; estado: "iniciou" | "alcancou"; id: string; em: number }
  | { tipo: "fase"; fase: string; em: number }
  | { tipo: "tick"; em: number };

/** O tom do balão — a UI pode colorir/animar diferente, e a voz pode mudar de entonação. */
export type TomNudge = "incentivo" | "dica" | "celebra" | "retomada";

/** O que a Zaeon diz num balão. `voz` = falar em voz alta (TTS). */
export type Nudge = {
  id: string;
  texto: string;
  tom: TomNudge;
  voz?: boolean;
  /** quando dois surgem no mesmo instante, o maior vence. Default 0. */
  prioridade?: number;
  em: number;
};

/** Onde o aluno está no ciclo: começou parado, entra em movimento, e pausa entre objetivos. */
export type Movimento = "parado" | "movimento" | "pausa";

/** O estado que o motor mantém e entrega aos comportamentos (já atualizado pelo sinal corrente). */
export type EstadoGuia = {
  /** a fase/módulo do plano de estudos em que o aluno está. */
  fase: string | null;
  /** o objetivo em curso (ex.: "tocar a Escala de Dó"). null durante uma pausa. */
  objetivoAtual: string | null;
  movimento: Movimento;
  /** timestamp da última atividade do aluno. */
  ultimaAtividade: number;
  /** o "agora" do sinal corrente (do relógio injetado). */
  agora: number;
};

/**
 * Um COMPORTAMENTO: recebe cada sinal com o estado JÁ atualizado e devolve os nudges a emitir (0+).
 * Deve ser determinístico (dá pra testar com sinais sintéticos). Guarda o próprio estado interno se
 * precisar (ex.: "já cutuquei nesta ociosidade?"), mas nunca o estado global — esse é do motor.
 */
export type Comportamento = {
  nome: string;
  aoSinal(sinal: Sinal, estado: EstadoGuia): Nudge[];
  /** opcional: avisado quando um nudge SEU foi de fato mostrado (pra não repetir). */
  aoMostrar?(nudge: Nudge): void;
};
