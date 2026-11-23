// @vitest-environment jsdom
/** #870 · Sala de Estudos: título provisório, carregamento, buscas do YouTube, legenda em botão, zoom com fundo e encaixe. */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { docVazio, type DocBlueprint } from "@/lib/blueprint/tipos";
import { Modulo, Montando, TITULO_PROVISORIO, ETAPAS_MONTAGEM, estaMontando } from "./Modulos";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

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

  it("estaMontando = nunca composto e sem resumo (composto com resumo vazio não fica carregando)", () => {
    expect(estaMontando({ resumo: "", compostoEm: 0 })).toBe(true);
    expect(estaMontando({ resumo: "ok", compostoEm: 0 })).toBe(false);
    expect(estaMontando({ resumo: "", compostoEm: 1_700_000_000_000 })).toBe(false);
  });

  it("composto com resumo vazio mostra o título de verdade, sem o carregamento", () => {
    render(<Modulo id="estudo" doc={doc({ titulo: "Fotossíntese", resumo: "", compostoEm: 1 })} acoes={acoes} />);
    expect(screen.getByText("FOTOSSÍNTESE")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("#870 · prancha", () => {
  const src = readFileSync("components/blueprint/PranchaBlueprint.tsx", "utf8");

  it("a legenda é um botão que abre e fecha (antes ficava sempre por cima do desenho)", async () => {
    // o jsdom não tem ResizeObserver (a prancha mede os cartões com ele)
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    const { default: PranchaBlueprint } = await import("./PranchaBlueprint");
    render(<PranchaBlueprint id="t" doc={doc({ titulo: "Fotossíntese", resumo: "ok", compostoEm: 1 })} acoes={acoes} onFixar={() => {}} />);
    const botao = screen.getByRole("button", { name: "Legenda" });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("legenda-prancha")).toBeNull();
    fireEvent.click(botao);
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("legenda-prancha")).toBeTruthy();
    fireEvent.click(botao);
    expect(document.getElementById("legenda-prancha")).toBeNull();
    // no celular o botão sobe e fica em cima da barra de zoom
    expect(src).toMatch(/data-tour="blueprint-legenda" className="[^"]*max-sm:bottom-\[64px\]/);
  });

  it("a barra de zoom tem fundo em todas as skins", () => {
    expect(src).toMatch(/data-zoom-prancha[\s\S]{0,400}background: PAPEL\.card[\s\S]{0,200}background: "rgba\(255,255,255,\.88\)"[\s\S]{0,120}background: FUNDO_BARRA/);
  });

  it("o foco abre encaixado na largura do celular (piso 0,25, o do botão −; antes 0,6)", async () => {
    const { ZOOM_MIN_FOCO, zoomDoFoco } = await import("./PranchaBlueprint");
    expect(ZOOM_MIN_FOCO).toBe(0.25);
    // a figura de 1100 px num celular de 375 px: o foco cabe na largura (sobram as margens de 16 px)
    for (const largura of [320, 375, 390]) {
      const z = zoomDoFoco(largura, 700, 1100, 900);
      expect(1100 * z).toBeLessThanOrEqual(largura - 32);
    }
    // no computador continua grande (até 110%)
    expect(zoomDoFoco(1440, 900, 900, 700)).toBeGreaterThan(1);
    expect(src).toMatch(/const z = zoomDoFoco\(r\.width, r\.height/);
  });

  it("a figura diz 'toque' em tela de toque, 'passe o mouse' com mouse", () => {
    const fig = readFileSync("components/blueprint/FiguraIso.tsx", "utf8");
    expect(fig).toMatch(/\[@media\(hover:none\)\]:hidden">passe o mouse/);
    expect(fig).toMatch(/hidden \[@media\(hover:none\)\]:inline">toque numa peça/);
  });
});
