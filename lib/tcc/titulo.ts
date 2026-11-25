/**
 * #873 PR 4: o TÍTULO que o aluno vê. "Gera um artigo sobre a Lei do Inquilinato" virava a aba "a Lei do
 * Inquilinato": sem o artigo do começo e com a 1ª letra maiúscula, "Lei do Inquilinato". O tema (o que vai pra
 * geração) não muda — só o nome do documento. PURO.
 */
export function tituloDoTema(tema: string): string {
  const limpo = String(tema ?? "").trim().replace(/^(?:o|a|os|as|um|uma)\s+(?=\S)/i, "");
  return limpo ? limpo.charAt(0).toLocaleUpperCase("pt-BR") + limpo.slice(1) : String(tema ?? "");
}
