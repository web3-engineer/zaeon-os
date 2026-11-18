// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, fireEvent } from "@testing-library/react";
import ChatMarkdown from "./ChatMarkdown";

afterEach(() => cleanup());

describe("ChatMarkdown — matemática", () => {
  it("$…$ inline e $$…$$ em destaque viram KaTeX", async () => {
    const { container } = render(<ChatMarkdown text={"Seja $f(x)=x^2$.\n$$\\frac{a}{b}$$\nfim"} />);
    await waitFor(() => expect(container.querySelectorAll(".katex").length).toBe(2));
    expect(container.querySelector(".katex-display")).not.toBeNull();
    expect(container.textContent).not.toContain("$");
  });
  it("```grafico vira SVG com a curva", () => {
    const { container } = render(<ChatMarkdown text={'Veja:\n```grafico\n{"funcoes":["x^2-4"],"x":[-3,3],"pontos":[{"x":2,"y":0,"rotulo":"raiz"}]}\n```'} />);
    expect(container.querySelector("svg[role=img]")).not.toBeNull();
    expect(container.querySelectorAll("polyline").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("y = x^2-4");
  });
  it("#749 · ```grafico com barras vira gráfico de barras, com a fonte embaixo", () => {
    const { container } = render(<ChatMarkdown text={'Pelo Censo:\n```grafico\n{"titulo":"População (milhões)","barras":[{"rotulo":"Sudeste","valor":84.8},{"rotulo":"Nordeste","valor":54.6}],"fonte":"Censo 2022 (IBGE)"}\n```'} />);
    const fig = container.querySelector("[data-grafico-dados]");
    expect(fig).not.toBeNull();
    expect(fig!.querySelectorAll("[data-barra-cheia]").length).toBe(2);   // #756: barras em HTML, não SVG
    expect(fig!.textContent).toContain("84,8");
    expect(fig!.textContent).toContain("54,6");   // número em TODAS as barras
    expect(fig!.textContent).toContain("Fonte: Censo 2022 (IBGE)");
    expect(container.querySelector("polyline")).toBeNull();   // não foi para o gráfico de função
  });
  it("gráfico inválido avisa sem quebrar", () => {
    const { container } = render(<ChatMarkdown text={'```grafico\n{"funcoes":["alert(1)"]}\n```'} />);
    expect(container.textContent).toMatch(/Não consegui desenhar/);
  });
  it("dinheiro continua texto; a*b não vira itálico dentro de fórmula", async () => {
    const { container } = render(<ChatMarkdown text={"Custa R$ 10 e o produto é $a*b*c$."} />);
    expect(container.textContent).toContain("R$ 10");
    await waitFor(() => expect(container.querySelectorAll(".katex").length).toBe(1));
    expect(container.querySelector("em")).toBeNull();
  });
  it("links http(s) viram <a> em nova aba; javascript: não", () => {
    const { container } = render(<ChatMarkdown text={"[PDF](https://www.gutenberg.org/x.pdf) e [mau](javascript:alert(1))"} />);
    const as = container.querySelectorAll("a");
    expect(as).toHaveLength(1);
    expect(as[0].getAttribute("href")).toBe("https://www.gutenberg.org/x.pdf");
    expect(as[0].getAttribute("target")).toBe("_blank");
    expect(as[0].getAttribute("rel")).toContain("noopener");
  });
  it("markdown de sempre continua (título, bullet, negrito)", () => {
    const { container } = render(<ChatMarkdown text={"## Título\n- item **forte**"} />);
    expect(container.querySelector("li strong")?.textContent).toBe("forte");
  });
});

describe("ChatMarkdown — geometria", () => {
  it("polígono, círculo e vetor viram SVG", () => {
    const { container } = render(<ChatMarkdown text={'```grafico\n{"formas":[{"tipo":"poligono","pontos":[[0,0],[4,0],[0,3]],"rotulo":"ABC"},{"tipo":"circulo","centro":[0,0],"raio":2},{"tipo":"vetor","de":[0,0],"ate":[2,1]}]}\n```'} />);
    expect(container.querySelector("polygon")).not.toBeNull();
    expect(container.querySelector("ellipse")).not.toBeNull();
    expect(container.querySelector("line[marker-end]")).not.toBeNull();
    expect(container.textContent).toContain("ABC");
  });
});

describe("ChatMarkdown — bloco de código (#634)", () => {
  it("vira a caixa de código: linguagem, Copiar, sem crases e o # do Python não vira título", () => {
    const { container, getByText } = render(<ChatMarkdown text={"Assim:\n```python\n# soma\nx = a * b\n```\nPronto."} />);
    const caixa = container.querySelector("[data-bloco-codigo]");
    expect(caixa).not.toBeNull();
    expect(caixa!.querySelector("pre code")!.textContent).toBe("# soma\nx = a * b");
    expect(getByText("python")).toBeTruthy();
    expect(getByText("Copiar")).toBeTruthy();
    expect(container.textContent).not.toContain("```");
    expect(container.querySelector(".font-semibold")).toBeNull();   // nada de título nem negrito
    expect(container.textContent).toContain("Pronto.");
  });
  it("Copiar põe o código na área de transferência", async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText: escrever }, configurable: true });
    const { getByText } = render(<ChatMarkdown text={"```js\nlet a = 1;\n```"} />);
    fireEvent.click(getByText("Copiar"));
    await waitFor(() => expect(getByText("Copiado")).toBeTruthy());
    expect(escrever).toHaveBeenCalledWith("let a = 1;");
  });
});
