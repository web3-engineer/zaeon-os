/**
 * lib/knowledge-tree/progresso.ts — o FLUXO DE LIÇÕES da Árvore Neuronal (PURO).
 *
 * Cada nó é uma lição; a ordem é a PRÉ-ORDEM da árvore (raiz primeiro). "Próxima lição" anda nessa
 * ordem pulando o que já foi concluído; ao chegar no fim, volta pra primeira pendente; com tudo
 * concluído devolve null (a árvore está completa).
 */
import type { IndiceArvore, NoArvore } from "./tipos";

/** Indexa a árvore uma vez. Ids repetidos: vale o primeiro (o segundo é ignorado com os filhos). */
export function indexar(raiz: NoArvore): IndiceArvore {
  const porId = new Map<string, NoArvore>();
  const pai = new Map<string, string | null>();
  const profundidade = new Map<string, number>();
  const ordem: string[] = [];
  const descendentes = new Map<string, string[]>();
  let grauMax = 0;
  const andar = (n: NoArvore, p: string | null, d: number): string[] => {
    if (porId.has(n.id)) return [];
    porId.set(n.id, n); pai.set(n.id, p); profundidade.set(n.id, d); ordem.push(n.id);
    if (typeof n.grau === "number" && Number.isFinite(n.grau)) grauMax = Math.max(grauMax, n.grau);
    const desc: string[] = [];
    for (const f of n.filhos || []) {
      if (porId.has(f.id)) continue;
      desc.push(f.id, ...andar(f, n.id, d + 1));
    }
    descendentes.set(n.id, desc);
    return desc;
  };
  andar(raiz, null, 0);
  return { raiz, porId, pai, profundidade, ordem, descendentes, grauMax };
}

/** Os filhos (válidos, já indexados) de um nó. */
export function filhosDe(idx: IndiceArvore, id: string): string[] {
  const n = idx.porId.get(id);
  if (!n) return [];
  return (n.filhos || []).map((f) => f.id).filter((fid) => idx.pai.get(fid) === id);
}

/**
 * A próxima lição depois de `r`: a primeira NÃO concluída depois dele na ordem; senão a primeira não
 * concluída de todas (menos o próprio r); senão null (árvore completa).
 */
export function proximaDe(idx: IndiceArvore, r: string, concluidas: ReadonlySet<string>): string | null {
  const i = idx.ordem.indexOf(r);
  for (let k = i + 1; k < idx.ordem.length; k++) if (!concluidas.has(idx.ordem[k]!)) return idx.ordem[k]!;
  for (const id of idx.ordem) if (id !== r && !concluidas.has(id)) return id;
  return null;
}

/** Fração concluída da subárvore ABAIXO do nó (descendentes, sem ele mesmo). 0 sem descendentes. */
export function frac(idx: IndiceArvore, id: string, concluidas: ReadonlySet<string>): number {
  const d = idx.descendentes.get(id) ?? [];
  if (!d.length) return 0;
  let feitas = 0;
  for (const x of d) if (concluidas.has(x)) feitas++;
  return feitas / d.length;
}

/** "x/y dentro": concluídas e total de descendentes. */
export function contagemDentro(idx: IndiceArvore, id: string, concluidas: ReadonlySet<string>): { feitas: number; total: number } {
  const d = idx.descendentes.get(id) ?? [];
  let feitas = 0;
  for (const x of d) if (concluidas.has(x)) feitas++;
  return { feitas, total: d.length };
}

/** O caminho raiz → id (inclusive). Vazio se o id não está na árvore. */
export function caminhoAte(idx: IndiceArvore, id: string): string[] {
  if (!idx.porId.has(id)) return [];
  const cam: string[] = [];
  let cur: string | null | undefined = id;
  while (cur != null) { cam.unshift(cur); cur = idx.pai.get(cur); }
  return cam;
}

/** Abre SÓ o caminho até `alvo` (e o próprio alvo); recolhe o resto. */
export function expandirCaminho(idx: IndiceArvore, alvo: string): Set<string> {
  const s = new Set(caminhoAte(idx, alvo));
  s.add(idx.raiz.id);
  return s;
}

/** Visão geral: expande todo nó que tem progresso (concluído ou com algo concluído dentro), e o caminho até ele. */
export function visaoGeral(idx: IndiceArvore, concluidas: ReadonlySet<string>): Set<string> {
  const s = new Set<string>([idx.raiz.id]);
  for (const id of idx.ordem) {
    if (concluidas.has(id) || frac(idx, id, concluidas) > 0) for (const c of caminhoAte(idx, id)) s.add(c);
  }
  return s;
}

/** Os nós visíveis (pré-ordem): a raiz sempre; os filhos de um nó só quando ele está expandido. */
export function nosVisiveis(idx: IndiceArvore, expandidos: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const andar = (id: string) => {
    out.push(id);
    if (!expandidos.has(id)) return;
    for (const f of filhosDe(idx, id)) andar(f);
  };
  andar(idx.raiz.id);
  return out;
}

/** Contagem do painel: só conta ids que existem na árvore (progresso antigo de nó que sumiu não infla). */
export function resumoProgresso(idx: IndiceArvore, concluidas: ReadonlySet<string>): { feitas: number; total: number; pct: number } {
  let feitas = 0;
  for (const id of idx.ordem) if (concluidas.has(id)) feitas++;
  const total = idx.ordem.length;
  return { feitas, total, pct: total ? Math.round((feitas / total) * 100) : 0 };
}

/** A lição por onde "começar/continuar": a raiz se nada foi feito; senão a primeira pendente na ordem. */
export function licaoParaContinuar(idx: IndiceArvore, concluidas: ReadonlySet<string>): string | null {
  for (const id of idx.ordem) if (!concluidas.has(id)) return id;
  return null;
}
