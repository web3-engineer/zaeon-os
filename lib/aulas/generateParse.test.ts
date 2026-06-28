import { describe, it, expect } from "vitest";
import { extractJson, youtubeId, buildAula } from "./generateParse";

const LONG_BODY = "# Fotossíntese\n\nA fotossíntese é o processo pelo qual plantas convertem luz em energia química. " +
  "Ocorre nos cloroplastos e envolve duas etapas principais.\n\n## Etapas\n\nFase clara e fase escura, cada uma com seu papel.";

describe("extractJson", () => {
  it("parses pure JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it("strips fences and prose", () => {
    expect(extractJson('Claro:\n```json\n{"a":1}\n```\npronto')).toEqual({ a: 1 });
  });
  it("returns null for garbage", () => {
    expect(extractJson("nada de json aqui")).toBeNull();
  });
});

describe("youtubeId", () => {
  it("extracts from watch url", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts from youtu.be", () => {
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=10")).toBe("dQw4w9WgXcQ");
  });
  it("accepts a raw 11-char id", () => {
    expect(youtubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("returns null for non-ids", () => {
    expect(youtubeId("https://example.com/x")).toBeNull();
    expect(youtubeId("short")).toBeNull();
  });
});

describe("buildAula", () => {
  it("builds a lesson with body, youtube ids and a normalized quiz", () => {
    const raw = JSON.stringify({
      title: "Fotossíntese",
      body: LONG_BODY,
      youtube: ["https://youtu.be/dQw4w9WgXcQ", "not-a-url"],
      quiz: {
        title: "Quiz de Fotossíntese",
        passingPct: 60,
        questions: [
          { text: "Onde ocorre?", type: "choice", options: [
            { text: "Cloroplasto", isCorrect: true }, { text: "Mitocôndria", isCorrect: false } ] },
          { text: "Cite uma etapa.", type: "input", accepted: ["fase clara", "fase escura"] },
          { text: "Explique com suas palavras.", type: "open" },
        ],
      },
    });
    const a = buildAula(raw, "aula de fotossíntese");
    expect(a).not.toBeNull();
    expect(a!.title).toBe("Fotossíntese");
    expect(a!.body.length).toBeGreaterThan(40);
    expect(a!.youtubeIds).toEqual(["dQw4w9WgXcQ"]);
    expect(a!.quiz.questions).toHaveLength(3);
    expect(a!.quiz.questions[0].type).toBe("choice");
    expect(a!.quiz.questions[0].order).toBe(0);
    expect(a!.quiz.questions[2].order).toBe(2);
    expect(a!.quiz.passingPct).toBe(60);
  });

  it("defaults passingPct and drops invalid questions", () => {
    const raw = JSON.stringify({
      title: "Tema",
      body: LONG_BODY,
      quiz: { questions: [
        { text: "Boa?", type: "choice", options: [{ text: "Sim", isCorrect: true }] },
        { text: "", type: "input" }, // dropped: empty text
        { type: "input", accepted: ["x"] }, // dropped: no text
      ] },
    });
    const a = buildAula(raw, "tema");
    expect(a).not.toBeNull();
    expect(a!.quiz.passingPct).toBe(70);
    expect(a!.quiz.questions).toHaveLength(1);
  });

  it("returns null when body is missing/too short", () => {
    const raw = JSON.stringify({ title: "T", body: "curto", quiz: { questions: [{ text: "q", type: "open" }] } });
    expect(buildAula(raw, "t")).toBeNull();
  });

  it("returns null when there are no questions", () => {
    const raw = JSON.stringify({ title: "T", body: LONG_BODY, quiz: { questions: [] } });
    expect(buildAula(raw, "t")).toBeNull();
  });

  it("returns null for unparseable output", () => {
    expect(buildAula("desculpe, não consigo", "t")).toBeNull();
  });
});
