/**
 * lib/ai/hf-image.ts — #883 (parte 1): gerar imagem pelo Hugging Face, sem o Google (server-only).
 *
 * O Martinez pediu para tirar o Google da equação, e o Gemini image (lib/ai/gemini-image.ts) ficou fora do ar
 * (403 "requires billing"). O chat já fala com o HF pelo router (lib/llm/reservaHf); a imagem usa o MESMO token e o
 * MESMO router, só que pelo endpoint de imagem de cada provedor (não existe /v1/chat para imagem).
 *
 *   HF_IMAGEM_MODELOS  lista "modelo:provedor" por vírgula, tentada em ordem (default: FLUX.1-schnell em
 *                      together → nebius → fal-ai → hf-inference). Provedores entendidos: os quatro acima.
 *   HF_IMAGEM=0        desliga só a imagem pelo HF (HF_RESERVA=0 desliga o HF inteiro, como no chat).
 *   HF_IMAGEM_TIMEOUT_MS  teto de CADA tentativa (default 45 s).
 *
 * Cada provedor conhece o modelo por um id próprio (o "providerId"). O id vem do mapeamento público do HF
 * (`/api/models/<modelo>?expand[]=inferenceProviderMapping`), guardado em memória; sem mapeamento, vai o id do HF.
 * Cada imagem gerada gasta créditos da conta do HF (área do Martinez).
 */
import { HF_ROUTER_URL } from "@/lib/llm/reservaHf";

type Env = Record<string, string | undefined>;
type Fetch = typeof fetch;

export const HF_IMAGEM_PADRAO = [
  "black-forest-labs/FLUX.1-schnell:together",
  "black-forest-labs/FLUX.1-schnell:nebius",
  "black-forest-labs/FLUX.1-schnell:fal-ai",
  "black-forest-labs/FLUX.1-schnell:hf-inference",
] as const;
export const HF_IMAGEM_TIMEOUT_PADRAO_MS = 45_000;
export const HF_API_URL = "https://huggingface.co/api/models";
export const PROVEDORES_IMAGEM = ["together", "nebius", "fal-ai", "hf-inference"] as const;
export type ProvedorImagem = (typeof PROVEDORES_IMAGEM)[number];

const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

export interface AlvoImagem { modelo: string; provedor: ProvedorImagem }
export interface ImagemHf { data: string; mimeType: string }

/** Tem token e ninguém desligou (HF_RESERVA=0 é o kill switch do HF inteiro; HF_IMAGEM=0, só da imagem). */
export function hfImagemDisponivel(env: Env = process.env): boolean {
  if (!env.HF_TOKEN?.trim()) return false;
  const geral = env.HF_RESERVA?.trim();
  const imagem = env.HF_IMAGEM?.trim();
  return !(geral && DESLIGADO.test(geral)) && !(imagem && DESLIGADO.test(imagem));
}

/** "modelo:provedor" → alvo. Provedor desconhecido (ou ausente) fica de fora: não sabemos o formato dele. */
export function lerAlvo(s: string): AlvoImagem | null {
  const m = s.trim().match(/^(.+):([a-z0-9-]+)$/i);
  if (!m) return null;
  const provedor = m[2].toLowerCase() as ProvedorImagem;
  return (PROVEDORES_IMAGEM as readonly string[]).includes(provedor) ? { modelo: m[1], provedor } : null;
}

export function hfImagemAlvos(env: Env = process.env): AlvoImagem[] {
  const lista = (env.HF_IMAGEM_MODELOS ?? "").split(",").map(lerAlvo).filter((a): a is AlvoImagem => !!a);
  return lista.length ? lista : HF_IMAGEM_PADRAO.map((s) => lerAlvo(s)!);
}

