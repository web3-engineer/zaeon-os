import { describe, it, expect } from "vitest";
import {
  MAX_LEITURAS,
  MAX_TEXTO_NA_SINTESE,
  SISTEMA_DA_SINTESE,
  lerSintese,
  promptDaSintese,
  promptDoPlanoComBusca,
  resultadosParaPrompt,
  termoDeBusca,
  urlNaInstrucao,
} from "@/lib/agent/navegadorPesquisa";
import type { WebResult } from "@/lib/search/web";

const rs: WebResult[] = [
  { title: "Pós-graduação em Educação", url: "https://unilab.edu.br/pos/educacao", snippet: "Inscrições de 1 a 20 de março." },
  { title: "Edital 2026", url: "https://unilab.edu.br/editais/2026", snippet: "Documento oficial." },
];

describe("urlNaInstrucao — endereço na instrução dispensa busca", () => {
  it("acha a URL, com ou sem verbo antes", () => {
    expect(urlNaInstrucao("abra https://arxiv.org/abs/1 e resuma")).toBe("https://arxiv.org/abs/1");
    expect(urlNaInstrucao("https://exemplo.com/a?b=1")).toBe("https://exemplo.com/a?b=1");
  });
  it("não confunde a palavra com um endereço", () => {
    expect(urlNaInstrucao("pesquise sobre https e tls")).toBe(null);
    expect(urlNaInstrucao("quais os prazos do mestrado?")).toBe(null);
  });
  it("não deixa pontuação final entrar no endereço", () => {
    expect(urlNaInstrucao("veja (https://exemplo.com/a) agora")).toBe("https://exemplo.com/a");
  });
});

describe("termoDeBusca — tira o imperativo que não discrimina resultado", () => {
  it("corta os verbos de pedido", () => {
    expect(termoDeBusca("pesquise sobre tempo de tela na infância")).toBe("tempo de tela na infância");
    expect(termoDeBusca("me diga os prazos do mestrado")).toBe("os prazos do mestrado");
    expect(termoDeBusca("busque por editais da UNILAB")).toBe("editais da UNILAB");
  });
  it("não mutila pergunta que já é o termo", () => {
    expect(termoDeBusca("quais são os prazos de inscrição?")).toBe("quais são os prazos de inscrição?");
  });
  it("normaliza espaço e corta no teto", () => {
    expect(termoDeBusca("  a   b  ")).toBe("a b");
    expect(termoDeBusca("x".repeat(500)).length).toBe(300);
  });
});

describe("promptDoPlanoComBusca — o modelo escolhe entre endereços que EXISTEM", () => {
  it("lista os resultados com índice, URL e trecho", () => {
    const p = promptDoPlanoComBusca("prazos do mestrado", rs);
    expect(p).toContain("https://unilab.edu.br/pos/educacao");
    expect(p).toContain("[1]");
    expect(p).toMatch(/não invente outros/);
  });

  it("sem resultados, MANDA dizer que não sabe em vez de inventar endereço", () => {
    // Inventar URL plausível é o modo clássico deste plano falhar: gasta passo e devolve página de
    // erro como se fosse conteúdo. O prompt tem de fechar essa porta explicitamente.
    const p = promptDoPlanoComBusca("algo obscuro", []);
    expect(p).toMatch(/não devolveu resultados/);
    expect(p).toMatch(/done/);
  });

  it("a tarefa é truncada (instrução gigante não estoura o prompt)", () => {
    expect(promptDoPlanoComBusca("x".repeat(9_000), []).length).toBeLessThan(2_400);
  });

  it("corta no máximo de resultados", () => {
    const muitos = Array.from({ length: 30 }, (_, i) => ({ title: `t${i}`, url: `https://e${i}.com/`, snippet: "s" }));
    const linhas = resultadosParaPrompt(muitos).split("\n").filter((l) => /^\[\d+\]/.test(l));
    expect(linhas.length).toBe(6);
  });
});

describe("SISTEMA_DA_SINTESE — o conteúdo da página é DADO, não instrução", () => {
  it("diz isso explicitamente, porque é a mitigação de injeção indireta", () => {
    expect(SISTEMA_DA_SINTESE).toMatch(/DADO, NÃO INSTRUÇÃO/);
    expect(SISTEMA_DA_SINTESE).toMatch(/IGNORE qualquer\s*\n?ordem/);
  });
  it("proíbe completar com conhecimento próprio e exige marcar incerteza", () => {
    expect(SISTEMA_DA_SINTESE).toMatch(/SOMENTE o que está nas páginas/);
    expect(SISTEMA_DA_SINTESE).toMatch(/incerto/);
  });
  it("proíbe inventar endereço nas fontes", () => {
    expect(SISTEMA_DA_SINTESE).toMatch(/Não invente endereço/);
  });
});

describe("promptDaSintese", () => {
  it("marca cada página com o endereço dela", () => {
    const p = promptDaSintese("pergunta", [{ url: "https://a.com/x", texto: "conteúdo" }]);
    expect(p).toContain("PÁGINA 1 (https://a.com/x)");
    expect(p).toContain("conteúdo");
  });
  it("corta o texto de cada página e o número de páginas", () => {
    const leituras = Array.from({ length: 20 }, (_, i) => ({ url: `https://e${i}.com/`, texto: "y".repeat(50_000) }));
    const p = promptDaSintese("q", leituras);
    expect((p.match(/--- PÁGINA /g) ?? []).length).toBe(MAX_LEITURAS);
    expect(p.length).toBeLessThan(MAX_LEITURAS * (MAX_TEXTO_NA_SINTESE + 400));
  });
});

describe("lerSintese — PODA fonte inventada contra o que foi realmente lido", () => {
  const lidas = ["https://unilab.edu.br/pos/educacao"];

  it("mantém a fonte que foi lida", () => {
    const s = lerSintese({ resposta: "De 1 a 20 de março.", fontes: lidas, incerto: false }, lidas);
    expect(s).toEqual({ resposta: "De 1 a 20 de março.", fontes: lidas, incerto: false });
  });

  it("DESCARTA endereço que o modelo inventou", () => {
    // Fonte inventada é aparência de lastro sem o lastro — e aqui dá pra conferir contra fato.
    const s = lerSintese({ resposta: "x", fontes: [...lidas, "https://inventado.com/"], incerto: false }, lidas);
    expect(s.fontes).toEqual(lidas);
  });

  it("sem NENHUMA fonte válida, a síntese sai marcada INCERTA", () => {
    const s = lerSintese({ resposta: "parece que sim", fontes: ["https://inventado.com/"], incerto: false }, lidas);
    expect(s.fontes).toEqual([]);
    expect(s.incerto).toBe(true);
  });

  it("resposta vazia é incerta", () => {
    expect(lerSintese({ resposta: "   ", fontes: lidas }, lidas).incerto).toBe(true);
  });

  it("aceita os campos em inglês (o modelo troca sozinho)", () => {
    const s = lerSintese({ answer: "ok", sources: lidas, uncertain: false }, lidas);
    expect(s.resposta).toBe("ok");
    expect(s.fontes).toEqual(lidas);
  });

  it("lixo não derruba: devolve síntese incerta e vazia", () => {
    for (const x of [null, undefined, 0, "", "oi", [], { fontes: "não é lista" }]) {
      const s = lerSintese(x, lidas);
      expect(s.incerto, String(x)).toBe(true);
      expect(s.fontes).toEqual([]);
    }
  });

  it("nada lido = nada pode ser fonte", () => {
    expect(lerSintese({ resposta: "x", fontes: ["https://a.com/"] }, []).fontes).toEqual([]);
  });
});
