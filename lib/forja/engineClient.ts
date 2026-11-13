/**
 * lib/forja/engineClient.ts — o ELO que faltava: o cliente SERVER-SIDE que fala com a ponte do motor Forja
 * (infra/forja-engine, no app server via localhost:8800), pega a SAÍDA dos engines e normaliza com os
 * adaptadores (A2). Sem a ponte configurada (FORJA_BRIDGE_URL/TOKEN), degrada pra null → o board fica no
 * esqueleto curado. Roda SÓ no servidor (rotas /api): o token nunca vai pro cliente.
 *
 * Espelha o papel do lib/octa/rea.ts (cliente do REA), mas pra Forja: repo → grafo/árvore.
 */
import { graphifyParaGrafo, understandParaGrafo, understandParaArvore } from "./adaptadores";
import type { GrafoConhecimento, ArvoreEntendimento } from "./tipos";

/** Lê a config da ponte em tempo de chamada (facilita teste e hot-reload de env). */
function config(): { url: string; token: string } | null {
  const url = (process.env.FORJA_BRIDGE_URL || "").replace(/\/$/, "");
  const token = process.env.FORJA_BRIDGE_TOKEN || "";
  return url && token ? { url, token } : null;
}

/** A ponte do motor está configurada? (sem ela, a Forja serve só o esqueleto). */
export function engineDisponivel(): boolean {
  return config() !== null;
}

type RespostaPonte = { ok?: boolean; grafo?: unknown; erro?: string };

/** Chama a ponte para um engine num repo (owner/name). null se não houver ponte, se falhar, ou se demorar. */
export async function chamarPonte(
  repo: string,
  engine: "graphify" | "understand",
  fetchImpl: typeof fetch = fetch,
): Promise<unknown | null> {
  const cfg = config();
  if (!cfg || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  try {
    const r = await fetchImpl(`${cfg.url}/forja`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: cfg.token, engine, repoUrl: `https://github.com/${repo}` }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as RespostaPonte;
    return data?.ok && data.grafo ? data.grafo : null;
  } catch {
    return null; // rede, timeout, JSON inválido: degrada pro esqueleto
  }
}

/** O grafo do repo pelo graphify (estático, SEM LLM). null se indisponível/falha. */
export async function grafoDoRepo(repo: string, fetchImpl: typeof fetch = fetch): Promise<GrafoConhecimento | null> {
  const raw = await chamarPonte(repo, "graphify", fetchImpl);
  return raw ? graphifyParaGrafo(raw as Parameters<typeof graphifyParaGrafo>[0]) : null;
}

/** Opcional: o entendimento pelo understand (precisa do wrapper na box). null se indisponível. */
export async function entendimentoDoRepo(
  repo: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ grafo: GrafoConhecimento; arvore: ArvoreEntendimento } | null> {
  const raw = await chamarPonte(repo, "understand", fetchImpl);
  if (!raw) return null;
  const j = raw as Parameters<typeof understandParaGrafo>[0];
  return { grafo: understandParaGrafo(j), arvore: understandParaArvore(j) };
}
