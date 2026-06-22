/**
 * Vídeo Overview do ZAEON Studio — núcleo PURO (sem rede/fs): prompt do roteiro,
 * normalização das cenas e construção dos ARGUMENTOS do ffmpeg. Testável sem rodar
 * nada. (Nível A: 1 imagem por cena + narração + montagem slideshow via ffmpeg.)
 */

const asArr = (v: any): any[] => (Array.isArray(v) ? v : []);
const asStr = (v: any): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export interface VideoOptions {
  sections?: number; // nº de cenas alvo (3–6)
  language?: string;
  tone?: string;
}

export interface VideoSection {
  narration: string; // texto narrado (pt-BR)
  bullets: string[]; // tópicos na tela
  imagePrompt: string; // prompt da imagem (en)
}

function numSections(opts?: VideoOptions): number {
  return clamp(Math.round(opts?.sections ?? 4), 3, 6);
}

export function buildVideoScriptPrompt(content: string, opts?: VideoOptions) {
  const n = numSections(opts);
  return {
    system: `Você roteiriza um VÍDEO-resumo educativo da Zaeon. Escreve em português do Brasil, didático e fiel ao material (não inventa).
Crie ${n} cenas. Cada cena tem: narração (2–4 frases), de 2 a 4 tópicos curtos pra tela, e um prompt de imagem EM INGLÊS (ilustração/diagrama, sem texto na imagem).
FORMATO (JSON):
{ "sections": [ { "narration": "...", "bullets": ["...","..."], "imagePrompt": "..." } ] }
Responda SOMENTE com o JSON.`,
    user: `Material de estudo:\n<material>\n${content.slice(0, 24000)}\n</material>\n\nGere o roteiro em ${n} cenas.`,
  };
}

export function normalizeVideoScript(raw: any): VideoSection[] {
  const sections = asArr(raw?.sections ?? raw?.cenas ?? raw?.slides ?? raw?.scenes)
    .map((s: any) => ({
      narration: asStr(s?.narration ?? s?.narracao ?? s?.text ?? s?.fala).trim(),
      bullets: asArr(s?.bullets ?? s?.topicos ?? s?.points ?? s?.topics).map(asStr).map((b) => b.trim()).filter(Boolean),
      imagePrompt: asStr(s?.imagePrompt ?? s?.image ?? s?.imagem ?? s?.prompt).trim(),
    }))
    .filter((s) => s.narration);
  if (!sections.length) throw new Error("Roteiro de vídeo vazio");
  return sections;
}

// ───────────────────────── ffmpeg (args puros) ─────────────────────────

export interface ClipArgsInput {
  image: string;
  audio: string;
  out: string;
  width?: number;
  height?: number;
}

/** Args do ffmpeg pra UMA cena: imagem parada + narração → mp4 (dura o áudio). */
export function sectionClipArgs(i: ClipArgsInput): string[] {
  const w = i.width ?? 1280;
  const h = i.height ?? 720;
  return [
    "-y",
    "-loop", "1",
    "-i", i.image,
    "-i", i.audio,
    "-c:v", "libx264",
    "-tune", "stillimage",
    "-c:a", "aac",
    "-b:a", "192k",
    "-pix_fmt", "yuv420p",
    "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
    "-shortest",
    i.out,
  ];
}

/** Conteúdo do arquivo de lista do concat demuxer (com escape de aspas). */
export function concatListContent(files: string[]): string {
  return files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n") + "\n";
}

/** Args do ffmpeg pra concatenar os clipes (mesmo codec → copy, rápido). */
export function concatArgs(listPath: string, out: string): string[] {
  return ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", out];
}
