/**
 * lib/llm/pool.ts — o pool GRÁTIS atrás do gateway (PR-G3, Fatia 7). PURO + env.
 *
 * Quem pede `model: MODELO_POOL` com `rota:"gateway"` cai no grupo `zaeon-pool-lite` do LiteLLM
 * (infra/litellm.config.yaml), que escorrega para `-cf` e `-groq` quando o primário estoura.
 * O pool NUNCA cai no Vertex (§5.10): esgotou = PoolEsgotadoError → fila (G4), não crédito do negócio.
 *
 * Só conteúdo PÚBLICO da web passa aqui (§8.10) — quem decide é `rotaDaChore()` (lib/chore/store.ts).
 * Uma conta por provedor (§8.11): uma env de key por provedor, e só uma.
 */

/** Provedor UPSTREAM que serviu a chamada. */
export type Alvo = "vertex" | "gemini-free" | "cloudflare" | "groq" | "glm" | "contabo";
/** Provedores GRÁTIS DE TERCEIROS (com teto diário). A Contabo é nossa: grátis, sem teto de terceiro → fora. */
export type AlvoPool = Exclude<Alvo, "vertex" | "contabo">;

/** Grupo do LiteLLM. Os fallbacks (`-cf`, `-groq`, `-glm`) moram no config, não aqui. */
export const MODELO_POOL = "zaeon-pool-lite";
/** Todos os grupos do pool — o que `scripts/gateway-keys.mjs --pool` põe na allowlist da key. */
export const GRUPOS_POOL = ["zaeon-pool-lite", "zaeon-pool-cf", "zaeon-pool-groq"] as const;

/** O model pedido é do pool? (prefixo `zaeon-pool-`) — o envelope usa para NUNCA cair no Vertex. */
export const ehModeloPool = (model: string | null | undefined): boolean => /^zaeon-pool-/.test(String(model ?? ""));

/** O model pedido é da Contabo (`zaeon-local-*`)? — o envelope NÃO cai no Vertex com esse nome (quem chama escolhe o Google). */
export const ehModeloLocal = (model: string | null | undefined): boolean => /^zaeon-local-/.test(String(model ?? ""));

/**
 * Tetos do free tier — DECLARATIVOS, para o painel (G8). Conferir no console do provedor e editar
 * aqui quando mudar; o gateway não lê isto (os limites reais são do provedor).
 */
export const TETOS_DIA: Record<AlvoPool, { unidade: string; teto: number; renova: "dia" | "min" }> = {
  "gemini-free": { unidade: "req", teto: 1000, renova: "dia" },        // AI Studio free, Flash-Lite — conferir no console do provedor
  cloudflare:    { unidade: "neurons", teto: 10_000, renova: "dia" },   // Workers AI free — conferir no console do provedor
  groq:          { unidade: "tokens/min", teto: 8_000, renova: "min" }, // free tier (handoff §9.3) — conferir no console do provedor
  glm:           { unidade: "req", teto: 0, renova: "dia" },            // off por padrão (§5.2) — conferir no console do provedor
};

const GRUPO_ALVO: Record<string, AlvoPool> = { "zaeon-pool-lite": "gemini-free", "zaeon-pool-cf": "cloudflare", "zaeon-pool-groq": "groq", "zaeon-pool-glm": "glm" };
const ALVOS: readonly Alvo[] = ["vertex", "gemini-free", "cloudflare", "groq", "glm", "contabo"];

/**
 * De onde veio a resposta. O header `x-litellm-model-id` é o `model_info.id` do deployment no
 * config (setado = o próprio nome do alvo) e vence; sem ele, pelo `model` do corpo.
 *   "gemini-2.5-flash-lite" → gemini-free · "@cf/…" → cloudflare · "gpt-oss-…"|"llama-…" → groq · "glm-…" → glm · senão vertex
 */
export function alvoDe(modelString: string | null | undefined, headerModelId?: string | null): Alvo {
  const h = String(headerModelId ?? "").trim().toLowerCase();
  if ((ALVOS as readonly string[]).includes(h)) return h as Alvo;
  if (h.startsWith("contabo-")) return "contabo"; // model_info.id dos zaeon-local-* (litellm.config.yaml)
  const m = String(modelString ?? "").trim().toLowerCase();
  if (m.startsWith("zaeon-local-") || m.startsWith("litellm_proxy/")) return "contabo";
  // O próprio grupo pedido (chamada que falhou antes de saber quem serviu) → o primário do grupo.
  const grupo = GRUPO_ALVO[m];
  if (grupo) return grupo;
  if (m.startsWith("vertex_ai/")) return "vertex";
  const base = m.replace(/^(?:gemini|groq|cloudflare|openai|vertex_ai)\//, "");
  if (m.startsWith("gemini/") || /^gemini-[\d.]+-flash-lite(?:-|$)/.test(base)) return "gemini-free";
  if (m.includes("@cf/") || m.startsWith("cloudflare/")) return "cloudflare";
  if (m.startsWith("groq/") || /(?:^|\/)gpt-oss-|(?:^|\/)llama-/.test(base)) return "groq";
  if (/(?:^|\/)glm-/.test(base)) return "glm";
  return "vertex";
}

type Env = Record<string, string | undefined>;
const tem = (v: string | undefined) => Boolean(v && v.trim());

/** Quais alvos do pool têm key no ambiente (não lê o yaml). Ordem = ordem do fallback. */
export function poolConfigurado(env: Env = process.env): AlvoPool[] {
  const out: AlvoPool[] = [];
  if (tem(env.GEMINI_FREE_API_KEY)) out.push("gemini-free");
  if (tem(env.CLOUDFLARE_API_KEY) && tem(env.CLOUDFLARE_ACCOUNT_ID)) out.push("cloudflare");
  if (tem(env.GROQ_API_KEY)) out.push("groq");
  if (tem(env.ZHIPU_API_KEY)) out.push("glm");
  return out;
}
