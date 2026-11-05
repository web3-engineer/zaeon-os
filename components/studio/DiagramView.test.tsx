// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import DiagramView, { CSS_CELULAR, comCssCelular } from "./DiagramView";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("DiagramView (#640)", () => {
  it("deu erro: mostra 'Tentar de novo' e, clicando, busca de novo e abre", async () => {
    const buscar = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 502, text: async () => "" })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => "<p>oi</p>" });
    vi.stubGlobal("fetch", buscar);
    const { findByText, container } = render(<DiagramView artifactId="a1" titulo="T" cheio />);
    fireEvent.click(await findByText("Tentar de novo"));
    await waitFor(() => expect(container.querySelector("iframe")).not.toBeNull());
    expect(buscar).toHaveBeenCalledTimes(2);
  });
  it("na aba inteira, o botão de abrir fica embaixo (o título do diagrama mora em cima); na resposta, em cima", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "<p>oi</p>" }));
    const cheio = render(<DiagramView artifactId="a1" cheio />);
    await waitFor(() => expect(cheio.container.querySelector("iframe")).not.toBeNull());
    expect(cheio.getByLabelText("Abrir o diagrama numa aba").parentElement!.className).toContain("bottom-2");
    cleanup();
    const bolha = render(<DiagramView artifactId="a1" />);
    await waitFor(() => expect(bolha.container.querySelector("iframe")).not.toBeNull());
    expect(bolha.getByLabelText("Abrir o diagrama numa aba").parentElement!.className).toContain("top-2");
  });
});

describe("DiagramView no celular (#713)", () => {
  it("o estilo do celular entra no <head> do diagrama, só abaixo de 720 px", () => {
    const html = comCssCelular("<html><head><title>x</title></head><body></body></html>");
    expect(html).toContain(`${CSS_CELULAR}</head>`);
    expect(CSS_CELULAR).toMatch(/@media \(max-width:720px\)/);
    expect(CSS_CELULAR).toContain("min-width:0");
    expect(CSS_CELULAR).toContain("position:static");
  });
  it("diagrama sem <head>: o estilo vai na frente", () => {
    expect(comCssCelular("<svg></svg>").startsWith(CSS_CELULAR)).toBe(true);
  });
  it("o iframe recebe o diagrama com o estilo do celular", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "<html><head></head><body>d</body></html>" }));
    const r = render(<DiagramView artifactId="a1" />);
    await waitFor(() => expect(r.container.querySelector("iframe")).not.toBeNull());
    expect(r.container.querySelector("iframe")!.getAttribute("srcdoc")).toContain("data-zaeon-celular");
  });
});
