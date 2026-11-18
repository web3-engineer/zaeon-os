// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

const fala = vi.hoisted(() => ({ speak: vi.fn(() => Promise.resolve()), stop: vi.fn(), speaking: false }));
vi.mock("@/lib/voice/useTTS", () => ({ useTTS: () => ({ speak: fala.speak, stop: fala.stop, speaking: fala.speaking, loading: false, activeText: null, speakSequence: vi.fn() }) }));

import ZaeonGuia from "./ZaeonGuia";
import type { Comportamento } from "@/lib/guia/tipos";

// comportamento de teste: no 1º tick, abre um balão com voz.
const noTick: Comportamento = {
  nome: "t",
  aoSinal: (s, e) => (s.tipo === "tick" ? [{ id: "n1", texto: "Vamos tocar?", tom: "incentivo", voz: true, em: e.agora }] : []),
};

beforeEach(() => { vi.useFakeTimers(); fala.speak.mockClear(); fala.stop.mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("ZaeonGuia", () => {
  it("mostra o orbe e, quando o motor emite um nudge, abre o balão e fala", () => {
    const { container, getByText, queryByText } = render(<ZaeonGuia comportamentos={[noTick]} tickMs={1000} escutaGlobal={false} />);
    expect(container.querySelector('[aria-label="Zaeon, sua guia"]')).toBeTruthy();
    expect(queryByText("Vamos tocar?")).toBeNull();
    act(() => { vi.advanceTimersByTime(1000); }); // dispara 1 tick do motor
    expect(getByText("Vamos tocar?")).toBeTruthy();
    expect(fala.speak).toHaveBeenCalledWith("Vamos tocar?", expect.anything());
  });

  it("some sozinho depois da duração", () => {
    const { getByText, queryByText } = render(<ZaeonGuia comportamentos={[noTick]} tickMs={1000} duracaoMs={3000} escutaGlobal={false} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(getByText("Vamos tocar?")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(3100); });
    expect(queryByText("Vamos tocar?")).toBeNull();
  });

  it("entrega o `enviar` pela montagem (a página manda sinais ricos)", () => {
    const recebido: unknown[] = [];
    render(<ZaeonGuia comportamentos={[noTick]} tickMs={100000} escutaGlobal={false} aoMontar={(enviar) => recebido.push(enviar)} />);
    expect(recebido).toHaveLength(1);
    expect(typeof recebido[0]).toBe("function");
  });
});
