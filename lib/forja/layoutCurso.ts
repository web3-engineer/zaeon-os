/**
 * lib/forja/layoutCurso.ts — o LAYOUT (puro, testável) da UI base de um curso de código: posiciona o
 * grafo do código (graphify) e a base de conhecimento (árvore do understand) num plano 2D, pra a
 * CursoCodigoView animar. Sem React, sem DOM — só geometria determinística (mesmo input, mesmo mapa).
 */
import type { ArvoreEntendimento, GrafoConhecimento, NoEntendimento, Temperatura } from "./tipos";
import { rankTemperatura } from "./temperatura";

export const CENTRO = { x: 520, y: 380 };

export type NoSaber = {
  id: string; titulo: string; resumo?: string;
  x: number; y: number; nivel: number; desde: Temperatura; parent?: string;
};
export type NoCod = { id: string; nome: string; x: number; y: number; grau: number };
export type ArestaSaber = { de: string; para: string };

/** Posiciona a árvore do understand de forma radial: raiz no centro, filhos em anel, netos para fora. PURA. */
export function layoutSaber(arvore: ArvoreEntendimento): { nos: NoSaber[]; arestas: ArestaSaber[] } {
  const nos: NoSaber[] = [];
  const arestas: ArestaSaber[] = [];
  const raiz = arvore.raiz;
  nos.push({ id: raiz.id, titulo: raiz.titulo, resumo: raiz.resumo, x: CENTRO.x, y: CENTRO.y, nivel: 0, desde: raiz.desde });

  const filhos = raiz.filhos ?? [];
  const n = Math.max(1, filhos.length);
  filhos.forEach((f: NoEntendimento, i) => {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r1 = 210;
    const x = CENTRO.x + Math.cos(ang) * r1;
    const y = CENTRO.y + Math.sin(ang) * r1;
    nos.push({ id: f.id, titulo: f.titulo, resumo: f.resumo, x, y, nivel: 1, desde: f.desde, parent: raiz.id });
    arestas.push({ de: raiz.id, para: f.id });

    const netos = f.filhos ?? [];
    const m = Math.max(1, netos.length);
    netos.forEach((g: NoEntendimento, j) => {
      const ang2 = ang + (j - (m - 1) / 2) * 0.42;
      const r2 = r1 + 150;
      nos.push({
        id: g.id, titulo: g.titulo, resumo: g.resumo,
        x: CENTRO.x + Math.cos(ang2) * r2, y: CENTRO.y + Math.sin(ang2) * r2,
        nivel: 2, desde: g.desde, parent: f.id,
      });
      arestas.push({ de: f.id, para: g.id });
    });
  });
  return { nos, arestas };
}

/** Espalha os nós do código (graphify) num anel de fundo, os mais centrais (maior grau) mais perto. PURA. */
export function layoutCodigo(grafo: GrafoConhecimento, max = 14): NoCod[] {
  const ordenados = [...grafo.nos].sort((a, b) => (b.grau ?? 0) - (a.grau ?? 0)).slice(0, max);
  const n = Math.max(1, ordenados.length);
  const grauMax = Math.max(1, ...ordenados.map((x) => x.grau ?? 0));
  return ordenados.map((no, i) => {
    const ang = (i / n) * Math.PI * 2 + 0.6;
    const prox = (no.grau ?? 0) / grauMax;          // 1 = central (perto), 0 = periférico (longe)
    const r = 300 - prox * 120 + ((i % 3) * 26);    // um pouco de variação pra não virar um círculo perfeito
    return { id: no.id, nome: no.nome, x: CENTRO.x + Math.cos(ang) * r, y: CENTRO.y + Math.sin(ang) * r, grau: no.grau ?? 0 };
  });
}

/** Um nó do saber aparece nesta temperatura? (raiz e nível 1 sempre; o resto, se o `desde` couber). PURA. */
export function visivelNaTemp(no: NoSaber, temp: Temperatura): boolean {
  if (no.nivel === 0) return true;
  return rankTemperatura(no.desde) <= rankTemperatura(temp);
}
