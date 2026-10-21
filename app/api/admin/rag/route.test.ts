import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({
  admin: { ok: true, email: "a@x.com" } as any,
  ingerir: vi.fn(), listar: vi.fn(), remover: vi.fn(), buscar: vi.fn(),
  turmas: vi.fn(), usuario: vi.fn(), ragPg: vi.fn(),
}));
vi.mock("@/lib/admin/assertAdmin", () => ({ assertAdmin: async () => m.admin }));
vi.mock("@/src/lib/prisma", () => ({ prisma: { turma: { findMany: m.turmas }, user: { findUnique: m.usuario }, $runCommandRaw: vi.fn() } }));
vi.mock("@/lib/rag/ingerir", () => ({ ingerirPdf: m.ingerir }));
vi.mock("@/lib/queue/rag", () => ({ enfileirarIndexacao: vi.fn() }));
vi.mock("@/lib/scholar/pdf", () => ({ extractPdfStructured: vi.fn() }));
vi.mock("@/lib/rag/pg", async (orig) => ({ ...(await orig<typeof import("@/lib/rag/pg")>()), ragPg: m.ragPg }));
vi.mock("@/lib/rag/store", () => ({ listarDocumentos: m.listar, removerPermissao: m.remover, contarBase: vi.fn() }));
vi.mock("@/lib/rag/embed", () => ({ embedVertex: vi.fn() }));
vi.mock("@/lib/rag/busca", () => ({ buscar: m.buscar, K_PADRAO: 8 }));

import { GET, POST, DELETE } from "@/app/api/admin/rag/route";
import { POST as BUSCA } from "@/app/api/admin/rag/busca/route";

const pdf = (nome: string, tipo = "application/pdf") => new File([new Uint8Array([37, 80, 68, 70])], nome, { type: tipo });
const multipart = (turmaId: string, arquivos: File[]) => {
  const fd = new FormData();
  fd.set("turmaId", turmaId);
  for (const a of arquivos) fd.append("arquivos", a);
  return new Request("http://x/api/admin/rag", { method: "POST", body: fd });
};

beforeEach(() => {
  Object.values(m).forEach((f: any) => f?.mockReset?.());
  m.admin = { ok: true, email: "a@x.com" };
  m.ragPg.mockReturnValue({});
  m.ingerir.mockResolvedValue({ documentoId: "d1", status: "novo", trechos: 3, paginas: 2 });
  m.listar.mockResolvedValue([{ id: "d1", titulo: "T" }]);
  m.turmas.mockResolvedValue([{ id: "t1", name: "Turma 1" }]);
  m.usuario.mockResolvedValue({ id: "u-admin" });
  m.remover.mockResolvedValue("removida");
  m.buscar.mockResolvedValue([{ trechoId: "x", titulo: "T", paginaIni: 1, paginaFim: 2, texto: "...", documentoId: "d1", score: 1 }]);
});

