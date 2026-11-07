/**
 * lib/anatomia/carregar.ts — carrega o manifesto do Atlas no SERVIDOR, uma vez por processo.
 *
 * O manifesto tem 1,3 MB e nunca muda em runtime (ele é parte da imagem), então ler do disco uma
 * vez e guardar é o certo. A GEOMETRIA (~90 MB) não passa por aqui: ela é servida como estático e
 * o navegador a busca direto — este módulo só conhece o manifesto.
 *
 * FALHA SEM DRAMA, de propósito: se o arquivo não estiver lá, `carregarAtlas()` devolve `null` em
 * vez de lançar, e `atlasDisponivel()` responde `false`. Isso é o que permite às ferramentas do
 * agente NÃO SE ANUNCIAREM quando o dado não existe (a regra da F0: nunca prometer o que não dá
 * pra fazer), em vez de anunciarem e estourarem no meio do turno.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Atlas } from "@/lib/anatomia/atlas";

/** Onde o manifesto mora dentro da imagem. A geometria fica em `/models/body/`, fora da imagem. */
export const CAMINHO_ATLAS = "public/models/atlas.json";

/**
 * No globalThis e não numa variável de módulo — mesmo motivo documentado em
 * lib/agent/runtime.ts para o registry de tools: o webpack do Next dá ao `instrumentation` o seu
 * próprio exemplar do módulo, e um cache de módulo seria carregado duas vezes.
 */
const g = globalThis as unknown as { __zaeonAtlas?: Atlas | null };

export function carregarAtlas(): Atlas | null {
  if (g.__zaeonAtlas !== undefined) return g.__zaeonAtlas;
  try {
    const bruto = readFileSync(join(process.cwd(), CAMINHO_ATLAS), "utf8");
    const a = JSON.parse(bruto) as Atlas;
    // Guarda contra manifesto truncado ou de outro formato: sem peças ou sem conceitos ele não
    // serve para nada, e é melhor tratar como ausente do que como presente e vazio.
    g.__zaeonAtlas = Array.isArray(a?.parts) && a.parts.length && Array.isArray(a?.concepts) && a.concepts.length ? a : null;
  } catch {
    g.__zaeonAtlas = null;
  }
  return g.__zaeonAtlas;
}

export const atlasDisponivel = (): boolean => !!carregarAtlas();

/** Só para teste: esquece o cache. */
export function __resetAtlasParaTeste(): void {
  delete (globalThis as unknown as { __zaeonAtlas?: unknown }).__zaeonAtlas;
}

/** O resumo que vai pro /api/health — contagens, nunca o dado. */
export function resumoDoAtlas(): { pecas: number; conceitos: number; sistemas: number; triangulos: number } | null {
  const a = carregarAtlas();
  if (!a) return null;
  return {
    pecas: a.parts.length,
    conceitos: a.concepts.length,
    sistemas: new Set(a.parts.map((p) => p.system)).size,
    triangulos: a.triangles,
  };
}
