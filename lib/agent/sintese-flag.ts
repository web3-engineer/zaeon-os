/**
 * lib/agent/sintese-flag.ts — a flag da F4, sozinha num módulo porque é lida em DOIS lados que não
 * devem se importar: o turno (lib/agent/runChatTurn, que decide a largura da consulta) e o
 * adaptador (lib/agent/aura-harness, que decide se a fase `reason` sintetiza).
 */
const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

/**
 * Com 2+ documentos em jogo, a busca da base passa a cobrir TODO documento e a fase `reason` vira
 * uma síntese cruzada (o que convergem, onde divergem, o que ninguém cobre). Custo: +1 chamada de
 * modelo, e SÓ em turno com 2+ documentos.
 *
 * LIGADO POR PADRÃO (decisão do dono, 2026-11-03: "queremos tudo ON"); `HARNESS_SINTESE=0` é o
 * kill-switch e devolve a consulta top-k=8 plana com `reason` desligada no caminho elaborado.
 */
export function sinteseLigada(env: Record<string, string | undefined> = process.env): boolean {
  return !DESLIGADO.test(env.HARNESS_SINTESE?.trim() ?? "");
}
