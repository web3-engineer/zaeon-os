/**
 * lib/forja/understandLocal.ts — a fonte CACHEADA do understand-anything para o fluxo do curso. SÓ SERVIDOR.
 *
 * O understand é LLM (minutos por repo), então NUNCA roda no caminho da requisição — travaria a página. O
 * curso lê o `.ua/knowledge-graph.json` só do CACHE (rápido); um job em lote (scripts/forja-ua-gerar.mjs)
 * popula o cache onde a ponte da box existe. Sem cache → null → o curso degrada pro grafo do graphify.
 *
 * Em prod, aponte `FORJA_UA_CACHE` para um volume persistente (o default é um tmpdir, por instância).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ArvoreEntendimento } from "./tipos";
import { arvoreDoUA, temUA, type UAGrafo } from "./understand";

const CACHE = process.env.FORJA_UA_CACHE || join(tmpdir(), "forja-ua-cache");
const slug = (repo: string) => repo.replace(/\//g, "__");
const arquivo = (repo: string) => join(CACHE, slug(repo), "knowledge-graph.json");

/** Lê o grafo do understand do CACHE (nunca gera na hora). null se não cacheado / inválido. */
export async function uaCacheado(repo: string): Promise<UAGrafo | null> {
  try {
    const j = JSON.parse(await readFile(arquivo(repo), "utf8"));
    return temUA(j) ? (j as UAGrafo) : null;
  } catch {
    return null;
  }
}

/** Árvore de aprendizado do understand (cacheada), pronta pro curso. null se não houver. Não toca a rede. */
export async function arvoreUACacheada(repo: string): Promise<ArvoreEntendimento | null> {
  const ua = await uaCacheado(repo);
  return ua ? arvoreDoUA(ua) : null;
}

/** Grava o grafo do understand no cache (usado pelo script de pré-geração em lote). */
export async function gravarUACache(repo: string, ua: UAGrafo): Promise<void> {
  await mkdir(join(CACHE, slug(repo)), { recursive: true });
  await writeFile(arquivo(repo), JSON.stringify(ua));
}

export const CAMINHO_CACHE_UA = CACHE;
