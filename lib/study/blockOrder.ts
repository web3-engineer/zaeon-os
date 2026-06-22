/**
 * Helpers PUROS de ordem/navegação de blocos do caderno (editor B1.2). Sem DOM.
 */

export interface BlockRef {
  id: string;
  type: string;
}

/**
 * Id do bloco EDITÁVEL (type "note") imediatamente anterior a `id` na ordem do feed.
 * Usado pra mover o foco ao fundir com Backspace. null se não houver anterior editável.
 */
export function prevEditableId(blocks: BlockRef[], id: string): string | null {
  const i = blocks.findIndex((b) => b.id === id);
  if (i <= 0) return null;
  for (let k = i - 1; k >= 0; k--) {
    if (blocks[k].type === "note") return blocks[k].id;
  }
  return null;
}
