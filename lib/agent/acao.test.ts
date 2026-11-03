import { describe, it, expect } from "vitest";
import {
  FORA_DO_MENU,
  MAX_CHAMADAS,
  MAX_RESUMO,
  chaveDaChamada,
  lerAcao,
  menuDeTools,
  resumoDaColeta,
  resumoDasFalhas,
  toolVisivel,
  toolsDoMenu,
  type ToolVisivel,
} from "@/lib/agent/acao";

const tool = (name: string, params: ToolVisivel["params"] = [], description = "faz algo"): ToolVisivel => ({ name, description, params });
const busca = tool("web_search", [{ nome: "query", tipo: "string", descricao: "o que buscar", obrigatorio: true }], "Busca na internet.");
const abrir = tool("abrir_url", [{ nome: "url", tipo: "string", obrigatorio: true }]);
const memoria = tool("memory_search", [{ nome: "query", tipo: "string", obrigatorio: true }]);

describe("render · o menu que o modelo vê", () => {
  it("ToolDef do Gemini → forma enxuta, com obrigatórios marcados", () => {
    const v = toolVisivel({
      name: "literature_search",
      schema: {
        description: "Busca papers.",
        parameters: { type: "OBJECT", properties: { query: { type: "STRING", description: "tema" }, domain: { type: "STRING" } }, required: ["query"] },
      },
    });
    expect(v).toEqual({
      name: "literature_search",
      description: "Busca papers.",
      params: [
        { nome: "query", tipo: "string", descricao: "tema", obrigatorio: true },
        { nome: "domain", tipo: "string", descricao: undefined, obrigatorio: false },
      ],
    });
  });

  it("tool sem parâmetros e sem descrição não quebra o render", () => {
    expect(toolVisivel({ name: "x" })).toEqual({ name: "x", description: "", params: [] });
    expect(menuDeTools([tool("x", [], "")])).toBe("- x(sem argumentos)");
  });

  it("o menu mostra nome, args e descrição; opcional vem com ?", () => {
    const m = menuDeTools([toolVisivel({
      name: "literature_search",
      schema: { description: "Busca papers.", parameters: { properties: { query: { type: "STRING" }, domain: { type: "STRING" } }, required: ["query"] } },
    })]);
    expect(m).toContain("literature_search(query: string; domain?: string)");
    expect(m).toContain("Busca papers.");
  });

  it("menu vazio é dito, não omitido", () => {
    expect(menuDeTools([])).toBe("(nenhuma ferramenta disponível)");
  });

  it("artefato e stub NÃO entram no menu — a decisão de produto não volta pro modelo", () => {
    const todas = [{ name: "web_search" }, { name: "studio_generate" }, { name: "research_generate" }, { name: "examiner" }, { name: "abrir_url" }];
    expect(toolsDoMenu(todas).map((t) => t.name)).toEqual(["web_search", "abrir_url"]);
    expect(FORA_DO_MENU).toContain("studio_generate");
  });
});

