/**
 * Imagem didática do Studio (chat, estudo, prancha da cartolina, cenas do vídeo).
 *
 * #883 (tirar o Google da equação): com HF_TOKEN, o caminho PRINCIPAL é o Hugging Face (lib/ai/hf-image.ts, FLUX).
 * O Google abaixo vira só a reserva enquanto a credencial existir (sai de vez na parte 6 do #883).
 *
 * Reserva Google: Gemini image (lib/ai/gemini-image.ts, `:generateContent` com rotação de região
 * no 429). O Imagen (Vertex `:predict`) virou override opcional: no projeto atual todos os
 * ids `imagen-*` respondem 404 (out/2026). Ver resolveImageRoute pro papel do IMAGEN_MODEL.
 * Se o override Imagen falhar, cai pro Gemini image. Sem credencial → indisponível.
 */
import { GoogleAuth } from "google-auth-library";
import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { gerarImagemGemini, geminiImageDisponivel, geminiImageModelo } from "@/lib/ai/gemini-image";
import { gerarImagemHf, hfImagemDisponivel } from "@/lib/ai/hf-image";
import {
  buildImagenBody,
  parseImagenResponse,
  resolveImageRoute,
  type ImageRoute,
  type ImagenOptions,
} from "@/lib/studio/imagen-request";

export interface GeneratedImage {
  data: string; // base64
  mimeType: string; // image/png
}

/** Qual caminho (Gemini/Imagen) e modelo a geração vai usar agora. */
export function imageRoute(): ImageRoute {
  return resolveImageRoute(process.env.IMAGEN_MODEL, geminiImageModelo());
}

/** Há um caminho de imagem: o Hugging Face (principal, #883) ou, enquanto existir, a credencial Google. */
export function imagenAvailable(): boolean {
  return hfImagemDisponivel() || geminiImageDisponivel();
}

/** Igual a generateImage, mas devolve o motivo da falha (cota, recusa, timeout…). */
export async function generateImageResult(
  prompt: string,
  opts?: ImagenOptions,
  timeoutMs = 60_000,
): Promise<{ image: GeneratedImage } | { error: string }> {
  const clean = (prompt || "").trim().slice(0, 1500);
  if (!clean) return { error: "prompt vazio" };
  if (!imagenAvailable()) return { error: "geração de imagem indisponível (sem HF_TOKEN e sem credencial Google)" };

  // #883: o Hugging Face primeiro. Falhou e há credencial Google → tenta a reserva; senão devolve o motivo do HF.
  // UM prazo só para os dois: `timeoutMs` é o teto do pedido inteiro, não de cada provedor — a rota (maxDuration)
  // precisa de folga para gravar o resultado e responder.
  const fim = Date.now() + timeoutMs;
  let motivoHf: string | null = null;
  if (hfImagemDisponivel()) {
    try {
      // com reserva Google, o HF fica com 2/3 do prazo; sem reserva, com o prazo todo
      const parteHf = geminiImageDisponivel() ? Math.round((timeoutMs * 2) / 3) : timeoutMs;
      return { image: await gerarImagemHf(clean, { aspectRatio: opts?.aspectRatio, timeoutMs: parteHf }) };
    } catch (e) {
      motivoHf = String((e as Error)?.message || e).slice(0, 300);
      console.warn("[hf-image] erro:", motivoHf);
      if (!geminiImageDisponivel()) return { error: motivoHf };
    }
  }
  const resta = fim - Date.now();
  if (resta < 5_000) return { error: motivoHf ? `${motivoHf} | reserva Google: sem tempo` : "sem tempo para gerar a imagem" };
  timeoutMs = resta;

  const route = imageRoute();
  if (route.provider === "imagen") {
    const img = await generateImagenPredict(route.model, clean, opts, timeoutMs);
    if (img) return { image: img };
    console.warn(`[imagen] ${route.model} falhou — caindo pro Gemini image`);
  }
  try {
    // o Gemini troca de região e espera entre voltas: o relógio do pedido inteiro corta o que passar de `fim`
    const sobra = Math.max(1_000, fim - Date.now());
    let relogio: ReturnType<typeof setTimeout> | undefined;
    const image = await Promise.race([
      gerarImagemGemini(clean, {
        model: route.provider === "gemini" ? route.model : geminiImageModelo(),
        aspectRatio: opts?.aspectRatio,
        timeoutMs: sobra,
        esperaMaxMs: Math.min(20_000, sobra),
      }),
      new Promise<never>((_, rej) => { relogio = setTimeout(() => rej(new Error("demorou demais")), sobra); }),
    ]).finally(() => clearTimeout(relogio));
    return { image };
  } catch (e) {
    const error = String((e as Error)?.message || e).slice(0, 300);
    console.warn("[gemini-image] erro:", error);
    return { error: motivoHf ? `${motivoHf} | reserva Google: ${error}`.slice(0, 500) : error };
  }
}

/** Gera 1 imagem; null em qualquer falha (o motivo vai pro log). */
export async function generateImage(
  prompt: string,
  opts?: ImagenOptions,
  timeoutMs = 60_000,
): Promise<GeneratedImage | null> {
  const r = await generateImageResult(prompt, opts, timeoutMs);
  return "image" in r ? r.image : null;
}

/** Caminho legado: Imagen via Vertex `:predict` (só com IMAGEN_MODEL=imagen-*). */
async function generateImagenPredict(
  model: string,
  prompt: string,
  opts: ImagenOptions | undefined,
  timeoutMs: number,
): Promise<GeneratedImage | null> {
  const { project, client_email, private_key, location } = vertexCredentials();
  if (!project || !client_email || !private_key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const auth = new GoogleAuth({
      credentials: { client_email, private_key },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const token = await auth.getAccessToken();
    if (!token) return null;

    const url =
      `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
      `/locations/${location}/publishers/google/models/${model}:predict`;

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildImagenBody(prompt, opts)),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn("[imagen] HTTP", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return null;
    }
    const json = await res.json().catch(() => null);
    return parseImagenResponse(json);
  } catch (e) {
    console.warn("[imagen] erro:", (e as Error)?.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
