import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ session: vi.fn(), userFind: vi.fn(), docFind: vi.fn(), docUpdate: vi.fn(), docCreate: vi.fn(), trigger: vi.fn(), get: vi.fn(), guard: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/src/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/src/lib/ratelimit", () => ({ guard: m.guard }));
vi.mock("@/src/lib/prisma", () => ({ prisma: { user: { findUnique: m.userFind, findMany: async () => [] }, collabDoc: { findUnique: m.docFind, update: m.docUpdate, create: m.docCreate, findMany: async () => [] } } }));
vi.mock("@/lib/collab/realtime", () => ({ triggerSafe: m.trigger, getPusher: () => ({ get: m.get, authorizeChannel: (s: string, c: string, d: any) => ({ auth: `${s}:${c}`, channel_data: JSON.stringify(d) }) }) }));

import { PATCH, GET } from "./[id]/route";
import { POST as CHAT } from "./[id]/chat/route";
import { POST as AUTH } from "./[id]/pusher-auth/route";

const ID = "0123456789abcdef01234567", ME = "aaaaaaaaaaaaaaaaaaaaaaaa", OUTRO = "bbbbbbbbbbbbbbbbbbbbbbbb";
const json = (b: unknown, method = "POST") => new Request("http://x/", { method, body: JSON.stringify(b), headers: { "Content-Type": "application/json" } });
const doc = (members = [ME]) => ({ id: ID, ownerId: ME, title: "Sala", kind: "lounge_canvas", content: JSON.stringify({ notes: [{ id: "n1", x: 0, z: 0, text: "velha" }], artifacts: [] }), members, token: "tok", updatedAt: new Date() });

describe("/api/lounge3d/[id]", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    process.env.LOUNGE_3D = "1";
    m.guard.mockResolvedValue({ ok: true });
    m.session.mockResolvedValue({ user: { email: "a@b.c" } });
    m.userFind.mockResolvedValue({ id: ME, name: "Ana", image: null });
  });

  it("sem flag a API responde (cyberespaço em produção); sem sessão → 401; não-membro → 404 (indistinguível de inexistente); kind errado → 404", async () => {
    delete process.env.LOUNGE_3D;
    m.session.mockResolvedValue(null);
    expect((await GET(new Request("http://x/"), { params: { id: ID } })).status).toBe(401);
    m.session.mockResolvedValue({ user: { email: "a@b.c" } });
    m.docFind.mockResolvedValue(doc([OUTRO]));
    expect((await GET(new Request("http://x/"), { params: { id: ID } })).status).toBe(404);
    m.docFind.mockResolvedValue({ ...doc(), kind: "study" });
    expect((await GET(new Request("http://x/"), { params: { id: ID } })).status).toBe(404);
  });

  it("GET devolve conteúdo saneado; token só pro dono", async () => {
    m.docFind.mockResolvedValue(doc([ME, OUTRO]));
    const d = await (await GET(new Request("http://x/"), { params: { id: ID } })).json();
    expect(d.sala.conteudo.notes[0].text).toBe("velha"); expect(d.sala.token).toBe("tok"); expect(d.eu.id).toBe(ME);
    m.docFind.mockResolvedValue({ ...doc([ME, OUTRO]), ownerId: OUTRO });
    expect((await (await GET(new Request("http://x/"), { params: { id: ID } })).json()).sala.token).toBeNull();
  });

  it("PATCH aplica por item, força autorId da SESSÃO, persiste e avisa a sala", async () => {
    m.docFind.mockResolvedValue(doc()); m.docUpdate.mockImplementation(async (a: any) => ({ title: a.data.title }));
    const r = await PATCH(json({ upsertNotes: [{ id: "n2", x: 1, z: 1, text: "nova", autorId: OUTRO }], removeNotes: ["n1"], title: "<b>Sala 2</b>" }, "PATCH"), { params: { id: ID } });
    const d = await r.json();
    expect(d.conteudo.notes).toEqual([{ id: "n2", x: 1, z: 1, kind: "nota", src: "Você", text: "nova", autorId: ME }]);
    expect(JSON.parse(m.docUpdate.mock.calls[0]![0].data.content).notes).toHaveLength(1);
    expect(m.trigger).toHaveBeenCalledWith(`presence-lounge3d-${ID}`, "conteudo", expect.objectContaining({ fromUserId: ME }));
  });

  it("chat: sanitiza, identidade da sessão, difunde; vazio → 400", async () => {
    m.docFind.mockResolvedValue(doc());
    expect((await CHAT(json({ texto: "   " }), { params: { id: ID } })).status).toBe(400);
    const d = await (await CHAT(json({ texto: "oi\u0000 <script>x</script>", userId: OUTRO, name: "hacker" }), { params: { id: ID } })).json();
    expect(d.msg).toMatchObject({ userId: ME, name: "Ana", texto: "oi <script>x</script>" }); // texto é dado; a UI renderiza como texto
    expect(m.trigger).toHaveBeenCalledWith(`presence-lounge3d-${ID}`, "chat", expect.objectContaining({ userId: ME }));
  });

  it("pusher-auth: canal de outra sala → 400; não-membro → 404; 5 dentro → 403 cheia; dentro reconecta; ok → auth com nome/cor", async () => {
    const form = (ch: string) => new Request("http://x/", { method: "POST", body: `socket_id=1.2&channel_name=${ch}`, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    m.docFind.mockResolvedValue(doc());
    expect((await AUTH(form(`presence-lounge3d-${OUTRO}`), { params: { id: ID } })).status).toBe(400);
    m.docFind.mockResolvedValue(doc([OUTRO]));
    expect((await AUTH(form(`presence-lounge3d-${ID}`), { params: { id: ID } })).status).toBe(404);
    m.docFind.mockResolvedValue(doc());
    m.get.mockResolvedValue({ ok: true, json: async () => ({ users: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }] }) });
    const cheia = await AUTH(form(`presence-lounge3d-${ID}`), { params: { id: ID } });
    expect(cheia.status).toBe(403); expect((await cheia.json()).motivo).toBe("cheia");
    m.get.mockResolvedValue({ ok: true, json: async () => ({ users: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: ME }] }) });
    expect((await AUTH(form(`presence-lounge3d-${ID}`), { params: { id: ID } })).status).toBe(200);
    m.get.mockResolvedValue({ ok: false, json: async () => ({}) }); // Pusher REST fora: não bloqueia a entrada
    const ok = await (await AUTH(form(`presence-lounge3d-${ID}`), { params: { id: ID } })).json();
    expect(JSON.parse(ok.channel_data)).toMatchObject({ user_id: ME, user_info: { name: "Ana" } });
  });
});
