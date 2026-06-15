/**
 * POST /api/study/youtube — sugestões de vídeos do YouTube sobre um assunto.
 *
 * Engine de descoberta de vídeos para a Sala de Estudos. Dois modos:
 *   1) Se houver YOUTUBE_API_KEY → usa a YouTube Data API v3 (vídeos REAIS, com
 *      videoId embutível no feed da sala).
 *   2) Sem a chave → fallback com Gemini Flash: sugere títulos/canais prováveis e
 *      um link de BUSCA no YouTube para cada (não embutível, mas já orienta).
 *
 * Retorno: { mode, videos: [{ title, channel, videoId?, url, thumbnail?, watchable }] }
 * `watchable` = true quando há videoId (dá pra assistir dentro da sala).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { geminiText } from "@/lib/ai/gemini-text";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (topic.length < 2) return NextResponse.json({ error: "Tema inválido." }, { status: 400 });

  const key = process.env.YOUTUBE_API_KEY;

  // ── Modo 1: YouTube Data API (vídeos reais, embutíveis) ──────────────────────
  if (key) {
    try {
      // videoEmbeddable=true = só vídeos assistíveis embutidos na sala. (videoSyndicated
      // é restritivo demais e zerava resultados, então ficou de fora.)
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&safeSearch=moderate&relevanceLanguage=pt&videoEmbeddable=true&q=${encodeURIComponent(topic)}&key=${key}`;
      const r = await fetch(url);
      const d = await r.json();
      if (r.ok && Array.isArray(d.items)) {
        const videos = d.items
          .filter((it: any) => it?.id?.videoId)
          .map((it: any) => ({
            title: it.snippet?.title ?? "Vídeo",
            channel: it.snippet?.channelTitle ?? "",
            videoId: it.id.videoId,
            url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
            thumbnail: it.snippet?.thumbnails?.medium?.url ?? null,
            watchable: true,
          }));
        return NextResponse.json({ mode: "youtube-api", topic, videos });
      }
    } catch { /* cai no fallback */ }
  }

  // ── Modo 2: fallback com Gemini (sugestões + links de busca) ────────────────
  try {
    const raw = await geminiText({
      temperature: 0.4,
      system: "Você sugere vídeos do YouTube para estudo. Responda SOMENTE um array JSON, sem markdown, no formato [{\"title\":\"...\",\"channel\":\"...\",\"query\":\"termos de busca\"}], com 6 itens em português, do mais didático ao mais avançado.",
      prompt: `Assunto: ${topic}`,
    });
    let arr: any[] = [];
    try { arr = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { arr = []; }
    const videos = (Array.isArray(arr) ? arr : []).slice(0, 6).map((v: any) => ({
      title: String(v.title || "Vídeo sugerido"),
      channel: String(v.channel || ""),
      videoId: null,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(v.query || v.title || topic)}`,
      thumbnail: null,
      watchable: false,
    }));
    return NextResponse.json({ mode: "gemini-fallback", topic, videos, note: "Configure YOUTUBE_API_KEY para vídeos embutíveis." });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_error", message: "Não consegui sugerir vídeos agora." }, { status: 502 });
  }
}
