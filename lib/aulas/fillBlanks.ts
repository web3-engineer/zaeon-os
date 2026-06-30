/**
 * Primitiva "fill-blanks" (cloze + dragwords) — PURA/testável.
 * Marcador de lacuna: *palavra* (a palavra entre asteriscos é a resposta).
 */
import { normalize } from "@/lib/aulas/normalize";

export type FillPart = { t: "text"; s: string } | { t: "blank"; i: number };
export type FillModel = { parts: FillPart[]; answers: string[]; bank: string[] };

const MARK = /\*([^*]+)\*/g;

function parseMarked(text: string): { parts: FillPart[]; answers: string[] } {
  const parts: FillPart[] = [];
  const answers: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MARK.lastIndex = 0;
  while ((m = MARK.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: "text", s: text.slice(last, m.index) });
    parts.push({ t: "blank", i: answers.length });
    answers.push(m[1].trim());
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: "text", s: text.slice(last) });
  if (parts.length === 0) parts.push({ t: "text", s: "" });
  return { parts, answers };
}

export function parseCloze(text: string): FillModel {
  const { parts, answers } = parseMarked(String(text || ""));
  return { parts, answers, bank: [...answers] };
}

export function parseDragwords(cfg: { sentence?: string; words?: string[] }): FillModel {
  const { parts, answers } = parseMarked(String(cfg?.sentence || ""));
  const extra = Array.isArray(cfg?.words) ? cfg!.words!.filter((w) => typeof w === "string" && w.trim()).map((w) => w.trim()) : [];
  return { parts, answers, bank: [...answers, ...extra] };
}

export function gradeBlanks(answers: string[], submitted: (string | null)[]): { correct: number; total: number; perBlank: boolean[] } {
  const perBlank: boolean[] = [];
  let correct = 0;
  for (let i = 0; i < answers.length; i++) {
    const s = normalize(submitted[i] ?? "");
    const ok = !!s && s === normalize(answers[i]);
    perBlank.push(ok);
    if (ok) correct++;
  }
  return { correct, total: answers.length, perBlank };
}

/** Embaralhamento determinístico (Fisher-Yates com PRNG mulberry32 semeado pela string). */
export function shuffleSeeded<T>(arr: T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  const rnd = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
