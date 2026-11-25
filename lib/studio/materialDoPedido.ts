/**
 * #873 PR 3 (parte 2) · o GUIA DE ESTUDO (e FAQ, flashcards, linha do tempo) não contradiz a resposta.
 *
 * No teste do resumo (D5), a Aura resumiu o PDF certo e, logo abaixo, o "Guia de estudo" automático dizia "o documento
 * não foi detalhado, não há como resumir". O guia nascia de um estudo NOVO e vazio, só com o TÍTULO — ele nunca via o
 * PDF nem a resposta. Agora, sem estudo com conteúdo, ele parte da EXPLICAÇÃO que o aluno acabou de ler (o mesmo que o
 * diagrama e o mapa mental já recebiam). PURO.
 */
export const MAX_CONTEXTO_MATERIAL = 12_000;

export function materialDoPedido(i: { textoDoEstudo?: string; topic?: string; contexto?: string }): { material: string; doTopico: boolean } {
  const estudo = (i.textoDoEstudo ?? "").trim();
  if (estudo) return { material: estudo, doTopico: false };
  const topic = (i.topic ?? "").trim();
  const contexto = (i.contexto ?? "").trim().slice(0, MAX_CONTEXTO_MATERIAL);
  if (contexto) {
    return {
      material: (topic ? `Tópico pedido na conversa: ${topic}\n\n` : "") +
        "A explicação que o aluno acabou de ler na conversa (o material deve concordar com ela; não diga que falta " +
        `conteúdo se ela tem o conteúdo):\n${contexto}`,
      doTopico: true,
    };
  }
  return { material: topic ? `Tópico pedido na conversa: ${topic}` : "", doTopico: !!topic };
}
