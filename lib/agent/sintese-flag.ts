/**
 * lib/agent/sintese-flag.ts — a flag da F4, sozinha num módulo porque é lida em DOIS lados que não
 * devem se importar: o turno (lib/agent/runChatTurn, que decide a largura da consulta) e o
 * adaptador (lib/agent/aura-harness, que decide se a fase `reason` sintetiza).
 */
const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

/**
 * `HARNESS_SINTESE=1`: com 2+ documentos em jogo, a busca da base passa a cobrir TODO documento e a
 * fase `reason` vira uma síntese cruzada (o que convergem, onde divergem, o que ninguém cobre).
 *
 * OFF (padrão) = consulta top-k=8 plana e `reason` desligada no caminho elaborado, byte a byte como
 * hoje. Custo quando ligada: +1 chamada de modelo, e SÓ em turno com 2+ documentos.
 */
export function sinteseLigada(env: Record<string, string | undefined> = process.env): boolean {
  const f = env.HARNESS_SINTESE?.trim();
  return !!f && !DESLIGADO.test(f);
}
