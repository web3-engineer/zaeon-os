import { describe, it, expect } from "vitest";
import {
  abntDoPaper, converterCitacoes, expandirFaixasDeChaves, numerosSemLatex, orcamentoDaSecao, pendenciasDaSecao, distanciaDaSecao, semTabelaForaDosResultados, semCitacaoRepetida, dividirParagrafosLongos, textoDoRegistro, criarRegistro, injetarCandidatas, lerRefinamento, notasDoParecer, papeisDoEsqueleto,
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
    const a = r.registrar({ title: "Gene editing A", authors: ["Ana Silva"], year: 2020, abstract: "diz A — e o resto do resumo que torna a fonte citável no texto." }, "INTRODUÇÃO")!;
    const b = r.registrar({ title: "Gene editing B", authors: ["João Silva"], year: 2020, abstract: "Um resumo longo o bastante para a fonte ser incluída no registro de evidência." }, "INTRODUÇÃO")!;
    const a2 = r.registrar({ title: "gene  editing a!", authors: ["Outro"], year: 1999, abstract: "Um resumo longo o bastante para a fonte ser incluída no registro de evidência." }, "X")!;
    expect(a.fonte.citacao).toBe("(SILVA, 2020)");
    expect(b.fonte.citacao).toBe("(SILVA, 2020b)");
    expect(a2.chave).toBe(a.chave);
    expect(r.itens()).toHaveLength(2);
    expect(a.resumo).toContain("diz A");
  });
  it("respeita o teto", () => {
    const r = criarRegistro(1);
    r.registrar({ title: "Um", authors: ["A B"], year: 2001, abstract: "Um resumo longo o bastante para a fonte ser incluída no registro de evidência." }, "s");
    expect(r.registrar({ title: "Dois", authors: ["C D"], year: 2002, abstract: "Um resumo longo o bastante para a fonte ser incluída no registro de evidência." }, "s")).toBeNull();
  });
});

