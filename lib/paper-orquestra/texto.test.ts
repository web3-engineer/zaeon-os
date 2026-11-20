import { describe, it, expect } from "vitest";
import {
  converterCitacoes, criarRegistro, injetarCandidatas, lerRefinamento, notasDoParecer, papeisDoEsqueleto,
  referenciasDasChaves, secoesDoMarkdown, tarefasDoEsboco, vereditoDaRevisao, type Esboco,
} from "@/lib/paper-orquestra/texto";

const ESQ = ["RESUMO", "INTRODUÇÃO", "REFERENCIAL TEÓRICO", "METODOLOGIA", "RESULTADOS E DISCUSSÃO", "CONSIDERAÇÕES FINAIS", "REFERÊNCIAS"];

describe("papéis do esqueleto", () => {
  it("acha introdução, revisão e referências do artigo ABNT", () => {
    const p = papeisDoEsqueleto(ESQ);
    expect(p).toMatchObject({ intro: "INTRODUÇÃO", revisao: "REFERENCIAL TEÓRICO", referencias: "REFERÊNCIAS" });
    expect(p.resto).toEqual(["RESUMO", "METODOLOGIA", "RESULTADOS E DISCUSSÃO", "CONSIDERAÇÕES FINAIS"]);
  });
  it("relatório sem seção de revisão: a revisão é null", () => {
    expect(papeisDoEsqueleto(["INTRODUÇÃO", "DESENVOLVIMENTO", "CONCLUSÃO", "REFERÊNCIAS"]).revisao).toBeNull();
  });
});

describe("tarefas de busca do esboço", () => {
  const esboco: Esboco = {
    intro_related_work_plan: {
      introduction_strategy: { search_directions: ["CRISPR gene editing survey", "CRISPR gene editing survey"] },
      related_work_strategy: { subsections: [{ subsection_title: "Off-target", limitation_search_queries: ["CRISPR off-target effects"] }] },
    },
    section_plan: [{ section_title: "METODOLOGIA", subsections: [{ subsection_title: "Base", citation_hints: ["paper introducing 'PRISMA'"] }] }],
  };
  it("macro, micro e alvo, sem repetir, alvo por último e com o termo extraído", () => {
    const t = tarefasDoEsboco(esboco, { intro: "INTRODUÇÃO", revisao: "REFERENCIAL TEÓRICO" });
    expect(t.map((x) => x.consulta)).toEqual(["CRISPR gene editing survey", "CRISPR off-target effects", "PRISMA"]);
    expect(t[1].secao).toBe("REFERENCIAL TEÓRICO: Off-target");
    expect(t[2]).toMatchObject({ tipo: "alvo", secao: "METODOLOGIA - Base" });
  });
  it("o teto corta as alvo primeiro", () => {
    expect(tarefasDoEsboco(esboco, { intro: "I", revisao: null }, 2).map((x) => x.tipo)).toEqual(["exploracao", "exploracao"]);
  });
});

describe("registro de evidência", () => {
  it("deduplica por título e desempata colisão de citação com 2020a/2020b", () => {
    const r = criarRegistro();
    const a = r.registrar({ title: "Gene editing A", authors: ["Ana Silva"], year: 2020, abstract: "diz A" }, "INTRODUÇÃO")!;
    const b = r.registrar({ title: "Gene editing B", authors: ["João Silva"], year: 2020 }, "INTRODUÇÃO")!;
    const a2 = r.registrar({ title: "gene  editing a!", authors: ["Outro"], year: 1999 }, "X")!;
    expect(a.fonte.citacao).toBe("(SILVA, 2020)");
    expect(b.fonte.citacao).toBe("(SILVA, 2020b)");
    expect(a2.chave).toBe(a.chave);
    expect(r.itens()).toHaveLength(2);
    expect(a.resumo).toBe("diz A");
  });
  it("respeita o teto", () => {
    const r = criarRegistro(1);
    r.registrar({ title: "Um", authors: ["A B"], year: 2001 }, "s");
    expect(r.registrar({ title: "Dois", authors: ["C D"], year: 2002 }, "s")).toBeNull();
  });
});

