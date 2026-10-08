/**
 * lib/llm/envelope.ts — contrato C5: a ÚNICA saída de LLM da camada autônoma (PR-G1/A1).
 *
 *   gerar(req)      → { texto, usage, modelo, provedor, finishReason, ms }
 *   gerarJson<T>()  → gerar({json:true}) + parse com os MESMOS erros diagnósticos do geminiJson legado
 *
 * Rotas: "vertex" (default; exatamente o que geminiJson/geminiText fazem hoje) e "gateway"
 * (LiteLLM OpenAI-compatible, só com GATEWAY_URL + key). Gateway caído/sem URL/sem key → cai para
 * o Vertex NA MESMA CHAMADA e grava provedor:"vertex" (é o que o health chama de degraded).
 * Erro de budget ("teto") NÃO cai para o Vertex: é indisponibilidade declarada (lei 5), relançada.
 * O ledger é fire-and-forget (void registrarTokens) ANTES do return — o turno nunca espera o banco.
 * Normalização de usage e classificação de erro vêm de lib/llm/usage.ts (puro, testado).
 */
import { usageDoVertex, usageDoOpenAI, classificarErroLlm, chaveDoAgente, gatewayLigado, type Usage, type ClasseErroLlm, USAGE_VAZIO } from "@/lib/llm/usage";
import { registrarTokens, type LedgerCtx } from "@/lib/llm/ledger";
import { GEMINI_MODEL_FLASH } from "@/lib/ai/model";
import { alvoDe, ehModeloPool, poolConfigurado, type Alvo } from "@/lib/llm/pool";

export type Rota = "vertex" | "gateway";
export type { LedgerCtx, Alvo };
export type Mensagem = { role: "user" | "model"; text: string };
export type GerarReq = {
  system?: string;
  user?: string;                       // ou `messages` — um dos dois
  messages?: Mensagem[];
  json?: boolean;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  maxOutputTokens?: number;
  rota?: Rota;
  /** Quantas vezes a fila já tentou este job (0 = primeira). Só entra no backoff do PoolEsgotadoError. */
  tentativa?: number;
  ctx: LedgerCtx;
};
export type GerarRes = {
  texto: string;
  usage: Usage;
  modelo: string;
  provedor: "vertex" | "litellm";
  rota: Rota;
  finishReason?: string;
  ms: number;
  /** Provedor UPSTREAM que serviu (Fatia 7): "vertex" na rota vertex; no gateway, pelo header x-litellm-model-id / model do corpo. */
  alvo?: Alvo;
  /** Só em json:true — o texto parseia como JSON (métrica §9.1). */
  jsonValido?: boolean;
};

/** Erro de LLM já classificado (relançado pelo envelope). `classe` decide quem trata (fila × agente × admin). */
export class ErroLlm extends Error {
  readonly classe: ClasseErroLlm;
  readonly provedor: "vertex" | "litellm";
  readonly causa: unknown;
  constructor(classe: ClasseErroLlm, provedor: "vertex" | "litellm", causa: unknown) {
    super(`llm:${classe}: ${String((causa as any)?.message ?? causa).slice(0, 300)}`);
    this.name = "ErroLlm"; this.classe = classe; this.provedor = provedor; this.causa = causa;
  }
}

/** Teto do backoff do pool (G4). */
export const POOL_BACKOFF_MAX_MS = 30 * 60_000;

/**
 * G4 — todos os alvos do pool estouraram (LiteLLM "No deployments available"). NÃO é erro de app:
 * a fila adia o job (lib/queue/reenfileirar.ts) e ele expira em 24h. O LiteLLM NÃO manda
 * Retry-After nesse 429 (issue #27823): sem header, o backoff é NOSSO — 60s × 2^tentativa, teto 30min.
 */
export class PoolEsgotadoError extends ErroLlm {
  readonly retryAfterMs: number;
  readonly alvosTentados: Alvo[];
  constructor(retryAfterMs: number, alvosTentados: Alvo[], causa: unknown) {
    super("pool_esgotado", "litellm", causa);
    this.name = "PoolEsgotadoError"; this.retryAfterMs = retryAfterMs; this.alvosTentados = alvosTentados;
  }
}

/** PURO. Header retry-after (s) → ms; senão "try again in N seconds" do corpo; senão 60s × 2^tentativa. Teto 30min. */
export function retryAfterDoPool(e: unknown, tentativa = 0): number {
  const hdr = Number((e as any)?.retryAfter);
  if (Number.isFinite(hdr) && hdr > 0) return Math.min(hdr * 1000, POOL_BACKOFF_MAX_MS);
  const m = /try again in (\d+(?:\.\d+)?)\s*s/i.exec(String((e as any)?.body ?? (e as any)?.message ?? ""));
  if (m) return Math.min(Math.ceil(Number(m[1]) * 1000), POOL_BACKOFF_MAX_MS);
  return Math.min(60_000 * 2 ** Math.max(0, Math.floor(tentativa)), POOL_BACKOFF_MAX_MS);
}

