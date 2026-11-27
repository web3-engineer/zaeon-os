/**
 * /api/studio/diag — diagnóstico do Studio (logado). Testa cada capacidade que
 * depende do Vertex e devolve o ERRO REAL (status + corpo), em vez do 502 genérico.
 * Use pra descobrir por que imagem/podcast/vídeo falham (ex.: id de modelo errado,
 * 403 de permissão, multi-speaker não suportado, ffmpeg ausente).
 *
 * #883: a imagem testa PRIMEIRO o Hugging Face (o caminho principal); o Gemini aparece como reserva.
 *
 * Não vaza segredo: só ids de modelo e trechos de mensagem de erro.
 */
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { GoogleAuth } from "google-auth-library";
import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { studioUid } from "@/lib/studio/auth";
import { buildImagenBody } from "@/lib/studio/imagen-request";
import { imageRoute } from "@/lib/studio/imagen";
import { gerarImagemHf, hfImagemAlvos, hfImagemDisponivel } from "@/lib/ai/hf-image";
import { geminiImageModelo } from "@/lib/ai/gemini-image";
import { buildGeminiImageBody, geminiImageLocais, geminiImageUrl, parseGeminiImageResponse } from "@/lib/ai/gemini-image-request";
import { buildTtsBody, buildMultiSpeakerTtsBody } from "@/lib/studio/gemini-tts-request";

export const runtime = "nodejs";
export const maxDuration = 120;

const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-tts";

type Probe = { ok: boolean; status?: number; detail: string; model?: string; location?: string };

async function vertexPost(
  model: string,
  suffix: string,
  body: unknown,
  opts: { location?: string; timeoutMs?: number; okDetail?: (text: string) => Probe } = {},
): Promise<Probe> {
  const { project, client_email, private_key, location: credLocation } = vertexCredentials();
  const location = opts.location || credLocation;
  if (!project || !client_email || !private_key) return { ok: false, detail: "credencial Google ausente" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45_000);
  try {
    const auth = new GoogleAuth({ credentials: { client_email, private_key }, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const token = await auth.getAccessToken();
    if (!token) return { ok: false, detail: "sem access token (auth falhou)" };
    const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
    const url = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}${suffix}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    if (res.ok && opts.okDetail) return { ...opts.okDetail(text), status: res.status };
    return { ok: res.ok, status: res.status, detail: res.ok ? "ok" : text.slice(0, 400) };
  } catch (e: any) {
    return { ok: false, detail: String(e?.message || e).slice(0, 300) };
  } finally {
    clearTimeout(timer);
  }
}

/** #883: gera 1 imagem pelo HF (o caminho principal) e diz qual provedor respondeu ou o motivo de cada um. */
async function probeHf(prompt: string): Promise<Probe & { provedores: string }> {
  const provedores = hfImagemAlvos().map((a) => `${a.modelo}:${a.provedor}`).join(",") || "(HF_IMAGEM_MODELOS inválido)";
  if (!hfImagemDisponivel()) return { ok: false, detail: "desligado (sem HF_TOKEN, ou HF_IMAGEM=0 / HF_RESERVA=0)", provedores };
  try {
    const img = await gerarImagemHf(prompt, { timeoutMs: 45_000 });
    return { ok: true, detail: `ok (${img.mimeType})`, provedores };
  } catch (e) {
    return { ok: false, detail: String((e as Error)?.message || e).slice(0, 400), provedores };
  }
}

function checkFfmpeg(): Promise<Probe> {
  return new Promise((resolve) => {
    try {
      const p = spawn(process.env.FFMPEG_PATH || "ffmpeg", ["-version"]);
      let out = "";
      p.stdout?.on("data", (d) => { out += d.toString(); });
      p.on("error", (e) => resolve({ ok: false, detail: String(e.message) }));
      p.on("close", (c) => resolve({ ok: c === 0, detail: (out.split("\n")[0] || `exit ${c}`).slice(0, 200) }));
    } catch (e: any) {
      resolve({ ok: false, detail: String(e?.message || e) });
    }
  });
}

export async function GET() {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const c = vertexCredentials();
  const route = imageRoute();
  const geminiModel = route.provider === "gemini" ? route.model : geminiImageModelo();
  // 1ª região da rotação (em produção um 429 aqui passa pra próxima; o diag mostra o status cru).
  const geminiLoc = geminiImageLocais(process.env.GEMINI_IMAGE_LOCATIONS)[0];
  const probePrompt = "a simple red circle on white background";
  const [imagemHf, imagem, imagenOverride, ttsSingle, ttsMulti, ffmpeg] = await Promise.all([
    probeHf(probePrompt),
    vertexPost(geminiModel, ":generateContent", buildGeminiImageBody(probePrompt), {
      location: geminiLoc,
      okDetail: (text) => {
        let json: unknown = null;
        try { json = JSON.parse(text); } catch { /* corpo não-JSON */ }
        const out = parseGeminiImageResponse(json);
        return "motivo" in out ? { ok: false, detail: out.motivo } : { ok: true, detail: `ok (${out.mimeType})` };
      },
    }).then((p) => ({ ...p, model: geminiModel, location: geminiLoc })),
    route.provider === "imagen"
      ? vertexPost(route.model, ":predict", buildImagenBody(probePrompt)).then((p) => ({ ...p, model: route.model, location: c.location }))
      : Promise.resolve(null),
    vertexPost(TTS_MODEL, ":generateContent", buildTtsBody("teste de voz", "Kore")),
    vertexPost(TTS_MODEL, ":generateContent", buildMultiSpeakerTtsBody("Ana: Olá.\nLeo: E aí?", [
      { speaker: "Ana", voiceName: "Kore" },
      { speaker: "Leo", voiceName: "Charon" },
    ])),
    checkFfmpeg(),
  ]);

  return NextResponse.json({
    env: {
      location: c.location,
      project: c.project ? `${c.project.slice(0, 6)}…` : "(ausente)",
      hasCreds: !!(c.project && c.client_email && c.private_key),
      IMAGEN_MODEL: process.env.IMAGEN_MODEL || "(não definido → Gemini image)",
      GEMINI_IMAGE_MODEL: geminiModel,
      GEMINI_IMAGE_LOCATIONS: geminiImageLocais(process.env.GEMINI_IMAGE_LOCATIONS).join(","),
      imagem_via: hfImagemDisponivel()
        ? `hugging face → reserva ${route.provider === "imagen" ? `imagen (${route.model}) → gemini` : "gemini"}`
        : route.provider === "imagen" ? `imagen (${route.model}) → fallback gemini` : "gemini",
      GEMINI_TTS_MODEL: TTS_MODEL,
    },
    imagem: imagemHf,
    imagem_reserva_google: imagem,
    ...(imagenOverride ? { imagem_imagen_override: imagenOverride } : {}),
    voz_narracao: ttsSingle,
    voz_podcast_multi: ttsMulti,
    ffmpeg,
  });
}
