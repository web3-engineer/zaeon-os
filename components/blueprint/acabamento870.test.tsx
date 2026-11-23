// @vitest-environment jsdom
/** #870 · Sala de Estudos: título provisório, carregamento, buscas do YouTube, legenda em botão, zoom com fundo e encaixe. */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { docVazio, type DocBlueprint } from "@/lib/blueprint/tipos";
import { Modulo, Montando, TITULO_PROVISORIO, ETAPAS_MONTAGEM, estaMontando } from "./Modulos";

afterEach(() => { cleanup(); vi.useRealTimers(); });

const doc = (mais: Partial<DocBlueprint> = {}): DocBlueprint => ({ ...docVazio("faz um blueprint de teste sobre fotossíntese", 0), ...mais });
const acoes = { podeEditar: false };

describe("#870 · blueprint montando", () => {
  it("sem resumo, o cartão mostra o título provisório, não o pedido em maiúsculas", () => {
    render(<Modulo id="estudo" doc={doc({ resumo: "" })} acoes={acoes} />);
    expect(screen.getByText(TITULO_PROVISORIO)).toBeTruthy();
    expect(screen.queryByText(/FAZ UM BLUEPRINT DE TESTE/)).toBeNull();
    expect(screen.getByRole("status", { name: /montando o blueprint/ })).toBeTruthy();
  });

  it("com resumo, o título de verdade volta", () => {
    render(<Modulo id="estudo" doc={doc({ titulo: "Fotossíntese", resumo: "Como a planta faz açúcar." })} acoes={acoes} />);
    expect(screen.getByText("FOTOSSÍNTESE")).toBeTruthy();
    expect(screen.queryByText(TITULO_PROVISORIO)).toBeNull();
  });

  it("as etapas acendem uma a uma e param na última", () => {
    vi.useFakeTimers();
    const { container } = render(<Montando />);
    const acesas = () => container.querySelectorAll('[data-etapa="acesa"]').length;
    expect(acesas()).toBe(1);
    act(() => { vi.advanceTimersByTime(2200); });
    expect(acesas()).toBe(2);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(acesas()).toBe(ETAPAS_MONTAGEM.length);
  });

  it("o cartão do YouTube não busca pelo pedido enquanto monta", () => {
    render(<Modulo id="youtube" doc={doc({ resumo: "" })} acoes={acoes} />);
    expect(screen.getByText(/as buscas aparecem quando o título chegar/)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("estaMontando = sem resumo", () => {
    expect(estaMontando({ resumo: "" })).toBe(true);
    expect(estaMontando({ resumo: "ok" })).toBe(false);
  });
});

describe("#870 · prancha", () => {
  const src = readFileSync("components/blueprint/PranchaBlueprint.tsx", "utf8");

  it("a legenda é um botão que abre e fecha (antes ficava sempre por cima do desenho)", () => {
    expect(src).toMatch(/aria-expanded=\{legenda\}/);
    expect(src).toMatch(/\{legenda && \(/);
    // no celular o botão sobe e fica em cima da barra de zoom
    expect(src).toMatch(/data-tour="blueprint-legenda" className="[^"]*max-sm:bottom-\[64px\]/);
  });

  it("a barra de zoom tem fundo em todas as skins", () => {
    expect(src).toMatch(/data-zoom-prancha[\s\S]{0,400}background: PAPEL\.card[\s\S]{0,200}background: "rgba\(255,255,255,\.88\)"[\s\S]{0,120}background: FUNDO_BARRA/);
  });

  it("o foco abre encaixado na largura (piso 0,35, antes 0,6)", async () => {
    const { ZOOM_MIN_FOCO } = await import("./PranchaBlueprint");
    expect(ZOOM_MIN_FOCO).toBe(0.35);
    expect(src).toMatch(/Math\.max\(ZOOM_MIN_FOCO, Math\.min\(1\.1, \(r\.width - 32\)/);
  });

  it("a figura diz 'toque' em tela de toque, 'passe o mouse' com mouse", () => {
    const fig = readFileSync("components/blueprint/FiguraIso.tsx", "utf8");
    expect(fig).toMatch(/\[@media\(hover:none\)\]:hidden">passe o mouse/);
    expect(fig).toMatch(/hidden \[@media\(hover:none\)\]:inline">toque numa peça/);
  });
});
