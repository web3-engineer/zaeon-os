/**
 * lib/ai/preco.ts — tabela de preço por modelo (USD por milhão de tokens).
 *
 * ESTIMATIVA — editar aqui; não é fatura. Fonte única do `estimatedCostUsd` do TokenLedger (C5).
 * `cached` é cobrado pelo preço de cache (≈10% do prompt no Vertex) — somar cache como token cheio
 * inflaria o custo justamente quando o contextCache está funcionando.
 * Modelos do pool grátis (Fatia 7) entram com 0 e comentário "free tier".
 */
import type { Usage } from "@/lib/llm/usage";

export type Preco = { prompt: number; completion: number; cached: number };

export const USD_POR_MILHAO: Record<string, Preco> = {
  // Gemini 2.5 (Vertex, ≤200k de contexto) — conferido 2026-10; editar quando o Google mexer.
  "gemini-2.5-flash":      { prompt: 0.30, completion: 2.50, cached: 0.03 },
  "gemini-2.5-flash-lite": { prompt: 0.10, completion: 0.40, cached: 0.01 },
  "gemini-2.5-pro":        { prompt: 1.25, completion: 10.00, cached: 0.125 },
  // Gemini 3.x (quando o projeto habilitar) — valores provisórios = 2.5 equivalentes.
  "gemini-3.5-flash":      { prompt: 0.30, completion: 2.50, cached: 0.03 },
  "gemini-3.1-pro":        { prompt: 1.25, completion: 10.00, cached: 0.125 },
  "gemini-3.5-flash-lite": { prompt: 0.10, completion: 0.40, cached: 0.01 }, // provisório = 2.5-flash-lite (reserva Google do pool)
  // Reserva do chat pelo Hugging Face (lib/llm/reservaHf): gpt-oss-120b na Cerebras/Groq, preço do provedor
  // sem acréscimo do HF. Cerebras ~0,25/0,69, Groq ~0,15/0,75 — fica o maior de cada (conferido 2026-10).
  "gpt-oss-120b":          { prompt: 0.25, completion: 0.75, cached: 0 },
  // Motores abertos da orquestra (lib/orquestra/provedores). PROVISÓRIO, nov/2026, de listagens de terceiros
  // (OpenRouter/agregadores) — conferir no painel de cada provedor antes de usar pra cobrar.
  "kimi-k2.6":                          { prompt: 0.95, completion: 4.00, cached: 0.16 },
  "alibaba/tongyi-deepresearch-30b-a3b": { prompt: 0.09, completion: 0.45, cached: 0 },
  // DeepSeek V4: sem preço conferido nesta data — fica o do Pro do Google (conservador) até alguém conferir.
  "deepseek-v4-pro":                    { prompt: 1.25, completion: 10.00, cached: 0.125 },
  "deepseek-v4-flash":                  { prompt: 0.30, completion: 2.50, cached: 0.03 },
  // Pool grátis (Fatia 7) — free tier: custo 0 dentro do teto (TETOS_DIA em lib/llm/pool.ts).
  // O MESMO "gemini-2.5-flash-lite" no Vertex custa: por isso o ledger zera pelo ALVO (custoDoAlvoUsd), não pelo nome.
  "zaeon-pool-lite":                { prompt: 0, completion: 0, cached: 0 }, // free tier — custo 0 dentro do teto (TETOS_DIA em lib/llm/pool.ts)
  "zaeon-pool-cf":                  { prompt: 0, completion: 0, cached: 0 }, // free tier — custo 0 dentro do teto (TETOS_DIA em lib/llm/pool.ts)
  "zaeon-pool-groq":                { prompt: 0, completion: 0, cached: 0 }, // free tier — custo 0 dentro do teto (TETOS_DIA em lib/llm/pool.ts)
  "zaeon-pool-glm":                 { prompt: 0, completion: 0, cached: 0 }, // free tier — custo 0 dentro do teto (TETOS_DIA em lib/llm/pool.ts)
  "@cf/meta/llama-3.1-8b-instruct": { prompt: 0, completion: 0, cached: 0 }, // free tier — custo 0 dentro do teto (TETOS_DIA em lib/llm/pool.ts)
  "openai/gpt-oss-20b":             { prompt: 0, completion: 0, cached: 0 }, // free tier — custo 0 dentro do teto (TETOS_DIA em lib/llm/pool.ts)
  "glm-4.7-flash":                  { prompt: 0, completion: 0, cached: 0 }, // free tier — custo 0 dentro do teto (TETOS_DIA em lib/llm/pool.ts)
};

/** Modelo desconhecido → preço do flash (conservador) e marca para o admin saber. */
export const PRECO_DESCONHECIDO: Preco = USD_POR_MILHAO["gemini-2.5-flash"];

export function precoDe(modelOriginal: string): { preco: Preco; conhecido: boolean } {
  // o Hugging Face devolve o id do repositório com maiúsculas ("moonshotai/Kimi-K2.6"); a tabela é minúscula
  const model = String(modelOriginal ?? "").toLowerCase();
  // Exato primeiro; senão a chave MAIS LONGA que casa (senão "gemini-2.5-flash-lite" casava "gemini-2.5-flash-" e saía 3× mais caro).
  const casa = (m: string) => model === m || model.startsWith(m + "-") || model.endsWith("/" + m);
  const k = Object.keys(USD_POR_MILHAO).filter(casa).sort((x, y) => (model === y ? 1 : 0) - (model === x ? 1 : 0) || y.length - x.length)[0];
  return k ? { preco: USD_POR_MILHAO[k], conhecido: true } : { preco: PRECO_DESCONHECIDO, conhecido: false };
}

/** PURO. prompt, completion e cached cada um pelo seu preço. */
export function custoEstimadoUsd(model: string, u: Pick<Usage, "promptTokens" | "completionTokens" | "cachedTokens">): number {
  const { preco } = precoDe(model);
  const usd = (u.promptTokens * preco.prompt + u.completionTokens * preco.completion + u.cachedTokens * preco.cached) / 1_000_000;
  return Math.round(usd * 1e8) / 1e8;
}

/** Alvos que não cobram por token: o pool grátis (free tier) e a Contabo (nossa). */
const ALVOS_GRATIS = new Set(["gemini-free", "cerebras", "cloudflare", "groq", "glm", "contabo"]);
/** Custo pelo ALVO que serviu: pool grátis/Contabo = 0; vertex, huggingface (pago) ou null = tabela por modelo. */
export function custoDoAlvoUsd(model: string, u: Pick<Usage, "promptTokens" | "completionTokens" | "cachedTokens">, alvo?: string | null): number {
  return alvo && ALVOS_GRATIS.has(alvo) ? 0 : custoEstimadoUsd(model, u);
}
