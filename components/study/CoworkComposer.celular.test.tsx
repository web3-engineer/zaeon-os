// @vitest-environment jsdom
/** #837: no celular a caixa de escrever é uma linha só — "+", campo, microfone e enviar; o "+" abre o painel. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

vi.mock("@/lib/voice/useSTT", () => ({
  default: () => ({ start: vi.fn(), stop: vi.fn(), listening: false, supported: true, ouviu: false, aviso: null, limparAviso: vi.fn() }),
  TEXTO_AVISO_STT: {},
}));
vi.mock("@/lib/research/zaeonEventos", () => ({ avisarMicrofone: vi.fn() }));
vi.mock("@/lib/ui/autofoco", () => ({ useAutoFoco: () => {} }));

/** o matchMedia diz "celular" (ou não) */
function telaDe(celular: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (q: string) => ({ matches: celular, media: q, addEventListener: () => {}, removeEventListener: () => {} }),
  });
}

beforeEach(async () => {
  const { default: i18n } = await import("i18next");
  const { default: pt } = await import("@/public/locales/pt/common.json");
  const { initReactI18next } = await import("react-i18next");
  await i18n.use(initReactI18next).init({ lng: "pt", resources: { pt: { translation: pt } } });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function montar(props: Partial<React.ComponentProps<typeof import("./CoworkComposer").default>> = {}) {
  const { default: CoworkComposer } = await import("./CoworkComposer");
  const base = { value: "", onChange: vi.fn(), onSubmit: vi.fn(), onToggleStudio: vi.fn() };
  render(<CoworkComposer {...base} {...props} opcoes={<span>opções da conversa</span>} />);
  return base;
}

describe("CoworkComposer no celular (#837)", () => {
  it("uma linha só: +, campo de 16 px, microfone e enviar — sem o Studio, anexo e modo na caixa", async () => {
    telaDe(true);
    await montar();
    expect(screen.getByRole("button", { name: "Mais" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Mensagem" }).className).toContain("text-[16px]");
    expect(screen.getByRole("button", { name: "Falar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeTruthy();
    expect(screen.queryByTitle("Anexar arquivo")).toBeNull();
    expect(screen.queryByText("opções da conversa")).toBeNull();   // moram no "Aura ▾" do topo
  });

  it("o + abre o painel: trazer arquivo/foto e gerar com o Studio; escolher põe o pedido na caixa e fecha", async () => {
    telaDe(true);
    const onEscolherStudio = vi.fn();
    await montar({ onEscolherStudio });
    fireEvent.click(screen.getByRole("button", { name: "Mais" }));
    const painel = screen.getByRole("dialog", { name: "Mais" });
    expect(painel.textContent).toContain("Arquivo");
    expect(painel.textContent).toContain("Foto");
    fireEvent.click(screen.getByRole("button", { name: /Mapa mental/ }));
    expect(onEscolherStudio).toHaveBeenCalledWith("Gere um mapa mental sobre ");
    await act(async () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("no computador continua a caixa de sempre (com as opções e o anexo)", async () => {
    telaDe(false);
    await montar();
    expect(screen.getByTitle("Anexar arquivo")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mais" })).toBeNull();
  });
});
