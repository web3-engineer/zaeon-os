import { describe, expect, it } from "vitest";
import { combateDe, sanitizarPresenca } from "./sala";
import { poseMudou } from "./pose";
import { codificarGolpe } from "../cyber/combate";

describe("ARENA PvP na presença (rede)", () => {
  it("o golpe, a vida e a espada passam limpos; lixo some", () => {
    expect(combateDe({ atk: codificarGolpe(5, 2), hp: 64, arma: 1, mov: 2 })).toEqual({ mov: 2, atk: 22, hp: 64, arma: 1 });
    expect(combateDe({ mov: 9 })).toEqual({});
    expect(combateDe({ atk: -3, hp: 140, arma: "sim" })).toEqual({});
    expect(combateDe({ hp: 100 })).toEqual({});   // vida cheia não viaja
    const p = sanitizarPresenca({ userId: "a".repeat(24), name: "X", color: "#ffffff", x: 1, z: 2, facing: 0, atk: 9, hp: 30, arma: 1 });
    expect(p).toMatchObject({ atk: 9, hp: 30, arma: 1 });
  });
  it("um golpe novo (ou a vida mudando) sai NA HORA — mesmo parado no lugar", () => {
    const base = { x: 0, z: 0, facing: 0 };
    expect(poseMudou({ ...base, atk: 5 }, { ...base, atk: 9 })).toBe(true);
    expect(poseMudou({ ...base, hp: 80 }, { ...base, hp: 70 })).toBe(true);
    expect(poseMudou({ ...base }, { ...base, arma: 1 })).toBe(true);
    expect(poseMudou({ ...base }, { ...base, mov: 2 })).toBe(true);   // (o dash dos outros aparece na hora)
    expect(poseMudou({ ...base, atk: 5 }, { ...base, atk: 5 })).toBe(false);
  });
});
