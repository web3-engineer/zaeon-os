// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

vi.mock("abcjs", () => ({ default: { renderAbc: () => [{}], synth: { supportsAudio: () => false, CreateSynth: class {} } } }));
vi.mock("@/lib/voice/useTTS", () => ({ useTTS: () => ({ speak: vi.fn(() => Promise.resolve()), stop: vi.fn(), speaking: false, loading: false, activeText: null, speakSequence: vi.fn() }), default: () => ({ speak: vi.fn(), stop: vi.fn(), speaking: false }) }));

import CadernoView from "./CadernoView";
import { CADERNO_RITMO } from "@/lib/jornadas/cadernoRitmo";

afterEach(() => cleanup());

describe("CadernoView", () => {
  it("desenha o caderno curado: título, módulo, trilha e o avatar-guia", async () => {
    const { getByText, container } = render(<CadernoView data={CADERNO_RITMO} />);
    expect(getByText("Caderno de Ritmo")).toBeTruthy();
    expect(getByText("O pulso e a escala")).toBeTruthy();
    expect(getByText("Ode à Alegria")).toBeTruthy();
    expect(getByText("+ 21 canções")).toBeTruthy();
    expect(container.querySelector('[aria-label="Zaeon, sua guia"]')).toBeTruthy();
    await waitFor(() => expect(container.querySelector("[data-partitura]")).toBeTruthy());
  });

  it("sem dados nem artifactId, mostra o carregando", () => {
    const { getByText } = render(<CadernoView />);
    expect(getByText(/Carregando o caderno/)).toBeTruthy();
  });
});
