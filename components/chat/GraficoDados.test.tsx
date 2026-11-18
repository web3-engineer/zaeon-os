// @vitest-environment jsdom
/** #756 · o gráfico de barras que a pessoa pede: legível no celular, número em toda barra, milhar e unidade. */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import GraficoDados from "./GraficoDados";
import { numeroBR } from "@/lib/chat/graficoDados";
import { virgulaDecimal } from "@/lib/chat/matematica";
import { DIRETRIZ_MATEMATICA } from "@/lib/agent/matematica";

const POP = '{"titulo":"População por região (milhões)","barras":[{"rotulo":"Sudeste","valor":84.8},{"rotulo":"Nordeste","valor":54.6},{"rotulo":"Sul","valor":29.9},{"rotulo":"Norte","valor":17.3},{"rotulo":"Centro-Oeste","valor":16.3}],"unidade":"mi","fonte":"Censo 2022 (IBGE)"}';

describe("#756 · GraficoDados", () => {
  it("toda barra tem o número com a unidade (antes só o Sudeste tinha)", () => {
    const { container } = render(<GraficoDados json={POP} />);
    const barras = container.querySelectorAll("[data-barra]");
    expect(barras).toHaveLength(5);
    for (const [nome, valor] of [["Sudeste", "84,8 mi"], ["Nordeste", "54,6 mi"], ["Sul", "29,9 mi"], ["Norte", "17,3 mi"], ["Centro-Oeste", "16,3 mi"]]) {
      const li = [...barras].find((b) => b.textContent?.includes(nome))!;
      expect(li.textContent).toContain(valor);
    }
    expect(container.textContent).toContain("Fonte: Censo 2022 (IBGE) · números citados pela Aura");
    expect(container.querySelector("svg")).toBeNull();   // é texto da página, não imagem que encolhe
  });

  it("a barra é proporcional, e a pequena não some", () => {
    const { container } = render(<GraficoDados json={POP} />);
    const cheias = [...container.querySelectorAll<HTMLElement>("[data-barra-cheia]")];
    expect(parseFloat(cheias[0].style.width)).toBe(100);
    expect(parseFloat(cheias[4].style.width)).toBeCloseTo((16.3 / 84.8) * 100, 1);
    expect(cheias[4].style.minWidth).toBe("3px");
  });

  it("zero não desenha barra, mas mostra o 0", () => {
    const { container } = render(<GraficoDados json='{"barras":[{"rotulo":"A","valor":0},{"rotulo":"B","valor":5}],"fonte":"x"}' />);
    expect(container.querySelectorAll("[data-barra-cheia]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-barra]")[0].textContent).toContain("0");
  });

  it("no celular o nome vai em cima (1 coluna); do sm pra cima, do lado", () => {
    const { container } = render(<GraficoDados json={POP} />);
    const li = container.querySelector("[data-barra]")!;
    expect(li.className).toContain("grid-cols-1");
    expect(li.className).toContain("sm:grid-cols-");
  });

  it("letra em em: acompanha o A−/A+ do chat", () => {
    const { container } = render(<GraficoDados json={POP} />);
    expect(container.innerHTML).not.toMatch(/text-\[\d+px\]/);
  });

  it("rótulo do modelo é texto, nunca HTML", () => {
    const { container } = render(<GraficoDados json='{"barras":[{"rotulo":"<img src=x onerror=alert(1)>","valor":1},{"rotulo":"B","valor":2}],"fonte":"x"}' />);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("#756 · número em português", () => {
  it("ponto de milhar e vírgula decimal", () => {
    expect(numeroBR(84847187)).toBe("84.847.187");
    expect(numeroBR(84.8)).toBe("84,8");
    expect(numeroBR(17.3)).toBe("17,3");
    expect(numeroBR(1234.56)).toBe("1.234,56");
    expect(numeroBR(0)).toBe("0");
  });
  it("número grande no gráfico sai com milhar", () => {
    const { container } = render(<GraficoDados json='{"barras":[{"rotulo":"Sudeste","valor":84847187},{"rotulo":"Sul","valor":29933315}],"fonte":"IBGE"}' />);
    expect(container.textContent).toContain("84.847.187");
    expect(container.textContent).toContain("29.933.315");
  });
});

describe("#756 · porcentagem sem espaço errado", () => {
  it("a vírgula entre dígitos vira {,} (sem o espaço do LaTeX)", () => {
    expect(virgulaDecimal("41,8\%")).toBe("41{,}8\%");
    expect(virgulaDecimal("8,0\%")).toBe("8{,}0\%");
    expect(virgulaDecimal("(1, 2)")).toBe("(1, 2)");     // par ordenado com espaço continua
    expect(virgulaDecimal("x^2-4")).toBe("x^2-4");
  });
  it("a Aura é orientada a não pôr número comum em fórmula", () => {
    expect(DIRETRIZ_MATEMATICA).toMatch(/Número comum .* sem \$…\$/);
  });
});
