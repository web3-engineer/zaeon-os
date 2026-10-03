import { describe, it, expect } from "vitest";
import { ARQUETIPOS, classificarHeuristica, sanitizeClassificacao } from "@/lib/map/arquetipo";
import { TIPOS_TOPICO } from "@/lib/map/tipos";

describe("classificarHeuristica (fallback sem modelo)", () => {
  it.each([
    ["análise de solo para plantio de milho", "aplicavel"],
    ["montar um circuito RC", "aplicavel"],
    ["tratamento da doença de Chagas", "aplicavel"],
    ["aprender a programar em Python", "habilidade"],
    ["tocar violão", "habilidade"],
    ["idioma japonês básico", "habilidade"],
    ["filosofia de Kant", "conceitual"],
    ["história do Brasil colônia", "conceitual"],
    ["panorama da inteligência artificial", "exploratorio"],
    ["visão geral de biotecnologia", "exploratorio"],
    ["escrever um conto de terror", "criativo"],
    ["compor uma música", "criativo"],
    ["xyzzy", "exploratorio"],
  ])("%s → %s", (topico, tipo) => {
    const c = classificarHeuristica(topico);
    expect(c.tipoTopico).toBe(tipo);
    expect(c.fonte).toBe("heuristica");
    expect(c.modoValidacao).toBe(ARQUETIPOS[c.tipoTopico].modoValidacao);
    expect(c.objetivo.length).toBeGreaterThan(10);
  });
});

describe("sanitizeClassificacao (saída do modelo)", () => {
  it("aceita o JSON válido e preserva objetivo/critério do modelo", () => {
    const c = sanitizeClassificacao({ tipoTopico: "Aplicável", objetivo: "Comprovar a correção do pH do solo", modoValidacao: "humana", criterioCompletude: "Laudo aprovado pelo professor" }, "solo")!;
    expect(c).toMatchObject({ tipoTopico: "aplicavel", modoValidacao: "humana", objetivo: "Comprovar a correção do pH do solo", fonte: "modelo" });
  });
  it("tipo inválido → null (quem chama usa a heurística)", () => {
    expect(sanitizeClassificacao({ tipoTopico: "magico" }, "x")).toBeNull();
    expect(sanitizeClassificacao(null, "x")).toBeNull();
  });
  it("modo fora do permitido pro arquétipo cai no default (conceitual não vira validação humana à toa; aplicável não vira quiz)", () => {
    expect(sanitizeClassificacao({ tipoTopico: "conceitual", modoValidacao: "cobertura" }, "x")!.modoValidacao).toBe("quiz");
    expect(sanitizeClassificacao({ tipoTopico: "aplicavel", modoValidacao: "quiz" }, "x")!.modoValidacao).toBe("humana");
    expect(sanitizeClassificacao({ tipoTopico: "conceitual", modoValidacao: "humana" }, "x")!.modoValidacao).toBe("humana");
  });
  it("objetivo curto/vazio → padrão do arquétipo", () => {
    expect(sanitizeClassificacao({ tipoTopico: "habilidade", objetivo: "ok" }, "piano")!.objetivo).toMatch(/piano/);
  });
  it("a tabela cobre todos os arquétipos e só o aplicável exige gate humano", () => {
    for (const t of TIPOS_TOPICO) expect(ARQUETIPOS[t].modosPermitidos).toContain(ARQUETIPOS[t].modoValidacao);
    expect(TIPOS_TOPICO.filter((t) => ARQUETIPOS[t].gateHumano)).toEqual(["aplicavel"]);
  });
});