// ───────────────────────────── transportes (injetáveis p/ teste) ─────────────────────────────
export type RespostaBruta = { texto: string; usage: Usage; finishReason?: string; modelo: string; modelId?: string | null };
export type TransporteVertex = (req: GerarReq, modelo: string) => Promise<RespostaBruta>;
export type Deps = { vertex?: TransporteVertex; fetchImpl?: typeof fetch; env?: Record<string, string | undefined>; registrar?: typeof registrarTokens; agora?: () => number };

const DEFAULT_TIMEOUT_MS = Number(process.env.SCHOLAR_GEMINI_TIMEOUT_MS || 30_000);

/** Vertex direto: reusa makeVertex/extractText/withTimeout de lib/scholar/gemini.ts (import tardio: o SDK é pesado). */
const vertexReal: TransporteVertex = async (req, modelo) => {
  const { makeVertex, extractText, withTimeout } = await import("@/lib/scholar/gemini");
  const model = makeVertex().getGenerativeModel({
    model: modelo,
    generationConfig: {
      temperature: req.temperature ?? (req.json ? 0.2 : 0.5),
      ...(req.json ? { responseMimeType: "application/json" } : {}),
      ...(req.maxOutputTokens ? { maxOutputTokens: req.maxOutputTokens } : {}),
    },
    ...(req.system ? { systemInstruction: { role: "system", parts: [{ text: req.system }] } } : {}),
  });
  const contents = contentsDe(req).map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  const result: any = await withTimeout(model.generateContent({ contents }), req.timeoutMs ?? DEFAULT_TIMEOUT_MS, "Gemini");
  return {
    texto: extractText(result),
    usage: usageDoVertex(result?.response?.usageMetadata),
    finishReason: result?.response?.candidates?.[0]?.finishReason,
    modelo,
  };
};

