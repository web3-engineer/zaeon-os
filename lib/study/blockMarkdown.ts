/**
 * Atalhos de markdown do caderno (editor B1) — PURO, testável.
 *
 * Faz a escrita parecer livre sem mexer no modelo de blocos: digitar "# " no início
 * de um bloco de TEXTO o converte em Título (h1); "## "/"### "… vira Subtítulo (h2).
 * O wiring fica no editText do MeusEstudosFeed (só dispara quando o bloco ainda é texto).
 */

export type BlockVariant = "h1" | "h2" | "text";

/**
 * Detecta o atalho de cabeçalho no começo do texto.
 * "# x" → {h1, "x"} · "## x"/"### x" → {h2, "x"}. Sem espaço após os #, não converte.
 * Retorna null quando não há atalho.
 */
export function detectHeadingShortcut(text: string): { variant: "h1" | "h2"; text: string } | null {
  const m = /^(#{1,6})[ \t]+([\s\S]*)$/.exec(text ?? "");
  if (!m) return null;
  return { variant: m[1].length === 1 ? "h1" : "h2", text: m[2] };
}
