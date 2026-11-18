/**
 * lib/octa/gatewayJson.ts — uma chamada JSON (não-stream) ao gateway LiteLLM. Para quem precisa de
 * um objeto de volta e não da transmissão: o compositor do blueprint REA com o Claude.
 *
 * Fala o MESMO protocolo OpenAI-compatível do resto da casa (`/v1/chat/completions`, Bearer com a
 * master key do gateway). O gateway roteia o `model` (ex.: "claude-sonnet") para a Anthropic. Não
 * depende de `response_format` (nem toda ponte de provedor respeita): pede JSON no prompt e extrai
 * o objeto do texto, tolerante a cerca de markdown. Nunca lança por conteúdo — só por rede/HTTP.
 */
import { gatewayCfg } from "@/lib/octa/litellm";

type Env = NodeJS.ProcessEnv | Record<string, string | undefined>;

export type GatewayJsonOpts = {
  model: string;
  env?: Env;
  temperature?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  maxTokens?: number;
};

/** Tira a cerca ```json … ``` e pega o primeiro objeto/array balanceado do texto. */
export function extrairJson(texto: string): unknown {
  const limpo = String(texto ?? "").trim().replace(/^```[\w-]*[ \t]*\n?/, "").replace(/\n?```\s*$/, "").trim();
  try { return JSON.parse(limpo); } catch { /* tenta achar o objeto no meio */ }
  const i = limpo.search(/[[{]/);
  if (i < 0) return null;
  const abre = limpo[i], fecha = abre === "{" ? "}" : "]";
  let nivel = 0, emStr = false, esc = false;
  for (let j = i; j < limpo.length; j++) {
    const c = limpo[j];
    if (emStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') emStr = false; continue; }
    if (c === '"') emStr = true;
    else if (c === abre) nivel++;
    else if (c === fecha && --nivel === 0) { try { return JSON.parse(limpo.slice(i, j + 1)); } catch { return null; } }
  }
  return null;
}

export const gatewayJsonConfigurado = (env: Env = process.env): boolean => {
  const c = gatewayCfg(env as NodeJS.ProcessEnv);
  return !!(c.url && c.master);
};

/** Pede um JSON ao gateway. Devolve o objeto parseado (T) ou lança (rede/HTTP/sem gateway). */
export async function gatewayJson<T>(system: string, user: string, opts: GatewayJsonOpts): Promise<T> {
  const env = opts.env ?? process.env;
  const c = gatewayCfg(env as NodeJS.ProcessEnv);
  if (!c.url || !c.master) throw new Error("gateway não configurado (GATEWAY_URL/GATEWAY_MASTER_KEY)");
  const f = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(new Error("timeout")), opts.timeoutMs ?? 60_000);
  try {
    const r = await f(`${c.url}/v1/chat/completions`, {
      method: "POST", cache: "no-store", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.master}` },
      body: JSON.stringify({
        model: opts.model,
        messages: [
          { role: "system", content: `${system}\n\nResponda SOMENTE com JSON válido, sem comentário nem texto fora do JSON.` },
          { role: "user", content: user },
        ],
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 4096,
        stream: false,
      }),
    });
    if (!r.ok) throw new Error(`gateway HTTP ${r.status}: ${(await r.text().catch(() => "")).slice(0, 160)}`);
    const j = await r.json();
    const conteudo = j?.choices?.[0]?.message?.content;
    const obj = extrairJson(typeof conteudo === "string" ? conteudo : "");
    if (obj == null) throw new Error("gateway não devolveu JSON legível");
    return obj as T;
  } finally {
    clearTimeout(to);
  }
}
