// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, renderHook, act } from "@testing-library/react";
import { SeletorModelo, SeloModelo, useModeloEscolhido } from "./SeletorModelo";
import { MODELOS_CHAT, CHAVE_MODELO } from "@/lib/chat/modelos";

afterEach(() => { cleanup(); localStorage.clear(); });

describe("SeletorModelo", () => {
  it("mostra símbolo + nome; abre a lista e troca", () => {
    const onChange = vi.fn();
    render(<SeletorModelo valor={MODELOS_CHAT[0]} onChange={onChange} />);
    const pilula = screen.getByRole("button", { name: /Gemini 3\.5 Flash/ });
    expect(pilula.textContent).toContain("✦");
    fireEvent.click(pilula);
    const opcoes = screen.getAllByRole("option");
    const textos = opcoes.map((o) => o.textContent);
    expect(textos).toEqual(expect.arrayContaining([expect.stringContaining("Gemini 2.5 Pro")]));
    expect(textos.some((t) => t?.includes("Claude Opus"))).toBe(true);
    expect(textos.some((t) => t?.includes("Claude Sonnet"))).toBe(true);
    expect(opcoes).toHaveLength(5);
    fireEvent.click(screen.getByText("Gemini 2.5 Pro"));
    expect(onChange).toHaveBeenCalledWith("gemini-2.5-pro");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
  it("useModeloEscolhido lembra a escolha e ignora id fora do catálogo", () => {
    localStorage.setItem(CHAVE_MODELO, "gpt-4o");
    const { result } = renderHook(() => useModeloEscolhido());
    expect(result.current[0].id).toBe("gemini-3.5-flash");
    act(() => result.current[1]("gemini-3.5-flash-lite"));
    expect(result.current[0].id).toBe("gemini-3.5-flash-lite");
    expect(localStorage.getItem(CHAVE_MODELO)).toBe("gemini-3.5-flash-lite");
  });
  it("SeloModelo marca local e reserva", () => {
    const { container, rerender } = render(<SeloModelo nome="Qwen3 30B · local" />);
    expect(container.textContent).toContain("⬢");
    rerender(<SeloModelo nome="gpt-oss-120b · reserva" />);
    expect(container.textContent).toContain("↺");
  });
});
