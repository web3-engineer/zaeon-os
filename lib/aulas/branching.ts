/** Navegação do cenário ramificado (puro/testável). */
export type BranchNode = { id: string; content: string; choices: { label: string; nextId: string }[] };

export function startNodeId(nodes: BranchNode[]): string | null { return nodes[0]?.id ?? null; }
export function findNode(nodes: BranchNode[], id: string): BranchNode | null { return nodes.find((n) => n.id === id) ?? null; }
export function nextNodeId(nodes: BranchNode[], currentId: string, choiceIdx: number): string | null {
  const node = findNode(nodes, currentId);
  const nid = node?.choices?.[choiceIdx]?.nextId;
  return nid && findNode(nodes, nid) ? nid : null;
}
