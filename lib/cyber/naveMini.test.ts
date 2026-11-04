import { describe, expect, it } from "vitest";
import { NAVE_MINI, SKINS_MINI, contornoDoMini, lugaresDaMini, moveisDaMini, noCascoMini } from "./naveMini";
import { empurrarDosRetangulos } from "./universidade";

describe("nave mini — o casco", () => {
  it("o contorno do casco fica na borda da superelipse", () => {
    for (const p of contornoDoMini(64)) { expect(noCascoMini(p.x * 0.99, p.z * 0.99)).toBe(true); expect(noCascoMini(p.x * 1.02, p.z * 1.02)).toBe(false); }
  });
});

describe.each(SKINS_MINI)("nave mini — a planta da skin %s", (skin) => {
  const moveis = moveisDaMini(skin);
  it("todo móvel cabe dentro do casco, com folga da parede", () => {
    for (const m of moveis) for (const [x, z] of [[m.x0, m.z0], [m.x1, m.z0], [m.x0, m.z1], [m.x1, m.z1]] as const) expect(noCascoMini(x, z, 0.2), `${m.tipo} em ${m.canto}`).toBe(true);
  });
  it("os móveis sólidos não se atropelam", () => {
    const s = moveis.filter((m) => m.solido !== false && m.tipo !== "sofaArco");
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
      const a = s[i]!, b = s[j]!; expect(a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1, `${a.tipo} × ${b.tipo}`).toBe(false);
    }
  });
  it("a chegada e o portal estão livres", () => {
    for (const { x, z } of [NAVE_MINI.chegada, NAVE_MINI.portal]) expect(empurrarDosRetangulos({ x, z }, moveis)).toEqual({ x, z });
  });
  it("da chegada se anda reto até o meio da roda", () => {
    const livres = moveis.filter((m) => m.tipo !== "lareira" && m.tipo !== "mesaHolo"), { chegada, roda } = NAVE_MINI;
    for (let i = 0; i <= 40; i++) { const p = { x: 0, z: chegada.z + ((roda.z - 1.3 - chegada.z) * i) / 40 }; expect(empurrarDosRetangulos(p, livres, 0.35)).toEqual(p); }
  });
  it("são 5 lugares no meio, todos olhando pro centro da roda e em cima de um sofá", () => {
    const L = lugaresDaMini(skin), sofas = moveis.filter((m) => m.tipo === "sofaArco" || m.tipo === "sofaLongo");
    expect(L).toHaveLength(5);
    for (const l of L) {
      const dx = NAVE_MINI.roda.x - l.x, dz = NAVE_MINI.roda.z - l.z;
      expect(Math.sin(l.rumo) * dx + Math.cos(l.rumo) * dz).toBeGreaterThan(0);
      expect(sofas.some((s) => l.x >= s.x0 - 0.3 && l.x <= s.x1 + 0.3 && l.z >= s.z0 - 0.3 && l.z <= s.z1 + 0.3), `lugar (${l.x.toFixed(1)}, ${l.z.toFixed(1)})`).toBe(true);
    }
  });
});

describe("nave mini — as skins", () => {
  it("a tron não tem fogueira e tem os gadgets (narguilés, telas, terminais)", () => {
    const tipos = new Set(moveisDaMini("tron").map((m) => m.tipo));
    expect(tipos.has("lareira")).toBe(false);
    for (const t of ["sofaLongo", "narguile", "telao", "terminal", "mesaHolo"] as const) expect(tipos.has(t), t).toBe(true);
  });
  it("a padrão é a tron", () => { expect(moveisDaMini()).toBe(moveisDaMini("tron")); });
});