describe("sem admin", () => {
  it.each([401, 403])("devolve %i em GET/POST/DELETE/busca e não ingere nada", async (status) => {
    m.admin = { ok: false, status };
    expect((await GET(new Request("http://x/api/admin/rag?turmaId=t1"))).status).toBe(status);
    expect((await POST(multipart("t1", [pdf("a.pdf")]))).status).toBe(status);
    expect((await DELETE(new Request("http://x/api/admin/rag?documentoId=d1&turmaId=t1", { method: "DELETE" }))).status).toBe(status);
    expect((await BUSCA(new Request("http://x/", { method: "POST", body: JSON.stringify({ turmaId: "t1", pergunta: "o que?" }) }))).status).toBe(status);
    expect(m.ingerir).not.toHaveBeenCalled();
    expect(m.remover).not.toHaveBeenCalled();
    expect(m.buscar).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/rag", () => {
  it("devolve turmas e documentos da turma", async () => {
    const r = await GET(new Request("http://x/api/admin/rag?turmaId=t1"));
    expect(await r.json()).toEqual({ turmas: [{ id: "t1", name: "Turma 1" }], documentos: [{ id: "d1", titulo: "T" }] });
    expect(m.listar.mock.calls[0][1]).toEqual({ turmaId: "t1" });
  });
});

describe("POST /api/admin/rag", () => {
  it("11 arquivos => 400 max_10_arquivos", async () => {
    const r = await POST(multipart("t1", Array.from({ length: 11 }, (_, i) => pdf(`${i}.pdf`))));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "max_10_arquivos" });
    expect(m.ingerir).not.toHaveBeenCalled();
  });
  it("2 PDFs => ingerirPdf 2x com permissao { turmaId } e origem admin", async () => {
    const r = await POST(multipart("t1", [pdf("a.pdf"), pdf("b.pdf")]));
    expect(r.status).toBe(200);
    expect(m.ingerir).toHaveBeenCalledTimes(2);
    for (const c of m.ingerir.mock.calls) expect(c[1]).toMatchObject({ permissao: { turmaId: "t1" }, origem: "admin", criadoPor: "u-admin" });
    const j = await r.json();
    expect(j.resultados.map((x: any) => x.nomeArquivo)).toEqual(["a.pdf", "b.pdf"]);
  });
  it("falha na ingestão => leitura_falhou para o arquivo e erro logado (sem derrubar o lote)", async () => {
    m.ingerir.mockRejectedValueOnce(new Error("db caiu"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const j = await (await POST(multipart("t1", [pdf("a.pdf"), pdf("b.pdf")]))).json();
    expect(j.resultados[0]).toMatchObject({ nomeArquivo: "a.pdf", status: "erro", erro: "leitura_falhou" });
    expect(j.resultados[1]).toMatchObject({ nomeArquivo: "b.pdf", status: "novo" });
    expect(log).toHaveBeenCalledWith("[rag/admin] ingestão falhou", "a.pdf", "db caiu");
    log.mockRestore();
  });
  it("não-PDF => erro nao_pdf sem ingerir; PDF por extensão aceito", async () => {
    const r = await POST(multipart("t1", [pdf("a.txt", "text/plain"), pdf("B.PDF", "application/octet-stream")]));
    const j = await r.json();
    expect(j.resultados[0]).toEqual({ nomeArquivo: "a.txt", status: "erro", erro: "nao_pdf" });
    expect(j.resultados[1]).toMatchObject({ nomeArquivo: "B.PDF", status: "novo" });
    expect(m.ingerir).toHaveBeenCalledTimes(1);
  });
  it("sem turmaId ou sem arquivos => 400", async () => {
    expect((await POST(multipart("", [pdf("a.pdf")]))).status).toBe(400);
    expect((await POST(multipart("t1", []))).status).toBe(400);
  });
});

describe("DELETE /api/admin/rag", () => {
  const DOC = "0b1f4c3e-8a52-4d6e-9c1a-2f3b4c5d6e7f";
  it("remove a permissão da turma", async () => {
    const r = await DELETE(new Request(`http://x/api/admin/rag?documentoId=${DOC}&turmaId=t1`, { method: "DELETE" }));
    expect(await r.json()).toEqual({ resultado: "removida" });
    expect(m.remover.mock.calls[0].slice(1)).toEqual([DOC, { turmaId: "t1" }]);
  });
  it("documento inexistente (erro do store) => 404 documento_inexistente", async () => {
    m.remover.mockRejectedValue(new Error(`documento ${DOC} não existe`));
    const r = await DELETE(new Request(`http://x/api/admin/rag?documentoId=${DOC}&turmaId=t1`, { method: "DELETE" }));
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: "documento_inexistente" });
  });
  it("outro erro => 500 falha_ao_remover (logado)", async () => {
    m.remover.mockRejectedValue(new Error("falha inesperada"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await DELETE(new Request(`http://x/api/admin/rag?documentoId=${DOC}&turmaId=t1`, { method: "DELETE" }));
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "falha_ao_remover" });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
  it.each(["d1", "xyz", "64b0000000000000000000d1", "0b1f4c3e-8a52-4d6e-9c1a-2f3b4c5d6e7z", "0b1f4c3e-8a52-4d6e-9c1a-2f3b4c5d6e7f0", "------------------------------------", "0b1f4c3e8a524d6e9c1a2f3b4c5d6e7f"])("documentoId malformado %s => 404 sem chamar o store", async (id) => {
    const r = await DELETE(new Request(`http://x/api/admin/rag?documentoId=${id}&turmaId=t1`, { method: "DELETE" }));
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: "documento_inexistente" });
    expect(m.remover).not.toHaveBeenCalled();
  });
  it("sem parâmetros => 400", async () => {
    expect((await DELETE(new Request("http://x/api/admin/rag?turmaId=t1", { method: "DELETE" }))).status).toBe(400);
  });
});

describe("POST /api/admin/rag/busca", () => {
  it("busca com escopo { userId: admin, turmaIds: [turmaId] }", async () => {
    const r = await BUSCA(new Request("http://x/", { method: "POST", body: JSON.stringify({ turmaId: "t1", pergunta: "o que?" }) }));
    const j = await r.json();
    expect(j.trechos).toHaveLength(1);
    expect(typeof j.ms).toBe("number");
    expect(m.buscar.mock.calls[0][1]).toEqual({ userId: "u-admin", turmaIds: ["t1"] });
    expect(m.buscar.mock.calls[0][2]).toBe("o que?");
  });
  it("pergunta/turma vazia => 400", async () => {
    expect((await BUSCA(new Request("http://x/", { method: "POST", body: JSON.stringify({ turmaId: "t1", pergunta: " " }) }))).status).toBe(400);
  });
});

