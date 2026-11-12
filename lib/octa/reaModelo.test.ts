import { describe, expect, it } from "vitest";
import { modeloReaAgente, modeloReaRedacao, reaClaude } from "@/lib/octa/reaModelo";

describe("reaModelo — seleção opt-in do Claude por ponto", () => {
  it("desligado por padrão (sem env → null)", () => {
    expect(modeloReaAgente({})).toBeNull();
    expect(modeloReaRedacao({})).toBeNull();
    expect(reaClaude({})).toEqual({ agente: null, redacao: null, ligado: false });
  });
  it("lê o nome do modelo de cada ponto, aparando espaço", () => {
    expect(modeloReaAgente({ REA_MODELO_AGENTE: " claude-opus " })).toBe("claude-opus");
    expect(modeloReaRedacao({ REA_MODELO_REDACAO: "claude-sonnet" })).toBe("claude-sonnet");
  });
  it("string vazia é como ausente", () => {
    expect(modeloReaAgente({ REA_MODELO_AGENTE: "   " })).toBeNull();
  });
  it("reaClaude resume os dois pontos e o ligado", () => {
    expect(reaClaude({ REA_MODELO_AGENTE: "claude-opus" })).toEqual({ agente: "claude-opus", redacao: null, ligado: true });
    expect(reaClaude({ REA_MODELO_AGENTE: "claude-opus", REA_MODELO_REDACAO: "claude-sonnet" }).ligado).toBe(true);
  });
});
