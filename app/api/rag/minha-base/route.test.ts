import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  userId: "u1" as string | null,
  ingerir: vi.fn(), ingerirTexto: vi.fn(), listar: vi.fn(), remover: vi.fn(), buscarPorId: vi.fn(), contar: vi.fn(), ragPg: vi.fn(),
}));
vi.mock("@/lib/agent/transcript", () => ({ resolveUserId: async () => m.userId }));
vi.mock("@/lib/rag/ingerir", () => ({ ingerirPdf: m.ingerir, ingerirTexto: m.ingerirTexto }));
vi.mock("@/lib/queue/rag", () => ({ enfileirarIndexacao: vi.fn() }));
vi.mock("@/lib/scholar/pdf", () => ({ extractPdfStructured: vi.fn() }));
vi.mock("@/lib/rag/pg", async (orig) => ({ ...(await orig<typeof import("@/lib/rag/pg")>()), ragPg: m.ragPg }));
vi.mock("@/lib/rag/store", () => ({
  listarDocumentos: m.listar, removerPermissao: m.remover, buscarPorId: m.buscarPorId, contarEnviadosPessoais: m.contar,
}));

import { GET, POST, DELETE } from "@/app/api/rag/minha-base/route";
import { LIMITE_PESSOAL } from "@/lib/rag/minhaBase";

const DOC = "11111111-2222-4333-8444-555555555555";
const pdf = (nome: string, tipo = "application/pdf") => new File([new Uint8Array([37, 80, 68, 70])], nome, { type: tipo });
const multipart = (arquivos: File[], extra: Record<string, string> = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  for (const a of arquivos) fd.append("arquivos", a);
  return new Request("http://x/api/rag/minha-base", { method: "POST", body: fd });
};
const apagar = (id: string) => new Request(`http://x/api/rag/minha-base?documentoId=${id}`, { method: "DELETE" });
const quedaDoBanco = () => Object.assign(new Error("connect ECONNREFUSED 100.113.137.74:5432"), { code: "ECONNREFUSED" });

beforeEach(() => {
  Object.values(m).forEach((f: any) => f?.mockReset?.());
  m.userId = "u1";
  m.ragPg.mockReturnValue({});
  m.contar.mockResolvedValue(0);
  m.ingerir.mockResolvedValue({ documentoId: DOC, status: "novo", trechos: 3, paginas: 2 });
  m.ingerirTexto.mockResolvedValue({ documentoId: DOC, status: "novo", trechos: 2, paginas: 1 });
  m.listar.mockResolvedValue([{ id: DOC, titulo: "Apostila", nomeArquivo: "apostila.pdf", paginas: 2, status: "pronto", erro: null, createdAt: "x", hash: "h", donoIds: ["u1"], turmaIds: [] }]);
  m.buscarPorId.mockResolvedValue({ id: DOC, donoIds: ["u1"], turmaIds: [] });
  m.remover.mockResolvedValue("documento_apagado");
});

describe("sem sessão", () => {
  it("401 em GET/POST/DELETE e não toca na base", async () => {
    m.userId = null;
    expect((await GET()).status).toBe(401);
    expect((await POST(multipart([pdf("a.pdf")]))).status).toBe(401);
    expect((await DELETE(apagar(DOC))).status).toBe(401);
    expect(m.ingerir).not.toHaveBeenCalled();
    expect(m.remover).not.toHaveBeenCalled();
  });
});

describe("GET", () => {
  it("lista só os da pessoa, sem hash/permissões, com o teto", async () => {
    const r = await (await GET()).json();
    expect(m.listar.mock.calls[0][1]).toEqual({ donoId: "u1" });
    expect(r.limite).toBe(LIMITE_PESSOAL);
    expect(r.enviados).toBe(0);
    expect(r.documentos).toEqual([{ id: DOC, titulo: "Apostila", nomeArquivo: "apostila.pdf", paginas: 2, status: "pronto", erro: null, createdAt: "x" }]);
  });
  it("banco fora ⇒ 503", async () => {
    m.listar.mockRejectedValue(quedaDoBanco());
    expect((await GET()).status).toBe(503);
  });
});

