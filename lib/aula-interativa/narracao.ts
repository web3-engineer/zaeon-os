/**
 * lib/aula-interativa/narracao.ts — a voz da aula (servidor): voz da Zaeon (#883: HF primeiro, lib/voice/sintetizar) → WAV → MP3 (ffmpeg, que já está no
 * container por causa do Studio). Sem ffmpeg (dev local) fica em WAV — toca igual, só pesa ~6×.
 */
import { spawn } from "node:child_process";
import { sintetizarVoz } from "@/lib/voice/sintetizar";
import { writeStudioFile } from "@/lib/studio/storage";
import { duracaoWav } from "@/lib/aula-interativa/tempo";
import type { GravarAudio, Narracao, Sintetizar } from "@/lib/aula-interativa/gerar";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

function wavParaMp3(wav: Buffer): Promise<Buffer | null> {
  return new Promise((resolve) => {
    let out: Buffer[] = [];
    let p;
    try {
      p = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "64k", "-f", "mp3", "pipe:1"], { stdio: ["pipe", "pipe", "ignore"] });
    } catch { return resolve(null); }
    const t = setTimeout(() => { p.kill("SIGKILL"); resolve(null); }, 30_000);
    p.on("error", () => { clearTimeout(t); resolve(null); });
    p.stdout.on("data", (d: Buffer) => out.push(d));
    p.on("close", (code: number) => { clearTimeout(t); resolve(code === 0 && out.length ? Buffer.concat(out) : null); });
    p.stdin.on("error", () => { /* ffmpeg morreu antes de ler tudo */ });
    p.stdin.end(wav);
  });
}

export const sintetizarGemini: Sintetizar = async (texto) => {
  const r = await sintetizarVoz(texto, undefined, 60_000);
  const wav = Buffer.from(r.audio_base64, "base64");
  const duracao = duracaoWav(wav);
  if (!duracao) return null;
  const mp3 = await wavParaMp3(wav);
  return mp3 ? { audio: mp3, ext: "mp3", duracao } : { audio: wav, ext: "wav", duracao };
};

/** Grava `.studio/<artefato>-<beat>.<ext>` e devolve a extensão (é o que a rota de áudio precisa). */
export const gravarEmStudio = (artId: string): GravarAudio => async (beatId: string, n: Narracao) => {
  await writeStudioFile(`${artId}-${beatId}`, n.ext, n.audio);
  return n.ext;
};
