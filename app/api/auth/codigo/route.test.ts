/** #686: a rota que manda o código — mesma resposta com ou sem conta, espera entre envios, admin não recebe. */
import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  preparar: vi.fn(),
  enviar: vi.fn(),
  soGoogle: vi.fn(),
}));
vi.mock("@/src/lib/ratelimit", () => ({ guard: async () => ({ ok: true }) }));
vi.mock("@/src/lib/auth", () => ({ entraSoPeloGoogle: m.soGoogle }));
vi.mock("@/lib/email", () => ({ enviarCodigoLogin: m.enviar }));
vi.mock("@/lib/auth/codigoLogin", async (orig) => ({ ...(await orig<typeof import("@/lib/auth/codigoLogin")>()), colecaoCodigos: async () => ({}), prepararCodigo: m.preparar }));
import { POST } from "./route";

const post = (b: unknown) => POST(new Request("http://x/api/auth/codigo", { method: "POST", body: JSON.stringify(b) }));
beforeEach(() => {
  m.preparar.mockReset().mockResolvedValue({ ok: true, codigo: "123456" });
  m.enviar.mockReset().mockResolvedValue(true);
  m.soGoogle.mockReset().mockResolvedValue(false);
});

describe("POST /api/auth/codigo", () => {
  it("manda o código para o e-mail digitado, limpo", async () => {
    const r = await post({ email: "  Ana@Zaeon.com " });
    expect(r.status).toBe(200);
    expect(m.enviar).toHaveBeenCalledWith("ana@zaeon.com", "123456");
  });
  it("e-mail inválido: 400, e nada é mandado", async () => {
    expect((await post({ email: "ana" })).status).toBe(400);
    expect(m.enviar).not.toHaveBeenCalled();
  });
  it("fundador/admin: responde igual, mas não manda código", async () => {
    m.soGoogle.mockResolvedValue(true);
    const r = await post({ email: "dono@zaeon.com" });
    expect(await r.json()).toEqual({ ok: true });
    expect(m.preparar).not.toHaveBeenCalled();
    expect(m.enviar).not.toHaveBeenCalled();
  });
  it("pediu cedo demais: 429 com a espera, e nada é mandado", async () => {
    m.preparar.mockResolvedValue({ ok: false, motivo: "espera", esperaS: 42 });
    const r = await post({ email: "ana@zaeon.com" });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ ok: false, esperaS: 42 });
    expect(m.enviar).not.toHaveBeenCalled();
  });
  it("o e-mail não saiu: 502", async () => {
    m.enviar.mockResolvedValue(false);
    expect((await post({ email: "ana@zaeon.com" })).status).toBe(502);
  });
});
