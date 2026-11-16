// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useIsMobile, QUERY_MOBILE, QUERY_CELULAR, QUERY_CELULAR_DEITADO } from "@/lib/ui/useIsMobile";

function mockMM(matches: boolean) {
  const ouvintes = new Set<() => void>();
  const mq = { matches, addEventListener: (_: string, f: () => void) => ouvintes.add(f), removeEventListener: (_: string, f: () => void) => ouvintes.delete(f) };
  const mm = vi.fn(() => mq);
  Object.defineProperty(window, "matchMedia", { configurable: true, value: mm });
  return { mq, mm, mudar: (m: boolean) => { mq.matches = m; ouvintes.forEach((f) => f()); }, ouvintes };
}
afterEach(() => vi.restoreAllMocks());

describe("useIsMobile", () => {
  it("SSR: renderiza false (o servidor nunca chama matchMedia) — sem hydration mismatch", () => {
    const { mm } = mockMM(true);
    function C() { return <span>{String(useIsMobile())}</span>; }
    expect(renderToString(<C />)).toContain("false");
    expect(mm).not.toHaveBeenCalled();
  });
  it("sincroniza no mount com o breakpoint de 767px", () => {
    const { mm } = mockMM(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    expect(mm).toHaveBeenCalledWith(QUERY_MOBILE);
    expect(QUERY_MOBILE).toBe("(max-width: 767px)");
  });
  it("acompanha a troca de tamanho e solta o ouvinte ao desmontar", () => {
    const { mudar, ouvintes } = mockMM(false);
    const { result, unmount } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => mudar(true));
    expect(result.current).toBe(true);
    unmount();
    expect(ouvintes.size).toBe(0);
  });
  it("#832: o celular deitado (baixo e de toque) também conta como celular no laboratório", () => {
    expect(QUERY_CELULAR_DEITADO).toBe("(max-height: 500px) and (pointer: coarse)");
    expect(QUERY_CELULAR).toBe(`${QUERY_MOBILE}, ${QUERY_CELULAR_DEITADO}`);
    const { mm } = mockMM(true);
    expect(renderHook(() => useIsMobile(QUERY_CELULAR)).result.current).toBe(true);
    expect(mm).toHaveBeenCalledWith(QUERY_CELULAR);
  });
  it("navegador sem matchMedia: fica false sem quebrar", () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: undefined });
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });
});
