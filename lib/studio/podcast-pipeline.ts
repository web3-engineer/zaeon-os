/**
 * Geração do podcast (IMPURA): roteiro (Gemini) → voz TURNO-A-TURNO (Gemini-TTS,
 * voz única por locutor — o caminho que já funciona) → concatena os WAVs → grava em
 * .studio/<id>.wav e marca o artefato como done.
 *
 * Por que turno-a-turno e não multi-speaker numa tacada: o modelo de TTS em uso faz
 * 1 voz com confiabilidade, mas o multi-speaker pode não estar disponível. Sintetizar
 * cada fala com a voz do seu locutor garante o podcast funcionando.
 *
 * Roda em FIRE-AND-FORGET: a rota cria o artefato (queued) e chama isto sem await;
 * o cliente faz polling em /api/studio/[id]. Funciona porque o app é um servidor
 * Node de longa duração (server.js), não função serverless que congela após a resposta.
 */
import { prisma } from "@/src/lib/prisma";
import { geminiJson } from "@/lib/scholar/gemini";
import { synthGeminiTTS } from "@/lib/voice/gemini-tts";
import { concatWav } from "@/lib/studio/wav";
import { writeStudioFile } from "@/lib/studio/storage";
import {
  defaultHosts,
  buildOutlinePrompt,
  buildTranscriptPrompt,
  normalizeOutline,
  normalizeTranscript,
  type PodcastOptions,
} from "@/lib/studio/podcast";

// Vozes dos 2 apresentadores (nomes prebuilt do Gemini-TTS; override por env).
// Feminina = Leda (voz premium padrão da casa); masculina = Charon.
const VOICE_F = process.env.ZAEON_TTS_VOICE_F || "Leda";
const VOICE_M = process.env.ZAEON_TTS_VOICE_M || "Charon";

export async function runPodcastGeneration(
  artId: string,
  content: string,
  options: PodcastOptions,
): Promise<void> {
  try {
    await prisma.studioArtifact.update({ where: { id: artId }, data: { status: "running" } });

    const hosts = defaultHosts(options);

    // 1) roteiro — esboço e depois o diálogo completo (Gemini JSON)
    const outlineP = buildOutlinePrompt(content, hosts, options);
    const outline = normalizeOutline(await geminiJson<any>(outlineP.system, outlineP.user, { timeoutMs: 60_000 }));

    const transcriptP = buildTranscriptPrompt(content, outline, hosts, options);
    const transcript = normalizeTranscript(
      await geminiJson<any>(transcriptP.system, transcriptP.user, { timeoutMs: 90_000 }),
      hosts,
    );

    // 2) voz — sintetiza cada turno com a voz do locutor (single-voice, confiável),
    //    EM PARALELO (lotes), mantendo a ordem, e concatena. Sequencial estourava o
    //    tempo (30 turnos × 45s); em lotes de 5 o podcast fica em ~1–2 min.
    const voiceFor = (speaker: string) => (speaker === hosts[1].name ? VOICE_M : VOICE_F);
    const turns = transcript.filter((t) => t.text.trim());
    const CONC = 5;
    const parts: (Buffer | null)[] = new Array(turns.length).fill(null);
    for (let i = 0; i < turns.length; i += CONC) {
      const batch = turns.slice(i, i + CONC);
      const got = await Promise.all(
        batch.map((t) =>
          synthGeminiTTS(t.text, voiceFor(t.speaker), 30_000)
            .then((a) => (a?.audio_base64 ? Buffer.from(a.audio_base64, "base64") : null))
            .catch((e) => { console.warn("[podcast] turno falhou:", (e as Error)?.message); return null; }),
        ),
      );
      got.forEach((b, j) => { parts[i + j] = b; });
    }
    const wavs = parts.filter((b): b is Buffer => b !== null);
    if (!wavs.length) throw new Error("Síntese de voz do podcast falhou (verifique GEMINI_TTS_MODEL).");

    const merged = concatWav(wavs);
    await writeStudioFile(artId, "wav", merged);

    await prisma.studioArtifact.update({
      where: { id: artId },
      data: {
        status: "done",
        mime: "audio/wav",
        storageRef: "wav",
        meta: { transcript, outline, hosts, options } as any,
      },
    });
  } catch (e: any) {
    await prisma.studioArtifact.update({
      where: { id: artId },
      data: { status: "error", error: String(e?.message || e).slice(0, 500) },
    });
  }
}
