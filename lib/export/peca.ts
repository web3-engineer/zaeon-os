/**
 * #873 PR 4 · o EXPORT da PEÇA JURÍDICA. Petição, contrato e procuração não são trabalho acadêmico: não têm capa,
 * folha de rosto, resumo nem palavras-chave. O export da ABNT pedia instituição/cidade (a capa) e chamava a IA pra
 * escrever um resumo que não existe numa petição. Aqui a peça vai como está — as partes que ela já tem — e o
 * abnt-service monta no estilo "peca" (abnt-service/styles.py). PURO.
 */
export type SecaoExport = { type: string; title: string; content: string; subsections: { title: string; content: string }[] };

export function estruturaDaPeca(content: string, parsed?: SecaoExport[] | null) {
  const sections: SecaoExport[] = parsed?.length
    ? parsed
    : [{ type: "desenvolvimento", title: "", content: String(content ?? ""), subsections: [] }];
  return {
    resumo: "",
    // o modelo do serviço exige ao menos uma; o estilo "peca" não imprime
    palavras_chave: ["Peça jurídica"],
    abstract: "",
    keywords: [] as string[],
    sections,
    validation: { has_introduction: false, has_conclusion: false, has_references: false, warnings: [] as string[] },
  };
}
