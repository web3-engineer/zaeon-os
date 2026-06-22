/**
 * Geração do podcast (IMPURA): roteiro (Gemini) → voz multi-speaker (Gemini-TTS) →
 * concatena os WAVs → grava em .studio/<id>.wav e marca o artefato como done.
 *
 * Roda em FIRE-AND-FORGET: a rota cria o artefato (queued) e chama isto sem await;
 * o cliente faz polling em /api/studio/[id]. Funciona porque o app é um servidor
 * Node de longa duração (server.js), não função serverless que congela após a resposta.
 */
import { prisma } from "@/src/lib/prisma";
import { geminiJson } from "@/lib/scholar/gemini";
import { geminiTTSMulti } from "@/lib/voice/gemini-tts";
import { ZAEON_VOICE_F, ZAEON_VOICE_M } from "@/lib/voice/gemini-voices";
import { concatWav } from "@/lib/studio/wav";
import { writeStudioFile } from "@/lib/studio/storage";
import {
  defaultHosts,
  buildOutlinePrompt,
  buildTranscriptPrompt,
  normalizeOutline,
  normalizeTranscript,
  chunkTurnsForTTS,
  type PodcastOptions,
} from "@/lib/studio/podcast";

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

    // 2) voz — multi-speaker (até 2 vozes); chunk por tamanho, concatena os WAVs
    const speakers = hosts.map((h) => ({ speaker: h.name, voiceName: h.gender === "f" ? ZAEON_VOICE_F : ZAEON_VOICE_M }));
    const chunks = chunkTurnsForTTS(transcript, 2500);
    const wavs: Buffer[] = [];
    for (const text of chunks) {
      const audio = await geminiTTSMulti(text, speakers, { timeoutMs: 120_000 });
      if (audio?.audio_base64) wavs.push(Buffer.from(audio.audio_base64, "base64"));
    }
    if (!wavs.length) throw new Error("TTS multi-speaker não retornou áudio (modelo Gemini-TTS habilitado no projeto?)");

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
