import { describe, it, expect } from "vitest";
import { cardDoPlano, validarCardContraArquivo, cardsValidados, type PlanoDeArquivo } from "./cardsDoRepo";
import { montarArquivo, snippetsDoCard, normalizar } from "./tutorialArquivo";

// Um "arquivo real" (o conteúdo que a box teria clonado).
const fonte = [
  "def busca_binaria(lista, alvo):",
  "    inicio, fim = 0, len(lista) - 1",
  "    while inicio <= fim:",
  "        meio = (inicio + fim) // 2",
  "        if lista[meio] == alvo:",
  "            return meio",
  "        elif lista[meio] < alvo:",
  "            inicio = meio + 1",
  "        else:",
  "            fim = meio - 1",
  "    return -1",
].join("\n");

const plano: PlanoDeArquivo = {
  arquivo: "searches/binary_search.py",
  funcao: "Busca binária.",
  ordem: 0,
  linguagem: "python",
  cortes: [
    { linha: 1, explicacao: "A assinatura.", aba: "A varredura" },
    { linha: 2, explicacao: "Os índices.", aba: "A varredura" },
    { linha: 3, explicacao: "O laço.", aba: "A varredura" },
    { linha: 5, explicacao: "As decisões.", aba: "As decisões" },
    { linha: 11, explicacao: "Não achou.", aba: "As decisões" },
  ],
  teste: "assert busca_binaria([1,2,3], 2) == 1",
};

describe("cardsDoRepo — o split do arquivo real garante a harmonia", () => {
  const card = cardDoPlano(plano, fonte);

  it("os snippets concatenados reconstroem o arquivo EXATO", () => {
    expect(normalizar(montarArquivo(card))).toBe(normalizar(fonte));
    expect(validarCardContraArquivo(card, fonte)).toBe(true);
  });

  it("agrupa os snippets nas sub-abas do plano, na ordem", () => {
    expect(card.abas.map((a) => a.titulo)).toEqual(["A varredura", "As decisões"]);
    expect(card.abas[0].snippets).toHaveLength(3);
    expect(card.abas[1].snippets).toHaveLength(2);
    expect(snippetsDoCard(card)).toHaveLength(5);
  });

  it("carrega o teste do plano", () => {
    expect(card.teste).toContain("assert busca_binaria");
  });

  it("cortes fora de ordem / sem começar na linha 1 são saneados, e a harmonia continua", () => {
    const bagunca: PlanoDeArquivo = { ...plano, cortes: [
      { linha: 5, explicacao: "meio do arquivo" },
      { linha: 3, explicacao: "antes" },
      { linha: 3, explicacao: "duplicado (ignorado)" },
    ] };
    const c = cardDoPlano(bagunca, fonte);
    expect(validarCardContraArquivo(c, fonte)).toBe(true);           // reconstrói mesmo assim
    expect(snippetsDoCard(c)[0].codigo.startsWith("def busca_binaria")).toBe(true); // começou na linha 1
  });

  it("cardsValidados descarta card que quebra a harmonia e mantém o residual", () => {
    const bom = plano;
    const residual = { ...plano, arquivo: "conftest.py", residual: true, cortes: [] };
    const cards = cardsValidados([bom, residual], { "searches/binary_search.py": fonte, "conftest.py": "import pytest\n" });
    expect(cards.map((c) => c.arquivo)).toContain("searches/binary_search.py");
    expect(cards.find((c) => c.arquivo === "conftest.py")?.residual).toBe(true);
  });
});
