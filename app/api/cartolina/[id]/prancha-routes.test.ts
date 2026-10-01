import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  userId: "u1" as string | null, board: null as any, patch: vi.fn(), gemini: vi.fn(),
  imagen: true, gerarImg: vi.fn(), artCreate: vi.fn(), artUpdate: vi.fn(), artFind: vi.fn(), write: vi.fn(), read: vi.fn(),
}));
vi.mock("@/src/lib/ratelimit", () => ({ guard: async () => ({ ok: true }) }));
vi.mock("@/lib/agent/transcript", () => ({ resolveUserId: async () => m.userId }));
vi.mock("@/lib/cartolina/store", async (o) => ({ ...(await o<any>()), getBoardForUser: async () => m.board, patchBoard: m.patch }));
vi.mock("@/lib/scholar/gemini", () => ({ geminiJson: m.gemini }));
vi.mock("@/lib/studio/imagen", () => ({ imagenAvailable: () => m.imagen, generateImage: m.gerarImg }));
vi.mock("@/lib/studio/storage", () => ({ writeStudioFile: m.write, readStudioFile: m.read }));
vi.mock("@/src/lib/prisma", () => ({ prisma: { studioArtifact: { create: m.artCreate, update: m.artUpdate, findUnique: m.artFind } } }));

import { POST as DESENHAR } from "@/app/api/cartolina/[id]/prancha/route";
import { GET as IMAGEM } from "@/app/api/cartolina/[id]/imagem/[artId]/route";

const ART = "a".repeat(24);
const prancha = { id: "p1", tipo: "prancha", legenda: "ciclo da água", x: 0, y: 0, w: 300 };
const desenhoBom = { desenhavel: true, primitivas: [
  { t: "circulo", c: [50, 40], r: 16 }, { t: "seta", de: [60, 60], ate: [130, 150] }, { t: "linha", de: [0, 0], ate: [9, 9] },
] };
const post = (body: any) => DESENHAR(new Request("http://x/", { method: "POST", body: JSON.stringify(body) }), { params: { id: "b1" } });

beforeEach(() => {
  process.env.CARTOLINA_MEMORIA = "1"; process.env.CADERNO_ENABLED = "1"; m.userId = "u1"; m.imagen = true;
  m.board = { id: "b1", titulo: "T", papel: "editor", cards: [prancha, { id: "n1", tipo: "nota", x: 0, y: 0, w: 300 }] };
  Object.values(m).forEach((f: any) => f?.mockReset?.());
  m.patch.mockImplementation(async (_id: string, _u: string, ops: any) => ({ ok: true, board: { cards: ops.upsert } }));
  m.artCreate.mockResolvedValue({ id: ART });
  m.artUpdate.mockResolvedValue({});
});

describe("POST /:id/prancha", () => {
  it("flag CADERNO_ENABLED off = 404", async () => {
    delete process.env.CADERNO_ENABLED;
    expect((await post({ cardId: "p1" })).status).toBe(404);
  });
  it("sem sessão 401; sem acesso 404; leitor 403; card inexistente/não-prancha 400", async () => {
    m.userId = null; expect((await post({ cardId: "p1" })).status).toBe(401);
    m.userId = "u1"; m.board = null; expect((await post({ cardId: "p1" })).status).toBe(404);
    m.board = { cards: [prancha], papel: "leitor" }; expect((await post({ cardId: "p1" })).status).toBe(403);
    m.board.papel = "editor";
    expect((await post({ cardId: "zz" })).status).toBe(400);
    m.board.cards.push({ id: "n1", tipo: "nota", x: 0, y: 0, w: 1 });
    expect((await post({ cardId: "n1" })).status).toBe(400);
    expect(m.gemini).not.toHaveBeenCalled();
  });
  it("desenho bom → primitivas gravadas no card", async () => {
    m.gemini.mockResolvedValue(desenhoBom);
    const r = await post({ cardId: "p1" });
    expect(r.status).toBe(200);
    const { card } = await r.json();
    expect(card.desenho.primitivas).toHaveLength(3);
    expect(m.gemini.mock.calls[0][1]).toMatch(/ciclo da água/);
  });
  it("não desenhável → imagem gerada, artefato ligado ao card", async () => {
    m.gemini.mockResolvedValue({ desenhavel: false, promptImagem: "portrait" });
    m.gerarImg.mockResolvedValue({ data: Buffer.from("png").toString("base64"), mimeType: "image/png" });
    const { card } = await (await post({ cardId: "p1" })).json();
    expect(card.imagemId).toBe(ART);
    expect(m.gerarImg).toHaveBeenCalledWith("portrait");
    expect(m.write).toHaveBeenCalledWith(ART, "png", expect.any(Buffer));
    expect(m.artCreate.mock.calls[0][0].data.ownerId).toBe("u1");
  });
  it("fallback sem Imagen = 503; Imagen falhou = 502 e artefato marcado como erro", async () => {
    m.gemini.mockResolvedValue({ desenhavel: false });
    m.imagen = false;
    expect((await post({ cardId: "p1" })).status).toBe(503);
    m.imagen = true; m.gerarImg.mockResolvedValue(null);
    expect((await post({ cardId: "p1" })).status).toBe(502);
    expect(m.artUpdate.mock.calls.at(-1)![0].data.status).toBe("error");
    expect(m.patch).not.toHaveBeenCalled();
  });
  it("LLM caiu → 502 amigável, nada gravado", async () => {
    m.gemini.mockRejectedValue(new Error("vertex 404"));
    const r = await post({ cardId: "p1" });
    expect(r.status).toBe(502);
    expect((await r.json()).error).not.toMatch(/vertex/);
    expect(m.patch).not.toHaveBeenCalled();
  });
  it("conflito ao gravar propaga o status", async () => {
    m.gemini.mockResolvedValue(desenhoBom);
    m.patch.mockResolvedValue({ ok: false, reason: "conflict" });
    expect((await post({ cardId: "p1" })).status).toBe(409);
  });
});

describe("GET /:id/imagem/:artId (acesso pelo BOARD)", () => {
  const get = (art = ART) => IMAGEM(new Request("http://x/"), { params: { id: "b1", artId: art } });
  beforeEach(() => {
    m.board = { cards: [{ ...prancha, imagemId: ART }], papel: "leitor" };
    m.artFind.mockResolvedValue({ kind: "image", status: "done", mime: "image/png", storageRef: "png" });
    m.read.mockResolvedValue(Buffer.from("PNG"));
  });
  it("membro (até leitor) vê a imagem que um card referencia", async () => {
    const r = await get();
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/png");
    expect(r.headers.get("cache-control")).toMatch(/private/);
  });
  it("IDOR: artefato que NENHUM card do board referencia = 404 (não vira proxy)", async () => {
    expect((await get("b".repeat(24))).status).toBe(404);
    expect(m.artFind).not.toHaveBeenCalled();
  });
  it("sem acesso ao board = 404; artefato não pronto/não imagem = 404; arquivo sumiu = 404", async () => {
    m.board = null; expect((await get()).status).toBe(404);
    m.board = { cards: [{ ...prancha, imagemId: ART }], papel: "editor" };
    m.artFind.mockResolvedValueOnce({ kind: "podcast", status: "done", storageRef: "mp3" }); expect((await get()).status).toBe(404);
    m.artFind.mockResolvedValueOnce({ kind: "image", status: "running" }); expect((await get()).status).toBe(404);
    m.read.mockRejectedValueOnce(new Error("ENOENT")); expect((await get()).status).toBe(404);
  });
});
