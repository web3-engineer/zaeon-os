/**
 * Layout PURO do mapa mental (sem DOM) → posições x/y dos nós e linhas, prontas
 * pra um SVG. Árvore em colunas por profundidade (raiz à esquerda, filhos à direita),
 * cada coluna centralizada verticalmente. Testável sem renderizar nada.
 */

export interface MmNode {
  id: string;
  label: string;
  parent: string | null;
}

export interface MmPositioned extends MmNode {
  x: number;
  y: number;
  depth: number;
}

export interface MmLink {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MmLayout {
  nodes: MmPositioned[];
  links: MmLink[];
  width: number;
  height: number;
}

export interface MmLayoutOpts {
  colGap?: number;
  rowGap?: number;
  nodeW?: number;
  nodeH?: number;
}

export function layoutMindmap(nodes: MmNode[], opts?: MmLayoutOpts): MmLayout {
  const colGap = opts?.colGap ?? 210;
  const rowGap = opts?.rowGap ?? 66;
  const nodeW = opts?.nodeW ?? 150;
  const nodeH = opts?.nodeH ?? 42;

  if (!nodes.length) return { nodes: [], links: [], width: nodeW, height: nodeH };

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depthCache = new Map<string, number>();
  const depthOf = (id: string, seen = new Set<string>()): number => {
    if (depthCache.has(id)) return depthCache.get(id)!;
    const n = byId.get(id);
    if (!n || n.parent == null || seen.has(id) || !byId.has(n.parent)) {
      depthCache.set(id, 0);
      return 0;
    }
    seen.add(id);
    const d = depthOf(n.parent, seen) + 1;
    depthCache.set(id, d);
    return d;
  };

  const cols = new Map<number, MmNode[]>();
  let maxDepth = 0;
  for (const n of nodes) {
    const d = depthOf(n.id);
    maxDepth = Math.max(maxDepth, d);
    if (!cols.has(d)) cols.set(d, []);
    cols.get(d)!.push(n);
  }
  const maxColSize = Math.max(...[...cols.values()].map((a) => a.length), 1);

  const positioned: MmPositioned[] = [];
  const posById = new Map<string, MmPositioned>();
  for (let d = 0; d <= maxDepth; d++) {
    const col = cols.get(d) || [];
    const offset = ((maxColSize - col.length) * rowGap) / 2; // centraliza a coluna
    col.forEach((n, i) => {
      const p: MmPositioned = {
        ...n,
        depth: d,
        x: d * colGap + nodeW / 2,
        y: offset + i * rowGap + nodeH / 2,
      };
      positioned.push(p);
      posById.set(n.id, p);
    });
  }

  const links: MmLink[] = positioned
    .filter((p) => p.parent != null && posById.has(p.parent))
    .map((p) => {
      const par = posById.get(p.parent as string)!;
      return { from: par.id, to: p.id, x1: par.x, y1: par.y, x2: p.x, y2: p.y };
    });

  return {
    nodes: positioned,
    links,
    width: maxDepth * colGap + nodeW,
    height: maxColSize * rowGap,
  };
}
