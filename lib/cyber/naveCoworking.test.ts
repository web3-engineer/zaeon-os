import { describe, expect, it } from "vitest";
import { ANDAR2, AREAS, CABINES, ESCADA_CW, LADO_CABINE, NAVE_COWORK, areaDoPonto, contornoDoCasco, moveisDaNave, moveisDoAndar2, noCasco, noLounge2, noTerraco, paredesDaNave, pontoDaEscada } from "./naveCoworking";
import { empurrarDasParedes, empurrarDosRetangulos } from "./universidade";

describe("nave coworking — a planta", () => {
  it("o contorno do casco fica na borda da superelipse", () => {
    for (const p of contornoDoCasco(64)) { expect(noCasco(p.x * 0.99, p.z * 0.99)).toBe(true); expect(noCasco(p.x * 1.02, p.z * 1.02)).toBe(false); }
  });

  it("todo móvel e toda divisória cabem dentro do casco (com folga da parede)", () => {
    for (const m of moveisDaNave()) for (const [x, z] of [[m.x0, m.z0], [m.x1, m.z0], [m.x0, m.z1], [m.x1, m.z1]] as const) expect(noCasco(x, z, 0.2), `${m.tipo} em ${m.area}`).toBe(true);
    for (const w of paredesDaNave()) { expect(noCasco(w.ax, w.az, 0.2)).toBe(true); expect(noCasco(w.bx, w.bz, 0.2)).toBe(true); }
  });

  it("cada móvel fica na área dele", () => {
    for (const m of moveisDaNave()) { const cx = (m.x0 + m.x1) / 2, cz = (m.z0 + m.z1) / 2; expect(areaDoPonto(cx, cz), `${m.tipo} em ${m.area}`).toBe(m.area); }
  });

  it("a chegada e o portal estão livres (nada de móvel nem parede em cima)", () => {
    for (const { x, z } of [NAVE_COWORK.chegada, NAVE_COWORK.portal]) {
      const p = { x, z };
      expect(empurrarDosRetangulos(p, moveisDaNave())).toEqual(p);
      expect(empurrarDasParedes(p, paredesDaNave())).toEqual(p);
    }
  });

  it("dá pra entrar nas salas de reuniões e nas cabines pela porta (a avenida → dentro)", () => {
    const paredes = paredesDaNave();
    // andando em passos curtos pela linha da porta, a parede nunca empurra
    const atravessa = (x0: number, x1: number, z: number) => { for (let i = 0; i <= 20; i++) { const p = { x: x0 + ((x1 - x0) * i) / 20, z }; const q = empurrarDasParedes(p, paredes, 0.35); if (Math.hypot(q.x - p.x, q.z - p.z) > 1e-6) return false; } return true; };
    expect(atravessa(-4.5, -8, -3)).toBe(true);    // Órion
    expect(atravessa(4.5, 8, -3)).toBe(true);      // Lyra
    for (const [cx, cz] of CABINES) expect(atravessa(cx + LADO_CABINE / 2 + 1, cx, cz)).toBe(true);
  });

  it("as áreas não se sobrepõem (fora a avenida, que é o corredor de todas)", () => {
    const outras = AREAS.filter((a) => a.id !== "avenida");
    for (let i = 0; i < outras.length; i++) for (let j = i + 1; j < outras.length; j++) {
      const a = outras[i]!, b = outras[j]!; const cruza = a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
      expect(cruza, `${a.id} × ${b.id}`).toBe(false);
    }
  });
});

describe("nave coworking — o 2º andar", () => {
  it("os móveis do lounge ficam no lounge e os do terraço no terraço", () => {
    for (const m of moveisDoAndar2()) for (const [x, z] of [[m.x0, m.z0], [m.x1, m.z0], [m.x0, m.z1], [m.x1, m.z1]] as const) {
      if (m.area === "lounge2") expect(noLounge2(x, z, 0.3), `${m.tipo} (${x}, ${z})`).toBe(true);
      else expect(noTerraco(x, z, 0.3), `${m.tipo} (${x}, ${z})`).toBe(true);
    }
  });
  it("a escada sai da avenida e chega no lounge, livre dos móveis dos dois andares", () => {
    expect(pontoDaEscada(0).y).toBe(0); expect(pontoDaEscada(ESCADA_CW.giro).y).toBeCloseTo(ANDAR2.y);
    for (let k = 0; k <= 30; k++) { const p = pontoDaEscada((ESCADA_CW.giro * k) / 30, ESCADA_CW.rOut); expect(Math.abs(p.x)).toBeLessThan(3); expect(noLounge2(p.x, p.z, 1)).toBe(true);
      expect(empurrarDosRetangulos({ x: p.x, z: p.z }, [...moveisDaNave(), ...moveisDoAndar2()], 0.1)).toEqual({ x: p.x, z: p.z }); }
  });
});
