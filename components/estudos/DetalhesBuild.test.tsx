// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import VitrineEstudos from "@/components/estudos/VitrineEstudos";
import { CATALOGO } from "@/lib/estudos/vitrine";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ itens: [], agentes: [] }) })));
  // jsdom não mede SVG
  (SVGElement.prototype as any).getTotalLength = () => 100;
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const passar = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe("Vitrine · detalhes do card", () => {
  it("cada card tem 'detalhes' ao lado do plug", () => {
    render(<VitrineEstudos />);
    expect(screen.getAllByRole("button", { name: "detalhes" })).toHaveLength(CATALOGO.length);
  });

  it("'detalhes' abre o painel com quem publicou, nicho, validadores e a descrição — e Esc fecha", () => {
    render(<VitrineEstudos />);
    const ps5 = CATALOGO.findIndex((i) => i.id === "ps5-rev");
    fireEvent.click(screen.getAllByRole("button", { name: "detalhes" })[ps5]);
    passar(50);
    const painel = screen.getByRole("dialog", { name: /Detalhes: Engenharia reversa do PS5/ });
    expect(painel.textContent).toContain("PUBLICADO POR");
    expect(painel.textContent).toContain("Lia Monteiro");
    expect(painel.textContent).toContain("NICHO");
    expect(painel.textContent).toContain("VALIDADORES");
    expect(painel.textContent).toContain("O QUE VEM");
    // sem conta ligada, perfil e mensagem ficam desligados (nada é inventado)
    expect((screen.getByRole("button", { name: /ver perfil/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /mensagem privada/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    passar(500);
    expect(screen.queryByRole("dialog", { name: /Detalhes:/ })).toBeNull();
  });

  it("clicar na carta também abre os detalhes (o plug é só no botão)", () => {
    const { container } = render(<VitrineEstudos />);
    fireEvent.click(container.querySelectorAll(".vt-grid .vt-card")[0]);
    passar(50);
    expect(screen.getByRole("dialog", { name: /Detalhes: Octa Code/ }).textContent).toContain("Zaeon");
  });
});
