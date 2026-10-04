import { describe, expect, it } from "vitest";
import { copyEntrada, ehRotaImersiva } from "./loungeHub";

describe("loungeHub", () => {
  it("rota imersiva só no cyberespaço", () => {
    expect(ehRotaImersiva("/lounge-cosmico")).toBe(true);
    expect(ehRotaImersiva("/lounge-cosmico/x")).toBe(true);
    expect(ehRotaImersiva("/lounge-cosmicos")).toBe(false);
    expect(ehRotaImersiva("/")).toBe(false);
    expect(ehRotaImersiva(null)).toBe(false);
  });
  it("copy por estado de login", () => {
    expect(copyEntrada(true).cta).toMatch(/cyberespaço/);
    expect(copyEntrada(false).badges.length).toBeGreaterThan(0);
  });
});
