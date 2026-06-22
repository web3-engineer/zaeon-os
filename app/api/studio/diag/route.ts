/**
 * /api/studio/diag — diagnóstico do Studio (logado). Testa cada capacidade que
 * depende do Vertex e devolve o ERRO REAL (status + corpo), em vez do 502 genérico.
 * Use pra descobrir por que imagem/podcast/vídeo falham (ex.: id de modelo errado,
 * 403 de permissão, multi-speaker não suportado, ffmpeg ausente).
 *
 * Não vaza segredo: só ids de modelo e trechos de mensagem de erro.
 */
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { GoogleAuth } from "google-auth-library";
import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { studioUid } from "@/lib/studio/auth";
import { buildImagenBody } from "@/lib/studio/imagen-request";
import { buildTtsBody, buildMultiSpeakerTtsBody } from "@/lib/studio/gemini-tts-request";

export const runtime = "nodejs";
export const maxDuration = 120;

const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-tts";
const IMAGEN_MODEL = process.env.IMAGEN_MODEL || "imagen-4.0-generate-001";

type Probe = { ok: boolean; status?: number; detail: string };

async function vertexPost(model: string, suffix: string, body: unknown, timeoutMs = 45_000): Promise<Probe> {
  const { project, client_email, private_key, location } = vertexCredentials();
  if (!project || !client_email || !private_key) return { ok: false, detail: "credencial Google ausente" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const auth = new GoogleAuth({ credentials: { client_email, private_key }, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const token = await auth.getAccessToken();
    if (!token) return { ok: false, detail: "sem access token (auth falhou)" };
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}${suffix}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, detail: res.ok ? "ok" : text.slice(0, 400) };
  } catch (e: any) {
    return { ok: false, detail: String(e?.message || e).slice(0, 300) };
  } finally {
    clearTimeout(timer);
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
  const [imagen, ttsSingle, ttsMulti, ffmpeg] = await Promise.all([
    vertexPost(IMAGEN_MODEL, ":predict", buildImagenBody("a simple red circle on white background")),
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
      IMAGEN_MODEL,
      GEMINI_TTS_MODEL: TTS_MODEL,
    },
    imagem: imagen,
    voz_narracao: ttsSingle,
    voz_podcast_multi: ttsMulti,
    ffmpeg,
  });
}
