/**
 * Correção determinística do quiz de uma aula (pura/testável).
 *
 * Tipos auto-corrigíveis: choice (opção correta), input/voice (match normalizado
 * contra `accepted`). 'open' (e voice sem `accepted`) não é auto-corrigido →
 * marksOutOf = 0 (entra como avaliação manual/assíncrona). A nota é a % de pontos
 * obtidos sobre o total auto-corrigível.
 */
export type GradeOption = { text: string; isCorrect: boolean };
export type GradeQuestion = {
  id?: string;
  type: string; // choice | input | open | voice
  marks?: number;
  options?: GradeOption[];
  accepted?: string[];
};
export type SubmittedAnswer = {
  questionId: string;
  answer?: string;        // texto digitado ou texto da opção escolhida
  choiceIndex?: number;   // alternativa escolhida (choice)
  transcript?: string;    // transcrição da resposta por voz
  audioUrl?: string;
};
export type GradedAnswer = {
  questionId: string;
  isCorrect: boolean;
  marks: number;       // pontos obtidos
  marksOutOf: number;  // pontos possíveis (0 = não auto-corrigido)
  answer?: string;
  transcript?: string;
  audioUrl?: string;
};
export type GradeResult = { percentage: number; passed: boolean; graded: GradedAnswer[] };

/** lowercase + sem acento + sem pontuação + espaços colapsados. */
export function normalize(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesAccepted(text: string, accepted: string[]): boolean {
  const n = normalize(text);
  if (!n) return false;
  return accepted.some((a) => {
    const na = normalize(a);
    return !!na && (n === na || n.includes(na) || na.includes(n));
  });
}

export function gradeSubmission(
  questions: GradeQuestion[],
  answers: SubmittedAnswer[],
  passingPct = 70,
): GradeResult {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  let totalOut = 0;
  let earned = 0;
  const graded: GradedAnswer[] = [];

  for (const q of questions) {
    const qid = q.id ?? "";
    const a = byId.get(qid);
    const marks = Number.isFinite(q.marks) && (q.marks as number) > 0 ? (q.marks as number) : 1;
    let marksOutOf = 0;
    let isCorrect = false;

    if (q.type === "choice" && Array.isArray(q.options) && q.options.length) {
      marksOutOf = marks;
      if (a) {
        if (typeof a.choiceIndex === "number") {
          isCorrect = !!q.options[a.choiceIndex]?.isCorrect;
        } else if (typeof a.answer === "string") {
          const correct = q.options.filter((o) => o.isCorrect).map((o) => o.text);
          isCorrect = matchesAccepted(a.answer, correct);
        }
      }
    } else if (q.type === "input" || (q.type === "voice" && (q.accepted?.length ?? 0) > 0)) {
      marksOutOf = marks;
      const text = a?.transcript || a?.answer || "";
      isCorrect = matchesAccepted(text, q.accepted ?? []);
    } else {
      // open, ou voice sem gabarito → avaliação manual (não pontua aqui)
      marksOutOf = 0;
      isCorrect = false;
    }

    if (marksOutOf > 0 && isCorrect) earned += marks;
    totalOut += marksOutOf;
    graded.push({
      questionId: qid,
      isCorrect,
      marks: marksOutOf > 0 && isCorrect ? marks : 0,
      marksOutOf,
      ...(a?.answer != null ? { answer: a.answer } : {}),
      ...(a?.transcript != null ? { transcript: a.transcript } : {}),
      ...(a?.audioUrl != null ? { audioUrl: a.audioUrl } : {}),
    });
  }

  const percentage = totalOut > 0 ? Math.round((earned / totalOut) * 100) : 0;
  return { percentage, passed: totalOut > 0 && percentage >= passingPct, graded };
}
