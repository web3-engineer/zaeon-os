// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTecladoAberto } from "@/lib/ui/useTecladoAberto";

describe("useTecladoAberto (#837)", () => {
  afterEach(() => { document.body.innerHTML = ""; vi.useRealTimers(); });

  it("abre com o foco num campo de texto e fecha ao sair dele", () => {
    vi.useFakeTimers();
    const ta = document.createElement("textarea");
    const bt = document.createElement("button");
    document.body.append(ta, bt);
    const { result } = renderHook(() => useTecladoAberto());
    expect(result.current).toBe(false);
    act(() => { ta.focus(); });
    expect(result.current).toBe(true);
    act(() => { bt.focus(); vi.runAllTimers(); });
    expect(result.current).toBe(false);
  });

  it("checkbox não conta como teclado; desligado fica sempre false", () => {
    const cb = document.createElement("input"); cb.type = "checkbox";
    const tx = document.createElement("input");
    document.body.append(cb, tx);
    const { result } = renderHook(() => useTecladoAberto());
    act(() => { cb.focus(); });
    expect(result.current).toBe(false);
    const off = renderHook(() => useTecladoAberto(false));
    act(() => { tx.focus(); });
    expect(off.result.current).toBe(false);
  });
});