async function viaGateway(req: GerarReq, modelo: string, url: string, key: string, f: typeof fetch): Promise<RespostaBruta> {
  const messages: { role: string; content: string }[] = [];
  if (req.system) messages.push({ role: "system", content: req.system });
  for (const m of contentsDe(req)) messages.push({ role: m.role === "model" ? "assistant" : "user", content: m.text });
  const r = await f(`${url.replace(/\/+$/, "")}/v1/chat/completions`, {
    method: "POST", cache: "no-store", // o fetch do Next tem data cache; LLM nunca é cacheável
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: modelo, messages, temperature: req.temperature ?? (req.json ? 0.2 : 0.5),
      ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
      ...(req.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(req.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
  const bruto = await r.text();
  let body: any = null;
  try { body = JSON.parse(bruto); } catch { throw Object.assign(new Error(`gateway: resposta não-JSON (HTTP ${r.status}): ${bruto.slice(0, 80)}`), { status: r.status, naoJson: true }); }
  if (!r.ok) throw Object.assign(new Error(body?.error?.message ?? body?.message ?? `gateway HTTP ${r.status}`), { status: r.status, body: bruto, retryAfter: r.headers.get("retry-after") });
  return {
    texto: String(body?.choices?.[0]?.message?.content ?? "").trim(),
    usage: usageDoOpenAI(body?.usage),
    finishReason: body?.choices?.[0]?.finish_reason,
    modelo: typeof body?.model === "string" && body.model ? body.model : modelo,
    modelId: r.headers.get("x-litellm-model-id"),
  };
}

/** O texto de uma resposta json:true parseia? (cercas ```json toleradas, como no gerarJson). */
export function textoJsonValido(texto: string): boolean {
  const t = String(texto ?? "").replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  if (!t) return false;
  try { JSON.parse(t); return true; } catch { return false; }
}

/** histórico (messages) + pergunta (user) — os dois podem vir juntos (geminiText com history). */
function contentsDe(req: GerarReq): Mensagem[] {
  const out: Mensagem[] = [...(req.messages ?? [])];
  if (req.user != null && req.user !== "") out.push({ role: "user", text: req.user });
  if (!out.length) out.push({ role: "user", text: "" });
  return out;
}

/** Gateway caiu de um jeito que o Vertex direto resolve? (teto/cota/auth-de-agente NÃO: são declaráveis/nossos.) */
const caiParaVertex = (classe: ClasseErroLlm): boolean => classe === "provedor_fora" || classe === "timeout" || classe === "resposta_nao_json" || classe === "modelo_inexistente";

const avisouSemKey = new Set<string>();

// ───────────────────────────── gerar ─────────────────────────────
export async function gerar(req: GerarReq, deps: Deps = {}): Promise<GerarRes> {
  const env = deps.env ?? process.env;
  const agora = deps.agora ?? Date.now;
  const registrar = deps.registrar ?? registrarTokens;
  const modelo = req.model || GEMINI_MODEL_FLASH;
  const ini = agora();

  let rota: Rota = req.rota === "gateway" && gatewayLigado(env) ? "gateway" : "vertex";
  let key: string | null = null;
  if (rota === "gateway") {
    key = chaveDoAgente(req.ctx.agentKey, env) ?? env.GATEWAY_MASTER_KEY?.trim() ?? null;
    if (!key) {
      if (!avisouSemKey.has(req.ctx.agentKey)) { avisouSemKey.add(req.ctx.agentKey); console.warn(`[llm] agente ${req.ctx.agentKey} sem GATEWAY_KEY_* nem GATEWAY_KEY_DEFAULT — Vertex direto`); }
      rota = "vertex";
    }
  }

  const jsonValido = (texto: string) => (req.json ? textoJsonValido(texto) : undefined);
  const gravar = (provedor: "vertex" | "litellm", r: Rota, usage: Usage, ok: boolean, erro: ClasseErroLlm | null, m: string, alvo: Alvo, jv?: boolean) =>
    void registrar({ ...req.ctx, model: m, provedor, rota: r, usage, ms: agora() - ini, ok, erro, alvo, jsonValido: jv ?? null }).catch(() => undefined);

  // Pool grátis (Fatia 7) NUNCA cai no Vertex (§5.10): sem gateway/key, ou gateway com erro, relança.
  // Se caísse, "grátis" viraria crédito do negócio sem ninguém ver.
  const pool = ehModeloPool(modelo);
  if (pool && rota !== "gateway") {
    const e = new Error("pool grátis exige o gateway (GATEWAY_URL + key) — nunca cai no Vertex");
    gravar("litellm", "gateway", USAGE_VAZIO, false, "provedor_fora", modelo, alvoDe(modelo));
    throw new ErroLlm("provedor_fora", "litellm", e);
  }

  if (rota === "gateway") {
    try {
      const r = await viaGateway(req, modelo, env.GATEWAY_URL!.trim(), key!, deps.fetchImpl ?? fetch);
      const alvo = alvoDe(r.modelo, r.modelId), jv = jsonValido(r.texto);
      gravar("litellm", "gateway", r.usage, true, null, r.modelo, alvo, jv);
      const { modelId: _id, ...resto } = r;
      return { ...resto, provedor: "litellm", rota: "gateway", ms: agora() - ini, alvo, ...(jv === undefined ? {} : { jsonValido: jv }) };
    } catch (e) {
      let classe: ClasseErroLlm = (e as any)?.naoJson ? "resposta_nao_json" : classificarErroLlm(e);
      // 429 com retry-after num grupo do pool = o router esgotou os alvos (G4).
      if (pool && (classe === "rate_limit" || classe === "cota_esgotada") && (e as any)?.retryAfter) classe = "pool_esgotado";
      gravar("litellm", "gateway", USAGE_VAZIO, false, classe, modelo, alvoDe(modelo));
      if (classe === "pool_esgotado") throw new PoolEsgotadoError(retryAfterDoPool(e, req.tentativa), poolConfigurado(env), e);
      if (pool || !caiParaVertex(classe)) throw new ErroLlm(classe, "litellm", e);
      console.warn(`[llm] gateway ${classe} — caindo para o Vertex direto (${req.ctx.agentKey})`);
    }
  }

  try {
    const r = await (deps.vertex ?? vertexReal)(req, modelo);
    const jv = jsonValido(r.texto);
    gravar("vertex", rota, r.usage, true, null, r.modelo, "vertex", jv);
    const { modelId: _id, ...resto } = r;
    return { ...resto, provedor: "vertex", rota, ms: agora() - ini, alvo: "vertex", ...(jv === undefined ? {} : { jsonValido: jv }) };
  } catch (e) {
    const classe = classificarErroLlm(e);
    gravar("vertex", rota, USAGE_VAZIO, false, classe, modelo, "vertex");
    throw new ErroLlm(classe, "vertex", e);
  }
}

/** = gerar({json:true}) + parse, devolvendo TAMBÉM a resposta bruta (usage) — para quem reconcilia orçamento. */
export async function gerarJsonRes<T>(req: GerarReq, deps: Deps = {}): Promise<{ valor: T; res: GerarRes }> {
  const res = await gerar({ ...req, json: true }, deps);
  const cleaned = res.texto.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  if (!cleaned) throw new ErroLlm("outro", res.provedor, new Error(`Gemini retornou resposta vazia (finishReason=${res.finishReason ?? "?"})`));
  try { return { valor: JSON.parse(cleaned) as T, res }; }
  catch { throw new ErroLlm("resposta_nao_json", res.provedor, new Error(`Gemini retornou JSON inválido (finishReason=${res.finishReason ?? "?"}): ${cleaned.slice(0, 160)}`)); }
}
/** = gerar({json:true}) + parse. Mesmos erros diagnósticos do geminiJson legado (nunca "{}" silencioso). */
export async function gerarJson<T>(req: GerarReq, deps: Deps = {}): Promise<T> {
  return (await gerarJsonRes<T>(req, deps)).valor;
}

export { classificarErroLlm } from "@/lib/llm/usage";
