import { describe, it, expect, vi } from "vitest";
import { decidir, aplicarDecisao, expiraEmDe, EXPIRA_MS, RATE_LIMIT_MAX_MS } from "./reenfileirar";
import { PoolEsgotadoError, ErroLlm, POOL_BACKOFF_MAX_MS } from "@/lib/llm/envelope";

const agora = new Date("2026-10-08T12:00:00Z");
const em = (ms: number) => new Date(agora.getTime() + ms);
const prazo = em(EXPIRA_MS);
const ms = (d: ReturnType<typeof decidir>) => (d.acao === "adiar" ? d.ate.getTime() - agora.getTime() : null);

describe("decidir (G4)", () => {
  it("pool esgotado → adia pelo retryAfterMs", () => {
    const d = decidir(new PoolEsgotadoError(90_000, ["gemini-free", "cloudflare", "groq"], null), agora, prazo);
    expect(d.acao).toBe("adiar"); expect(ms(d)).toBe(90_000);
  });
  it("pool esgotado → teto de 30min", () => {
    expect(ms(decidir(new PoolEsgotadoError(5 * 60 * 60_000, [], null), agora, prazo))).toBe(POOL_BACKOFF_MAX_MS);
  });
  it("pool esgotado → nunca além do prazo", () => {
    expect(ms(decidir(new PoolEsgotadoError(20 * 60_000, [], null), agora, em(5 * 60_000)))).toBe(5 * 60_000);
  });
  it("pool esgotado depois do expiraEm → expirar", () => {
    expect(decidir(new PoolEsgotadoError(60_000, [], null), agora, em(-1))).toEqual({ acao: "expirar" });
    expect(decidir(new PoolEsgotadoError(60_000, [], null), agora, agora)).toEqual({ acao: "expirar" });
  });
  it("erro cru do LiteLLM 'No deployments available' também é pool esgotado", () => {
    const d = decidir(new Error("No deployments available for selected model"), agora, prazo, 1);
    expect(d.acao).toBe("adiar"); expect(ms(d)).toBe(120_000);
  });
  it("rate_limit → 60s × 2^tentativa, teto 15min", () => {
    const rl = new ErroLlm("rate_limit", "litellm", null);
    expect(ms(decidir(rl, agora, prazo, 0))).toBe(60_000);
    expect(ms(decidir(rl, agora, prazo, 2))).toBe(240_000);
    expect(ms(decidir(rl, agora, prazo, 10))).toBe(RATE_LIMIT_MAX_MS);
    expect(decidir(rl, agora, em(-1), 0)).toEqual({ acao: "expirar" });
  });
  it("timeout → adia 1× e depois falha", () => {
    const to = new ErroLlm("timeout", "litellm", null);
    expect(decidir(to, agora, prazo, 0).acao).toBe("adiar");
    expect(decidir(to, agora, prazo, 1)).toEqual({ acao: "falhar", classe: "timeout" });
  });
  it("auth | credito | teto | outro → falhar", () => {
    for (const c of ["auth", "credito", "teto", "outro", "cota_esgotada"] as const) {
      expect(decidir(new ErroLlm(c, "litellm", null), agora, prazo)).toEqual({ acao: "falhar", classe: c });
    }
    expect(decidir(Object.assign(new Error("invalid api key"), { status: 401 }), agora, prazo)).toEqual({ acao: "falhar", classe: "auth" });
  });
  it("expiraEm aceita string ISO; expiraEmDe = +24h", () => {
    expect(decidir(new PoolEsgotadoError(1000, [], null), agora, prazo.toISOString()).acao).toBe("adiar");
    expect(expiraEmDe(agora).getTime() - agora.getTime()).toBe(EXPIRA_MS);
  });
});

describe("aplicarDecisao (adoção no processor, fake BullMQ)", () => {
  class DelayedError extends Error {}
  const store = () => ({ adiar: vi.fn(async () => {}), expirar: vi.fn(async () => {}), falhar: vi.fn(async () => {}) });

  it("adiar → grava delayed, moveToDelayed(ate) e lança DelayedError", async () => {
    const s = store(); const job = { moveToDelayed: vi.fn(async () => {}) };
    const d = decidir(new PoolEsgotadoError(60_000, [], null), agora, prazo);
    await expect(aplicarDecisao(d, job, "tok", s, DelayedError)).rejects.toBeInstanceOf(DelayedError);
    expect(s.adiar).toHaveBeenCalledWith(em(60_000));
    expect(job.moveToDelayed).toHaveBeenCalledWith(em(60_000).getTime(), "tok");
    expect(s.expirar).not.toHaveBeenCalled(); expect(s.falhar).not.toHaveBeenCalled();
  });
  it("expirar → só grava expired e devolve 'expirado' (quem chama decide o aviso ao humano)", async () => {
    const s = store(); const job = { moveToDelayed: vi.fn(async () => {}) };
    expect(await aplicarDecisao({ acao: "expirar" }, job, undefined, s, DelayedError)).toBe("expirado");
    expect(s.expirar).toHaveBeenCalled(); expect(job.moveToDelayed).not.toHaveBeenCalled();
  });
  it("falhar → grava a classe", async () => {
    const s = store(); const job = { moveToDelayed: vi.fn(async () => {}) };
    expect(await aplicarDecisao({ acao: "falhar", classe: "auth" }, job, undefined, s, DelayedError)).toBe("falhou");
    expect(s.falhar).toHaveBeenCalledWith("auth");
  });
});
