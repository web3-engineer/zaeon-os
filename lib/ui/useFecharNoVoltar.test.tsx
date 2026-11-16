// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFecharNoVoltar } from "@/lib/ui/useFecharNoVoltar";

/** simula o ◀: volta o `state` para `estado` e dispara o popstate, como o navegador faz */
function voltarPara(estado: unknown) {
  window.history.replaceState(estado, "");
  window.dispatchEvent(new PopStateEvent("popstate", { state: estado }));
}

describe("useFecharNoVoltar (#832)", () => {
  let back: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, "");
    back = vi.spyOn(window.history, "back").mockImplementation(() => {});
  });
  afterEach(() => { back.mockRestore(); vi.useRealTimers(); });

  it("aberto, põe uma entrada no histórico; o voltar fecha o painel", () => {
    const fechar = vi.fn();
    const push = vi.spyOn(window.history, "pushState");
    renderHook(() => useFecharNoVoltar(true, fechar));
    act(() => { vi.runAllTimers(); });
    expect(push).toHaveBeenCalledTimes(1);
    act(() => voltarPara(null));
    expect(fechar).toHaveBeenCalledTimes(1);
    push.mockRestore();
  });

  it("fechado pelo ✕, tira a entrada que sobrou", () => {
    const { rerender } = renderHook(({ a }) => useFecharNoVoltar(a, () => {}), { initialProps: { a: true } });
    act(() => { vi.runAllTimers(); });
    rerender({ a: false });
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("fechado pelo voltar, não volta de novo", () => {
    const { rerender } = renderHook(({ a }) => useFecharNoVoltar(a, () => {}), { initialProps: { a: true } });
    act(() => { vi.runAllTimers(); });
    act(() => voltarPara(null));
    rerender({ a: false });
    expect(back).not.toHaveBeenCalled();
  });

  it("dois abertos: o voltar fecha só o de cima", () => {
    const fecharBaixo = vi.fn(), fecharCima = vi.fn();
    renderHook(() => useFecharNoVoltar(true, fecharBaixo));
    act(() => { vi.runAllTimers(); });
    const doBaixo = window.history.state;
    renderHook(() => useFecharNoVoltar(true, fecharCima));
    act(() => { vi.runAllTimers(); });
    act(() => voltarPara(doBaixo));
    expect(fecharCima).toHaveBeenCalledTimes(1);
    expect(fecharBaixo).not.toHaveBeenCalled();
    act(() => voltarPara(null));
    expect(fecharBaixo).toHaveBeenCalledTimes(1);
  });

  it("desmontou ABERTO (troca de tela): não volta — a navegação não é desfeita", () => {
    const { unmount } = renderHook(() => useFecharNoVoltar(true, () => {}));
    act(() => { vi.runAllTimers(); });
    unmount();
    expect(back).not.toHaveBeenCalled();
  });

  it("o de baixo fecha com outro por cima: a entrada dele é pulada quando o voltar cair nela", () => {
    const fecharCima = vi.fn();
    const baixo = renderHook(({ a }) => useFecharNoVoltar(a, () => {}), { initialProps: { a: true } });
    act(() => { vi.runAllTimers(); });
    const doBaixo = window.history.state;
    renderHook(() => useFecharNoVoltar(true, fecharCima));
    act(() => { vi.runAllTimers(); });
    baixo.rerender({ a: false });
    expect(back).not.toHaveBeenCalled();          // a de cima ainda está aberta
    act(() => voltarPara(doBaixo));               // o ◀ fecha a de cima e cai na entrada morta
    expect(fecharCima).toHaveBeenCalledTimes(1);
    act(() => { vi.runAllTimers(); });
    expect(back).toHaveBeenCalledTimes(1);        // e a morta é pulada
  });

  it("fechado antes do tick (StrictMode) não deixa entrada nem volta", () => {
    const push = vi.spyOn(window.history, "pushState");
    const { unmount } = renderHook(() => useFecharNoVoltar(true, () => {}));
    unmount();
    act(() => { vi.runAllTimers(); });
    expect(push).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
    push.mockRestore();
  });
});
