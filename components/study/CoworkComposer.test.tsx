// @vitest-environment jsdom
/** #713: no celular, as opções da conversa ficam recolhidas num botão da caixa de texto; no computador, sempre à vista. */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";

vi.mock("@/lib/voice/useSTT", () => ({ default: () => ({ toggle: () => {}, listening: false, supported: false }) }));
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
