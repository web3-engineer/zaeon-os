import { describe, it, expect } from "vitest";
import { messageForError, classifyError } from "./errors";

describe("errors · messageForError", () => {
  it("mapeia code conhecido (ToolResult) → mensagem amigável", () => {
    expect(messageForError({ code: "tool_denied" })).toMatch(/plano/i);
    expect(messageForError({ code: "memory_unavailable" })).toMatch(/mem[óo]ria/i);
    expect(messageForError({ code: "needs_approval" })).toMatch(/aprova/i);
  });
  it("classifica string de erro crua (rede/timeout/rate)", () => {
    expect(messageForError("Gemini timeout (30000ms)")).toMatch(/demorou/i);
    expect(messageForError("HTTP 429 quota exceeded")).toMatch(/segundinho|espera/i);
    expect(messageForError("fetch failed ECONNREFUSED")).toMatch(/conex[ãa]o/i);
  });
  it("code desconhecido/null → fallback (nunca vazio)", () => {
    expect(messageForError({ code: "nao_existe" })).toMatch(/problema/i);
    expect(messageForError(null)).toMatch(/problema/i);
    expect(messageForError({ error: "algo estranho sem padrão" })).toMatch(/problema/i);
  });
  it("aceita um code cru como string", () => {
    expect(messageForError("skill_offline")).toMatch(/fora do ar/i);
  });
});

describe("errors · teto da virtual key (C6)", () => {
  it("budget estourado → agent_budget_exhausted, por code e por string crua (antes de rate/quota)", () => {
    expect(messageForError("agent_budget_exhausted")).toMatch(/limite diário/);
    expect(messageForError("llm:teto: Budget has been exceeded! Current cost: 0.51, Max budget: 0.50")).toMatch(/limite diário/);
    expect(classifyError("ExceededBudget: max_budget reached")).toBe("agent_budget_exhausted");
    expect(classifyError("429 quota exceeded")).toBe("rate_limited");
  });
});

describe("errors · classifyError", () => {
  it("reconhece as famílias", () => {
    expect(classifyError("deadline exceeded")).toBe("tool_timeout");
    expect(classifyError("rate limit hit")).toBe("rate_limited");
    expect(classifyError("getaddrinfo ENOTFOUND")).toBe("network");
    expect(classifyError("invalid JSON")).toBe("invalid_output");
    expect(classifyError("")).toBe("unknown");
  });
});

describe("errors · pool_esgotado (Fatia 7 · G4)", () => {
  it("mensagem própria e classificação do erro cru do envelope/LiteLLM", () => {
    expect(messageForError("pool_esgotado")).toMatch(/gratuitos.*sem cota/i);
    expect(classifyError("llm:pool_esgotado: No deployments available for selected model")).toBe("pool_esgotado");
    expect(classifyError("No deployments available for selected model")).toBe("pool_esgotado");
    expect(classifyError("429 rate limit")).toBe("rate_limited");
  });
});
