import { describe, it, expect } from "vitest";
import { critique, checkSemFonte, checkLacuna, type ExaminerInput } from "./examiner";
import { INTENTS, shouldRevise, type StructuredAnswer } from "./contracts";

const longText = "A ".repeat(80); // > 120 chars p/ não disparar `raso`

const explain = (draft: StructuredAnswer): ExaminerInput => ({
  intent: "explicar_conceito",
  mode: "elaborated",
  academicMode: "flexible",
  draft,
});

describe("examiner · critique (determinístico)", () => {
  it("rascunho completo e flexível → aprovado, score 10, sem issues", () => {
    const v = critique(explain({ nucleo: longText, desenvolvimento: longText, conceitos: ["a"], proximos_passos: ["b"] }));
    expect(v.issues).toHaveLength(0);
    expect(v.score).toBe(10);
    expect(v.decision).toBe("aprovado");
    // rubrica ADAPTATIVA: só as dims da intenção
    expect(Object.keys(v.rubric).sort()).toEqual(["escrita", "literatura", "problema"]);
  });

  it("campo obrigatório vazio → lacuna crítica: score < threshold e decisão revisar", () => {
    const v = critique(explain({ nucleo: longText, desenvolvimento: longText, proximos_passos: ["b"] })); // falta `conceitos`
    expect(v.issues.some((i) => i.tipo === "lacuna" && i.onde === "conceitos")).toBe(true);
    expect(v.score).toBeLessThan(INTENTS.explicar_conceito.reviseThreshold ?? 7);
    expect(v.decision).toBe("revisar");
  });

  it("checagem BARATA primeiro: enforced sem fonte → issues[0] é sem_fonte, decisão não-aprovado", () => {
    const v = critique({
      intent: "criar_trabalho",
      mode: "research",
      academicMode: "enforced",
      draft: { nucleo: "x" }, // falta work/evidencia/proximos_passos e não tem fonte
    });
    expect(v.issues[0].tipo).toBe("sem_fonte");
    expect(v.decision).not.toBe("aprovado");
    expect(v.score).toBeLessThanOrEqual(3);
  });

  it("rubrica reflete o sem_fonte: literatura/citações caem", () => {
    const v = critique({
      intent: "criar_trabalho",
      mode: "research",
      academicMode: "enforced",
      draft: { nucleo: longText, work: { kind: "artigo", sections: [{ title: "t", body: longText }] }, evidencia: [], proximos_passos: ["p"] },
    });
    expect(v.rubric.citacoes).toBeLessThanOrEqual(2);
    expect(v.rubric.literatura).toBeLessThanOrEqual(2);
  });

  it("raso: rascunho curto em modo elaborated → issue raso (não crítico)", () => {
    const v = critique(explain({ nucleo: "curto", desenvolvimento: "d", conceitos: ["a"], proximos_passos: ["b"] }));
    expect(v.issues.some((i) => i.tipo === "raso")).toBe(true);
  });
});

describe("examiner · checkSemFonte (a checagem mais barata)", () => {
  const draftNoSrc: StructuredAnswer = { nucleo: "x" };
  it("flexível + intenção sem exigência de fonte → nenhum sem_fonte", () => {
    expect(checkSemFonte({ intent: "duvida_rapida", mode: "quick", academicMode: "flexible", draft: draftNoSrc })).toHaveLength(0);
  });
  it("enforced sem fonte → 1 sem_fonte", () => {
    expect(checkSemFonte({ intent: "explicar_conceito", mode: "elaborated", academicMode: "enforced", draft: draftNoSrc })).toHaveLength(1);
  });
  it("enforced com SÓ fontesBase (material da turma) → nenhum sem_fonte; sem ela → continua sem_fonte", () => {
    const daBase: StructuredAnswer = { nucleo: "x", fontesBase: [{ documentoId: "d1", titulo: "Apostila 3", paginas: "4–5" }] };
    expect(checkSemFonte({ intent: "explicar_conceito", mode: "elaborated", academicMode: "enforced", draft: daBase })).toHaveLength(0);
    expect(critique({ intent: "explicar_conceito", mode: "elaborated", academicMode: "enforced", draft: daBase }).issues.some((i) => i.tipo === "sem_fonte")).toBe(false);
    const semBase: StructuredAnswer = { nucleo: "x", fontesBase: [] };
    expect(checkSemFonte({ intent: "explicar_conceito", mode: "elaborated", academicMode: "enforced", draft: semBase })).toHaveLength(1);
  });
  it("intenção que exige fonte, COM fonte → nenhum sem_fonte", () => {
    const withSrc: StructuredAnswer = { nucleo: "x", sources: [{ title: "S", url: "u" }] };
    expect(checkSemFonte({ intent: "pesquisar_fontes", mode: "elaborated", academicMode: "flexible", draft: withSrc })).toHaveLength(0);
  });
});

describe("examiner · integra com shouldRevise (stop-condition do laço)", () => {
  const spec = INTENTS.explicar_conceito;
  it("aprovado → não revisa; incompleto → revisa (iter<maxRevisions)", () => {
    const ok = critique(explain({ nucleo: longText, desenvolvimento: longText, conceitos: ["a"], proximos_passos: ["b"] }));
    expect(shouldRevise(ok, spec, 0)).toBe(false);
    const bad = critique(explain({ nucleo: longText, desenvolvimento: longText, proximos_passos: ["b"] }));
    expect(shouldRevise(bad, spec, 0)).toBe(true);
  });
});