describe("parse · nada passa sem validação", () => {
  const disponiveis = [busca, abrir, memoria];

  it("o caminho feliz", () => {
    const r = lerAcao({ chamadas: [{ tool: "web_search", args: { query: "ipca 2024" } }] }, { disponiveis });
    expect(r.chamadas).toEqual([{ tool: "web_search", args: { query: "ipca 2024" } }]);
    expect(r.pronto).toBe(false);
    expect(r.descartadas).toEqual([]);
  });

  it("aceita a lista crua, que é como o modelo às vezes responde", () => {
    const r = lerAcao([{ tool: "abrir_url", args: { url: "https://x.gov.br/a" } }], { disponiveis });
    expect(r.chamadas).toHaveLength(1);
  });

  it("tool INVENTADA cai", () => {
    const r = lerAcao({ chamadas: [{ tool: "clonar_repo", args: {} }, { tool: "", args: {} }] }, { disponiveis });
    expect(r.chamadas).toEqual([]);
    expect(r.descartadas).toEqual(["tool desconhecida: clonar_repo", "tool desconhecida: (vazio)"]);
    expect(r.pronto).toBe(true);   // sem chamada válida, o laço PARA
  });

  it("argumento obrigatório ausente derruba a chamada (melhor não chamar que chamar com undefined)", () => {
    const r = lerAcao({ chamadas: [{ tool: "web_search", args: {} }] }, { disponiveis });
    expect(r.chamadas).toEqual([]);
    expect(r.descartadas[0]).toBe("web_search: falta query");
  });

  it("argumento FORA do schema é descartado, não repassado pra tool", () => {
    const r = lerAcao({ chamadas: [{ tool: "web_search", args: { query: "x", limite: 999, callback: "rm -rf" } }] }, { disponiveis });
    expect(r.chamadas[0].args).toEqual({ query: "x" });
    expect(r.descartadas[0]).toContain("fora do schema");
  });

  it("args ausente ou não-objeto vira {} (e aí falta o obrigatório)", () => {
    expect(lerAcao({ chamadas: [{ tool: "web_search" }] }, { disponiveis }).chamadas).toEqual([]);
    expect(lerAcao({ chamadas: [{ tool: "web_search", args: "x" }] }, { disponiveis }).chamadas).toEqual([]);
  });

  it("CHAMADA JÁ FEITA cai — é o que impede o laço de pedir a mesma coisa pra sempre", () => {
    const feita = chaveDaChamada({ tool: "web_search", args: { query: "ipca" } });
    const r = lerAcao({ chamadas: [{ tool: "web_search", args: { query: "ipca" } }] }, { disponiveis, jaFeitas: [feita] });
    expect(r.chamadas).toEqual([]);
    expect(r.pronto).toBe(true);
    expect(r.descartadas[0]).toContain("já foi feita");
  });

  it("a mesma chamada duas vezes na mesma volta vale uma", () => {
    const r = lerAcao({ chamadas: [{ tool: "memory_search", args: { query: "a" } }, { tool: "memory_search", args: { query: "a" } }] }, { disponiveis });
    expect(r.chamadas).toHaveLength(1);
  });

  it("a ordem dos argumentos não muda a identidade da chamada", () => {
    const a = chaveDaChamada({ tool: "t", args: { b: 2, a: 1 } });
    const b = chaveDaChamada({ tool: "t", args: { a: 1, b: 2 } });
    expect(a).toBe(b);
  });

  it("corta no teto", () => {
    const muitas = Array.from({ length: 10 }, (_, i) => ({ tool: "web_search", args: { query: `q${i}` } }));
    const r = lerAcao({ chamadas: muitas }, { disponiveis });
    expect(r.chamadas).toHaveLength(MAX_CHAMADAS);
    expect(r.descartadas.some((d) => d.includes("teto"))).toBe(true);
    expect(lerAcao({ chamadas: muitas }, { disponiveis, max: 1 }).chamadas).toHaveLength(1);
  });

  it("`pronto` do modelo é respeitado mesmo com chamada válida junto", () => {
    const r = lerAcao({ pronto: true, chamadas: [{ tool: "memory_search", args: { query: "a" } }] }, { disponiveis });
    expect(r.chamadas).toHaveLength(1);
    expect(r.pronto).toBe(true);
  });

  it("lixo de entrada não derruba nada", () => {
    for (const lixo of [null, undefined, "texto", 42, {}, { chamadas: "x" }, { chamadas: [null, 1, "a"] }]) {
      const r = lerAcao(lixo, { disponiveis });
      expect(r.chamadas, String(lixo)).toEqual([]);
      expect(r.pronto, String(lixo)).toBe(true);
    }
  });
});

describe("o estado que o modelo vê pra decidir", () => {
  it("resumo é TÍTULO, não conteúdo — uma página tem 4.000 chars e não cabe aqui", () => {
    const pagina = { claim: `Tabela 1737 <https://x>\n${"a".repeat(4000)}`, source: { title: "Tabela 1737" } };
    const r = resumoDaColeta([pagina]);
    expect(r).toBe("- Tabela 1737");
    expect(r.length).toBeLessThan(MAX_RESUMO);
  });

  it("sem fonte, usa a primeira linha do claim", () => {
    expect(resumoDaColeta([{ claim: "Primeira linha\nsegunda" }])).toBe("- Primeira linha");
  });

  it("nada reunido é DITO (o modelo precisa saber que falhou)", () => {
    expect(resumoDaColeta([])).toBe("(nada reunido ainda)");
  });

  it("muitos achados cabem no teto, com a conta do que sobrou", () => {
    const muitos = Array.from({ length: 200 }, (_, i) => ({ claim: `achado ${i} ${"x".repeat(100)}` }));
    const r = resumoDaColeta(muitos);
    expect(r.length).toBeLessThanOrEqual(MAX_RESUMO + 40);
    expect(r).toMatch(/\(\+\d+ outros\)/);
  });

  it("as falhas aparecem uma vez por tool, pro modelo não insistir no que não funciona", () => {
    const r = resumoDasFalhas([{ tool: "web_search", code: "web_unavailable" }, { tool: "web_search", code: "web_unavailable" }, { tool: "abrir_url", code: "url_nao_permitida" }]);
    expect(r).toBe("- web_search: web_unavailable\n- abrir_url: url_nao_permitida");
    expect(resumoDasFalhas([])).toBe("");
  });
});
