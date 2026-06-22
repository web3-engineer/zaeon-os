/**
 * Podcast do ZAEON Studio — núcleo PURO (sem rede): monta os prompts de roteiro e
 * normaliza/encaixa o resultado pra síntese multi-voz. Pipeline outline → transcript
 * → TTS multi-speaker, portado do open-notebook (lfnovo/open-notebook, MIT — ver
 * NOTICE): prompts/podcast/outline.jinja e transcript.jinja, adaptados pro pt-BR +
 * Gemini (roteiro) + Gemini-TTS (voz).
 */

const asArr = (v: any): any[] => (Array.isArray(v) ? v : []);
const asStr = (v: any): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export interface PodcastOptions {
  durationMin?: number; // alvo aproximado em minutos (2–6)
  tone?: string; // ex.: "didático e leve, com analogias"
  language?: string; // default pt-BR
  hostA?: string; // nome do condutor (voz A)
  hostB?: string; // nome do especialista (voz B)
}

export interface Host {
  id: "A" | "B";
  name: string;
  role: string;
  gender: "f" | "m";
}

export interface Segment {
  name: string;
  description: string;
  size: "short" | "medium" | "long";
}

export interface Turn {
  speaker: string;
  text: string;
}

/** 2 apresentadores: A conduz (curiosa), B é o especialista. Nomes/ vozes configuráveis. */
export function defaultHosts(opts?: PodcastOptions): [Host, Host] {
  return [
    { id: "A", name: (opts?.hostA || "Marina").trim() || "Marina", role: "condutora curiosa, faz as perguntas do ouvinte", gender: "f" },
    { id: "B", name: (opts?.hostB || "Téo").trim() || "Téo", role: "especialista, explica com clareza e analogias", gender: "m" },
  ];
}

function numSegments(opts?: PodcastOptions): number {
  return clamp(Math.round(opts?.durationMin ?? 4), 3, 6);
}

const SCRIPT_BASE = `Você é roteirista de podcast educativo da Zaeon. Escreve em português do Brasil, com naturalidade de conversa real (ganchos, idas e voltas, analogias), SEM markdown e SEM ler em voz alta marcações. É fiel ao material; não inventa fatos fora dele.`;

export function buildOutlinePrompt(content: string, hosts: [Host, Host], opts?: PodcastOptions) {
  const n = numSegments(opts);
  const speakers = hosts.map((h) => `- ${h.name} (${h.role})`).join("\n");
  return {
    system: `${SCRIPT_BASE}

Crie o ROTEIRO/ESBOÇO do episódio com ${n} segmentos (incluindo abertura e encerramento).
FORMATO (JSON):
{ "segments": [ { "name": "nome do segmento", "description": "o que será discutido", "size": "short|medium|long" } ] }
Responda SOMENTE com o JSON.`,
    user: `Apresentadores:\n${speakers}\n\nMaterial de estudo:\n<material>\n${content}\n</material>\n\nGere o esboço em ${n} segmentos.`,
  };
}

export function buildTranscriptPrompt(content: string, segments: Segment[], hosts: [Host, Host], opts?: PodcastOptions) {
  const names = hosts.map((h) => h.name);
  const speakers = hosts.map((h) => `- ${h.name}: ${h.role}`).join("\n");
  const outline = segments.map((s, i) => `${i + 1}. ${s.name} — ${s.description}`).join("\n");
  const tone = opts?.tone ? ` Tom: ${opts.tone}.` : "";
  return {
    system: `${SCRIPT_BASE}${tone}

Escreva o DIÁLOGO COMPLETO do episódio entre os dois apresentadores, conversando de forma natural e equilibrada (sem monólogos longos), cobrindo todo o esboço.
Use SOMENTE estes nomes de locutor: ${names.join(", ")}.
FORMATO (JSON):
{ "transcript": [ { "speaker": "${names[0]}|${names[1]}", "dialogue": "fala natural, 1–3 frases" } ] }
Gere de 12 a 30 turnos. Comece com uma abertura curta e termine com um fechamento. Responda SOMENTE com o JSON.`,
    user: `Apresentadores:\n${speakers}\n\nEsboço:\n${outline}\n\nMaterial de estudo:\n<material>\n${content}\n</material>\n\nEscreva o diálogo completo em JSON.`,
  };
}

export function normalizeOutline(raw: any): Segment[] {
  const segs = asArr(raw?.segments ?? raw?.segmentos ?? raw?.outline)
    .map((s: any) => ({
      name: asStr(s?.name ?? s?.nome ?? s?.title ?? s?.titulo).trim(),
      description: asStr(s?.description ?? s?.descricao ?? s?.desc).trim(),
      size: (["short", "medium", "long"].includes(s?.size) ? s.size : "medium") as Segment["size"],
    }))
    .filter((s) => s.name);
  if (!segs.length) throw new Error("Esboço do podcast vazio");
  return segs;
}

export function normalizeTranscript(raw: any, hosts: [Host, Host]): Turn[] {
  const list = asArr(raw?.transcript ?? raw?.turns ?? raw?.dialogue ?? raw?.dialogo ?? raw?.roteiro);
  const names = hosts.map((h) => h.name);
  const turns: Turn[] = [];
  for (const t of list) {
    const text = asStr(t?.dialogue ?? t?.text ?? t?.fala ?? t?.line ?? t?.texto).trim();
    if (!text) continue;
    let sp = asStr(t?.speaker ?? t?.name ?? t?.locutor ?? t?.quem).trim();
    const matched = names.find(
      (n) => sp && (n.toLowerCase() === sp.toLowerCase() || sp.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(sp.toLowerCase())),
    );
    sp = matched || names[turns.length % 2]; // sem match → alterna A/B
    turns.push({ speaker: sp, text });
  }
  if (!turns.length) throw new Error("Transcrição do podcast vazia");
  return turns;
}

/** Texto rotulado p/ o Gemini-TTS multi-speaker: "Nome: fala\nNome: fala". */
export function assembleSpeakerText(turns: Turn[]): string {
  return turns.map((t) => `${t.speaker}: ${t.text}`).join("\n");
}

/**
 * Quebra os turnos em blocos rotulados ≤ maxChars (sem cortar um turno no meio) —
 * cada bloco vira UMA chamada de TTS; depois os WAVs são concatenados (lib/studio/wav).
 */
export function chunkTurnsForTTS(turns: Turn[], maxChars = 2500): string[] {
  const chunks: string[] = [];
  let cur: Turn[] = [];
  let len = 0;
  for (const t of turns) {
    const line = `${t.speaker}: ${t.text}`;
    if (cur.length && len + line.length + 1 > maxChars) {
      chunks.push(assembleSpeakerText(cur));
      cur = [];
      len = 0;
    }
    cur.push(t);
    len += line.length + 1;
  }
  if (cur.length) chunks.push(assembleSpeakerText(cur));
  return chunks;
}
