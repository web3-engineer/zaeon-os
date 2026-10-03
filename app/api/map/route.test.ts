import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ user: vi.fn(), guard: vi.fn(), findMapa: vi.fn(), conv: vi.fn(), enqueue: vi.fn(), process: vi.fn(), getMapaForUser: vi.fn() }));
vi.mock("@/lib/agent/transcript", () => ({ resolveUserId: m.user }));
vi.mock("@/src/lib/ratelimit", () => ({ guard: m.guard }));
vi.mock("@/lib/map/store", () => ({ findOwnMapa: m.findMapa, getMapaForUser: m.getMapaForUser }));
vi.mock("@/lib/map/queue", async (o) => ({ ...(await o<any>()), enqueueGenerateMap: m.enqueue, processCerebroJob: m.process }));
vi.mock("@/src/lib/prisma", () => ({ prisma: { conversation: { findFirst: m.conv } } }));
vi.mock("@/lib/collab/realtime", () => ({ getPusher: () => ({ authorizeChannel: (s: string, c: string) => ({ auth: `${s}:${c}` }) }) }));

import { GET } from "./route";
import { POST as GENERATE } from "./generate/route";
import { POST as AUTH } from "./pusher-auth/route";

const req = (url: string, init?: RequestInit) => new Request(`http://x${url}`, init);
const json = (b: unknown, headers: Record<string, string> = {}) => ({ method: "POST", body: JSON.stringify(b), headers: { "Content-Type": "application/json", ...headers } });

describe("/api/map", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    process.env.MAP_HARNESS = "1";
    m.guard.mockResolvedValue({ ok: true }); m.user.mockResolvedValue("u1");
  });

  it("flag off → 404; sem sessão → 401; scopeId inválido → 400", async () => {
    delete process.env.MAP_HARNESS;
    expect((await GET(req("/api/map?scopeId=t1"))).status).toBe(404);
    process.env.MAP_HARNESS = "1"; m.user.mockResolvedValue(null);
    expect((await GET(req("/api/map?scopeId=t1"))).status).toBe(401);
    m.user.mockResolvedValue("u1");
    expect((await GET(req("/api/map?scopeId=a%20b"))).status).toBe(400);
  });

  it("GET devolve mapa + estado da bolinha (sugerida sem mapa; ativa com backbone)", async () => {
    m.findMapa.mockResolvedValue(null); m.conv.mockResolvedValue({ estudavel: true, tituloSugerido: "Solo", mapaId: null });
    let d = await (await GET(req("/api/map?scopeId=t1"))).json();
    expect(d).toMatchObject({ mapa: null, estudavel: true, tituloSugerido: "Solo", estado: "sugerida" });
    m.findMapa.mockResolvedValue({ id: "m1", backbone: ["a", "b", "c"] }); m.conv.mockResolvedValue(null);
    d = await (await GET(req("/api/map?scopeId=t1"))).json();
    expect(d.estado).toBe("ativa");
    expect(m.findMapa).toHaveBeenCalledWith("u1", "estudos", "t1"); // userId da SESSÃO, nunca do cliente
  });

  it("generate: mapa pronto → 200 pronto; sem tópico → 400; enfileira (202) ou roda inline", async () => {
    m.findMapa.mockResolvedValue({ id: "m1", backbone: ["a"], titulo: "T", nos: [] });
    expect(await (await GENERATE(req("/api/map/generate", json({ scopeId: "t1" })))).json()).toMatchObject({ pronto: true, mapaId: "m1" });
    m.findMapa.mockResolvedValue(null); m.conv.mockResolvedValue(null);
    expect((await GENERATE(req("/api/map/generate", json({ scopeId: "t1" })))).status).toBe(400);
    m.conv.mockResolvedValue({ tituloSugerido: "Solo", title: null }); m.enqueue.mockResolvedValue(true);
    const r = await GENERATE(req("/api/map/generate", json({ scopeId: "t1" })));
    expect(r.status).toBe(202); expect(await r.json()).toMatchObject({ enfileirado: true, jobId: "u1:t1" });
    expect(m.enqueue.mock.calls[0][0]).toMatchObject({ userId: "u1", scopeId: "t1", topico: "Solo" });
    m.enqueue.mockResolvedValue(false); m.process.mockResolvedValue({ mapaId: "m2" });
    const r2 = await GENERATE(req("/api/map/generate", json({ scopeId: "t1", topico: "Enzimas" })));
    expect((await r2.json()).enfileirado).toBe(false);
    expect(m.process.mock.calls[0][0]).toMatchObject({ topico: "Enzimas" });
  });

  it("pusher-auth: só dono/membro do mapa; canal inválido → 400; sem acesso → 404", async () => {
    const id = "0123456789abcdef01234567";
    const form = (ch: string) => ({ method: "POST", body: `socket_id=1.2&channel_name=${ch}`, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    expect((await AUTH(req("/api/map/pusher-auth", form("private-cerebro-zz")))).status).toBe(400);
    m.getMapaForUser.mockResolvedValue(null);
    expect((await AUTH(req("/api/map/pusher-auth", form(`private-cerebro-${id}`)))).status).toBe(404);
    m.getMapaForUser.mockResolvedValue({ mapa: { id }, papel: "leitor" });
    const r = await AUTH(req("/api/map/pusher-auth", form(`private-cerebro-${id}`)));
    expect(r.status).toBe(200); expect(await r.json()).toEqual({ auth: `1.2:private-cerebro-${id}` });
    expect(m.getMapaForUser).toHaveBeenCalledWith(id, "u1");
  });
});
