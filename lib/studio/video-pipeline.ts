/**
 * Geração do Vídeo Overview (IMPURA) — Nível A: roteiro (Gemini) → 1 imagem por
 * cena (Gemini image) + narração (Gemini-TTS) → monta um slideshow .mp4 com ffmpeg.
 *
 * Fire-and-forget (servidor de longa duração, server.js): a rota cria o artefato
 * (queued) e o cliente faz polling em /api/studio/[id]. Requer ffmpeg no container
 * (ver Dockerfile). Sem imagem/TTS habilitados, marca erro tratado.
 */
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/src/lib/prisma";
import { geminiJson } from "@/lib/scholar/gemini";
import { generateImageResult } from "@/lib/studio/imagen";
import { synthGeminiTTS } from "@/lib/voice/gemini-tts";
import { writeStudioFile, studioDir } from "@/lib/studio/storage";
import {
  buildVideoScriptPrompt,
  normalizeVideoScript,
  sectionClipArgs,
  concatArgs,
  concatListContent,
  type VideoOptions,
} from "@/lib/studio/video";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

function runFfmpeg(args: string[], timeoutMs = 120_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    const timer = setTimeout(() => { proc.kill("SIGKILL"); reject(new Error("ffmpeg timeout")); }, timeoutMs);
    proc.stderr?.on("data", (d) => { err = (err + d.toString()).slice(-2000); });
    proc.on("error", (e) => { clearTimeout(timer); reject(e); });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg saiu ${code}: ${err.slice(-400)}`));
    });
  });
}

export async function runVideoGeneration(artId: string, content: string, options: VideoOptions): Promise<void> {
  const tmp = path.join(studioDir(), `tmp-${artId}`);
  try {
    await prisma.studioArtifact.update({ where: { id: artId }, data: { status: "running" } });

    const sp = buildVideoScriptPrompt(content, options);
    const script = normalizeVideoScript(await geminiJson<any>(sp.system, sp.user, { timeoutMs: 60_000 }));

    await fs.mkdir(tmp, { recursive: true });

    // Uma cena = imagem (Gemini image) + narração (Gemini-TTS) → clipe mp4.
    const clips: string[] = [];
    let motivoImagem: string | null = null; // #883: o porquê da imagem que falhou chega ao aluno ("fora do ar")
    for (let i = 0; i < script.length; i++) {
      const sec = script[i];
      const ri = await generateImageResult(sec.imagePrompt || sec.narration, { aspectRatio: "16:9" }, 45_000);
      const img = "image" in ri ? ri.image : null;
      if ("error" in ri) motivoImagem = ri.error;
      const narr = await synthGeminiTTS(sec.narration, undefined, 45_000).catch(() => null);
      if (!img?.data || !narr?.audio_base64) { console.warn(`[video] cena ${i} sem mídia (img=${!!img?.data} narr=${!!narr?.audio_base64})`); continue; }
      const imgPath = path.join(tmp, `s${i}.png`);
      const audPath = path.join(tmp, `s${i}.wav`);
      const clipPath = path.join(tmp, `s${i}.mp4`);
      await fs.writeFile(imgPath, Buffer.from(img.data, "base64"));
      await fs.writeFile(audPath, Buffer.from(narr.audio_base64, "base64"));
      await runFfmpeg(sectionClipArgs({ image: imgPath, audio: audPath, out: clipPath }));
      clips.push(clipPath);
    }
    if (!clips.length) {
      throw new Error(motivoImagem ? `Nenhuma cena pôde ser gerada: ${motivoImagem}` : "Nenhuma cena pôde ser gerada (sem narração).");
    }

    let finalBuf: Buffer;
    if (clips.length === 1) {
      finalBuf = await fs.readFile(clips[0]);
    } else {
      const listPath = path.join(tmp, "list.txt");
      await fs.writeFile(listPath, concatListContent(clips));
      const finalPath = path.join(tmp, "final.mp4");
      await runFfmpeg(concatArgs(listPath, finalPath));
      finalBuf = await fs.readFile(finalPath);
    }

    await writeStudioFile(artId, "mp4", finalBuf);
    await prisma.studioArtifact.update({
      where: { id: artId },
      data: { status: "done", mime: "video/mp4", storageRef: "mp4", meta: { script, options } as any },
    });
  } catch (e: any) {
    await prisma.studioArtifact.update({
      where: { id: artId },
      data: { status: "error", error: String(e?.message || e).slice(0, 500) },
    });
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
