// Tipos compartilhados da UI de Aulas (espelham os models Prisma / respostas das rotas).
export type Aula = {
  id: string;
  professorId: string;
  turmaId: string | null;
  title: string;
  body: string | null;
  youtubeIds: string[];
  status: "draft" | "sent";
  sentAt: string | null;
  createdAt: string;
  blocks?: Array<
    | { kind: "text"; md: string }
    | { kind: "video"; youtubeId: string }
    | { kind: "studio"; studioKind: string; title?: string; data?: unknown }
    | { kind: "q"; questionId: string; qkind: string }
  > | null;
};

export type QuizMeta = { id: string; title: string; passingPct: number };

export type QuizOption = { text: string; isCorrect?: boolean; explanation?: string };
export type RoulettePoolQ = { text: string; type: "choice" | "input"; options?: QuizOption[] };
export type Question = {
  id: string;
  text: string;
  type: "choice" | "input" | "open" | "voice" | "roulette" | "cloze" | "dragwords" | "flashcards" | "memory" | "branching";
  options?: QuizOption[];
  accepted?: string[];
  marks: number;       // PONTOS do item
  noPaste?: boolean;   // resposta escrita: bloqueia colar
  config?: {
    pool?: RoulettePoolQ[]; rounds?: number; // roleta
    parts?: Array<{ t: "text"; s: string } | { t: "blank"; i: number }>; // cloze/dragwords (sanitizado)
    bank?: string[]; allowType?: boolean;
    cards?: { front: string; back: string }[]; // flashcards
    pairs?: { a: string; b: string }[];        // memória
    nodes?: { id: string; content: string; choices: { label: string; nextId: string }[] }[]; // ramificado
  } | null;
  order: number;
};

export type Progress = { id: string; status: "new" | "in_progress" | "completed"; readingMs: number } | null;

export type Turma = { id: string; name: string; memberCount?: number };

export type GradedAnswer = {
  questionId: string;
  isCorrect: boolean;
  marks: number;
  marksOutOf: number;
  answer?: string;
  transcript?: string;
  audioUrl?: string;
  blanksCorrect?: boolean[]; // cloze/dragwords: acerto por lacuna
};
export type SubmitResult = { submissionId: string; percentage: number; passed: boolean; graded: GradedAnswer[] };
