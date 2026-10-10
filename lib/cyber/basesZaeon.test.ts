import { describe, expect, it } from "vitest";
import { BASES_CEU_LOCAIS, BASE_PLATAFORMA_R, baseNoCeu, basesDosMembros, spawnDaBase, vagasDeBaseNaZaeon } from "./bases";
import { CIDADE, colisoresDaCidade, escadaEm, mundo, naIlhaPrincipal } from "./ceu";
import { MIRANTES } from "./terra";
import { POIS } from "./landmarks";

describe("bases na Zaeon (a praça virou a arena PvP)", () => {
  const ids = Array.from({ length: 30 }, (_, i) => String(i).padStart(24, "0"));
  const m = basesDosMembros(ids, POIS, { ceu: [ids[2]!], todosNaZaeon: true });
  it("com a cidade, TODO mundo tem a base na Zaeon (o fundador no lugar dele); cada um numa vaga", () => {
    expect([...m.values()].every((l) => l.nivel === "ceu")).toBe(true);
    expect(m.get(ids[2]!)).toEqual(baseNoCeu(0));
    expect(new Set([...m.values()].map((l) => `${l.x.toFixed(2)},${l.z.toFixed(2)}`)).size).toBe(ids.length);
  });
  it("as vagas ficam livres: dos sólidos da cidade, das escadas, do buraco negro, dos mirantes e das bases dos fundadores", () => {
    const vs = vagasDeBaseNaZaeon(), cs = colisoresDaCidade();
    expect(vs.length).toBeGreaterThan(60);
    for (const l of vs) {
      const w = mundo(l);
      for (const c of cs) expect(Math.hypot(w.x - c.x, w.z - c.z)).toBeGreaterThan(c.r + BASE_PLATAFORMA_R + 1);
      expect(escadaEm(l, BASE_PLATAFORMA_R)).toBeNull();
      expect(Math.hypot(l.x - CIDADE.portalTunel.x, l.z - CIDADE.portalTunel.z)).toBeGreaterThan(12);
      for (const mi of MIRANTES) expect(Math.hypot(l.x - mi.x, l.z - mi.z)).toBeGreaterThan(55);
      for (const b of BASES_CEU_LOCAIS) expect(Math.hypot(l.x - b.x, l.z - b.z)).toBeGreaterThan(12);
      expect(Math.hypot(l.x, l.z) + BASE_PLATAFORMA_R).toBeLessThan(CIDADE.andavelR);
    }
  });
  it("quem entra nasce na frente da própria base, no piso da Zaeon", () => {
    for (const l of m.values()) expect(naIlhaPrincipal(spawnDaBase(l))).toBe(true);
  });
  it("sem a cidade (marcos desligados): continua tudo no anel da praça", () => {
    expect([...basesDosMembros(ids).values()].every((l) => !l.nivel)).toBe(true);
  });
});