export function hfImagemTimeout(env: Env = process.env): number {
  const n = Number(env.HF_IMAGEM_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : HF_IMAGEM_TIMEOUT_PADRAO_MS;
}

/** Proporção pedida ("16:9") → largura × altura em múltiplos de 64, com o lado maior em 1024. */
export function tamanhoDaProporcao(aspectRatio?: string): { width: number; height: number } {
  const m = (aspectRatio || "").match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  const w = m ? Number(m[1]) : 1, h = m ? Number(m[2]) : 1;
  if (!(w > 0 && h > 0)) return { width: 1024, height: 1024 };
  const r64 = (x: number) => Math.max(256, Math.round(x / 64) * 64);
  return w >= h ? { width: 1024, height: r64((1024 * h) / w) } : { width: r64((1024 * w) / h), height: 1024 };
}

/**
 * O mapeamento do HF vem em dois formatos (antigo: objeto por provedor; novo: lista). Devolve o providerId do
 * provedor pedido, ou null quando ele não serve o modelo para texto→imagem.
 */
export function providerIdDoMapeamento(json: unknown, provedor: string): string | null {
  const m = (json as { inferenceProviderMapping?: unknown } | null)?.inferenceProviderMapping;
  if (!m) return null;
  const itens: Array<{ provider?: string; providerId?: string; task?: string; status?: string }> = Array.isArray(m)
    ? m
    : Object.entries(m as Record<string, Record<string, string>>).map(([provider, v]) => ({ provider, ...v }));
  const it = itens.find((x) => x.provider === provedor && (!x.task || x.task === "text-to-image"));
  return it?.providerId?.trim() || null;
}

/** O pedido HTTP de cada provedor (puro: os testes conferem URL e corpo sem rede). */
export function montarPedido(
  alvo: AlvoImagem,
  providerId: string,
  prompt: string,
  tam: { width: number; height: number },
): { url: string; body: Record<string, unknown> } {
  switch (alvo.provedor) {
    case "together":
      return {
        url: `${HF_ROUTER_URL}/together/v1/images/generations`,
        body: { model: providerId, prompt, n: 1, response_format: "base64", ...tam },
      };
    case "nebius":
      return {
        url: `${HF_ROUTER_URL}/nebius/v1/images/generations`,
        body: { model: providerId, prompt, response_format: "b64_json", ...tam },
      };
    case "fal-ai":
      return {
        url: `${HF_ROUTER_URL}/fal-ai/${providerId}`,
        body: { prompt, sync_mode: true, num_images: 1, image_size: tam },
      };
    case "hf-inference":
      return {
        url: `${HF_ROUTER_URL}/hf-inference/models/${alvo.modelo}`,
        body: { inputs: prompt, parameters: tam },
      };
  }
}

/** data:image/png;base64,AAAA → {data, mimeType} */
function deDataUrl(u: string): ImagemHf | null {
  const m = u.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

/**
 * A resposta de qualquer provedor → imagem em base64. Aceita: bytes de imagem (hf-inference); `data[0].b64_json`
 * (together/nebius); `images[0].url` ou `data[0].url` (fal-ai e afins) — data URL ou link para baixar.
 */
export async function lerResposta(res: Response, fetchImpl: Fetch = fetch): Promise<ImagemHf | null> {
  const tipo = (res.headers.get("content-type") || "").toLowerCase();
  if (tipo.startsWith("image/")) {
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length ? { data: buf.toString("base64"), mimeType: tipo.split(";")[0] } : null;
  }
  const j = (await res.json().catch(() => null)) as
    | { data?: Array<{ b64_json?: string; url?: string }>; images?: Array<{ url?: string; content_type?: string }> }
    | null;
  const b64 = j?.data?.[0]?.b64_json;
  if (b64) return { data: b64, mimeType: "image/png" };
  const url = j?.images?.[0]?.url || j?.data?.[0]?.url;
  if (!url) return null;
  const embutida = deDataUrl(url);
  if (embutida) return embutida;
  if (!/^https:\/\//i.test(url)) return null;
  const r = await fetchImpl(url);
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  const mime = (r.headers.get("content-type") || j?.images?.[0]?.content_type || "image/png").split(";")[0];
  return buf.length ? { data: buf.toString("base64"), mimeType: mime } : null;
}

/** providerId em memória: "modelo|provedor" → id (ou o próprio modelo quando o HF não informou). */
const cacheIds = new Map<string, string>();
export const _limparCacheIds = () => cacheIds.clear();

async function providerId(alvo: AlvoImagem, token: string, fetchImpl: Fetch, timeoutMs: number): Promise<string> {
  if (alvo.provedor === "hf-inference") return alvo.modelo;
  const chave = `${alvo.modelo}|${alvo.provedor}`;
  const visto = cacheIds.get(chave);
  if (visto) return visto;
  let id: string | null = null;
  try {
    const r = await fetchImpl(`${HF_API_URL}/${alvo.modelo}?expand[]=inferenceProviderMapping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(Math.min(timeoutMs, 10_000)),
    });
    if (r.ok) id = providerIdDoMapeamento(await r.json().catch(() => null), alvo.provedor);
  } catch {
    /* sem mapeamento: tenta com o id do HF */
  }
  const final = id || alvo.modelo;
  cacheIds.set(chave, final);
  return final;
}

/** Erro HTTP do provedor, curto e sem o token (vai pro log e, resumido, pro motivo da falha). */
async function erroHttp(res: Response, alvo: AlvoImagem): Promise<string> {
  const corpo = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
  return `${alvo.provedor} ${res.status}${corpo ? `: ${corpo}` : ""}`;
}

/**
 * Gera UMA imagem pelo HF, tentando os alvos em ordem até um responder. Lança com o motivo de cada tentativa
 * quando nenhum responde (quem chama decide a reserva e a mensagem para o aluno).
 */
export async function gerarImagemHf(
  prompt: string,
  opts: { aspectRatio?: string; timeoutMs?: number; env?: Env; fetchImpl?: Fetch } = {},
): Promise<ImagemHf> {
  const env = opts.env ?? process.env;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const token = env.HF_TOKEN?.trim();
  if (!token || !hfImagemDisponivel(env)) throw new Error("imagem pelo Hugging Face desligada (sem HF_TOKEN ou HF_IMAGEM=0)");
  const texto = (prompt || "").trim().slice(0, 1500);
  if (!texto) throw new Error("prompt vazio");

  const prazo = Math.min(opts.timeoutMs ?? hfImagemTimeout(env), hfImagemTimeout(env));
  const fim = Date.now() + Math.max(prazo, opts.timeoutMs ?? 0);
  const tam = tamanhoDaProporcao(opts.aspectRatio);
  const motivos: string[] = [];

  for (const alvo of hfImagemAlvos(env)) {
    const resta = fim - Date.now();
    if (resta < 2_000) { motivos.push("sem tempo para tentar o próximo provedor"); break; }
    const t = Math.min(prazo, resta);
    try {
      const id = await providerId(alvo, token, fetchImpl, t);
      const { url, body } = montarPedido(alvo, id, texto, tam);
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(t),
      });
      if (!res.ok) { motivos.push(await erroHttp(res, alvo)); continue; }
      const img = await lerResposta(res, fetchImpl);
      if (img) return img;
      motivos.push(`${alvo.provedor}: resposta sem imagem`);
    } catch (e) {
      const nome = (e as Error)?.name;
      motivos.push(`${alvo.provedor}: ${nome === "TimeoutError" || nome === "AbortError" ? "demorou demais" : String((e as Error)?.message || e).slice(0, 120)}`);
    }
  }
  throw new Error(`Hugging Face não gerou a imagem (${motivos.join(" | ")})`);
}
