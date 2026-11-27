/**
 * VÍDEO DO DOCUMENTO — a GERAÇÃO (servidor, sem GPU). Roteiro (Gemini) → checagem contra o texto (Gemini) → narração
 * FRASE A FRASE com a voz da Zaeon (Gemini TTS, Leda) → um WAV só, com o início de cada frase no `meta` (a duração de
 * cada WAV dá o tempo exato — sem alinhador de fala). O player do navegador sincroniza slides, tópicos e o destaque
 * por esses tempos, e a boca do holograma pelo volume. Grava em `.studio/<id>.wav` + `StudioArtifact.meta`.
 */
import { readWav } from "@/lib/studio/wav";
import { CHECAGEM_SYSTEM, ROTEIRO_SYSTEM, frasesEmOrdem, inicios, lerRoteiro, promptChecagem, promptRoteiro, type Roteiro } from "./roteiro";

export const VOZ_ZAEON = "leda";
/** Frases narradas ao mesmo tempo. A cota do gemini-2.5-flash-tts é por MINUTO e por projeto (regional): com 4 em
 *  paralelo, a 1ª prova em prod (2026-10-22) levou 429 e o vídeo inteiro caiu. */
const TTS_PARALELO = 2;

/** 429 de cota (Vertex) — espera e tenta de novo; outro erro relança na hora. */
export const ehCota429 = (e: unknown): boolean => /_http_429\b|RESOURCE_EXHAUSTED|quota exceeded/i.test((e as Error)?.message ?? String(e));

/** Espera antes da tentativa `i` (0-based) depois de um 429: 8 s, 16 s, 32 s, 60 s… */
export const esperaCota = (i: number): number => Math.min(60_000, 8_000 * 2 ** i);

/** Chama `fn`; num 429, espera (esperaCota) e tenta de novo até `tentativas` vezes no total. */
export async function comEsperaDeCota<T>(fn: () => Promise<T>, tentativas = 6, dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) {
      if (!ehCota429(e) || i >= tentativas - 1) throw e;
      await dormir(esperaCota(i));
    }
  }
}

export type GerarDeps = {
  gen: <T>(system: string, user: string) => Promise<T>;
  tts: (texto: string) => Promise<Buffer>;   // um WAV
  concat: (wavs: Buffer[]) => Buffer;
  gravar: (artId: string, wav: Buffer) => Promise<void>;
  marcar: (artId: string, data: { status: "running" | "done" | "error"; meta?: unknown; error?: string; mime?: string; storageRef?: string }) => Promise<void>;
};
export type MetaVideoDoc = { chave: string; publico: boolean; blueprints: string[]; documento: { titulo: string; tipo: string; url?: string }; roteiro?: Roteiro; tempos?: number[]; duracao?: number };

/** duração de um WAV em segundos */
export function duracaoWav(wav: Buffer): number {
  const { fmt, data } = readWav(wav);
  return data.length / (fmt.sampleRate * fmt.channels * (fmt.bitsPerSample / 8));
}

export async function gerarVideoDoc(artId: string, entrada: { titulo: string; texto: string; meta: MetaVideoDoc }, d: GerarDeps): Promise<"done" | "error"> {
  try {
    await d.marcar(artId, { status: "running" });
    const bruto = lerRoteiro(await d.gen<unknown>(ROTEIRO_SYSTEM, promptRoteiro(entrada)));
    if (!bruto) throw new Error("o roteiro não saiu (o documento tem texto suficiente?)");
    // a checagem só troca o roteiro se devolver um válido (falhou → fica o primeiro)
    const roteiro = lerRoteiro(await d.gen<unknown>(CHECAGEM_SYSTEM, promptChecagem(bruto, entrada.texto)).catch(() => null)) ?? bruto;
    const frases = frasesEmOrdem(roteiro), wavs: Buffer[] = new Array(frases.length);
    for (let i = 0; i < frases.length; i += TTS_PARALELO) {
      const lote = frases.slice(i, i + TTS_PARALELO);
      const got = await Promise.all(lote.map((f) => d.tts(f.fala)));
      got.forEach((w, k) => { wavs[i + k] = w; });
    }
    const { tempos, total } = inicios(wavs.map(duracaoWav));
    await d.gravar(artId, d.concat(wavs));
    await d.marcar(artId, { status: "done", mime: "audio/wav", storageRef: "wav", meta: { ...entrada.meta, roteiro, tempos, duracao: total } });
    return "done";
  } catch (e: unknown) {
    await d.marcar(artId, { status: "error", error: (e instanceof Error ? e.message : String(e)).slice(0, 300), meta: entrada.meta }).catch(() => null);
    return "error";
  }
}

/** as dependências reais (Vertex + storage do Studio + Prisma) */
export async function depsReais(userId: string): Promise<GerarDeps> {
  const [{ geminiJson }, { GEMINI_MODEL_FLASH }, { sintetizarVoz }, { concatWav }, { writeStudioFile }, { prisma }] = await Promise.all([
    import("@/lib/scholar/gemini"), import("@/lib/ai/model"), import("@/lib/voice/sintetizar"), import("@/lib/studio/wav"), import("@/lib/studio/storage"), import("@/src/lib/prisma"),
  ]);
  return {
    gen: <T,>(system: string, user: string) => geminiJson<T>(system, user, { temperature: 0.3, model: GEMINI_MODEL_FLASH, timeoutMs: 90_000, ctx: { agentKey: "zaeon", surface: "estudos", userId, phase: "videodoc" } }),
    tts: async (texto) => {
      const a = await comEsperaDeCota(() => sintetizarVoz(texto, VOZ_ZAEON, 45_000));
      if (!a?.audio_base64) throw new Error("a voz da Zaeon falhou");
      return Buffer.from(a.audio_base64, "base64");
    },
    concat: concatWav,
    gravar: async (artId, wav) => { await writeStudioFile(artId, "wav", wav); },
    // o `meta` é relido e MESCLADO: blueprints que ganharam acesso durante a geração (minutos) não se perdem
    marcar: async (artId, data) => {
      let d: Record<string, unknown> = data;
      if (data.meta) {
        const atual = await prisma.studioArtifact.findUnique({ where: { id: artId }, select: { meta: true } });
        const m0 = (atual?.meta ?? {}) as Partial<MetaVideoDoc>, m1 = data.meta as MetaVideoDoc;
        d = { ...data, meta: { ...m0, ...m1, blueprints: [...new Set([...(m0.blueprints ?? []), ...(m1.blueprints ?? [])])].slice(-50) } };
      }
      await prisma.studioArtifact.update({ where: { id: artId }, data: d as never });
    },
  };
}