describe("citação [E#] → ABNT do documento", () => {
  const r = criarRegistro();
  r.registrar({ title: "Paper um", authors: ["Ana Silva"], year: 2020 }, "s");
  r.registrar({ title: "Paper dois", authors: ["Bia Souza"], year: 2021 }, "s");
  it("agrupa chaves vizinhas numa citação só, corta a inventada e devolve as citadas em ordem", () => {
    const c = converterCitacoes("Como mostram estudos [E2][E1][E9]. Outro ponto [E1, E2].", r.porChave);
    expect(c.texto).toBe("Como mostram estudos (SOUZA, 2021; SILVA, 2020). Outro ponto (SILVA, 2020; SOUZA, 2021).");
    expect(c.citadas).toEqual(["E2", "E1"]);
    expect(c.invalidas).toEqual(["E9"]);
  });
  it("só chave inventada: some sem deixar parêntese vazio", () => {
    expect(converterCitacoes("Fato [E40].", r.porChave).texto).toBe("Fato.");
  });
  it("referências saem das chaves, sem repetir", () => {
    const refs = referenciasDasChaves(["E2", "E1", "E2", "E7"], r.porChave);
    expect(refs).toHaveLength(2);
    expect(refs[0].abnt).toContain("BIA SOUZA");
  });
});

describe("markdown ↔ seções do documento", () => {
  it("casa o título pelo esqueleto (acento, caixa, numeração) e descarta seção inventada", () => {
    const md = "preâmbulo\n# 1 Introducao\ntexto i\n## 1.1 Sub\nmais\n# Seção Nova\nx\n# REFERENCIAL TEÓRICO\ntexto r";
    const m = secoesDoMarkdown(md, ESQ);
    expect([...m.keys()]).toEqual(["INTRODUÇÃO", "REFERENCIAL TEÓRICO"]);
    expect(m.get("INTRODUÇÃO")).toBe("texto i\n## 1.1 Sub\nmais");
  });
});

describe("injeção das candidatas no esboço", () => {
  it("põe as chaves achadas em cada seção e tira os hints", () => {
    const r = criarRegistro();
    r.registrar({ title: "P", authors: ["A B"], year: 2000 }, "METODOLOGIA - Base");
    const e = injetarCandidatas({ section_plan: [{ section_title: "METODOLOGIA", subsections: [{ subsection_title: "Base", citation_hints: ["x"] }] }] }, r.itens(), { intro: "I", revisao: null });
    expect(e.section_plan![0].subsections![0]).toEqual({ subsection_title: "Base", citation_candidates: ["E1"] });
  });
});

describe("refinamento e regra de aceite (ContentRefinementAgent)", () => {
  it("lê o registro JSON e o trabalho completo", () => {
    const r = lerRefinamento('```json\n{"actions_taken":["a"]}\n```\n\n```markdown\n# INTRODUÇÃO\nnovo\n```');
    expect(r).toEqual({ worklog: { actions_taken: ["a"] }, trabalho: "# INTRODUÇÃO\nnovo" });
    expect(lerRefinamento("sem blocos")).toBeNull();
  });
  const base = notasDoParecer({ Overall: 6, Clarity: 3, Quality: 3, Soundness: 3 });
  it("nota subiu → aceita; caiu → rejeita", () => {
    expect(vereditoDaRevisao(base, { ...base, Overall: 7 }).veredito).toBe("aceita");
    expect(vereditoDaRevisao(base, { ...base, Overall: 5 }).veredito).toBe("rejeita");
  });
  it("nota igual: aceita se o ganho dos sub-eixos cobre a perda", () => {
    expect(vereditoDaRevisao(base, { ...base, Clarity: 4, Quality: 2 }).veredito).toBe("aceita");
    expect(vereditoDaRevisao(base, { ...base, Clarity: 2 }).veredito).toBe("rejeita");
  });
  it("nota ausente ou texto vira 0, nunca NaN", () => {
    expect(notasDoParecer({ Overall: "x" }).Overall).toBe(0);
    expect(notasDoParecer(null).Clarity).toBe(0);
  });
});
