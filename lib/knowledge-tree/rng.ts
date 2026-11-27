/**
 * lib/knowledge-tree/rng.ts — aleatoriedade DETERMINÍSTICA por id: a mesma árvore nasce sempre igual
 * (nada "treme" a cada render). Hash FNV-1a de 32 bits semeia um xorshift32.
 */

/** FNV-1a 32 bits → inteiro sem sinal. */
export function hashTexto(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gerador xorshift32 em [0, 1). Semente 0 vira uma constante (o xorshift não sai do zero). */
export function xorshift(semente: number): () => number {
  let x = (semente >>> 0) || 0x9e3779b9;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

/** Atalho: o gerador de um id (mais um sal opcional pra separar usos do mesmo nó). */
export function rngDe(id: string, sal = ""): () => number {
  return xorshift(hashTexto(sal ? id + "\u0000" + sal : id));
}
