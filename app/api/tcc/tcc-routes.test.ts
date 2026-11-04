import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  userId: "u1" as string | null,
  rl: { ok: true } as any,
  findTcc: vi.fn(), listar: vi.fn(), criar: vi.fn(), getTcc: vi.fn(), sugestoes: vi.fn(), aplicar: vi.fn(), sugerir: vi.fn(),
  decidir: vi.fn(), historico: vi.fn(), desfazer: vi.fn(), gerar: vi.fn(), card: vi.fn(), lapidar: vi.fn(),
}));
vi.mock("@/src/lib/ratelimit", () => ({ guard: async () => m.rl }));
vi.mock("@/lib/agent/transcript", () => ({ resolveUserId: async () => m.userId }));
vi.mock("@/lib/tcc/store", async (orig) => ({
  ...(await orig<any>()),
  findTccDoEscopo: m.findTcc, listarTrabalhosDoEscopo: m.listar, criarTcc: m.criar, getTccForUser: m.getTcc, listarSugestoes: m.sugestoes,
  aplicarNoTcc: m.aplicar, sugerirNoTcc: m.sugerir, decidirSugestao: m.decidir, historicoDoTcc: m.historico,
  desfazerRevisao: m.desfazer,
}));
vi.mock("@/lib/tcc/gerar", () => ({ gerarTccEmBackground: m.gerar }));
// `partidaDoPedido` é a lógica REAL (pura): mocká-la esconderia justamente o que a rota passou a
// fazer — título provisório e seções do pedido num briefing. Só o `fixarCardTcc` (banco) é dublê.
vi.mock("@/lib/tcc/turno", async (orig) => ({ ...(await orig<any>()), fixarCardTcc: m.card }));
vi.mock("@/lib/tcc/rigor", async (orig) => ({ ...(await orig<any>()), lapidarComRigor: m.lapidar }));

import { GET, POST } from "@/app/api/tcc/route";
import { GET as GET_ID } from "@/app/api/tcc/[id]/route";
import { POST as EDIT } from "@/app/api/tcc/[id]/edit/route";
import { POST as SUGG } from "@/app/api/tcc/[id]/suggestion/[revId]/route";
import { GET as HIST, POST as UNDO } from "@/app/api/tcc/[id]/history/route";
import { POST as REVISAR } from "@/app/api/tcc/[id]/revisar/route";

const req = (url: string, body?: any, method = "GET") =>
  new Request("http://x" + url, { method, body: body !== undefined ? JSON.stringify(body) : undefined, headers: { "content-type": "application/json" } });
const P = { params: { id: "w1" } };
const tcc = (x: any = {}) => ({ id: "w1", titulo: "T", status: "pronto", papel: "dono", secoes: [{ id: "introducao", titulo: "INTRODUÇÃO", corpo: "i" }], ...x });

beforeEach(() => {
  process.env.TCC_CROSS = "1";
  m.userId = "u1"; m.rl = { ok: true };
  Object.values(m).forEach((f: any) => f?.mockReset?.());
  m.findTcc.mockResolvedValue(null);
  m.criar.mockImplementation(async (i: any) => ({ id: "novo", titulo: i.titulo, secoes: i.secoes }));
  m.gerar.mockResolvedValue(undefined);
  m.card.mockResolvedValue(undefined);
});

describe("flag TCC_CROSS", () => {
  it("desligada = 404 em TODAS as rotas (merge não muda nada)", async () => {
    delete process.env.TCC_CROSS;
    const rs = await Promise.all([
      GET(req("/api/tcc?scopeId=a")), POST(req("/api/tcc", { topic: "x" }, "POST")),
      GET_ID(req("/api/tcc/w1"), P), EDIT(req("/api/tcc/w1/edit", { op: "anexar" }, "POST"), P),
      SUGG(req("/api/tcc/w1/suggestion/r1", { aceitar: true }, "POST"), { params: { id: "w1", revId: "r1" } }),
      HIST(req("/api/tcc/w1/history"), P), UNDO(req("/api/tcc/w1/history", { revId: "r" }, "POST"), P),
      REVISAR(req("/api/tcc/w1/revisar", { pedido: "x" }, "POST"), P),
    ]);
    expect(rs.map((r) => r.status)).toEqual([404, 404, 404, 404, 404, 404, 404, 404]);
  });
});

