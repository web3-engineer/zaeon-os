import { describe, expect, it } from "vitest";
import { requisitoDoNo, resumoDoNo } from "./resumoNo";
import { normalizarBackbone } from "./backbone";
import { readNos } from "./grafo";

describe("resumoDoNo", () => {
  it("prefere o resumo do modelo; senão corpo/closet; senão deriva do tipo", () => {
    expect(resumoDoNo({ label: "X", tipo: "conceito", resumo: " O que é X. " })).toBe("O que é X.");
    expect(resumoDoNo({ label: "X", tipo: "passo", corpo: "Faça Y" })).toBe("Faça Y");
    expect(resumoDoNo({ label: "Medir", tipo: "experimento" })).toBe("Experimento do percurso: Medir.");
  });
  it("trunca corpo longo", () => {
    expect(resumoDoNo({ label: "X", tipo: "passo", corpo: "a".repeat(400) }).length).toBeLessThanOrEqual(220);
  });
});

describe("requisitoDoNo", () => {
  const ctx = { modoValidacao: "humana" as const, tipoTopico: "aplicavel" as const, criterioCompletude: "", ehConclusao: false };
  it("usa o req do modelo", () => { expect(requisitoDoNo({ req: "Faça Z" }, ctx)).toBe("Faça Z"); });
  it("a conclusão carrega o critério do arquétipo", () => {
    expect(requisitoDoNo({}, { ...ctx, ehConclusao: true })).toMatch(/professor|instituição/i);
    expect(requisitoDoNo({}, { ...ctx, ehConclusao: true, criterioCompletude: "Critério X" })).toBe("Critério X");
  });
  it("tópico intermediário sem req tem texto padrão", () => { expect(requisitoDoNo({}, ctx)).toMatch(/avançar/); });
});

describe("resumo/req no percurso", () => {
  it("normalizarBackbone carrega resumo e req dos passos", () => {
    const r = normalizarBackbone({ passos: [{ label: "A", resumo: "o que é A", req: "faça A" }, { label: "B" }, { label: "C" }] }, "conceitual", []);
    expect(r?.nos[0]).toMatchObject({ resumo: "o que é A", req: "faça A" });
    expect(r?.nos[1]?.resumo).toBeUndefined();
  });
  it("o sanitizador do grafo mantém resumo/req (com teto) vindos do banco", () => {
    const nos = readNos([{ id: "n1", label: "A", tipo: "conceito", resumo: "r".repeat(500), req: "ok" }]);
    expect(nos[0]?.resumo?.length).toBe(300);
    expect(nos[0]?.req).toBe("ok");
  });
});
