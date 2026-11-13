import { describe, it, expect } from "vitest";
import {
  MODELOS_PREMIUM, modeloPremiumPorId, premiumHabilitados, premiumLigado,
  premiumDisponivel, podeUsarPremium, premiumBudgetUsd, PLANO_PREMIUM,
} from "@/lib/octa/modelosPremium";

describe("catálogo premium", () => {
  it("claude é multimodal; codex não (captura vira texto antes de ir)", () => {
    expect(modeloPremiumPorId("claude")).toMatchObject({ grupo: "zaeon-claude", multimodal: true });
    expect(modeloPremiumPorId("codex")).toMatchObject({ grupo: "zaeon-codex", multimodal: false });
  });
  it("id é case/espaço-insensível; desconhecido → undefined", () => {
    expect(modeloPremiumPorId("  CLAUDE ")?.id).toBe("claude");
    expect(modeloPremiumPorId("gemini")).toBeUndefined();
  });
});

describe("flag OCTA_MODELOS_PREMIUM (default DESLIGADO)", () => {
  it("ausente/vazia = nenhum", () => {
    expect(premiumLigado({})).toBe(false);
    expect(premiumLigado({ OCTA_MODELOS_PREMIUM: "" })).toBe(false);
    expect(premiumHabilitados({})).toEqual([]);
  });
  it("lista por vírgula liga só os listados; lixo é ignorado", () => {
    expect(premiumHabilitados({ OCTA_MODELOS_PREMIUM: "claude" }).map((m) => m.id)).toEqual(["claude"]);
    expect(premiumHabilitados({ OCTA_MODELOS_PREMIUM: " codex , claude " }).map((m) => m.id).sort()).toEqual(["claude", "codex"]);
    expect(premiumHabilitados({ OCTA_MODELOS_PREMIUM: "claude,gemini,foo" }).map((m) => m.id)).toEqual(["claude"]);
    expect(premiumLigado({ OCTA_MODELOS_PREMIUM: "claude" })).toBe(true);
  });
  it("premiumDisponivel exige ligado E conhecido", () => {
    const env = { OCTA_MODELOS_PREMIUM: "claude" };
    expect(premiumDisponivel("claude", env)?.grupo).toBe("zaeon-claude");
    expect(premiumDisponivel("codex", env)).toBeUndefined();   // conhecido, mas não ligado
    expect(premiumDisponivel("gemini", env)).toBeUndefined();  // desconhecido
  });
});

describe("gate de plano (premium = max)", () => {
  it("só max (ou super-admin) passa", () => {
    expect(PLANO_PREMIUM).toBe("max");
    for (const p of ["free", "plus", "pro", null, undefined]) expect(podeUsarPremium(p as string)).toBe(false);
    expect(podeUsarPremium("max")).toBe(true);
    expect(podeUsarPremium("free", true)).toBe(true);   // super-admin ignora o tier
  });
});

describe("budget separado", () => {
  it("default 2 USD; env positiva sobrepõe; lixo cai no default", () => {
    expect(premiumBudgetUsd({})).toBe(2);
    expect(premiumBudgetUsd({ OCTA_PREMIUM_BUDGET_USD: "5" })).toBe(5);
    expect(premiumBudgetUsd({ OCTA_PREMIUM_BUDGET_USD: "0" })).toBe(2);
    expect(premiumBudgetUsd({ OCTA_PREMIUM_BUDGET_USD: "abc" })).toBe(2);
  });
});

it("o catálogo e os grupos são estáveis (guarda contra renomear sem querer)", () => {
  expect(MODELOS_PREMIUM.map((m) => `${m.id}:${m.grupo}`)).toEqual(["claude:zaeon-claude", "codex:zaeon-codex"]);
});
