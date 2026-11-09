// @vitest-environment jsdom
/** #733 · o microfone diz o que está fazendo: "ouvindo", o que já ouviu e por que desligou. */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSTT, avisoDoErro } from "./useSTT";

class SRFalso {
  static ultimo: SRFalso | null = null;
  onresult: ((e: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: ((e: unknown) => void) | null = null;
  lang = ""; continuous = false; interimResults = false;
  constructor() { SRFalso.ultimo = this; }
  start() {} stop() { this.onend?.(); }
}
afterEach(() => { delete (window as any).webkitSpeechRecognition; SRFalso.ultimo = null; });

describe("#733 · useSTT", () => {
  it("avisoDoErro", () => {
    expect(avisoDoErro("not-allowed")).toBe("negado");
    expect(avisoDoErro("no-speech")).toBe("sem-som");
    expect(avisoDoErro("audio-capture")).toBe("sem-microfone");
    expect(avisoDoErro("network")).toBe("sem-rede");
    expect(avisoDoErro("aborted")).toBeNull();
    expect(avisoDoErro("qualquer")).toBe("falhou");
  });

  it("ouvindo → ouviu → desligou sozinho avisa; parar pela pessoa não avisa", () => {
    (window as any).webkitSpeechRecognition = SRFalso;
    const onResult = vi.fn();
    const { result } = renderHook(() => useSTT({ onResult }));
    act(() => { result.current.start(); });
    expect(result.current.listening).toBe(true);
    expect(result.current.ouviu).toBe(false);
    act(() => { SRFalso.ultimo!.onresult!({ results: [{ 0: { transcript: "oi" }, isFinal: false }], resultIndex: 0 }); });
    expect(result.current.ouviu).toBe(true);
    expect(onResult).toHaveBeenLastCalledWith("oi", false);
    // o navegador encerrou sozinho (pausa)
    act(() => { SRFalso.ultimo!.onend!(); });
    expect(result.current.listening).toBe(false);
    expect(result.current.aviso).toBe("desligou");
    // a pessoa parou: sem aviso
    act(() => { result.current.start(); });
    act(() => { result.current.stop(); });
    expect(result.current.aviso).toBeNull();
  });

  it("junta todos os trechos (no contínuo, o que já tinha fechado não some)", () => {
    (window as any).webkitSpeechRecognition = SRFalso;
    const onResult = vi.fn();
    const { result } = renderHook(() => useSTT({ onResult, continuous: true }));
    act(() => { result.current.start(); });
    act(() => { SRFalso.ultimo!.onresult!({ results: [{ 0: { transcript: "olá " }, isFinal: true }, { 0: { transcript: "mundo" }, isFinal: false }], resultIndex: 1 }); });
    expect(onResult).toHaveBeenLastCalledWith("olá mundo", false);
  });

  it("microfone bloqueado vira o aviso de liberar", () => {
    (window as any).webkitSpeechRecognition = SRFalso;
    const { result } = renderHook(() => useSTT());
    act(() => { result.current.start(); });
    act(() => { SRFalso.ultimo!.onerror!({ error: "not-allowed" }); SRFalso.ultimo!.onend!(); });
    expect(result.current.aviso).toBe("negado");
  });

  it("#749 · ouviu fala mas veio vazio: 'não entendi' (e não 'desligou depois da pausa')", () => {
    (window as any).webkitSpeechRecognition = SRFalso;
    const { result } = renderHook(() => useSTT());
    act(() => { result.current.start(); });
    const sr = SRFalso.ultimo as any;
    act(() => { sr.onspeechstart?.(); sr.onresult!({ results: [{ 0: { transcript: "" }, isFinal: true }], resultIndex: 0 }); sr.onend!(); });
    expect(result.current.aviso).toBe("nao-entendi");
  });

  it("#749 · com pausaMs: contínuo, desliga sozinho depois da pausa e avisa; sem fala nenhuma, 'não ouvi nada' em 10 s", () => {
    vi.useFakeTimers();
    try {
      (window as any).webkitSpeechRecognition = SRFalso;
      const onResult = vi.fn();
      const { result } = renderHook(() => useSTT({ onResult, pausaMs: 2500 }));
      act(() => { result.current.start(); });
      expect(SRFalso.ultimo!.continuous).toBe(true);
      const sr = SRFalso.ultimo as any;
      act(() => { sr.onspeechstart?.(); sr.onresult!({ results: [{ 0: { transcript: "o que é fotossíntese" }, isFinal: true }], resultIndex: 0 }); });
      act(() => { vi.advanceTimersByTime(2400); });
      expect(result.current.listening).toBe(true);   // ainda dentro da pausa
      act(() => { vi.advanceTimersByTime(200); });
      expect(result.current.listening).toBe(false);
      expect(result.current.aviso).toBe("desligou");
      expect(onResult).toHaveBeenLastCalledWith("o que é fotossíntese", true);
      // de novo, calado
      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(10000); });
      expect(result.current.listening).toBe(false);
      expect(result.current.aviso).toBe("sem-som");
    } finally { vi.useRealTimers(); }
  });
});
