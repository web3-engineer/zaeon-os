import { describe, it, expect, beforeEach } from "vitest";
import { abrirProjetoNaOcta, consumirAberturaPendente, CHAVE_ABRIR_PENDENTE, EVT_ABRIR_PROJETO } from "./ideNav";

/** janela falsa: localStorage em memória + dispatch/add/removeEventListener + CustomEvent */
function instalarWindow() {
  const store = new Map<string, string>();
  const listeners: { type: string; cb: (e: any) => void }[] = [];
  const w: any = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
    },
    dispatchEvent: (e: any) => { listeners.filter((l) => l.type === e.type).forEach((l) => l.cb(e)); return true; },
    addEventListener: (t: string, cb: any) => listeners.push({ type: t, cb }),
    removeEventListener: () => {},
  };
  (globalThis as any).window = w;
  (globalThis as any).CustomEvent = class { type: string; detail: any; constructor(t: string, o: any) { this.type = t; this.detail = o?.detail; } };
  return { store, listeners };
}

describe("octa · ideNav (ponte REA → Octa, o handoff)", () => {
  beforeEach(() => { delete (globalThis as any).window; });

  it("abrirProjetoNaOcta grava o id no handoff pendente E dispara o evento com o projetoId", () => {
    const { store } = instalarWindow();
    const recebidos: string[] = [];
    (globalThis as any).window.addEventListener(EVT_ABRIR_PROJETO, (e: any) => recebidos.push(e.detail?.projetoId));
    abrirProjetoNaOcta("proj-123");
    expect(store.get(CHAVE_ABRIR_PENDENTE)).toBe("proj-123"); // handoff cru pra IDE que vai montar
    expect(recebidos).toEqual(["proj-123"]);                   // evento pra IDE já montada
  });

  it("consumirAberturaPendente lê e APAGA (uso único) — não reabre duas vezes", () => {
    const { store } = instalarWindow();
    store.set(CHAVE_ABRIR_PENDENTE, "proj-abc");
    expect(consumirAberturaPendente()).toBe("proj-abc");
    expect(store.has(CHAVE_ABRIR_PENDENTE)).toBe(false);
    expect(consumirAberturaPendente()).toBeNull(); // segundo boot não repete
  });

  it("sem window (SSR) não quebra", () => {
    expect(() => abrirProjetoNaOcta("x")).not.toThrow();
    expect(consumirAberturaPendente()).toBeNull();
  });

  it("id vazio não dispara nada", () => {
    const { store } = instalarWindow();
    abrirProjetoNaOcta("");
    expect(store.has(CHAVE_ABRIR_PENDENTE)).toBe(false);
  });
});
