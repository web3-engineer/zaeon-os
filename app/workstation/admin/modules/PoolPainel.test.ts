import { describe, it, expect } from "vitest";
import { formatPct, corDoAlvo } from "./PoolPainel";

describe("PoolPainel — puros", () => {
  it("formatPct", () => {
    expect(formatPct(null)).toBe("—"); expect(formatPct(66.666)).toBe("66.7%"); expect(formatPct(0)).toBe("0%");
  });
  it("corDoAlvo: vertex (pago) em âmbar, grátis em outras cores", () => {
    expect(corDoAlvo("vertex")).toBe("bg-amber-500");
    expect(new Set(["gemini-free", "cloudflare", "groq"].map(corDoAlvo)).size).toBe(3);
  });
});
