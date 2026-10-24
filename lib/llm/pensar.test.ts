import { describe, it, expect } from "vitest";
import { pensarDa, thinkingConfigDo } from "./pensar";

describe("o pensar por fase", () => {
  it("padrões: classificar/raciocinar/rascunho rápido sem pensar; rascunho completo pouco; plano no padrão do modelo", () => {
    expect(pensarDa("route", {})).toBe("minimal");
    expect(pensarDa("reason", {})).toBe("minimal");
    expect(pensarDa("draft_rapido", {})).toBe("minimal");
    expect(pensarDa("draft", {})).toBe("low");
    expect(pensarDa("plan", {})).toBeUndefined();
  });
  it("o env ajusta sem deploy; 'padrao' desliga; valor inválido cai no padrão", () => {
    expect(pensarDa("draft", { PENSAR_DRAFT: "high" })).toBe("high");
    expect(pensarDa("reason", { PENSAR_REASON: "padrao" })).toBeUndefined();
    expect(pensarDa("route", { PENSAR_ROUTE: "turbo" })).toBe("minimal");
  });
  it("vira thinkingConfig só onde o modelo aceita", () => {
    expect(thinkingConfigDo("gemini-3.5-flash", "minimal")).toEqual({ thinkingConfig: { thinkingLevel: "minimal" } });
    expect(thinkingConfigDo("gemini-2.5-flash", "minimal")).toEqual({ thinkingConfig: { thinkingBudget: 0 } });
    expect(thinkingConfigDo("gemini-2.5-pro", "minimal")).toEqual({});
    expect(thinkingConfigDo("gemini-3.5-flash", undefined)).toEqual({});
  });
});
