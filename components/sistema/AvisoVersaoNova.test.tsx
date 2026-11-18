// @vitest-environment jsdom
/** #756 · a faixa "Tem uma versão nova" e a recarga quando falta pedaço do site. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { AvisoVersaoNova } from "./AvisoVersaoNova";

const reload = vi.fn();
let commits: string[] = [];

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  reload.mockReset();
  Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, reload } });
  sessionStorage.clear();
  commits = [];
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ commit: commits.shift() ?? null }) })));
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const voltarParaAba = async () => {
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); await new Promise((r) => setTimeout(r, 0)); });
};

describe("#756 · AvisoVersaoNova", () => {
  it("o commit do ar mudou desde que a aba abriu → faixa com Atualizar", async () => {
    commits = ["a1de6d35", "02d89227"];
    const { container } = render(<AvisoVersaoNova />);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(container.querySelector("[data-aviso-versao]")).toBeNull();
    await voltarParaAba();
    const faixa = container.querySelector("[data-aviso-versao]");
    expect(faixa?.textContent).toContain("Tem uma versão nova da Zaeon.");
    act(() => { (faixa!.querySelector("button") as HTMLButtonElement).click(); });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("mesmo commit: nada aparece", async () => {
    commits = ["549dcd05", "549dcd05"];
    const { container } = render(<AvisoVersaoNova />);
    await voltarParaAba();
    expect(container.querySelector("[data-aviso-versao]")).toBeNull();
  });

  it("pedaço do site que sumiu (ChunkLoadError) → recarrega sozinha, mas só 1× por minuto", async () => {
    commits = ["549dcd05"];
    const { container } = render(<AvisoVersaoNova />);
    const erro = Object.assign(new Error("Loading chunk 177 failed."), { name: "ChunkLoadError" });
    act(() => { window.dispatchEvent(new ErrorEvent("error", { error: erro, message: erro.message })); });
    expect(reload).toHaveBeenCalledTimes(1);
    // de novo logo em seguida: não recarrega (sem laço), mostra a faixa
    act(() => { window.dispatchEvent(new ErrorEvent("error", { error: erro, message: erro.message })); });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(container.querySelector("[data-aviso-versao]")).not.toBeNull();
  });

  it("erro comum não recarrega", () => {
    render(<AvisoVersaoNova />);
    act(() => { window.dispatchEvent(new ErrorEvent("error", { error: new TypeError("x is undefined"), message: "x is undefined" })); });
    expect(reload).not.toHaveBeenCalled();
  });

  it("em desenvolvimento não faz nada", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<AvisoVersaoNova />);
    expect(fetch).not.toHaveBeenCalled();
  });
});
