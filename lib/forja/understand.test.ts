import { describe, it, expect } from "vitest";
import { arvoreDoUA, temUA, type UAGrafo } from "./understand";
import sample from "./understand.sample.json";

// amostra REAL: understand-anything rodado de verdade no karpathy/micrograd (17 nós, 3 camadas, 7 passos).
const ua = sample as unknown as UAGrafo;

describe("arvoreDoUA — base de conhecimento a partir do understand-anything REAL (micrograd)", () => {
  const arv = arvoreDoUA(ua);

  it("a raiz é o projeto, com a descrição real", () => {
    expect(arv.raiz.titulo).toBe("micrograd");
    expect(arv.raiz.resumo.length).toBeGreaterThan(10);
  });

  it("os ramos são as camadas, ordenadas pelo TOUR (o motor da autograd vem primeiro)", () => {
    expect(arv.raiz.filhos.length).toBe(3);
    expect(arv.raiz.filhos[0].titulo).toBe("Autograd engine"); // camada do passo 1 do tour
  });

  it("as folhas são conceitos reais com resumo (a lição) do understand-anything", () => {
    const motor = arv.raiz.filhos[0];
    const titulos = motor.filhos.map((f) => f.titulo);
    expect(titulos).toContain("Value"); // conceito central real
    const value = motor.filhos.find((f) => f.titulo === "Value")!;
    expect(value.resumo.toLowerCase()).toContain("grad"); // resumo real explica data+gradiente
    expect(value.refs).toContain("symbol:micrograd/engine.py#Value"); // aponta pro nó real
  });

  it("o 1º conceito da 1ª camada é o ponto de partida (Value, pelo tour)", () => {
    expect(arv.raiz.filhos[0].filhos[0].titulo).toBe("Value");
  });

  it("temUA reconhece um grafo utilizável e rejeita um vazio", () => {
    expect(temUA(ua)).toBe(true);
    expect(temUA({ layers: [], nodes: [] })).toBe(false);
    expect(temUA(null)).toBe(false);
  });
});
