// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cadernoDoItem, marcarCadernoPendente, consumirCadernoPendente, EVT_ABRIR_CADERNO } from "./desbloqueio";

afterEach(() => { try { localStorage.clear(); } catch { /* ok */ } });

describe("cadernoDoItem — que item vira caderno", () => {
  it("o card do MuseScore (por id ou tag) → ritmo", () => {
    expect(cadernoDoItem({ id: "skill:musescore-partituras" })).toBe("ritmo");
    expect(cadernoDoItem({ id: "x", tags: ["música", "partitura"] })).toBe("ritmo");
    expect(cadernoDoItem({ id: "x", tags: ["musescore"] })).toBe("ritmo");
  });
  it("qualquer outro item → null", () => {
    expect(cadernoDoItem({ id: "ps5-rev", tags: ["hardware"] })).toBeNull();
    expect(cadernoDoItem({ id: "skill:anatomia-3d", tags: ["anatomia"] })).toBeNull();
    expect(cadernoDoItem(null)).toBeNull();
    expect(cadernoDoItem({})).toBeNull();
  });
});

describe("pendência de caderno — marcar / consumir / evento", () => {
  it("marcar grava, consumir lê UMA vez e limpa", () => {
    marcarCadernoPendente("ritmo");
    expect(consumirCadernoPendente()).toBe("ritmo");
    expect(consumirCadernoPendente()).toBeNull(); // já consumido
  });
  it("id null não marca nada", () => {
    marcarCadernoPendente(null);
    expect(consumirCadernoPendente()).toBeNull();
  });
  it("marcar dispara o evento com o id (pra sala já aberta)", () => {
    const ouvinte = vi.fn((e: Event) => (e as CustomEvent).detail);
    window.addEventListener(EVT_ABRIR_CADERNO, ouvinte);
    marcarCadernoPendente("ritmo");
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect((ouvinte.mock.calls[0][0] as CustomEvent).detail).toBe("ritmo");
    window.removeEventListener(EVT_ABRIR_CADERNO, ouvinte);
  });
});
