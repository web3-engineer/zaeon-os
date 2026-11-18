import { describe, it, expect } from "vitest";
import { MODELOS_CHAT, MODELO_PADRAO, modeloDoId, nomeDoModeloServido, viaGateway } from "./modelos";

describe("catálogo de modelos do chat", () => {
  it("Google + Claude no seletor; padrão = Gemini 3.5 Flash", () => {
    expect(MODELOS_CHAT.map((m) => m.id)).toEqual(["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-pro", "claude-opus", "claude-sonnet"]);
    expect(MODELO_PADRAO).toBe("gemini-3.5-flash");
    // google precisa de vertex; o resto (zaeon/anthropic) precisa de grupo (rota do gateway)
    for (const m of MODELOS_CHAT) expect(m.provedor === "google" ? !!m.vertex : !!m.grupo).toBe(true);
  });
  it("os Claude roteiam pelo gateway; os Gemini não", () => {
    expect(viaGateway(modeloDoId("claude-opus"))).toBe(true);
    expect(viaGateway(modeloDoId("claude-sonnet"))).toBe(true);
    expect(viaGateway(modeloDoId("gemini-3.5-flash"))).toBe(false);
    expect(viaGateway(null)).toBe(false);
    expect(modeloDoId("claude-opus")?.grupo).toBe("claude-opus");   // = model_name no litellm-config
  });
  it("só aceita id do catálogo (nome solto do cliente = null)", () => {
    expect(modeloDoId("zaeon-qwen30")).toBeNull();
    expect(modeloDoId("gemini-2.5-pro")?.vertex).toBe("gemini-2.5-pro");
    expect(modeloDoId("gpt-4o")).toBeNull();
    expect(modeloDoId("claude-3")).toBeNull();
    expect(modeloDoId(42)).toBeNull();
  });
  it("nome de quem respondeu, a partir do que o servidor usou", () => {
    expect(nomeDoModeloServido("gemini-3.5-flash", "vertex")).toBe("Gemini 3.5 Flash");
    expect(nomeDoModeloServido("claude-opus")).toBe("Claude Opus");   // grupo → nome, sem "· local"
    expect(nomeDoModeloServido("claude-sonnet")).toBe("Claude Sonnet");
    expect(nomeDoModeloServido("zaeon-local-qwen30", "contabo")).toBe("qwen30 · local");
    expect(nomeDoModeloServido("openai/gpt-oss-120b", "huggingface")).toBe("gpt-oss-120b · reserva");
    expect(nomeDoModeloServido("", null)).toBe("?");
  });
});
