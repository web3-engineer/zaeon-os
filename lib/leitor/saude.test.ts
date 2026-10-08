import { describe, it, expect, beforeEach, vi } from "vitest";
import { estadoLeitor, __resetLeitorParaTeste } from "./saude";

beforeEach(() => __resetLeitorParaTeste());
const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("estadoLeitor", () => {
  it("off sem LEITOR_PROXY_URL (zero fetch)", async () => {
    const f = vi.fn();
    expect(await estadoLeitor({ env: {}, fetchImpl: f as any })).toBe("off");
    expect(f).not.toHaveBeenCalled();
  });
  it("on com allowlist; degraded com allowlist vazia, erro ou HTTP ruim; cache 60s", async () => {
    let t = 0;
    const f = vi.fn(async () => resp({ ok: true, allow: 3 }));
    expect(await estadoLeitor({ env: { LEITOR_PROXY_URL: "http://p:8787" }, fetchImpl: f as any, agora: () => t })).toBe("on");
    expect(await estadoLeitor({ env: { LEITOR_PROXY_URL: "http://p:8787" }, fetchImpl: f as any, agora: () => t })).toBe("on");
    expect(f).toHaveBeenCalledTimes(1);
    __resetLeitorParaTeste();
    expect(await estadoLeitor({ env: { LEITOR_PROXY_URL: "http://p" }, fetchImpl: (async () => resp({ ok: true, allow: 0 })) as any })).toBe("degraded");
    __resetLeitorParaTeste();
    expect(await estadoLeitor({ env: { LEITOR_PROXY_URL: "http://p" }, fetchImpl: (async () => { throw new Error("ECONNREFUSED"); }) as any })).toBe("degraded");
  });
});
