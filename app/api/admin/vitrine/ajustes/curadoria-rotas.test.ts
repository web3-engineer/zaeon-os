import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ upsert: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn(), write: vi.fn(), read: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { email: "qualquer@x.com", role: "user" } }) }));
vi.mock("@/src/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/src/lib/prisma", () => ({ prisma: { vitrineAjuste: { upsert: m.upsert, findMany: m.findMany, deleteMany: m.deleteMany } } }));
vi.mock("@/lib/studio/storage", () => ({ writeStudioFile: m.write, readStudioFile: m.read }));

import { PUT, DELETE } from "@/app/api/admin/vitrine/ajustes/route";
import { POST as SUBIR } from "@/app/api/admin/vitrine/imagem/route";
import { GET as FOTO } from "@/app/api/estudos/vitrine/imagem/[arq]/route";

const TOKEN = "k".repeat(40);
const auth = { authorization: `Bearer ${TOKEN}` };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  process.env.ORQUESTRA_CONSOLE_TOKEN = TOKEN;
  m.upsert.mockImplementation(async ({ create }: any) => create);
});

describe("ajustes da curadoria", () => {
  it("sem super-admin nem token: 401 e nada muda", async () => {
    const r = await PUT(new Request("http://x", { method: "PUT", body: JSON.stringify({ itemId: "ps5-rev", oculto: true }) }));
    expect(r.status).toBe(401);
    expect(m.upsert).not.toHaveBeenCalled();
  });

  it("PUT faz upsert pelo itemId só com os campos que vieram", async () => {
    const r = await PUT(new Request("http://x", { method: "PUT", headers: auth, body: JSON.stringify({ itemId: "ps5-rev", tags: ["a", "b"], oculto: true }) }));
    expect(r.status).toBe(200);
    expect(m.upsert.mock.calls[0][0]).toMatchObject({ where: { itemId: "ps5-rev" }, create: { itemId: "ps5-rev", tags: ["a", "b"], oculto: true }, update: { tags: ["a", "b"], oculto: true } });
  });

  it("PUT com foto de fora: 400", async () => {
    const r = await PUT(new Request("http://x", { method: "PUT", headers: auth, body: JSON.stringify({ itemId: "ps5-rev", imagem: "https://x.com/a.png" }) }));
    expect(r.status).toBe(400);
  });

  it("DELETE restaura o original", async () => {
    const r = await DELETE(new Request("http://x?itemId=ps5-rev", { method: "DELETE", headers: auth }));
    expect(r.status).toBe(200);
    expect(m.deleteMany).toHaveBeenCalledWith({ where: { itemId: "ps5-rev" } });
  });
});

describe("a foto", () => {
  const subir = (bytes: Uint8Array, headers: Record<string, string> = auth) => {
    const fd = new FormData(); fd.append("file", new Blob([bytes as BlobPart], { type: "image/png" }), "x.png");
    return SUBIR(new Request("http://x", { method: "POST", body: fd, headers }));
  };

  it("sobe um PNG de verdade com nome pelo hash do conteúdo", async () => {
    const r = await subir(PNG);
    expect(r.status).toBe(201);
    const { url } = await r.json();
    expect(url).toMatch(/^\/api\/estudos\/vitrine\/imagem\/vimg_[a-f0-9]{32}\.png$/);
    expect(m.write.mock.calls[0][1]).toBe("png");
  });

  it("recusa SVG/HTML mesmo dizendo que é PNG; sem login: 401", async () => {
    expect((await subir(new TextEncoder().encode("<svg onload=alert(1)></svg>"))).status).toBe(415);
    expect((await subir(PNG, {})).status).toBe(401);
    expect(m.write).not.toHaveBeenCalled();
  });

  it("servir: só nomes do upload (sem path traversal), com nosniff e cache longo", async () => {
    expect((await FOTO(new Request("http://x"), { params: { arq: "../../etc/passwd" } })).status).toBe(400);
    m.read.mockResolvedValue(Buffer.from(PNG));
    const r = await FOTO(new Request("http://x"), { params: { arq: `vimg_${"ab".repeat(16)}.png` } });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/png");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("cache-control")).toContain("immutable");
  });
});
