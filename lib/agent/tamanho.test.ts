import { describe, expect, it } from "vitest";
import { diretrizDeTamanho, pedeRespostaCurta, semDesenvolvimentoNaoPedido, tamanhoPedido } from "@/lib/agent/tamanho";

describe("#728 · tamanho pedido pelo aluno", () => {
  it("lê o número e a unidade", () => {
    expect(tamanhoPedido("o que é mitocôndria? responda em 2 frases")).toEqual({ n: 2, unidade: "frases" });
    expect(tamanhoPedido("o que é fotossíntese? responda em três frases")).toEqual({ n: 3, unidade: "frases" });
    expect(tamanhoPedido("explica em até 5 linhas")).toEqual({ n: 5, unidade: "linhas" });
    expect(tamanhoPedido("me explica numa frase")).toEqual({ n: 1, unidade: "frases" });
    expect(tamanhoPedido("resume em um parágrafo")).toEqual({ n: 1, unidade: "paragrafos" });
  });

  it("pedido curto sem número", () => {
    expect(tamanhoPedido("o que é DNA, resumidamente")).toEqual({});
    expect(pedeRespostaCurta("me fala rapidinho o que é ATP")).toBe(true);
  });

  it("sem pedido de tamanho: null", () => {
    expect(tamanhoPedido("o que é fotossíntese?")).toBeNull();
    expect(tamanhoPedido("faça um diagrama da fotossíntese")).toBeNull();
    expect(tamanhoPedido("quais são as 3 fases da mitose")).toBeNull();
    expect(tamanhoPedido("")).toBeNull();
  });

  it("a diretriz põe o limite; sem pedido, só cobra não repetir", () => {
    expect(diretrizDeTamanho("responda em 2 frases")).toMatch(/TAMANHO: .*2 frases/);
    expect(diretrizDeTamanho("numa frase")).toMatch(/1 frase\b/);
    expect(diretrizDeTamanho("o que é DNA?")).toMatch(/^REPETIÇÃO/);
  });

  it("com tamanho pedido, o desenvolvimento sai; sem núcleo, fica", () => {
    const a = { nucleo: "Três frases.", desenvolvimento: "Um parágrafo a mais." };
    expect(semDesenvolvimentoNaoPedido(a, "em 3 frases")).toEqual({ nucleo: "Três frases." });
    expect(semDesenvolvimentoNaoPedido(a, "o que é DNA?")).toBe(a);
    const vazio = { nucleo: " ", desenvolvimento: "a resposta" };
    expect(semDesenvolvimentoNaoPedido(vazio, "em 3 frases")).toBe(vazio);
  });
});
