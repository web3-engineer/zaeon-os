// @vitest-environment jsdom
/** #824 · o laboratório e o item "Marketplace" do menu de acordo — o hook rodando de verdade */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { useMarketplaceNoLab } from "./useMarketplaceNoLab";
import { EVT_MARKETPLACE, estaNoMarketplace, pedirSairDoMarketplace, avisarMarketplace } from "./marketplaceRota";

const ir = (url: string) => window.history.replaceState(null, "", url);
let menu: boolean[] = [];
const ouvir = (e: Event) => menu.push((e as CustomEvent<boolean>).detail);

beforeEach(() => { ir("/research-lab"); menu = []; avisarMarketplace(false); window.addEventListener(EVT_MARKETPLACE, ouvir); });
afterEach(() => { cleanup(); window.removeEventListener(EVT_MARKETPLACE, ouvir); });

describe("#824 · useMarketplaceNoLab", () => {
  it("entrou por /marketplace: abre a vitrine, o endereço não perde o pedido no meio-tempo, e o menu acende", () => {
    ir("/research-lab?tab=sala-de-estudos&aba=marketplace");
    const irEstudos = vi.fn();
    const h = renderHook(({ no }) => useMarketplaceNoLab(no, irEstudos), { initialProps: { no: false } });
    expect(irEstudos).toHaveBeenCalledWith("community");
    expect(window.location.search).toBe("?tab=sala-de-estudos&aba=marketplace");   // (a Sala ainda não chegou na vitrine)
    expect(estaNoMarketplace()).toBe(true);
    h.rerender({ no: true });
    expect(window.location.search).toBe("?tab=sala-de-estudos&aba=marketplace");
    expect(estaNoMarketplace()).toBe(true);
  });

  it("trocou de aba (Literatura, conversa…): o menu apaga e o endereço sai da vitrine", () => {
    const h = renderHook(({ no }) => useMarketplaceNoLab(no, vi.fn()), { initialProps: { no: false } });
    h.rerender({ no: true });
    expect(window.location.search).toBe("?tab=sala-de-estudos&aba=marketplace");
    h.rerender({ no: false });
    expect(window.location.search).toBe("");
    expect(menu).toEqual([true, false]);
  });

  it("clicou em Laboratório no menu com a vitrine aberta: volta pra conversa", () => {
    const irEstudos = vi.fn();
    renderHook(() => useMarketplaceNoLab(true, irEstudos));
    act(() => pedirSairDoMarketplace());
    expect(irEstudos).toHaveBeenCalledWith("meus-estudos");
  });

  it("voltar/avançar do navegador: a aba segue o endereço", () => {
    const irEstudos = vi.fn();
    const h = renderHook(({ no }) => useMarketplaceNoLab(no, irEstudos), { initialProps: { no: true } });
    act(() => { ir("/research-lab?tab=profile"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(irEstudos).toHaveBeenLastCalledWith("meus-estudos");
    h.rerender({ no: false });
    act(() => { ir("/research-lab?tab=sala-de-estudos&aba=marketplace"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(irEstudos).toHaveBeenLastCalledWith("community");
  });

  it("saiu do laboratório: o menu apaga", () => {
    const h = renderHook(() => useMarketplaceNoLab(true, vi.fn()));
    expect(estaNoMarketplace()).toBe(true);
    h.unmount();
    expect(estaNoMarketplace()).toBe(false);
  });
});

describe("#824 · os endereços antigos continuam no ar", () => {
  it("/assistentes é a mesma página do /plugin-store, e o /mentores tem a sua", async () => {
    vi.doMock("@/components/mentors/LojaMentores", () => ({ default: () => null }));
    vi.doMock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), redirect: vi.fn() }));
    const assistentes = await import("@/app/assistentes/page");
    const loja = await import("@/app/plugin-store/page");
    const mentores = await import("@/app/mentores/page");
    expect(typeof loja.default).toBe("function");
    expect(assistentes.default).toBe(loja.default);
    expect(typeof mentores.default).toBe("function");
  });
});
