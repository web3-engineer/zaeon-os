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
};

export type QuizMeta = { id: string; title: string; passingPct: number };

export type QuizOption = { text: string; isCorrect?: boolean; explanation?: string };
export type Question = {
  id: string;
  text: string;
  type: "choice" | "input" | "open" | "voice";
  options?: QuizOption[];
  accepted?: string[];
  marks: number;
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
};
export type SubmitResult = { submissionId: string; percentage: number; passed: boolean; graded: GradedAnswer[] };
