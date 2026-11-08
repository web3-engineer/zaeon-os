// @vitest-environment jsdom
/**
 * CadView — a prévia da peça CAD. Testamos os caminhos SEM WebGL (jsdom não tem GL): o PNG, o botão
 * de baixar STEP, a legenda do volume e o estado vazio. O render 3D (three.js) é caminho de navegador
 * real — T5/T6, com o bundle WASM, não aqui.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import CadView from "./CadView";

afterEach(() => cleanup());

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCA"; // suficiente pra um <img src>

describe("CadView — a miniatura (sem WebGL)", () => {
  it("com PNG: mostra a miniatura como <img>, não dispara o 3D", () => {
    const { container } = render(<CadView data={{ titulo: "Suporte", png: PNG }} />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("src")).toBe(PNG);
    // nenhum <canvas> = o three não montou
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("com STEP: oferece baixar como .step via data URL (sem Blob)", () => {
    const { getByText } = render(<CadView data={{ titulo: "Suporte Bracket", png: PNG, step: "ISO-10303-21;\nHEADER;" }} />);
    const link = getByText(/Baixar STEP/i).closest("a")!;
    expect(link.getAttribute("download")).toBe("Suporte_Bracket.step");
    expect(link.getAttribute("href")!.startsWith("data:model/step")).toBe(true);
    expect(decodeURIComponent(link.getAttribute("href")!)).toContain("ISO-10303-21;");
  });

  it("com volume medido: mostra o número formatado", () => {
    const { container } = render(<CadView data={{ titulo: "x", png: PNG, volumeMm3: 22385.31 }} />);
    expect(container.textContent).toMatch(/22\.385,3\s*mm³/);
  });

  it("sem PNG e sem glTF: estado vazio honesto, nunca quebra", () => {
    const { container } = render(<CadView data={{ titulo: "x" }} />);
    expect(container.textContent).toContain("Prévia indisponível");
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("modo figura (nu) com PNG: vira <figure> com legenda, sem botões", () => {
    const { container } = render(<CadView data={{ titulo: "Viga", png: PNG, volumeMm3: 100 }} nu />);
    expect(container.querySelector("figure")).toBeTruthy();
    expect(container.querySelector("figcaption")?.textContent).toContain("Viga");
    expect(container.querySelector("button")).toBeNull();
  });
});
