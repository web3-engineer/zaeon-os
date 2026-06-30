/**
 * Correção determinística do quiz de uma aula (pura/testável).
 *
 * Tipos auto-corrigíveis: choice (opção correta), input/voice (match normalizado
 * contra `accepted`). 'open' (e voice sem `accepted`) não é auto-corrigido →
 * marksOutOf = 0 (entra como avaliação manual/assíncrona). A nota é a % de pontos
 * obtidos sobre o total auto-corrigível.
 */
import { normalize } from "@/lib/aulas/normalize";
import { parseCloze, parseDragwords, gradeBlanks } from "@/lib/aulas/fillBlanks";
export { normalize };

export type GradeOption = { text: string; isCorrect: boolean };
export type PoolQuestion = { type: string; options?: GradeOption[]; accepted?: string[] };
export type GradeQuestion = {
  id?: string;
  type: string; // choice | input | open | voice | roulette | …
  marks?: number; // PONTOS do item
  options?: GradeOption[];
  accepted?: string[];
  config?: { pool?: PoolQuestion[]; rounds?: number; text?: string; sentence?: string; words?: string[] } | null; // roleta / cloze / dragwords
};
export type RoulettePick = { index: number; answer?: string; choiceIndex?: number; transcript?: string };
export type SubmittedAnswer = {
  questionId: string;
  answer?: string;        // texto digitado ou texto da opção escolhida
  choiceIndex?: number;   // alternativa escolhida (choice)
  transcript?: string;    // transcrição da resposta por voz
  audioUrl?: string;
  picks?: RoulettePick[]; // roleta: respostas das perguntas sorteadas
  blanks?: (string | null)[]; // cloze/dragwords: 1 palavra por lacuna, na ordem
};
export type GradedAnswer = {
  questionId: string;
  isCorrect: boolean;
  marks: number;       // pontos obtidos
  marksOutOf: number;  // pontos possíveis (0 = não auto-corrigido)
  answer?: string;
  transcript?: string;
  audioUrl?: string;
  blanksCorrect?: boolean[]; // cloze/dragwords: acerto por lacuna
};
export type GradeResult = { percentage: number; passed: boolean; graded: GradedAnswer[] };

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
    let earnedThis = 0; // suporta crédito PARCIAL (roleta)
    let isCorrect = false;
    let blanksCorrect: boolean[] | undefined; // cloze/dragwords

    if (q.type === "choice" && Array.isArray(q.options) && q.options.length) {
      marksOutOf = marks;
      if (a) {
        if (typeof a.choiceIndex === "number") isCorrect = !!q.options[a.choiceIndex]?.isCorrect;
        else if (typeof a.answer === "string") isCorrect = matchesAccepted(a.answer, q.options.filter((o) => o.isCorrect).map((o) => o.text));
      }
      earnedThis = isCorrect ? marks : 0;
    } else if (q.type === "input" || (q.type === "voice" && (q.accepted?.length ?? 0) > 0)) {
      marksOutOf = marks;
      isCorrect = matchesAccepted(a?.transcript || a?.answer || "", q.accepted ?? []);
      earnedThis = isCorrect ? marks : 0;
    } else if (q.type === "roulette") {
      // Roleta: nota = pontos × (acertos / perguntas respondidas) — crédito parcial.
      marksOutOf = marks;
      const pool = Array.isArray(q.config?.pool) ? q.config!.pool! : [];
      const picks = Array.isArray(a?.picks) ? a!.picks! : [];
      if (picks.length) {
        let correct = 0;
        for (const pk of picks) {
          const pq = pool[pk?.index];
          if (!pq) continue;
          if (pq.type === "choice" && Array.isArray(pq.options)) {
            const ok = typeof pk.choiceIndex === "number"
              ? !!pq.options[pk.choiceIndex]?.isCorrect
              : matchesAccepted(String(pk.answer || ""), pq.options.filter((o) => o.isCorrect).map((o) => o.text));
            if (ok) correct++;
          } else if (matchesAccepted(String(pk.answer || pk.transcript || ""), Array.isArray(pq.accepted) ? pq.accepted : [])) {
            correct++;
          }
        }
        isCorrect = correct === picks.length;
        earnedThis = Math.round((marks * correct) / picks.length);
      }
    } else if (q.type === "cloze" || q.type === "dragwords") {
      // Lacunas: crédito parcial pelos acertos posição-a-posição (gabarito vem do config).
      const model = q.type === "cloze" ? parseCloze(q.config?.text || "") : parseDragwords(q.config || {});
      const total = model.answers.length;
      if (total > 0) {
        marksOutOf = marks;
        const gb = gradeBlanks(model.answers, Array.isArray(a?.blanks) ? a!.blanks! : []);
        isCorrect = gb.correct === total;
        earnedThis = Math.round((marks * gb.correct) / total);
        blanksCorrect = gb.perBlank;
      }
    } else {
      // open, voice sem gabarito, ou tipos ainda manuais → avaliação manual (não pontua aqui).
      marksOutOf = 0;
    }

    earned += earnedThis;
    totalOut += marksOutOf;
    graded.push({
      questionId: qid,
      isCorrect,
      marks: earnedThis,
      marksOutOf,
      ...(a?.answer != null ? { answer: a.answer } : {}),
      ...(a?.transcript != null ? { transcript: a.transcript } : {}),
      ...(a?.audioUrl != null ? { audioUrl: a.audioUrl } : {}),
      ...(blanksCorrect ? { blanksCorrect } : {}),
    });
  }

  const percentage = totalOut > 0 ? Math.round((earned / totalOut) * 100) : 0;
  return { percentage, passed: totalOut > 0 && percentage >= passingPct, graded };
}