describe("sessão e rate-limit", () => {
  it("sem sessão = 401", async () => {
    m.userId = null;
    expect((await GET_ID(req("/api/tcc/w1"), P)).status).toBe(401);
    expect((await EDIT(req("/api/tcc/w1/edit", { op: "anexar" }, "POST"), P)).status).toBe(401);
    expect((await REVISAR(req("/api/tcc/w1/revisar", { pedido: "x" }, "POST"), P)).status).toBe(401);
  });
  it("rate-limit estourado devolve a resposta do guard", async () => {
    m.rl = { ok: false, response: new Response("calma", { status: 429 }) };
    expect((await POST(req("/api/tcc", { topic: "x" }, "POST"))).status).toBe(429);
  });
  it("o usuário vem da SESSÃO, nunca do corpo", async () => {
    m.aplicar.mockResolvedValue({ ok: true, tcc: tcc(), efeitos: [] });
    await EDIT(req("/api/tcc/w1/edit", { op: "anexar", secaoId: "introducao", corpo: "x", userId: "atacante", autorId: "atacante" }, "POST"), P);
    expect(m.aplicar.mock.calls[0][1]).toBe("u1");
    await POST(req("/api/tcc", { topic: "foto", userId: "atacante" }, "POST"));
    expect(m.criar.mock.calls[0][0].userId).toBe("u1");
  });
});

describe("GET/POST /api/tcc", () => {
  it("GET: sem scope = null; com scope devolve o resumo do TCC do usuário", async () => {
    expect(await (await GET(req("/api/tcc"))).json()).toEqual({ tcc: null });
    m.findTcc.mockResolvedValue(tcc());
    expect(await (await GET(req("/api/tcc?scopeId=aba1"))).json()).toEqual({ tcc: { id: "w1", titulo: "T", status: "pronto" } });
    expect(m.findTcc).toHaveBeenCalledWith("u1", "aba1");
  });
  it("POST cria o esqueleto 'gerando', dispara a geração solta e responde 202 na hora", async () => {
    const r = await POST(req("/api/tcc", { topic: "  energia   solar ", scopeId: "aba1" }, "POST"));
    expect(r.status).toBe(202);
    expect(await r.json()).toEqual({ workId: "novo", status: "gerando" });
    expect(m.criar.mock.calls[0][0]).toMatchObject({ scopeId: "aba1", titulo: "energia solar", status: "gerando", origem: "estudos" });
    // tema simples: briefing INERTE (4º arg é o `gen`, 5º o briefing) — a rota segue como antes
    expect(m.gerar).toHaveBeenCalledWith("novo", "u1", "energia solar", undefined,
      expect.objectContaining({ ehBriefing: false, secoes: [], referencias: [] }));
    expect(m.card).toHaveBeenCalled();
  });
  it("POST com TCC já na conversa devolve o existente (sem duplicar nem gastar modelo)", async () => {
    m.findTcc.mockResolvedValue(tcc({ status: "gerando" }));
    const r = await POST(req("/api/tcc", { topic: "x", scopeId: "aba1" }, "POST"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ workId: "w1", status: "gerando" });
    expect(m.criar).not.toHaveBeenCalled();
    expect(m.gerar).not.toHaveBeenCalled();
  });
  it("D7 · BRIEFING pela rota: título provisório, seções do pedido e nada de corte em 300", async () => {
    // esta rota ficou de fora da D7 e repetia o defeito: cortava em 300, usava isso como TÍTULO
    // e gerava com o esqueleto ABNT, ignorando o plano e as referências do pedido.
    m.criar.mockResolvedValueOnce({ id: "w9", titulo: "Documento em preparação", secoes: [] });
    const pedido = [
      "Você é um redator acadêmico sênior. Redija a primeira versão de um artigo científico",
      "seguindo as diretrizes metodológicas de avaliação de modelos de linguagem.".padEnd(320, " "),
      "",
      "REFERÊNCIAS OBRIGATÓRIAS (limite-se estritamente a estas):",
      "- Wang et al. (EMNLP 2024), Factuality of Large Language Models",
      "",
      "- Seção 1: Introdução e Justificativa",
      "- Seção 2: Definições Operacionais",
    ].join("\n");
    await POST(req("/api/tcc", { topic: pedido, scopeId: "aba1" }, "POST"));
    const criado = m.criar.mock.calls.at(-1)![0];
    expect(criado.titulo).toBe("Documento em preparação");          // não o preâmbulo cortado
    expect(criado.titulo.length).toBeLessThan(60);
    expect(criado.secoes.map((x: any) => x.titulo)).toEqual([
      "INTRODUÇÃO E JUSTIFICATIVA", "DEFINIÇÕES OPERACIONAIS", "REFERÊNCIAS",
    ]);
    const brief = m.gerar.mock.calls.at(-1)![4];
    expect(brief.ehBriefing).toBe(true);
    expect(brief.referencias).toHaveLength(1);
    expect(brief.instrucoes.length).toBeGreaterThan(300);            // o teto de 300 caiu
  });

  it("POST sem tema = 400; sem scope cria solto (sem card)", async () => {
    expect((await POST(req("/api/tcc", { topic: " " }, "POST"))).status).toBe(400);
    await POST(req("/api/tcc", { topic: "x", scopeId: "a b<" }, "POST"));
    expect(m.criar.mock.calls[0][0].scopeId).toBeNull();
    expect(m.card).not.toHaveBeenCalled();
  });
});

