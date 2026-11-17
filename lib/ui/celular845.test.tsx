// @vitest-environment jsdom
/**
 * #845 · bugs achados no app instalado: Menu de baixo → Marketplace voltava pra conversa; o teclado abria sozinho;
 * a barra de baixo sumia sem teclado na tela. Os ganchos rodando de verdade, juntos como no laboratório.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useFecharNoVoltar } from "./useFecharNoVoltar";
import { useMarketplaceNoLab } from "./useMarketplaceNoLab";
import { useTecladoAberto, telaEncolhida } from "./useTecladoAberto";
import { useAutoFoco, telaDeToque } from "./autofoco";
import { avisarMarketplace } from "./marketplaceRota";

/** o laboratório no celular: o Menu (gaveta) com o gancho do ◀ e a Sala com o Marketplace */
function useLab(gaveta: boolean, noMarketplace: boolean, irEstudos: (a: string) => void) {
  useFecharNoVoltar(gaveta, () => {});
  useMarketplaceNoLab(noMarketplace, irEstudos as never);
}

describe("#845 · Menu de baixo → Marketplace", () => {
  let back: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/research-lab?tab=sala-de-estudos");
    avisarMarketplace(false);
    back = vi.spyOn(window.history, "back").mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); act(() => { vi.runAllTimers(); }); back.mockRestore(); vi.useRealTimers(); });

  it("o endereço vai pra vitrine antes do Menu fechar: o Menu não desfaz a ida (sem 'voltar'), e o ◀ volta pra conversa", () => {
    const irEstudos = vi.fn();
    const h = renderHook(({ g, m }) => useLab(g, m, irEstudos), { initialProps: { g: true, m: false } });
    act(() => { vi.runAllTimers(); });                       // o Menu abriu: marca no histórico
    expect(window.history.state).toHaveProperty("zaeonPainel");
    h.rerender({ g: true, m: true });                          // tocou em Marketplace: a Sala chegou na vitrine
    expect(window.location.search).toContain("aba=marketplace");
    expect(window.history.state).toBeNull();                   // a marca saiu junto com a troca de endereço
    h.rerender({ g: false, m: true });                         // o Menu fecha
    expect(back).not.toHaveBeenCalled();                       // nada de "voltar" desfazendo o Marketplace
    expect(irEstudos).not.toHaveBeenCalledWith("meus-estudos");

    // ◀ da pessoa: a entrada de antes (a conversa) → a Sala sai da vitrine
    act(() => {
      window.history.replaceState(null, "", "/research-lab?tab=sala-de-estudos");
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    expect(irEstudos).toHaveBeenLastCalledWith("meus-estudos");
  });

  it("o Menu fecha antes do endereço trocar: o 'voltar' do Menu não tira a pessoa do Marketplace", () => {
    const irEstudos = vi.fn();
    const h = renderHook(({ g, m }) => useLab(g, m, irEstudos), { initialProps: { g: true, m: false } });
    act(() => { vi.runAllTimers(); });
    h.rerender({ g: false, m: false });                        // o Menu fecha primeiro: "voltar" do painel
    expect(back).toHaveBeenCalledTimes(1);
    h.rerender({ g: false, m: true });                         // a Sala chega na vitrine
    act(() => {                                                // o "voltar" do Menu chega (na conversa, sem a vitrine)
      window.history.replaceState(null, "", "/research-lab?tab=sala-de-estudos");
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    expect(irEstudos).not.toHaveBeenCalledWith("meus-estudos");
    expect(window.location.search).toContain("aba=marketplace");   // o endereço acompanha a aba
  });

  it("o ◀ da pessoa (não de painel) continua seguindo o endereço", () => {
    const irEstudos = vi.fn();
    renderHook(() => useLab(false, true, irEstudos));
    act(() => { vi.runAllTimers(); });
    act(() => {
      window.history.replaceState(null, "", "/research-lab?tab=profile");
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    expect(irEstudos).toHaveBeenLastCalledWith("meus-estudos");
  });
});

describe("#845 · no celular o teclado não abre sozinho", () => {
  const matchMediaOriginal = window.matchMedia;
  const tela = (toque: boolean) => {
    window.matchMedia = ((q: string) => ({ matches: toque && q.includes("pointer: coarse"), media: q, addEventListener() {}, removeEventListener() {} })) as never;
  };
  afterEach(() => { window.matchMedia = matchMediaOriginal; document.body.innerHTML = ""; cleanup(); });

  it("tela de toque: a caixa não é selecionada sozinha; com mouse, continua sendo", async () => {
    const ta = document.createElement("textarea");
    document.body.append(ta);
    // jsdom não pinta: finge que a caixa ocupa espaço
    Object.defineProperty(ta, "offsetParent", { get: () => document.body });
    ta.getBoundingClientRect = () => ({ width: 200, height: 40 }) as DOMRect;
    const ref = { current: ta };

    tela(true);
    expect(telaDeToque()).toBe(true);
    const toque = renderHook(() => useAutoFoco(ref, true));
    await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
    expect(document.activeElement).not.toBe(ta);
    toque.unmount();

    tela(false);
    renderHook(() => useAutoFoco(ref, true));
    await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
    expect(document.activeElement).toBe(ta);
  });
});

describe("#845 · a barra de baixo só some com o teclado de verdade", () => {
  let altura = 800;
  const ouvintes: Array<() => void> = [];
  beforeEach(() => {
    altura = 800;
    ouvintes.length = 0;
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: { get width() { return 400; }, get height() { return altura; }, addEventListener: (_: string, f: () => void) => ouvintes.push(f), removeEventListener() {} },
    });
  });
  afterEach(() => { Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined }); document.body.innerHTML = ""; cleanup(); });
  const redimensionar = (h: number) => act(() => { altura = h; ouvintes.forEach((f) => f()); });

  it("caixa com o foco mas a tela inteira (o Android devolveu o foco sem teclado): a barra fica", () => {
    const ta = document.createElement("textarea");
    document.body.append(ta);
    const { result } = renderHook(() => useTecladoAberto());
    act(() => { ta.focus(); });
    expect(result.current).toBe(false);
    redimensionar(420);                       // o teclado subiu: a tela encolheu
    expect(result.current).toBe(true);
    redimensionar(800);                       // o teclado desceu (◀), a caixa continua com o foco
    expect(result.current).toBe(false);
  });

  it("encolher pouco (a barra do navegador indo e vindo) não conta como teclado", () => {
    expect(telaEncolhida(760, 800)).toBe(false);
    expect(telaEncolhida(450, 800)).toBe(true);
    expect(telaEncolhida(450, 0)).toBe(false);
  });
});
