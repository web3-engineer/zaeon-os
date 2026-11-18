// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import SkinDoLab from "./SkinDoLab";
import { CHAVE_SKIN, EVT_SKIN, aplicarSkin, escolherSkin, lerSkinLocal } from "@/lib/skins/preferencia";

const marca = () => document.documentElement.dataset.skin;
const responder = (corpo: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => corpo })) as unknown as typeof fetch;

beforeEach(() => { localStorage.clear(); aplicarSkin(null); globalThis.fetch = responder({ skin: "original", salva: false }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("SkinDoLab", () => {
  it("sem escolha: nenhuma marca (o visual original)", async () => {
    render(<SkinDoLab />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(marca()).toBeUndefined();
  });

  it("veste a skin do navegador ao montar e TIRA ao sair do laboratório", () => {
    localStorage.setItem(CHAVE_SKIN, "med");
    const { unmount } = render(<SkinDoLab />);
    expect(marca()).toBe("med");
    unmount();
    expect(marca()).toBeUndefined();
  });

  it("lixo no navegador cai no original", () => {
    localStorage.setItem(CHAVE_SKIN, "barbie");
    render(<SkinDoLab />);
    expect(marca()).toBeUndefined();
    expect(lerSkinLocal()).toBe("original");
  });

  it("a conta manda quando a pessoa escolheu noutro aparelho", async () => {
    localStorage.setItem(CHAVE_SKIN, "med");
    globalThis.fetch = responder({ skin: "bio", salva: true });
    render(<SkinDoLab />);
    await waitFor(() => expect(marca()).toBe("bio"));
    expect(localStorage.getItem(CHAVE_SKIN)).toBe("bio");
  });

  it("deslogado (401): fica a skin do navegador", async () => {
    localStorage.setItem(CHAVE_SKIN, "lounge");
    globalThis.fetch = responder({ error: "Unauthorized" }, false);
    render(<SkinDoLab />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(marca()).toBe("lounge");
  });

  it("escolher em Configurações troca na hora, salva e sobe pra conta", () => {
    render(<SkinDoLab />);
    const fetchMock = responder({ skin: "quantic" });
    globalThis.fetch = fetchMock;
    expect(escolherSkin("quantic")).toBe("quantic");
    expect(marca()).toBe("quantic");
    expect(localStorage.getItem(CHAVE_SKIN)).toBe("quantic");
    expect(fetchMock).toHaveBeenCalledWith("/api/user/skin", expect.objectContaining({ method: "PUT", body: JSON.stringify({ skin: "quantic" }) }));
    escolherSkin("original");
    expect(marca()).toBeUndefined();
    expect(localStorage.getItem(CHAVE_SKIN)).toBeNull();
  });

  it("a resposta atrasada da conta não desfaz o que a pessoa acabou de escolher", async () => {
    let soltar: (v: unknown) => void = () => {};
    globalThis.fetch = vi.fn(() => new Promise((r) => { soltar = r; })) as unknown as typeof fetch;
    render(<SkinDoLab />);
    window.dispatchEvent(new CustomEvent(EVT_SKIN, { detail: "humanities" }));
    soltar({ ok: true, json: async () => ({ skin: "bio", salva: true }) });
    await new Promise((r) => setTimeout(r, 10));
    expect(marca()).toBe("humanities");
  });

  it("outra aba trocou a skin: esta acompanha", () => {
    render(<SkinDoLab />);
    localStorage.setItem(CHAVE_SKIN, "cyber");
    window.dispatchEvent(new StorageEvent("storage", { key: CHAVE_SKIN }));
    expect(marca()).toBe("cyber");
  });
});
