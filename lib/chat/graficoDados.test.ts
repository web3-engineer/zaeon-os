/** #749 · gráfico de DADOS no chat: o pedido certo, o bloco certo, o desenho certo. */
import { describe, it, expect } from "vitest";
import { ehGraficoDeDados, parseGraficoDados } from "./graficoDados";
import { pedeGraficoDeDados, pedeGraficoMatematico } from "@/lib/agent/matematica";
import { classifyHeuristic } from "@/lib/agent/router";
import { artefatoDeAprender } from "@/lib/agent/aprender";
import { pickStudioKind } from "@/lib/agent/aura-harness";
import { graficosDoTurno, graficoCoberturaPorDocumento } from "@/lib/agent/graficosDoTurno";
import { svgDoGrafico } from "@/lib/agent/grafico";

const POP = '{"titulo":"População por região (milhões)","barras":[{"rotulo":"Sudeste","valor":84.8},{"rotulo":"Nordeste","valor":54.6},{"rotulo":"Sul","valor":29.9},{"rotulo":"Norte","valor":17.3},{"rotulo":"Centro-Oeste","valor":16.3}],"unidade":"mi","fonte":"Censo 2022 (IBGE)"}';

describe("#749 · pedido de gráfico de dados", () => {
  it("o pedido do ar é gráfico de DADOS (não de função)", () => {
    expect(pedeGraficoDeDados("faça um gráfico da população do Brasil por região")).toBe(true);
    expect(pedeGraficoDeDados("me mostra um gráfico de barras das notas por ano")).toBe(true);
    expect(pedeGraficoDeDados("faz o gráfico de f(x) = x^2 - 4")).toBe(false);   // função: continua no GraficoFuncao
    expect(pedeGraficoMatematico("faz o gráfico de f(x) = x^2 - 4")).toBe(true);
    expect(pedeGraficoDeDados("faz uma imagem com um gráfico bonito")).toBe(false); // pediu imagem de verdade
    expect(pedeGraficoDeDados("o que é fotossíntese")).toBe(false);
  });

  it("vai para o texto (explicar_conceito), sem diagrama nem imagem", () => {
    const r = classifyHeuristic("faça um gráfico da população do Brasil por região", { activeTab: "estudos" } as any);
    expect(r.intent).toBe("explicar_conceito");
    expect(artefatoDeAprender("explicar_conceito", "faça um gráfico da população do Brasil por região", { artifacts: [] })).toBeNull();
    // e mesmo se cair no artefato, "gráfico" não é mais imagem
    expect(pickStudioKind("faça um gráfico da população")).not.toBe("image");
    expect(pickStudioKind("faz uma imagem da mitocôndria")).toBe("image");
  });
});

describe("#749 · o bloco ```grafico de barras", () => {
  it("lê barras, título, unidade e fonte; rótulo longo vai deitado", () => {
    expect(ehGraficoDeDados(POP)).toBe(true);
    expect(ehGraficoDeDados('{"funcoes":["x^2"]}')).toBe(false);
    const r = parseGraficoDados(POP);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.grafico.pontos).toHaveLength(5);
    expect(r.grafico.forma).toBe("faixas");   // "Centro-Oeste" não cabe embaixo da barra
    expect(r.grafico.fonte).toBe("Censo 2022 (IBGE)");
    expect(r.grafico.unidade).toBe(" mi");
    const svg = svgDoGrafico(r.grafico)!;
    expect(svg).toContain("Sudeste: 84,8 mi");
    expect(svg).not.toMatch(/<svg[^>]*\sheight\s*=\s*["']auto["']/);
  });

  it("sem fonte, com 1 barra só ou com texto no lugar do número: não desenha", () => {
    expect(parseGraficoDados('{"barras":[{"rotulo":"A","valor":1},{"rotulo":"B","valor":2}]}')).toEqual({ ok: false, erro: "gráfico sem fonte dos números" });
    expect(parseGraficoDados('{"barras":[{"rotulo":"A","valor":1}],"fonte":"x"}').ok).toBe(false);
    expect(parseGraficoDados('{"barras":[{"rotulo":"A","valor":"muito"},{"rotulo":"B","valor":"pouco"}],"fonte":"x"}').ok).toBe(false);
    expect(parseGraficoDados("{quebrado").ok).toBe(false);
  });

  it("rótulo do modelo é escapado no SVG", () => {
    const r = parseGraficoDados('{"barras":[{"rotulo":"<script>","valor":1},{"rotulo":"B","valor":2}],"fonte":"x"}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(svgDoGrafico(r.grafico)).not.toContain("<script>");
  });
});

describe("#749 · 'Trechos usados por documento' só quando ajuda", () => {
  const iguais = Array.from({ length: 10 }, (_, i) => ({ titulo: `ENEM 2023 — questao_${i}`, trechos: [1] }));
  it("todos com o mesmo número não comparam nada", () => {
    expect(graficoCoberturaPorDocumento(iguais)).toBeNull();
    expect(graficoCoberturaPorDocumento([{ titulo: "A", trechos: [1, 2] }, { titulo: "B", trechos: [1] }])).not.toBeNull();
  });
  it("quem pediu um gráfico de outra coisa não recebe a cobertura", () => {
    const docs = [{ titulo: "A", trechos: [1, 2] }, { titulo: "B", trechos: [1] }];
    expect(graficosDoTurno({ docsDaBase: docs, env: {} })).toHaveLength(1);
    expect(graficosDoTurno({ docsDaBase: docs, env: {}, objetivo: "faça um gráfico da população do Brasil por região" })).toEqual([]);
  });
});