describe("GET /api/tcc?todos=1 (chat único)", () => {
  it("lista os trabalhos da conversa do DONO, do mais antigo pro mais novo", async () => {
    m.listar.mockResolvedValue([tcc({ id: "w2", titulo: "B", workType: "Artigo" }), tcc({ id: "w1", titulo: "A", workType: null })]);
    const d = await (await GET(req("/api/tcc?scopeId=aba1&todos=1"))).json();
    expect(m.listar).toHaveBeenCalledWith("u1", "aba1");
    expect(d.trabalhos).toEqual([{ id: "w1", titulo: "A", status: "pronto", tipo: "TCC" }, { id: "w2", titulo: "B", status: "pronto", tipo: "Artigo" }]);
  });
  it("sem conversa = lista vazia; CHAT_UNICO sozinho liga a rota", async () => {
    delete process.env.TCC_CROSS; process.env.CHAT_UNICO = "1";
    expect(await (await GET(req("/api/tcc?todos=1"))).json()).toEqual({ trabalhos: [] });
    delete process.env.CHAT_UNICO;
  });
});

describe("GET /api/tcc/:id", () => {
  it("sem acesso = 404; com acesso devolve doc + sugestões pendentes", async () => {
    m.getTcc.mockResolvedValue(null);
    expect((await GET_ID(req("/api/tcc/w1"), P)).status).toBe(404);
    expect(m.getTcc).toHaveBeenCalledWith("w1", "u1");
    m.getTcc.mockResolvedValue(tcc());
    m.sugestoes.mockResolvedValue([{ id: "r1" }]);
    expect(await (await GET_ID(req("/api/tcc/w1"), P)).json()).toEqual({ tcc: tcc(), sugestoes: [{ id: "r1" }] });
  });
});

