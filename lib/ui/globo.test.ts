import { describe, it, expect } from "vitest";
import { latLonParaXYZ, MARCADORES, temWebGL } from "@/lib/ui/globo";

describe("globo", () => {
  it("polos e raio", () => {
    const [x, y, z] = latLonParaXYZ(90, 0, 2);
    expect(y).toBeCloseTo(2);
    expect(Math.hypot(x, y, z)).toBeCloseTo(2);
    for (const [lat, lon] of MARCADORES) expect(Math.hypot(...latLonParaXYZ(lat, lon, 0.785))).toBeCloseTo(0.785);
  });
  it("temWebGL: sem document, sem contexto, ou lançando → false", () => {
    expect(temWebGL(undefined)).toBe(false);
    expect(temWebGL({ createElement: () => ({ getContext: () => null }) } as any)).toBe(false);
    expect(temWebGL({ createElement: () => { throw new Error("x"); } } as any)).toBe(false);
    expect(temWebGL({ createElement: () => ({ getContext: (k: string) => (k === "webgl" ? {} : null) }) } as any)).toBe(true);
  });
});
