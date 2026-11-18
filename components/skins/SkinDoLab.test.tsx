// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import SkinDoLab from "./SkinDoLab";
import { CHAVE_PENDENTE, CHAVE_SKIN, EVT_SKIN, __reiniciarSkins, aplicarSkin, enviarSkin, escolherSkin, lerSkinLocal, reconciliarComAConta, skinPendente } from "@/lib/skins/preferencia";

const marca = () => document.documentElement.dataset.skin;
type Resposta = { ok: boolean; json: () => Promise<unknown> };
const resp = (corpo: unknown, ok = true): Resposta => ({ ok, json: async () => corpo });
/** fetch falso: GET responde `conta`; PUT responde `put` (e fica anotado) */
function rede(conta: Resposta, put: Resposta = resp({ skin: "x" })) {
  const puts: string[] = [];
  const f = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PUT") { puts.push(JSON.parse(String(init.body)).skin); return put; }
    return conta;
  });
  globalThis.fetch = f as unknown as typeof fetch;
  return { f, puts };
}
const quieto = () => new Promise((r) => setTimeout(r, 15));

beforeEach(() => { localStorage.clear(); aplicarSkin(null); __reiniciarSkins(); rede(resp({ skin: "original", salva: false })); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("SkinDoLab", () => {
  it("sem escolha: nenhuma marca (o visual original) e nada sobe pra conta", async () => {
    const { f, puts } = rede(resp({ skin: "original", salva: false }));
    render(<SkinDoLab />);
    await waitFor(() => expect(f).toHaveBeenCalled());
    await quieto();
    expect(marca()).toBeUndefined();
    expect(puts).toEqual([]);
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

  it("EMBUTIDO (workstation): a marca fica só na raiz do laboratório, o resto da página não muda", () => {
    localStorage.setItem(CHAVE_SKIN, "bio");
    const raiz = document.createElement("div"); document.body.appendChild(raiz);
    const ref = createRef<HTMLElement>() as { current: HTMLElement | null }; ref.current = raiz;
    const { unmount } = render(<SkinDoLab escopo={ref} />);
    expect(raiz.dataset.skin).toBe("bio");
    expect(marca()).toBeUndefined();
    window.dispatchEvent(new CustomEvent(EVT_SKIN, { detail: "lounge" }));
    expect(raiz.dataset.skin).toBe("lounge");
    expect(marca()).toBeUndefined();
    unmount();
    expect(raiz.dataset.skin).toBeUndefined();
    raiz.remove();
  });

  it("a conta manda quando a pessoa escolheu noutro aparelho (e avisa quem estiver ouvindo)", async () => {
    localStorage.setItem(CHAVE_SKIN, "med");
    const { puts } = rede(resp({ skin: "bio", salva: true }));
    const ouviu = vi.fn(); window.addEventListener(EVT_SKIN, ouviu);
    render(<SkinDoLab />);
    await waitFor(() => expect(marca()).toBe("bio"));
    expect(localStorage.getItem(CHAVE_SKIN)).toBe("bio");
    expect(ouviu).toHaveBeenCalledTimes(1);
    expect(puts).toEqual([]);
    window.removeEventListener(EVT_SKIN, ouviu);
  });

  it("deslogado (401): fica a skin do navegador", async () => {
    localStorage.setItem(CHAVE_SKIN, "lounge");
    const { f } = rede(resp({ error: "Unauthorized" }, false));
    render(<SkinDoLab />);
    await waitFor(() => expect(f).toHaveBeenCalled());
    await quieto();
    expect(marca()).toBe("lounge");
  });

  it("escolher em Configurações troca na hora, salva e sobe pra conta; confirmado, deixa de estar pendente", async () => {
    render(<SkinDoLab />);
    await quieto();
    const { puts } = rede(resp({ skin: "original", salva: false }), resp({ skin: "quantic" }));
    expect(escolherSkin("quantic")).toBe("quantic");
    expect(marca()).toBe("quantic");
    expect(localStorage.getItem(CHAVE_SKIN)).toBe("quantic");
    expect(skinPendente()).toBe(true);
    await waitFor(() => expect(skinPendente()).toBe(false));
    expect(puts).toEqual(["quantic"]);
    escolherSkin("original");
    expect(marca()).toBeUndefined();
    expect(localStorage.getItem(CHAVE_SKIN)).toBeNull();
  });

  it("o envio falhou: a escolha fica pendente e a skin ANTIGA da conta não a desfaz ao reabrir — ela sobe de novo", async () => {
    rede(resp({ skin: "med", salva: true }), resp({ error: "x" }, false));
    escolherSkin("bio");
    await quieto();
    expect(skinPendente()).toBe(true);
    const { puts } = rede(resp({ skin: "med", salva: true }), resp({ skin: "bio" }));
    render(<SkinDoLab />);
    await waitFor(() => expect(puts).toEqual(["bio"]));
    await waitFor(() => expect(skinPendente()).toBe(false));
    expect(marca()).toBe("bio");
    expect(localStorage.getItem(CHAVE_SKIN)).toBe("bio");
  });

  it("escolha feita deslogado: ao abrir logado, sobe pra conta que ainda não tinha skin", async () => {
    localStorage.setItem(CHAVE_SKIN, "humanities");
    const { puts } = rede(resp({ skin: "original", salva: false }), resp({ skin: "humanities" }));
    render(<SkinDoLab />);
    await waitFor(() => expect(puts).toEqual(["humanities"]));
    expect(marca()).toBe("humanities");
  });

  it("a resposta ATRASADA da conta não desfaz o que a pessoa acabou de escolher", async () => {
    let soltar: (v: Resposta) => void = () => {};
    const f = vi.fn((_u: string, init?: RequestInit) => (init?.method === "PUT" ? Promise.resolve(resp({})) : new Promise<Resposta>((r) => { soltar = r; })));
    globalThis.fetch = f as unknown as typeof fetch;
    render(<SkinDoLab />);
    await waitFor(() => expect(f).toHaveBeenCalledTimes(1));   // a pergunta à conta SAIU
    escolherSkin("humanities");
    await waitFor(() => expect(skinPendente()).toBe(false));    // e a escolha já foi confirmada
    soltar(resp({ skin: "bio", salva: true }));                 // só agora chega a resposta velha
    await quieto();
    expect(marca()).toBe("humanities");
    expect(localStorage.getItem(CHAVE_SKIN)).toBe("humanities");
  });

  it("outra aba trocou a skin: esta acompanha", () => {
    render(<SkinDoLab />);
    localStorage.setItem(CHAVE_SKIN, "cyber");
    window.dispatchEvent(new StorageEvent("storage", { key: CHAVE_SKIN }));
    expect(marca()).toBe("cyber");
  });
});

describe("envio da skin pra conta", () => {
  it("duas escolhas seguidas: só a mais nova é enviada (a antiga não pode chegar depois e vencer)", async () => {
    const { puts } = rede(resp({ skin: "original", salva: false }));
    escolherSkin("med");
    escolherSkin("bio");
    await waitFor(() => expect(skinPendente()).toBe(false));
    expect(puts).toEqual(["bio"]);
  });

  it("envios saem um de cada vez, na ordem", async () => {
    const ordem: string[] = [];
    let soltar1: () => void = () => {};
    globalThis.fetch = vi.fn((_u: string, init?: RequestInit) => {
      const skin = JSON.parse(String(init!.body)).skin as string;
      ordem.push(`ida:${skin}`);
      if (skin === "med") return new Promise<Resposta>((r) => { soltar1 = () => { ordem.push("volta:med"); r(resp({})); }; });
      ordem.push(`volta:${skin}`);
      return Promise.resolve(resp({}));
    }) as unknown as typeof fetch;
    const a = enviarSkin("med");
    await waitFor(() => expect(ordem).toEqual(["ida:med"]));
    const b = enviarSkin("bio");
    await quieto();
    expect(ordem).toEqual(["ida:med"]);   // o segundo espera o primeiro voltar
    soltar1();
    await Promise.all([a, b]);
    expect(ordem).toEqual(["ida:med", "volta:med", "ida:bio", "volta:bio"]);
  });

  it("sem rede: não quebra, e a escolha segue pendente", async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    escolherSkin("lounge");
    await quieto();
    expect(localStorage.getItem(CHAVE_PENDENTE)).toBe("1");
    expect(await reconciliarComAConta()).toBeNull();
    expect(lerSkinLocal()).toBe("lounge");
  });
});