describe("POST", () => {
  it("vários PDFs: cada um vai pra base PESSOAL da sessão (origem chat), turmaId do cliente é ignorado", async () => {
    const r = await (await POST(multipart([pdf("a.pdf"), pdf("b.PDF", "")], { turmaId: "t-alheia", donoId: "u2" }))).json();
    expect(r.resultados).toHaveLength(2);
    for (const call of m.ingerir.mock.calls) {
      expect(call[1].permissao).toEqual({ donoId: "u1" });
      expect(call[1].origem).toBe("chat");
      expect(call[1].criadoPor).toBe("u1");
    }
    expect(r.resultados[0]).toMatchObject({ nomeArquivo: "a.pdf", status: "novo", paginas: 2 });
  });

  // MUDANÇA DE COMPORTAMENTO DESTA PR: .txt/.md deixaram de ser recusados na porta. O código de
  // erro de um formato que não lemos virou `nao_suportado` — "não é PDF" deixou de ser verdade aqui.
  it("formato que não lemos vira erro daquele arquivo, o resto segue", async () => {
    const r = await (await POST(multipart([pdf("foto.png", "image/png"), pdf("a.pdf")]))).json();
    expect(r.resultados.map((x: any) => x.erro ?? x.status)).toEqual(["nao_suportado", "novo"]);
    expect(m.ingerir).toHaveBeenCalledTimes(1);
    expect(m.ingerirTexto).not.toHaveBeenCalled();
  });

  it("ACEITA .txt e .md, pelo caminho de texto, com os blocos da estrutura do arquivo", async () => {
    const md = new File(["# Membranas\n\n## Estado da Arte\n\nCorpo do texto."], "notas.md", { type: "text/markdown" });
    const txt = new File(["linha um\n\nlinha dois"], "anotacoes.txt", { type: "" });
    const r = await (await POST(multipart([md, txt]))).json();
    expect(r.resultados.map((x: any) => x.erro ?? x.status)).toEqual(["novo", "novo"]);
    expect(m.ingerir).not.toHaveBeenCalled();          // não passa pelo pdf-loader
    expect(m.ingerirTexto).toHaveBeenCalledTimes(2);

    const [, entradaMd] = m.ingerirTexto.mock.calls[0];
    expect(entradaMd.titulo).toBe("Membranas");          // o `# h1` dá o título
    expect(entradaMd.chave).toBe("notas.md");
    expect(entradaMd.permissao).toEqual({ donoId: "u1" }); // base PESSOAL, nunca turma
    expect(entradaMd.origem).toBe("chat");
    // a estrutura sobrevive: o `## ` virou heading de nível 2, não parágrafo
    expect(entradaMd.blocos).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "heading", level: 2, text: "Estado da Arte" }),
    ]));

    const [, entradaTxt] = m.ingerirTexto.mock.calls[1];
    expect(entradaTxt.titulo).toBe("anotacoes");         // sem h1: cai no nome do arquivo
  });

  it("o teto da base vale igual pra texto (não é porta de fuga do limite)", async () => {
    m.contar.mockResolvedValue(LIMITE_PESSOAL);
    const r = await (await POST(multipart([new File(["x"], "a.md", { type: "text/markdown" })]))).json();
    expect(r.resultados[0].erro).toBe("limite_base");
    expect(m.ingerirTexto).not.toHaveBeenCalled();
  });

  it("no teto recusa com limite_base e não ingere (conta a cada arquivo)", async () => {
    m.contar.mockResolvedValueOnce(LIMITE_PESSOAL - 1).mockResolvedValueOnce(LIMITE_PESSOAL);
    const r = await (await POST(multipart([pdf("a.pdf"), pdf("b.pdf")]))).json();
    expect(r.resultados.map((x: any) => x.erro ?? x.status)).toEqual(["novo", "limite_base"]);
    expect(m.ingerir).toHaveBeenCalledTimes(1);
  });

  it("sem arquivo ⇒ 400; mais de 10 ⇒ 400", async () => {
    expect((await POST(multipart([]))).status).toBe(400);
    expect((await POST(multipart(Array.from({ length: 11 }, (_, i) => pdf(`${i}.pdf`))))).status).toBe(400);
  });

  it("banco fora no meio ⇒ 503 com o que já foi", async () => {
    m.ingerir.mockResolvedValueOnce({ documentoId: DOC, status: "novo", trechos: 1, paginas: 1 })
      .mockResolvedValueOnce({ documentoId: "", status: "erro", erro: "banco_indisponivel", trechos: 0, paginas: 0 });
    const r = await POST(multipart([pdf("a.pdf"), pdf("b.pdf"), pdf("c.pdf")]));
    expect(r.status).toBe(503);
    expect((await r.json()).resultados).toHaveLength(1);
  });

  it("ingestão lançando (não-banco) vira leitura_falhou só daquele arquivo", async () => {
    m.ingerir.mockRejectedValueOnce(new Error("boom"));
    const r = await (await POST(multipart([pdf("a.pdf"), pdf("b.pdf")]))).json();
    expect(r.resultados.map((x: any) => x.erro ?? x.status)).toEqual(["leitura_falhou", "novo"]);
  });
});

describe("DELETE", () => {
  it("tira a permissão da pessoa", async () => {
    const r = await DELETE(apagar(DOC));
    expect(await r.json()).toEqual({ resultado: "documento_apagado" });
    expect(m.remover.mock.calls[0].slice(1)).toEqual([DOC, { donoId: "u1" }]);
  });
  it("documento de outra pessoa (ou só da turma) ⇒ 404, nada removido", async () => {
    m.buscarPorId.mockResolvedValue({ id: DOC, donoIds: ["u2"], turmaIds: ["t1"] });
    expect((await DELETE(apagar(DOC))).status).toBe(404);
    expect(m.remover).not.toHaveBeenCalled();
  });
  it("id malformado ou inexistente ⇒ 404; sem id ⇒ 400", async () => {
    expect((await DELETE(apagar("abc"))).status).toBe(404);
    m.buscarPorId.mockResolvedValue(null);
    expect((await DELETE(apagar(DOC))).status).toBe(404);
    expect((await DELETE(new Request("http://x/api/rag/minha-base", { method: "DELETE" }))).status).toBe(400);
    expect(m.remover).not.toHaveBeenCalled();
  });
});
