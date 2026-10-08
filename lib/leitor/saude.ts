/**
 * lib/leitor/saude.ts — estado do Leitor para /api/health (Fatia 7, G6). Molde de lib/llm/saude.ts.
 *   "off"      → LEITOR_PROXY_URL vazio (Leitor fora do ar por configuração; lei 5)
 *   "on"       → GET ${LEITOR_PROXY_URL}/health respondeu {ok:true} e a allowlist não está vazia
 *   "degraded" → configurado e caído, ou allowlist vazia (nega tudo)
 */
export type EstadoLeitor = "off" | "on" | "degraded";
type Deps = { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; agora?: () => number };
const CACHE_MS = 60_000;
let cache: { estado: EstadoLeitor; url: string; at: number } | null = null;
export function __resetLeitorParaTeste(): void { cache = null; }

export async function estadoLeitor(d: Deps = {}): Promise<EstadoLeitor> {
  const env = d.env ?? process.env;
  const url = env.LEITOR_PROXY_URL?.trim();
  if (!url) return "off";
  const agora = d.agora ?? Date.now;
  if (cache && cache.url === url && agora() - cache.at < CACHE_MS) return cache.estado;
  let estado: EstadoLeitor = "degraded";
  try {
    const r = await (d.fetchImpl ?? fetch)(`${url.replace(/\/+$/, "")}/health`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    const j: any = r.ok ? await r.json().catch(() => null) : null;
    estado = j?.ok && Number(j.allow) > 0 ? "on" : "degraded";
  } catch { estado = "degraded"; }
  cache = { estado, url, at: agora() };
  return estado;
}