describe("banco da base fora do ar => 503 banco_indisponivel", () => {
  const recusada = () => Object.assign(new Error("connect ECONNREFUSED 100.113.137.74:5432"), { code: "ECONNREFUSED" });
  const semEnv = () => { m.ragPg.mockImplementation(() => { throw new Error("RAG_PG_URL ausente"); }); };
  let log: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { log = vi.spyOn(console, "error").mockImplementation(() => {}); });
  afterEach(() => { log.mockRestore(); });
  const DOC = "0b1f4c3e-8a52-4d6e-9c1a-2f3b4c5d6e7f";
  const del = () => DELETE(new Request(`http://x/api/admin/rag?documentoId=${DOC}&turmaId=t1`, { method: "DELETE" }));
  const busca = () => BUSCA(new Request("http://x/", { method: "POST", body: JSON.stringify({ turmaId: "t1", pergunta: "o que?" }) }));

  it("GET: listar rejeita ECONNREFUSED => 503", async () => {
    m.listar.mockRejectedValue(recusada());
    const r = await GET(new Request("http://x/api/admin/rag?turmaId=t1"));
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "banco_indisponivel" });
    expect(log).toHaveBeenCalled();
  });
  it("GET: RAG_PG_URL ausente (ragPg lança) => 503", async () => {
    semEnv();
    const r = await GET(new Request("http://x/api/admin/rag?turmaId=t1"));
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "banco_indisponivel" });
  });
  it("GET: erro que não é de conexão continua sendo erro do servidor (não 503)", async () => {
    m.listar.mockRejectedValue(new Error("bug qualquer"));
    await expect(GET(new Request("http://x/api/admin/rag?turmaId=t1"))).rejects.toThrow("bug qualquer");
  });
  it("POST: ingerirPdf devolve erro banco_indisponivel => 503 (e não continua o lote)", async () => {
    m.ingerir.mockResolvedValue({ documentoId: "", status: "erro", erro: "banco_indisponivel", trechos: 0, paginas: 0 });
    const r = await POST(multipart("t1", [pdf("a.pdf"), pdf("b.pdf")]));
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ error: "banco_indisponivel" });
    expect(m.ingerir).toHaveBeenCalledTimes(1);
  });
  it("POST: RAG_PG_URL ausente (ragPg lança) => 503, não leitura_falhou", async () => {
    semEnv();
    const r = await POST(multipart("t1", [pdf("a.pdf")]));
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ error: "banco_indisponivel" });
    expect(log).toHaveBeenCalled();
  });
  it("POST: ingerirPdf lança ECONNREFUSED => 503", async () => {
    m.ingerir.mockRejectedValue(recusada());
    expect((await POST(multipart("t1", [pdf("a.pdf")]))).status).toBe(503);
  });
  it("POST: arquivos já ingeridos antes da queda continuam no corpo do 503", async () => {
    m.ingerir.mockResolvedValueOnce({ documentoId: "d1", status: "novo", trechos: 3, paginas: 2 });
    m.ingerir.mockRejectedValueOnce(recusada());
    const r = await POST(multipart("t1", [pdf("a.pdf"), pdf("b.pdf")]));
    expect(r.status).toBe(503);
    const j = await r.json();
    expect(j.error).toBe("banco_indisponivel");
    expect(j.resultados).toHaveLength(1);
    expect(j.resultados[0]).toMatchObject({ nomeArquivo: "a.pdf", status: "novo" });
  });
  it("DELETE: remover rejeita ECONNREFUSED => 503 (não falha_ao_remover)", async () => {
    m.remover.mockRejectedValue(recusada());
    const r = await del();
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "banco_indisponivel" });
    expect(log).toHaveBeenCalled();
  });
  it("DELETE: RAG_PG_URL ausente => 503", async () => {
    semEnv();
    expect((await del()).status).toBe(503);
  });
  it("busca: buscar rejeita ECONNREFUSED => 503", async () => {
    m.buscar.mockRejectedValue(recusada());
    const r = await busca();
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "banco_indisponivel" });
    expect(log).toHaveBeenCalled();
  });
  it("busca: RAG_PG_URL ausente => 503", async () => {
    semEnv();
    const r = await busca();
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "banco_indisponivel" });
  });
  it("busca: erro que não é de conexão propaga (500 do Next), não vira 503", async () => {
    m.buscar.mockRejectedValue(new Error("bug qualquer"));
    await expect(busca()).rejects.toThrow("bug qualquer");
  });
});
