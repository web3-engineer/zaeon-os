// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";

const speak = vi.fn((_texto: string, _opts?: unknown) => Promise.resolve());
const stop = vi.fn();
vi.mock("@/lib/voice/useTTS", () => ({ useTTS: () => ({ speak, stop, speaking: false }), default: () => ({ speak, stop, speaking: false }) }));

import VozOcta from "./VozOcta";

beforeEach(() => { speak.mockClear(); stop.mockClear(); try { localStorage.clear(); } catch { /* */ } });
afterEach(() => cleanup());

describe("VozOcta — a voz da Octa", () => {
  it("desligada por padrão: não fala, e o botão liga/desliga persiste", () => {
    const { getByRole, rerender } = render(<VozOcta texto="" />);
    const botao = getByRole("button");
    expect(botao.getAttribute("aria-pressed")).toBe("false");
    // texto chega, mas desligada: não fala
    rerender(<VozOcta texto="Pronto: escrevi 1 arquivo." />);
    expect(speak).not.toHaveBeenCalled();
    // liga
    fireEvent.click(botao);
    expect(botao.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("zaeon.octa.voz")).toBe("1");
  });

  it("ligada, fala quando o texto muda pra algo não-vazio (fim de turno)", () => {
    localStorage.setItem("zaeon.octa.voz", "1");
    const { rerender } = render(<VozOcta texto="" />);
    expect(speak).not.toHaveBeenCalled(); // vazio não fala
    rerender(<VozOcta texto="Pronto: escrevi 2 arquivos. Dá uma olhada?" />);
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toMatch(/escrevi 2 arquivos/);
    // o mesmo texto de novo não repete a fala
    rerender(<VozOcta texto="Pronto: escrevi 2 arquivos. Dá uma olhada?" />);
    expect(speak).toHaveBeenCalledTimes(1);
  });
});
