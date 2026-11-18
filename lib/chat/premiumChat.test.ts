import { describe, it, expect } from "vitest";
import { contaPodeClaude, podeClaudeNoChat, type ContaPremium } from "./premiumChat";

const LIGADO = { OCTA_MODELOS_PREMIUM: "claude,codex" };

describe("contaPodeClaude (pura)", () => {
  it("max → pode; free → não; conta ausente → não", () => {
    expect(contaPodeClaude({ plan: "max" })).toBe(true);
    expect(contaPodeClaude({ plan: "free" })).toBe(false);
    expect(contaPodeClaude(null)).toBe(false);
  });
  it("plano plus/pro não basta — só max (ou super-admin)", () => {
    expect(contaPodeClaude({ plan: "plus" })).toBe(false);
    expect(contaPodeClaude({ plan: "pro" })).toBe(false);
  });
});

describe("podeClaudeNoChat (com banco injetado)", () => {
  const ler = (conta: ContaPremium | null) => async () => conta;

  it("flag desligada → false mesmo com plano max", async () => {
    expect(await podeClaudeNoChat("u1", {}, ler({ plan: "max" }))).toBe(false);
  });
  it("flag ligada + max → true", async () => {
    expect(await podeClaudeNoChat("u1", LIGADO, ler({ plan: "max" }))).toBe(true);
  });
  it("flag ligada + free → false", async () => {
    expect(await podeClaudeNoChat("u1", LIGADO, ler({ plan: "free" }))).toBe(false);
  });
  it("sem userId → false (nem lê o banco)", async () => {
    let leu = false;
    const r = await podeClaudeNoChat(null, LIGADO, async () => { leu = true; return { plan: "max" }; });
    expect(r).toBe(false);
    expect(leu).toBe(false);
  });
  it("banco explode → false (fecha fechado)", async () => {
    const r = await podeClaudeNoChat("u1", LIGADO, async () => { throw new Error("mongo fora"); });
    expect(r).toBe(false);
  });
});
