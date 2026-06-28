/**
 * Parse + validação puros do worker generativo de AULAS (/api/aulas/generate).
 *
 * Converte a saída do Gemini (JSON, às vezes com prosa/fences em volta) numa Aula
 * pronta: título + corpo markdown + ids de vídeo + quiz normalizado. Saída
 * degenerada (sem corpo decente ou sem perguntas) vira `null` → a rota trata como
 * falha em vez de gravar lixo. Espelha a robustez do worker de estudo (Fase 0).
 */
export type QuizOption = { text: string; isCorrect: boolean; explanation?: string };
export type ParsedQuestion = {
  text: string;
  type: "choice" | "input" | "open" | "voice";
  options?: QuizOption[];
  accepted: string[];
  marks: number;
  order: number;
};
export type ParsedQuiz = { title: string; passingPct: number; questions: ParsedQuestion[] };
export type ParsedAula = { title: string; body: string; youtubeIds: string[]; quiz: ParsedQuiz };

const Q_TYPES = ["choice", "input", "open", "voice"] as const;

/** Lê o 1º objeto JSON balanceado de `raw` (ignora fences e prosa em volta). null se não houver. */
export function extractJson(raw: string): any | null {
  if (!raw) return null;
  const s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch { /* tenta o objeto balanceado abaixo */ }
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

/** Extrai um id de vídeo do YouTube (11 chars) de uma URL, de um youtu.be ou de um id cru. */
export function youtubeId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim();
  const m =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(s) ||
    /^([A-Za-z0-9_-]{11})$/.exec(s);
  return m ? m[1] : null;
}

function normOptions(raw: any): QuizOption[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const opts = raw
    .filter((o: any) => o && typeof o.text === "string" && o.text.trim())
    .slice(0, 8)
    .map((o: any) => ({
      text: String(o.text).slice(0, 300),
      isCorrect: !!o.isCorrect,
      ...(typeof o.explanation === "string" ? { explanation: o.explanation.slice(0, 400) } : {}),
    }));
  return opts.length ? opts : undefined;
}

function normQuestions(raw: any): ParsedQuestion[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((q: any) => q && typeof q.text === "string" && q.text.trim())
    .slice(0, 20)
    .map((q: any, i: number): ParsedQuestion => {
      const type: ParsedQuestion["type"] = Q_TYPES.includes(q.type) ? q.type : "choice";
      const accepted = Array.isArray(q.accepted)
        ? q.accepted.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.slice(0, 200))
        : [];
      const marks = Number.isFinite(q.marks) && q.marks > 0 ? Math.min(10, Math.floor(q.marks)) : 1;
      const out: ParsedQuestion = { text: String(q.text).slice(0, 600), type, accepted, marks, order: i };
      const options = normOptions(q.options);
      if (type === "choice" && options) out.options = options;
      return out;
    })
    // choice precisa de ao menos 2 opções com 1 correta; senão vira 'open'
    .map((q) => {
      if (q.type === "choice" && (!q.options || q.options.length < 2 || !q.options.some((o) => o.isCorrect))) {
        return { ...q, type: "open" as const, options: undefined };
      }
      return q;
    });
}

/** raw do modelo -> Aula pronta, ou null quando a saída é degenerada/inparseável. */
export function buildAula(raw: string, command: string): ParsedAula | null {
  const parsed = extractJson(raw);
  if (!parsed) return null;
  const title = (typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : command).slice(0, 160);
  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
  if (body.length < 40) return null; // corpo precisa ser real

  const ytRaw: any[] = Array.isArray(parsed.youtube) ? parsed.youtube
    : Array.isArray(parsed.youtubeIds) ? parsed.youtubeIds : [];
  const youtubeIds = Array.from(new Set(ytRaw.map(youtubeId).filter((x): x is string => !!x))).slice(0, 5);

  const quizRaw = parsed.quiz && typeof parsed.quiz === "object" ? parsed.quiz : {};
  const questions = normQuestions(quizRaw.questions);
  if (!questions.length) return null; // aula precisa de ao menos 1 pergunta

  const passingPct = Number.isFinite(quizRaw.passingPct) ? Math.max(0, Math.min(100, Math.floor(quizRaw.passingPct))) : 70;
  const quizTitle = (typeof quizRaw.title === "string" && quizRaw.title.trim() ? quizRaw.title : `Quiz — ${title}`).slice(0, 160);

  return { title, body: body.slice(0, 12000), youtubeIds, quiz: { title: quizTitle, passingPct, questions } };
}

// ── GERAÇÃO POR BLOCO (Lote 9 — /api/aulas/generate-block) ──────────────────
export type ParsedBlock = {
  type: string;            // base: choice | input | open | voice | roulette
  text: string;
  options?: QuizOption[];
  accepted: string[];
  marks: number;           // pontos sugeridos
  noPaste?: boolean;
  config?: { pool: { text: string; type: "choice" | "input"; options?: QuizOption[]; accepted: string[] }[]; rounds: number };
};

function normRoulettePool(raw: any) {
  return (Array.isArray(raw) ? raw : [])
    .filter((q: any) => q && typeof q.text === "string" && q.text.trim())
    .slice(0, 10)
    .map((q: any) => {
      const opts = normOptions(q.options);
      const isChoice = !!opts && opts.length >= 2 && opts.some((o) => o.isCorrect);
      const accepted = Array.isArray(q.accepted) ? q.accepted.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.slice(0, 200)) : [];
      return isChoice
        ? { text: String(q.text).slice(0, 400), type: "choice" as const, options: opts!, accepted: [] as string[] }
        : { text: String(q.text).slice(0, 400), type: "input" as const, accepted };
    })
    .filter((q) => q.type === "choice" || q.accepted.length > 0); // só auto-corrigíveis
}

/** raw do modelo -> 1 bloco de pergunta do `kind` pedido, ou null se degenerado. */
export function buildQuestionBlock(raw: string, kind: string): ParsedBlock | null {
  const parsed = extractJson(raw);
  if (!parsed) return null;
  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  const marks = Number.isFinite(parsed.marks) && parsed.marks > 0 ? Math.min(20, Math.floor(parsed.marks)) : 1;
  const accepted = Array.isArray(parsed.accepted)
    ? parsed.accepted.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.slice(0, 200))
    : [];

  if (kind === "q-choice") {
    const options = normOptions(parsed.options);
    if (!text || !options || options.length < 2 || !options.some((o) => o.isCorrect)) return null;
    return { type: "choice", text: text.slice(0, 600), options, accepted: [], marks };
  }
  if (kind === "q-written") {
    if (!text) return null;
    return { type: accepted.length ? "input" : "open", text: text.slice(0, 600), accepted, marks, noPaste: true };
  }
  if (kind === "q-voice") {
    if (!text) return null;
    return { type: "voice", text: text.slice(0, 600), accepted, marks };
  }
  if (kind === "q-roulette") {
    const pool = normRoulettePool(parsed.config?.pool ?? parsed.pool);
    if (pool.length < 2) return null;
    const rRaw = parsed.config?.rounds ?? parsed.rounds;
    const rounds = Number.isFinite(rRaw) ? Math.max(1, Math.min(pool.length, Math.floor(rRaw))) : Math.min(3, pool.length);
    return { type: "roulette", text: (text || "Roleta de perguntas").slice(0, 200), accepted: [], marks, config: { pool, rounds } };
  }
  return null; // tipos scaffold ainda não geram bloco
}
