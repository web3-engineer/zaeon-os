// @vitest-environment jsdom
/**
 * A trilha de progressão: a RAIZ (primeiro nó) tem que ligar ao módulo 1, e os módulos em sequência.
 * Antes isto era um leque radial e "o primeiro nó não conectava com o resto". Este teste trava a conexão.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import CursoArvoreView from "./CursoArvoreView";
import type { CursoRepo, NoEntendimento } from "@/lib/forja/tipos";

afterEach(cleanup);

const mod = (i: number): NoEntendimento => ({ id: `mod:${i}`, titulo: `Módulo ${i + 1}`, resumo: "lição " + i, desde: "basico", refs: [], filhos: [] });

const curso = {
  repo: "owner/nome",
  grafo: { nos: [], arestas: [] },
  arvore: { raiz: { id: "raiz", titulo: "Curso Teste", resumo: "raiz", desde: "basico", refs: [], filhos: [mod(0), mod(1), mod(2)] } },
} as unknown as CursoRepo;

describe("CursoArvoreView — a raiz conecta na trilha de módulos", () => {
  it("desenha a trilha de progressão saindo da RAIZ (BASE 600,720) até o módulo 1", () => {
    const { container } = render(<CursoArvoreView curso={curso} />);
    const trilhas = Array.from(container.querySelectorAll("path.av-trail")) as SVGPathElement[];
    // 3 módulos → 3 segmentos de trilha (raiz→m1, m1→m2, m2→m3)
    expect(trilhas.length).toBe(3);
    // o PRIMEIRO segmento começa exatamente na raiz (BASE.x=600, BASE.y=720): a raiz está conectada
    const ds = trilhas.map((p) => p.getAttribute("d") || "");
    expect(ds.some((d) => d.startsWith("M 600.0 720.0"))).toBe(true);
  });
});
