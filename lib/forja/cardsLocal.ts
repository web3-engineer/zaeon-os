/**
 * lib/forja/cardsLocal.ts — a fonte CACHEADA dos cards de tutorial por arquivo (F2). SÓ SERVIDOR.
 *
 * Gerar os cards do repo é LLM (minutos por repo), então NUNCA roda no caminho da requisição. Um job em
 * lote (scripts/forja-cards-gerar.mjs) roda na box, aplica `cardsValidados` aos arquivos reais e grava o
 * resultado JÁ VALIDADO (harmonia conferida) aqui no cache. O curso lê só do cache. Sem cache → null → o
 * curso usa os cards bundlados (lib/forja/tutoriais) ou nenhum. `FORJA_CARDS_CACHE` aponta pro volume.
 * O cache é a geração em ESCALA (repos arbitrários na box); os cursos conhecidos já vêm prontos bundlados.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CardDeArquivo } from "./tutorialArquivo";

const CACHE = process.env.FORJA_CARDS_CACHE || join(tmpdir(), "forja-cards-cache");
const slug = (repo: string) => repo.replace(/\//g, "__");
const arquivo = (repo: string) => join(CACHE, `${slug(repo)}.json`);

const ehCard = (x: unknown): x is CardDeArquivo =>
  !!x && typeof x === "object" && typeof (x as CardDeArquivo).arquivo === "string" && Array.isArray((x as CardDeArquivo).abas);

/** Lê os cards gerados do CACHE (nunca gera na hora). [] se não cacheado / inválido. */
export async function cardsCacheados(repo: string): Promise<CardDeArquivo[]> {
  try {
    const j = JSON.parse(await readFile(arquivo(repo), "utf8"));
    return Array.isArray(j) ? j.filter(ehCard) : [];
  } catch {
    return [];
  }
}

/** Grava os cards validados no cache (usado pelo job de geração em lote, na box). */
export async function gravarCardsCache(repo: string, cards: CardDeArquivo[]): Promise<void> {
  await mkdir(CACHE, { recursive: true });
  await writeFile(arquivo(repo), JSON.stringify(cards));
}

export const CAMINHO_CACHE_CARDS = CACHE;
