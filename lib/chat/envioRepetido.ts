/**
 * #873 PR 4 · MENSAGEM DUPLICADA. No teste de 24/11 a pergunta saiu duas vezes (dois balões iguais, duas respostas).
 * Enter duas vezes rápido, ou Enter + clique no ↑, antes do estado `sending` chegar ao componente. Aqui: a mesma frase
 * DIGITADA não sai de novo dentro de `JANELA_REPETIDO_MS` do envio anterior. PURO.
 */
export const JANELA_REPETIDO_MS = 3000;
export type UltimoEnvio = { texto: string; em: number } | null;

export function ehEnvioRepetido(ultimo: UltimoEnvio, texto: string, agora = Date.now()): boolean {
  if (!ultimo) return false;
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  return norm(ultimo.texto) === norm(texto) && agora - ultimo.em < JANELA_REPETIDO_MS;
}
