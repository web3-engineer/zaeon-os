// @vitest-environment jsdom
/** #713: no celular, as opções da conversa ficam recolhidas num botão da caixa de texto; no computador, sempre à vista. */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";

// #733: o microfone do teste é controlável (ouvindo, já ouviu, aviso)
const mic = vi.hoisted(() => ({ estado: { listening: false, supported: false, ouviu: false, aviso: null as string | null } }));
vi.mock("@/lib/voice/useSTT", () => ({
  default: () => ({ toggle: () => {}, limparAviso: () => {}, ...mic.estado }),
  TEXTO_AVISO_STT: { desligou: "O microfone desligou depois da pausa. Toque nele para falar de novo.", negado: "bloqueado", "sem-som": "Não ouvi nada.", "sem-rede": "sem internet", falhou: "falhou" },
}));
vi.mock("@/lib/ui/autofoco", () => ({ useAutoFoco: () => {} }));
import CoworkComposer from "./CoworkComposer";

afterEach(cleanup);
const base = { value: "", onChange: () => {}, onSubmit: () => {}, onToggleStudio: () => {} };

describe("CoworkComposer · opções da conversa (#713)", () => {
  it("as opções começam escondidas só no celular, e o botão abre e fecha", () => {
    const r = render(<CoworkComposer {...base} opcoes={<span>Modo pesquisa</span>} />);
    const caixa = r.container.querySelector("#opcoes-da-conversa")!;
    expect(caixa.className).toBe("hidden sm:block [@media(max-height:640px)]:!hidden");
    const botao = r.getByRole("button", { name: "Mostrar as opções da conversa" });
    expect(botao.className).toContain("sm:hidden");
    // #728: em tela baixa e larga o botão volta (senão as opções somem sem jeito de abrir)
    expect(botao.className).toContain("[@media(max-height:640px)]:!flex");
    fireEvent.click(botao);
    expect(caixa.className).toBe("");
    expect(r.getByRole("button", { name: "Esconder as opções da conversa" }).getAttribute("aria-expanded")).toBe("true");
  });
  it("opção ligada (modo pesquisa): o botão ganha um ponto", () => {
    const r = render(<CoworkComposer {...base} opcoes={<span>x</span>} opcoesAtivas />);
    expect(r.getByRole("button", { name: "Mostrar as opções da conversa" }).querySelector("span")).not.toBeNull();
  });
  it("sem opções, nem o botão aparece; os anexos (children) ficam sempre à vista", () => {
    const r = render(<CoworkComposer {...base}><span>anexo.pdf</span></CoworkComposer>);
    expect(r.queryByRole("button", { name: /opções da conversa/ })).toBeNull();
    expect(r.getByText("anexo.pdf")).toBeTruthy();
  });
  it("os botões da caixa têm 44 px no celular", () => {
    const r = render(<CoworkComposer {...base} />);
    expect(r.getByRole("button", { name: "Anexar arquivo" }).className).toContain("w-11 h-11 sm:w-10 sm:h-10");
  });
});

describe("CoworkComposer · microfone (#733)", () => {
  afterEach(() => { mic.estado = { listening: false, supported: false, ouviu: false, aviso: null }; });
  it("gravando: diz que está ouvindo; depois de ouvir, que desliga sozinho", () => {
    mic.estado = { listening: true, supported: true, ouviu: false, aviso: null };
    const r = render(<CoworkComposer {...base} />);
    expect(r.getByRole("status").textContent).toMatch(/Ouvindo… pode falar/);
    cleanup();
    mic.estado = { listening: true, supported: true, ouviu: true, aviso: null };
    const r2 = render(<CoworkComposer {...base} />);
    expect(r2.getByRole("status").textContent).toMatch(/desliga sozinho/);
  });
  it("desligou sem a pessoa pedir: mostra o motivo", () => {
    mic.estado = { listening: false, supported: true, ouviu: true, aviso: "desligou" };
    const r = render(<CoworkComposer {...base} />);
    expect(r.getByRole("status").textContent).toMatch(/desligou depois da pausa/);
  });
  it("sem microfone no navegador (Firefox): nada aparece", () => {
    const r = render(<CoworkComposer {...base} />);
    expect(r.queryByRole("status")).toBeNull();
  });
});