describe("POST /api/tcc/:id/edit", () => {
  it("{ tituloDoc } renomeia o trabalho (sem op, sem seção); vazio = 400", async () => {
    m.aplicar.mockResolvedValue({ ok: true, tcc: tcc({ titulo: "Novo nome" }), efeitos: [] });
    const r = await EDIT(req("/api/tcc/w1/edit", { tituloDoc: "  Novo   nome " }, "POST"), P);
    expect(r.status).toBe(200);
    expect(m.aplicar.mock.calls[0].slice(1)).toEqual(["u1", [], "aluno", { titulo: "Novo nome" }]);
    expect((await EDIT(req("/api/tcc/w1/edit", { tituloDoc: "  " }, "POST"), P)).status).toBe(400);
  });
  it("op inválida / corpo vazio = 400", async () => {
    expect((await EDIT(req("/api/tcc/w1/edit", { op: "apagar_tudo" }, "POST"), P)).status).toBe(400);
    expect((await EDIT(new Request("http://x/api/tcc/w1/edit", { method: "POST", body: "lixo" }), P)).status).toBe(400);
  });
  it("estudos/aluno APLICAM direto com a origem certa (padrão = aluno); campos sujos são filtrados", async () => {
    m.aplicar.mockResolvedValue({ ok: true, tcc: tcc(), efeitos: [{ secaoId: "introducao" }] });
    await EDIT(req("/api/tcc/w1/edit", { op: "anexar", secaoId: "introducao", corpo: "x", aposId: "a b" }, "POST"), P);
    expect(m.aplicar.mock.calls[0][2]).toEqual([{ op: "anexar", secaoId: "introducao", corpo: "x" }]);
    expect(m.aplicar.mock.calls[0][3]).toBe("aluno");
    await EDIT(req("/api/tcc/w1/edit", { op: "inserir", titulo: "T", origem: "estudos", aposId: "introducao" }, "POST"), P);
    expect(m.aplicar.mock.calls[1][2]).toEqual([{ op: "inserir", titulo: "T", aposId: "introducao" }]);
    expect(m.aplicar.mock.calls[1][3]).toBe("estudos");
  });
  it("pesquisa vira SUGESTÃO (201), nunca aplicação", async () => {
    m.sugerir.mockResolvedValue({ ok: true, revisoes: [{ id: "r1", status: "sugerida" }] });
    const r = await EDIT(req("/api/tcc/w1/edit", { op: "anexar", secaoId: "introducao", corpo: "x", origem: "pesquisa" }, "POST"), P);
    expect(r.status).toBe(201);
    expect(m.aplicar).not.toHaveBeenCalled();
    m.sugerir.mockResolvedValue({ ok: true, revisoes: [] });
    expect((await EDIT(req("/api/tcc/w1/edit", { op: "anexar", secaoId: "zz", corpo: "x", origem: "pesquisa" }, "POST"), P)).status).toBe(400);
    m.sugerir.mockResolvedValue({ ok: false, reason: "forbidden" });
    expect((await EDIT(req("/api/tcc/w1/edit", { op: "anexar", secaoId: "zz", corpo: "x", origem: "pesquisa" }, "POST"), P)).status).toBe(403);
  });
  it("recusas do store → 403 leitor · 404 sem acesso · 409 corrida · 400 inválida", async () => {
    const chamar = () => EDIT(req("/api/tcc/w1/edit", { op: "anexar", secaoId: "introducao", corpo: "x" }, "POST"), P);
    for (const [reason, status] of [["forbidden", 403], ["not_found", 404], ["conflict", 409], ["invalid", 400]] as const) {
      m.aplicar.mockResolvedValueOnce({ ok: false, reason });
      expect((await chamar()).status).toBe(status);
    }
  });
});

describe("POST /api/tcc/:id/suggestion/:revId", () => {
  const S = { params: { id: "w1", revId: "r1" } };
  it("exige aceitar booleano; repassa a decisão com o usuário da sessão", async () => {
    expect((await SUGG(req("/x", { aceitar: "sim" }, "POST"), S)).status).toBe(400);
    m.decidir.mockResolvedValue({ ok: true, tcc: tcc(), revisao: { id: "r1", status: "aplicada" } });
    const r = await SUGG(req("/x", { aceitar: true }, "POST"), S);
    expect(r.status).toBe(200);
    expect(m.decidir).toHaveBeenCalledWith("w1", "r1", "u1", true);
  });
  it("leitor = 403; sugestão de outro/já decidida = 404", async () => {
    m.decidir.mockResolvedValueOnce({ ok: false, reason: "forbidden" });
    expect((await SUGG(req("/x", { aceitar: false }, "POST"), S)).status).toBe(403);
    m.decidir.mockResolvedValueOnce({ ok: false, reason: "not_found" });
    expect((await SUGG(req("/x", { aceitar: false }, "POST"), S)).status).toBe(404);
  });
});

