/** Tema Caderno — tinta/papel. Mesmos valores do LoungeCartolina (uma fonte só). */
export const CADERNO = {
  tinta: "#3a2f1e",
  tintaSuave: "#6b5a3e",
  destaque: "#0e7490",
  papel: "#efe7d3",
  fonteCaligrafia: "'Snell Roundhand','Segoe Script','Brush Script MT',cursive",
} as const;
/** Cores que o LLM pode pedir — por NOME, nunca valor livre (nada de url()/expression no SVG). */
export const CORES = { tinta: CADERNO.tinta, suave: CADERNO.tintaSuave, destaque: CADERNO.destaque } as const;
export type Cor = keyof typeof CORES;
