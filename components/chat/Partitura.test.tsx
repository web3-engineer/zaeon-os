// @vitest-environment jsdom
/** A partitura da skill partitura-abc: o que chega ao abcjs, o play, e o que fica quando ele não chega. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

const abc = vi.hoisted(() => ({ renders: [] as string[], audioOK: true, iniciados: 0, tocados: 0, falhar: false }));

vi.mock("abcjs", () => ({
  default: {
    renderAbc: (_el: unknown, s: string) => {
      if (abc.falhar) throw new Error("sem biblioteca");
      abc.renders.push(s);
      return [{ __tune: true }];
    },
    synth: {
      supportsAudio: () => abc.audioOK,
      CreateSynth: class {
        async init() { abc.iniciados++; }
        async prime() { return {}; }
        start() { abc.tocados++; }
        stop() { /* noop */ }
      },
    },
  },
}));

import Partitura from "./Partitura";
import ChatMarkdown from "@/components/study/ChatMarkdown";

const BOA = '{"titulo":"Escala de Dó","tom":"C","abc":"X:1\\nK:C\\nC D E F | G A B c |]","conceito":"Graus conjuntos."}';

beforeEach(() => {
  abc.renders.length = 0; abc.audioOK = true; abc.iniciados = 0; abc.tocados = 0; abc.falhar = false;
  // jsdom não tem AudioContext: um stub que resolve resume/close.
  (window as unknown as { AudioContext: unknown }).AudioContext = class {
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };
});
afterEach(() => cleanup());

describe("Partitura — desenha e toca", () => {
  it("renderiza a pauta com o ABC e mostra o botão de ouvir", async () => {
    const { container, getByText } = render(<Partitura json={BOA} />);
    await waitFor(() => expect(abc.renders).toHaveLength(1));
    expect(abc.renders[0]).toContain("K:C");
    expect(getByText("Escala de Dó")).toBeTruthy();
    expect(container.querySelector("[data-partitura-pauta]")).toBeTruthy();
    expect(getByText("▶ ouvir")).toBeTruthy();
  });

  it("clicar em ouvir inicia o synth (dentro do gesto)", async () => {
    const { getByText } = render(<Partitura json={BOA} />);
    await waitFor(() => expect(abc.renders).toHaveLength(1));
    fireEvent.click(getByText("▶ ouvir"));
    await waitFor(() => expect(abc.tocados).toBe(1));
    expect(abc.iniciados).toBe(1);
  });

  it("sem suporte de áudio: desenha, mas não oferece o play", async () => {
    abc.audioOK = false;
    const { container, queryByText } = render(<Partitura json={BOA} />);
    await waitFor(() => expect(abc.renders).toHaveLength(1));
    expect(queryByText("▶ ouvir")).toBeNull();
    expect(container.querySelector("[data-partitura-pauta]")).toBeTruthy();
  });

  it("JSON inválido: aviso, sem chamar o abcjs", async () => {
    const { container } = render(<Partitura json={'{"titulo":"x"}'} />);
    expect(container.querySelector("[data-partitura-erro]")).toBeTruthy();
    expect(abc.renders).toHaveLength(0);
  });

  it("abcjs falhou: a pauta esconde mas o ABC cru fica visível", async () => {
    abc.falhar = true;
    const { container } = render(<Partitura json={BOA} />);
    await waitFor(() => expect(container.querySelector("[data-partitura-abc]")?.textContent).toContain("K:C"));
  });
});

describe("dispatch no ChatMarkdown", () => {
  it("```partitura vira a partitura", async () => {
    const { container } = render(<ChatMarkdown text={"Toca isto:\n```partitura\n" + BOA + "\n```\nPronto."} />);
    await waitFor(() => expect(container.querySelector("[data-partitura]")).toBeTruthy());
    expect(abc.renders).toHaveLength(1);
  });

  it("o JSON da skill sozinho (sem cerca) também vira partitura", async () => {
    const { container } = render(<ChatMarkdown text={BOA} />);
    await waitFor(() => expect(container.querySelector("[data-partitura]")).toBeTruthy());
  });
});