describe("/api/tcc/:id/history", () => {
  it("GET: sem acesso = 404; senão a timeline", async () => {
    m.historico.mockResolvedValueOnce(null);
    expect((await HIST(req("/x"), P)).status).toBe(404);
    m.historico.mockResolvedValueOnce([{ id: "r1" }]);
    expect(await (await HIST(req("/x"), P)).json()).toEqual({ revisoes: [{ id: "r1" }] });
  });
  it("POST desfaz uma revisão; sem revId = 400; leitor = 403", async () => {
    expect((await UNDO(req("/x", {}, "POST"), P)).status).toBe(400);
    m.desfazer.mockResolvedValueOnce({ ok: true, tcc: tcc(), efeitos: [] });
    expect((await UNDO(req("/x", { revId: "r1" }, "POST"), P)).status).toBe(200);
    expect(m.desfazer).toHaveBeenCalledWith("w1", "r1", "u1");
    m.desfazer.mockResolvedValueOnce({ ok: false, reason: "forbidden" });
    expect((await UNDO(req("/x", { revId: "r1" }, "POST"), P)).status).toBe(403);
  });
});

describe("POST /api/tcc/:id/revisar (Sala de Pesquisa, rigor)", () => {
  const chamar = (body: any = { pedido: "fundamente a introdução" }) => REVISAR(req("/x", body, "POST"), P);
  it("sem pedido = 400; sem acesso = 404; leitor = 403 (nem gasta modelo)", async () => {
    expect((await chamar({ pedido: "  " })).status).toBe(400);
    m.getTcc.mockResolvedValueOnce(null);
    expect((await chamar()).status).toBe(404);
    m.getTcc.mockResolvedValueOnce(tcc({ papel: "leitor" }));
    expect((await chamar()).status).toBe(403);
    expect(m.lapidar).not.toHaveBeenCalled();
  });
  it("o que passou no crivo vira SUGESTÃO no MESMO doc; responde texto + sugestões", async () => {
    m.getTcc.mockResolvedValue(tcc());
    m.lapidar.mockResolvedValue({ texto: "Deixei 1 sugestão", sugestoes: [{ op: "anexar", secaoId: "introducao", corpo: "x", fontes: [{ abnt: "A" }], nota: "" }], descartadas: 2, fontes: [] });
    m.sugerir.mockResolvedValue({ ok: true, revisoes: [{ id: "r1", status: "sugerida" }] });
    const r = await chamar({ pedido: "fundamente", secaoId: "introducao" });
    expect(await r.json()).toEqual({ texto: "Deixei 1 sugestão", sugestoes: [{ id: "r1", status: "sugerida" }], descartadas: 2 });
    expect(m.lapidar.mock.calls[0][0]).toMatchObject({ titulo: "T", pedido: "fundamente", secaoId: "introducao" });
    expect(m.sugerir).toHaveBeenCalledWith("w1", "u1", expect.any(Array));
    expect(m.aplicar).not.toHaveBeenCalled();
  });
  it("nada passou = não grava; erro no pipeline = 502 com texto amigável", async () => {
    m.getTcc.mockResolvedValue(tcc());
    m.lapidar.mockResolvedValueOnce({ texto: "Não achei fonte", sugestoes: [], descartadas: 0, fontes: [] });
    expect((await (await chamar()).json()).sugestoes).toEqual([]);
    expect(m.sugerir).not.toHaveBeenCalled();
    m.lapidar.mockRejectedValueOnce(new Error("vertex"));
    const r = await chamar();
    expect(r.status).toBe(502);
    expect((await r.json()).texto).toMatch(/Não consegui revisar/);
  });
});