describe("citação [E#] → ABNT do documento", () => {
  const r = criarRegistro();
  r.registrar({ title: "Paper um", authors: ["Ana Silva"], year: 2020, abstract: "Um resumo longo o bastante para a fonte ser incluída no registro de evidência." }, "s");
  r.registrar({ title: "Paper dois", authors: ["Bia Souza"], year: 2021, abstract: "Um resumo longo o bastante para a fonte ser incluída no registro de evidência." }, "s");
  it("agrupa chaves vizinhas numa citação só, corta a inventada e devolve as citadas em ordem", () => {
    const c = converterCitacoes("Como mostram estudos [E2][E1][E9]. Outro ponto [E1, E2]. E mais [E1], [E2] e [E1] e [E2].", r.porChave);
    expect(c.texto).toBe("Como mostram estudos (SOUZA, 2021; SILVA, 2020). Outro ponto (SILVA, 2020; SOUZA, 2021). E mais (SILVA, 2020; SOUZA, 2021).");
    expect(c.citadas).toEqual(["E2", "E1"]);
    expect(c.invalidas).toEqual(["E9"]);
  });
  it("FAIXA de chaves vira as chaves (achado do E2E: \"Artigos [E1-E7]\" vazava na tabela do TCC)", () => {
    expect(expandirFaixasDeChaves("| Artigos [E1-E3] | x |")).toBe("| Artigos [E1][E2][E3] | x |");
    expect(expandirFaixasDeChaves("ver [E1–E2, E5]")).toBe("ver [E1][E2][E5]");
    expect(expandirFaixasDeChaves("ver [E1 a E2]")).toBe("ver [E1][E2]");
    expect(expandirFaixasDeChaves("absurda [E1-E90]")).toBe("absurda [E1-E90]");
    const c = converterCitacoes("| Artigos [E1-E2] | achado |", r.porChave);
    expect(c.texto).toBe("| Artigos (SILVA, 2020; SOUZA, 2021) | achado |");
    expect(c.citadas).toEqual(["E1", "E2"]);
  });
  it("rede final: chave malformada que sobrou não chega ao documento", () => {
    const c = converterCitacoes("Fato [E1-E90] e outro [E3 e E4].", r.porChave);
    expect(c.texto).not.toMatch(/\[E\d/);
    expect(c.invalidas.length).toBeGreaterThan(0);
  });
  it("só chave inventada: some sem deixar parêntese vazio", () => {
    expect(converterCitacoes("Fato [E40].", r.porChave).texto).toBe("Fato.");
  });
  it("referências saem das chaves, sem repetir", () => {
    const refs = referenciasDasChaves(["E2", "E1", "E2", "E7"], r.porChave);
    expect(refs).toHaveLength(2);
    expect(refs[0].abnt).toContain("SOUZA, B.");
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
    r.registrar({ title: "P", authors: ["A B"], year: 2000, abstract: "Um resumo longo o bastante para a fonte ser incluída no registro de evidência." }, "METODOLOGIA - Base");
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

describe("ABNT do paper (NBR 10520 · 6023)", () => {
  it("até 3 autores na citação; 4 ou mais = primeiro + et al.; referência com iniciais e veículo", () => {
    const um = abntDoPaper({ title: "Paper", authors: ["Eric D. Klopfer"], year: 2024, venue: "MIT Press", doi: "10.1/x" })!;
    expect(um.citacao).toBe("(KLOPFER, 2024)");
    expect(um.abnt).toBe("KLOPFER, E. D. Paper. **MIT Press**, 2024. DOI: 10.1/x.");
    expect(abntDoPaper({ title: "P", authors: ["Ana Silva", "Bia Souza"], year: 2020 })!.citacao).toBe("(SILVA; SOUZA, 2020)");
    const quatro = abntDoPaper({ title: "P", authors: ["Eric Klopfer", "Justin Reich", "Hal Abelson", "Cynthia Breazeal"], year: 2024 })!;
    expect(quatro.citacao).toBe("(KLOPFER et al., 2024)");
    expect(quatro.abnt).toBe("KLOPFER, E.; REICH, J.; ABELSON, H. et al. P. 2024.");
  });
  it("sem autor: título curto em caixa alta; sem ano: [s.d.]", () => {
    expect(abntDoPaper({ title: "Generative AI in schools today and tomorrow" })!.citacao).toBe("(GENERATIVE AI IN SCHOOLS, [s.d.])");
  });
  it("paper sem resumo fica fora do registro", () => {
    const r = criarRegistro();
    expect(r.registrar({ title: "Sem resumo", authors: ["A B"], year: 2020 }, "s")).toBeNull();
  });
  it("instituição listada como autor sai da autoria; marca de rodapé (*, 1) sai do sobrenome", () => {
    expect(abntDoPaper({ title: "P", authors: ["The Korean Society of Special Education", "Eunji Sohn", "Sunyoung Kim", "Jeongmin Lim"], year: 2026 })!.citacao).toBe("(SOHN; KIM; LIM, 2026)");
    expect(abntDoPaper({ title: "P", authors: ["Sathy Akter*"], year: 2026 })!.citacao).toBe("(AKTER, 2026)");
  });
  it("nome no formato PubMed (\"Schmidt MJ\"): sobrenome primeiro, iniciais no fim", () => {
    const r = abntDoPaper({ title: "P", authors: ["Schmidt MJ", "van der Berg A", "Costa"], year: 2026 })!;
    expect(r.citacao).toBe("(SCHMIDT; VAN DER BERG; COSTA, 2026)");
    expect(r.abnt).toMatch(/^SCHMIDT, M\. J\.; VAN DER BERG, A\.; COSTA\./);
    expect(abntDoPaper({ title: "P", authors: ["Eric D. Klopfer"], year: 2024 })!.citacao).toBe("(KLOPFER, 2024)"); // formato comum intacto
  });
});
describe("orçamento de palavras por seção", () => {
  it("varia por seção e por tipo de trabalho; título desconhecido tem faixa padrão", () => {
    expect(orcamentoDaSecao("RESUMO", "Artigo", false)).toEqual([190, 250]);
    expect(orcamentoDaSecao("REFERENCIAL TEÓRICO", "TCC", false)).toEqual([780, 1000]);
    expect(orcamentoDaSecao("REFERENCIAL TEÓRICO", "Artigo", true)).toEqual([630, 820]);
    expect(orcamentoDaSecao("METODOLOGIA", "Artigo", true)).toEqual([220, 300]);
    expect(orcamentoDaSecao("INTRODUÇÃO", "Artigo", true)).toEqual([350, 450]);
    expect(orcamentoDaSecao("RESULTADOS E DISCUSSÃO", "TCC", false)).toEqual([1020, 1300]);
    expect(orcamentoDaSecao("CONSIDERAÇÕES FINAIS", "Artigo", false)).toEqual([190, 250]);
    expect(orcamentoDaSecao("APÊNDICE", "Artigo", false)).toEqual([300, 700]);
  });
});

describe("auditoria de entrega (checagem de código)", () => {
  const P = (n: number, extra = "") => `${"palavra ".repeat(n)}${extra}`.trim();
  const sem = { tipo: "Artigo", dados: "" };
  const com = { tipo: "Artigo", dados: "| h | n | média |\nr de Pearson = 0,58" };
  it("tamanho fora da faixa pede condensar/aprofundar", () => {
    expect(pendenciasDaSecao("INTRODUÇÃO", P(700), sem)[0]).toMatch(/^CONDENSE para 370–490/);
    expect(pendenciasDaSecao("INTRODUÇÃO", P(200), sem)[0]).toMatch(/^APROFUNDE/);
  });
  it("revisão: metodologia com as 3 subseções fixas e tabela-síntese nos resultados", () => {
    expect(pendenciasDaSecao("METODOLOGIA", P(300), sem).join()).toMatch(/Tipo de estudo/);
    expect(pendenciasDaSecao("METODOLOGIA", `## Tipo de estudo\n${P(100)}\n## Busca e seleção das fontes\n${P(100)}\n## Análise e limitações do método\n${P(100)}`, sem)).toEqual([]);
    expect(pendenciasDaSecao("RESULTADOS E DISCUSSÃO", `## a\n${P(300)}\n## b\n${P(300)}\n## c\n${P(300, "[E1] [E2] [E3] [E4] [E5] [E6] [E7] [E8] [E9] [E10] [E11] [E12] [E13] [E14] [E15] [E16] [E17] [E18] [E19] [E20] [E21] [E22] [E23] [E24] [E25] [E26] [E27] [E28]")}`, sem).join()).toMatch(/tabela-síntese/);
  });
  it("com dados e estatística: metodologia pede a equação", () => {
    const corpo = `## a\n${P(65)}\n\n${P(65)}\n\n## b\n${P(65)}\n\n${P(65)}`;
    expect(pendenciasDaSecao("METODOLOGIA", corpo, com)).toEqual([expect.stringMatching(/equação da medida/)]);
    expect(pendenciasDaSecao("METODOLOGIA", `${corpo}\n\n$$r = x$$`, com)).toEqual([]);
  });
  it("resumo sem palavras-chave, 1ª pessoa, citação demais e parágrafo longo", () => {
    expect(pendenciasDaSecao("RESUMO", P(200), sem).join()).toMatch(/Palavras-chave/);
    expect(pendenciasDaSecao("CONSIDERAÇÕES FINAIS", `${P(100)} nós concluímos\n\n${P(110)}`, sem).join()).toMatch(/impessoal/);
    expect(pendenciasDaSecao("INTRODUÇÃO", P(400, "[E1] ".repeat(30)), sem).join()).toMatch(/Cite MENOS/);
    expect(pendenciasDaSecao("CONSIDERAÇÕES FINAIS", P(240), sem).join()).toMatch(/Divida os parágrafos/);
    expect(pendenciasDaSecao("CONSIDERAÇÕES FINAIS", `${P(100, "[E1] [E2]")}\n\n${P(100, "[E3]")}`, sem).join()).toMatch(/Cite MENOS/);
  });
});

describe("registro de busca", () => {
  it("diz o que foi feito, os critérios ÚNICOS e as limitações — e nada de PRISMA nem revisores", () => {
    const t = textoDoRegistro({ origem: "busca", bases: ["OpenAlex", "Crossref"], consultas: ["a", "b"], data: "2026-11-20", encontrados: 10, semResumo: 1, excluidosTriagem: 2, incluidos: 7, motivosExclusao: ["fora do tema"], resumosCompletados: 3 });
    expect(t).toContain("OpenAlex e Crossref");
    expect(t).toContain("Resumos completados pelo DOI (OpenAlex): 3");
    expect(t).toContain("os ÚNICOS aplicados");
    expect(t).toContain("Incluídos na síntese: 7");
    expect(t).not.toMatch(/scopus|web of science|dois revisores/i);
    expect(textoDoRegistro({ origem: "pedido", bases: [], consultas: [], data: "", encontrados: 0, semResumo: 0, excluidosTriagem: 0, incluidos: 4, motivosExclusao: [] })).toMatch(/indicadas pelo autor/);
  });
});

describe("número como texto, equação como LaTeX", () => {
  it("estatística simples perde o cifrão; equação de verdade fica", () => {
    expect(numerosSemLatex("com $r = 0,58$ e $p<0,001$ (n = 40), $n=14$ e o coeficiente $r$")).toBe("com r = 0,58 e p < 0,001 (n = 40), n = 14 e o coeficiente r");
    expect(numerosSemLatex("onde $r^2 \\approx 0,34$ e $$x = \\frac{a}{b}$$")).toBe("onde $r^2 \\approx 0,34$ e $$x = \\frac{a}{b}$$");
    expect(numerosSemLatex("custa R$ 10 e R$ 20")).toBe("custa R$ 10 e R$ 20");
  });
});

describe("distância até o entregável", () => {
  const P = (n: number, extra = "") => `${"palavra ".repeat(n)}${extra}`.trim();
  const ctx = { tipo: "Artigo", dados: "" };
  it("0 quando pronta; cai quando o ajuste APROXIMA, mesmo sem zerar a pendência", () => {
    const pronta = `${P(100, "[E1] [E2] [E3] [E4] [E5]")}\n\n${P(100, "[E6] [E7] [E8] [E9] [E10]")}\n\n${P(100)}\n\n${P(80)}`;
    expect(distanciaDaSecao("INTRODUÇÃO", pronta, ctx)).toBe(0);
    const muito = P(400, "[E1] ".repeat(30));  // ~70 por mil
    const menos = P(400, "[E1] ".repeat(20));  // ~48 por mil: ainda acima de 30, mas mais perto
    expect(distanciaDaSecao("INTRODUÇÃO", menos, ctx)).toBeLessThan(distanciaDaSecao("INTRODUÇÃO", muito, ctx));
  });
});

describe("tabela só nos resultados", () => {
  const tabela = "Tabela 1 — Notas por grupo\n\n| g | n |\n|---|---|\n| a | 1 |\n\nFonte: dados da pesquisa.";
  it("sai da introdução com título e fonte; fica nos resultados", () => {
    expect(semTabelaForaDosResultados("INTRODUÇÃO", `Texto antes.\n\n${tabela}\n\nTexto depois.`)).toBe("Texto antes.\n\nTexto depois.");
    expect(semTabelaForaDosResultados("RESULTADOS E DISCUSSÃO", tabela)).toBe(tabela);
  });
});

describe("correções determinísticas", () => {
  it("citação repetida no mesmo parágrafo sai na 2ª vez; em outro parágrafo, fica", () => {
    expect(semCitacaoRepetida("A diz isso [E1][E2]. E mais isso [E1]. Também [E1, E3].\n\nOutro parágrafo [E1]."))
      .toBe("A diz isso [E1][E2]. E mais isso. Também [E3].\n\nOutro parágrafo [E1].");
  });
  it("parágrafo longo parte na frase do meio; curto, tabela e título ficam", () => {
    const frase = (n: number) => `${"palavra ".repeat(n - 1)}fim.`;
    const longo = [frase(50), frase(50), frase(50), frase(50)].map((f, i) => (i ? f.replace(/^p/, "P") : f)).join(" ");
    const r = dividirParagrafosLongos(longo);
    expect(r.split("\n\n")).toHaveLength(2);
    expect(dividirParagrafosLongos(`## Título\n\n${frase(30)}\n\n| a |\n|---|`)).toBe(`## Título\n\n${frase(30)}\n\n| a |\n|---|`);
  });
});

describe("registro de busca descreve a busca que ACONTECEU (E2E nov/2026)", () => {
  const base = { origem: "busca" as const, consultas: ["reúso de água cinza"], data: "2026-11-20", encontrados: 3, semResumo: 2, excluidosTriagem: 0, incluidos: 1, motivosExclusao: [] };
  it("só as bases que responderam; as que falharam são ditas como tal; sem 'em inglês' fixo", () => {
    const t = textoDoRegistro({ ...base, bases: ["Crossref", "arXiv"], basesSemResposta: ["OpenAlex", "Semantic Scholar"] });
    expect(t).toContain("nas bases Crossref e arXiv");
    expect(t).toContain("não responderam (limite de uso ou indisponibilidade): OpenAlex, Semantic Scholar");
    expect(t).not.toMatch(/PubMed|em inglês/);
  });
  it("nenhuma base respondeu: diz isso", () => {
    expect(textoDoRegistro({ ...base, bases: [] })).toContain("nenhuma base acadêmica respondeu");
  });
});
