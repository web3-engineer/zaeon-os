import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  findTcc: vi.fn(), listar: vi.fn(), criar: vi.fn(), aplicar: vi.fn(), marcar: vi.fn(),
  findBoard: vi.fn(), createBoard: vi.fn(), patchBoard: vi.fn(),
  gen: vi.fn(), getTcc: vi.fn(),
}));
vi.mock("@/lib/tcc/store", async (orig) => ({
  ...(await orig<any>()),
  findTccDoEscopo: m.findTcc, listarTrabalhosDoEscopo: m.listar, criarTcc: m.criar, aplicarNoTcc: m.aplicar, marcarStatus: m.marcar,
  getTccForUser: m.getTcc,
}));
vi.mock("@/lib/cartolina/store", async (orig) => ({
  ...(await orig<any>()),
  findOwnBoard: m.findBoard, createBoard: m.createBoard, patchBoard: m.patchBoard,
}));
vi.mock("@/lib/scholar/gemini", () => ({ geminiJson: m.gen }));
vi.mock("@/lib/agent/transcript", () => ({ resolveUserId: async () => null })); // route-auth não arrasta next-auth/db
vi.mock("@/src/lib/ratelimit", () => ({ guard: async () => ({ ok: true }) }));

import { contextoDosTrabalhos, pedeNovoTrabalho, trabalhosParaTurno } from "@/lib/tcc/turno";
import { EXTRATO_SECAO } from "@/lib/tcc/turno";
import { cardIdDoTcc, contextoDoTcc, ehPedidoDeTcc, fixarCardTcc, tccContextoParaTurno, tccDoTurno, temaDoPedido } from "@/lib/tcc/turno";
import { corposDoEsboco, gerarTccEmBackground, opsDoEsboco } from "@/lib/tcc/gerar";
import { aplicarOps } from "@/lib/tcc/secoes";

const tcc = (x: any = {}) => ({
  id: "w1", titulo: "Fotossíntese", workType: "TCC", scopeId: "aba1", rev: 0, status: "pronto", papel: "dono", updatedAt: new Date(), content: "",
  secoes: [{ id: "introducao", titulo: "INTRODUÇÃO", corpo: "intro com cinco palavras aqui" }, { id: "metodologia", titulo: "METODOLOGIA", corpo: "" }],
  ...x,
});
const ans = (x: any = {}) => ({ nucleo: "ok", ...x });

beforeEach(() => {
  process.env.TCC_CROSS = "1";
  process.env.CARTOLINA_MEMORIA = "1";
  Object.values(m).forEach((f) => f.mockReset());
  m.findTcc.mockResolvedValue(null);
  m.listar.mockResolvedValue([]);
  m.criar.mockImplementation(async (i: any) => tcc({ id: "novo", titulo: i.titulo, secoes: i.secoes.map((s: any, k: number) => ({ id: `s${k}`, titulo: s.titulo, corpo: s.corpo ?? "" })) }));
  m.findBoard.mockResolvedValue(null);
  m.marcar.mockResolvedValue(undefined);
});

describe("detecção do pedido", () => {
  it("temaDoPedido tira o verbo e a pontuação", () => {
    expect(temaDoPedido("crie um TCC sobre a fotossíntese em plantas C4.")).toBe("a fotossíntese em plantas C4");
    expect(temaDoPedido("faz um tcc a respeito de ética na IA!")).toBe("ética na IA");
    expect(temaDoPedido("TCC: energia solar")).toBe("TCC: energia solar");
    expect(temaDoPedido("")).toBe("TCC");
  });
  it("ehPedidoDeTcc: precisa de criar_trabalho E (kind tcc OU o texto dizer TCC)", () => {
    expect(ehPedidoDeTcc("criar_trabalho", "tcc", "x")).toBe(true);
    expect(ehPedidoDeTcc("criar_trabalho", "artigo", "faça uma monografia")).toBe(true);
    expect(ehPedidoDeTcc("criar_trabalho", "artigo", "Trabalho de Conclusão de curso")).toBe(true);
    expect(ehPedidoDeTcc("criar_trabalho", "artigo", "escreva um artigo")).toBe(false);
    expect(ehPedidoDeTcc("explicar_conceito", "tcc", "tcc")).toBe(false);
  });
});

describe("bússola do TCC (Aura sabe que o TCC existe)", () => {
  it("lista seções com contagem de palavras e a regra de editar por seção", () => {
    const c = contextoDoTcc(tcc() as any);
    expect(c).toContain('TCC EM CONSTRUÇÃO NESTA CONVERSA: "Fotossíntese"');
    expect(c).toContain("- INTRODUÇÃO (5 palavras)");
    expect(c).toContain("MESMO título");
  });
  it("tem teto de tamanho", () => {
    const muitas = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, titulo: `SEÇÃO COM TÍTULO BEM LONGO NÚMERO ${i}`, corpo: "" }));
    expect(contextoDoTcc(tcc({ secoes: muitas }) as any).length).toBeLessThanOrEqual(1200);
  });
  it("vazio com flag off / sem usuário / scope inválido / sem TCC / erro de banco", async () => {
    expect(await tccContextoParaTurno("u1", "aba1")).toBe(""); // sem TCC
    m.findTcc.mockResolvedValue(tcc());
    expect(await tccContextoParaTurno("u1", "aba1")).toContain("Fotossíntese");
    expect(await tccContextoParaTurno(null, "aba1")).toBe("");
    expect(await tccContextoParaTurno("u1", "a b<")).toBe("");
    delete process.env.TCC_CROSS;
    expect(await tccContextoParaTurno("u1", "aba1")).toBe("");
    process.env.TCC_CROSS = "1";
    m.findTcc.mockRejectedValue(new Error("db"));
    expect(await tccContextoParaTurno("u1", "aba1")).toBe("");
  });
});

describe("tccDoTurno — entrelace Estudos → TCC", () => {
  const base = { userId: "u1", scopeId: "aba1", surface: "sala-de-estudos", intent: "criar_trabalho" as const, kind: "tcc" as const, prompt: "crie um TCC sobre fotossíntese" };

  it("'crie um TCC' com seções do modelo: cria com scopeId, origem estudos, pronto, e põe o card na cartolina", async () => {
    const gerar = vi.fn();
    const r = await tccDoTurno({ ...base, gerar, answer: ans({ work: { kind: "tcc", sections: [{ title: "Introdução", body: "i" }, { title: "Vazia", body: " " }] } }) as any });
    expect(m.criar).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", scopeId: "aba1", titulo: "fotossíntese", origem: "estudos", status: "pronto", secoes: [{ titulo: "Introdução", corpo: "i" }] }));
    expect(r).toEqual({ workId: "novo", titulo: "fotossíntese", criado: true, alteradas: 1, gerando: false });
    expect(gerar).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(m.createBoard).toHaveBeenCalled());
    expect(m.createBoard.mock.calls[0][0].cards[0]).toMatchObject({ id: "tcc:novo", titulo: "TCC — em construção" });
  });
  it("'crie um TCC' SEM seções: esqueleto ABNT + geração em background (status gerando)", async () => {
    const gerar = vi.fn();
    const r = await tccDoTurno({ ...base, gerar, answer: ans() as any });
    expect(m.criar.mock.calls[0][0]).toMatchObject({ status: "gerando" });
    expect(m.criar.mock.calls[0][0].secoes.map((s: any) => s.titulo)).toEqual(["INTRODUÇÃO", "REFERENCIAL TEÓRICO", "METODOLOGIA", "RESULTADOS E DISCUSSÃO", "CONCLUSÃO", "REFERÊNCIAS"]);
    expect(gerar).toHaveBeenCalledWith("novo", "u1", "fotossíntese");
    expect(r).toMatchObject({ criado: true, gerando: true, alteradas: 0 });
  });
  it("TCC já existe: work.sections vira operação por seção (origem estudos)", async () => {
    m.findTcc.mockResolvedValue(tcc());
    m.aplicar.mockImplementation(async (_id: string, _u: string, fn: any, origem: string) => {
      const ops = fn(tcc());
      const r = aplicarOps(tcc().secoes, ops);
      return { ok: true, tcc: tcc(), efeitos: r.ok ? r.efeitos : [], origem };
    });
    const r = await tccDoTurno({ ...base, intent: "explicar_conceito", answer: ans({ work: { kind: "tcc", sections: [{ title: "METODOLOGIA", body: "método novo" }] } }) as any });
    expect(m.aplicar.mock.calls[0][3]).toBe("estudos");
    expect(r).toEqual({ workId: "w1", titulo: "Fotossíntese", criado: false, alteradas: 1 });
    expect(m.criar).not.toHaveBeenCalled();
  });
  it("TCC existe e a resposta não trouxe work / nada mudou = null", async () => {
    m.findTcc.mockResolvedValue(tcc());
    expect(await tccDoTurno({ ...base, answer: ans() as any })).toBeNull();
    m.aplicar.mockResolvedValue({ ok: true, tcc: tcc(), efeitos: [] });
    expect(await tccDoTurno({ ...base, answer: ans({ work: { kind: "tcc", sections: [{ title: "X", body: "y" }] } }) as any })).toBeNull();
  });
  it("não cria TCC pra outros pedidos (artigo, explicação)", async () => {
    expect(await tccDoTurno({ ...base, kind: "artigo", prompt: "escreva um artigo sobre x", answer: ans() as any })).toBeNull();
    expect(await tccDoTurno({ ...base, intent: "explicar_conceito", answer: ans() as any })).toBeNull();
    expect(m.criar).not.toHaveBeenCalled();
  });
  it("desligado: flag off, sem usuário, sem conversa, ou Sala de Pesquisa (lá é sugestão)", async () => {
    expect(await tccDoTurno({ ...base, surface: "pesquisa", answer: ans() as any })).toBeNull();
    expect(await tccDoTurno({ ...base, userId: null, answer: ans() as any })).toBeNull();
    expect(await tccDoTurno({ ...base, scopeId: undefined, answer: ans() as any })).toBeNull();
    delete process.env.TCC_CROSS;
    expect(await tccDoTurno({ ...base, answer: ans() as any })).toBeNull();
    expect(m.findTcc).not.toHaveBeenCalled();
  });
  it("erro no banco nunca derruba o turno", async () => {
    m.findTcc.mockRejectedValue(new Error("db fora"));
    expect(await tccDoTurno({ ...base, answer: ans() as any })).toBeNull();
  });
});

describe("D3 · o chat enxerga o CONTEÚDO do documento, não só a contagem", () => {
  it("cada seção leva um extrato — é o que impede o chat de contradizer a aba ao lado", () => {
    const t = tcc({
      titulo: "Fotossíntese",
      secoes: [
        { id: "a", titulo: "INTRODUÇÃO", corpo: "A fotossíntese converte luz em energia química nos cloroplastos, e este trabalho trata das plantas C4." },
        { id: "b", titulo: "METODOLOGIA", corpo: "" },
      ],
    });
    const ctx = contextoDoTcc(t);
    expect(ctx).toContain("A fotossíntese converte luz em energia química");
    expect(ctx).toContain("- METODOLOGIA: (vazia)");
    expect(ctx).toContain("NÃO contradiga");
    expect(ctx).toContain("está CORRIGINDO");
  });

  it("seção longa é cortada no teto, e o bloco inteiro respeita o limite", () => {
    const longo = "palavra ".repeat(400);
    const ctx = contextoDoTcc(tcc({ secoes: Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, titulo: `SEÇÃO ${i}`, corpo: longo })) }));
    expect(ctx).toContain("…");
    expect(ctx.length).toBeLessThanOrEqual(1200);   // MAX_CONTEXTO
    expect(EXTRATO_SECAO).toBe(180);
  });

  it("corpo só com espaços conta como vazia (não vira extrato de nada)", () => {
    expect(contextoDoTcc(tcc({ secoes: [{ id: "a", titulo: "X", corpo: "   \n  " }] }))).toContain("- X: (vazia)");
  });
});

describe("card do TCC na cartolina", () => {
  const t = { workId: "w1", titulo: "Foto", secoes: 6, palavras: 120 };
  it("board existente: card novo entra com posição; card existente atualiza só o texto", async () => {
    m.findBoard.mockResolvedValue({ id: "b1", cards: [{ id: "k1", tipo: "nota", x: 0, y: 0, w: 300 }] });
    await fixarCardTcc("u1", "aba1", t);
    const novo = m.patchBoard.mock.calls[0][2].upsert[0];
    expect(novo).toMatchObject({ id: cardIdDoTcc("w1"), corpo: "Foto · 6 seções · 120 palavras" });
    expect(typeof novo.x).toBe("number");

    m.patchBoard.mockClear();
    m.findBoard.mockResolvedValue({ id: "b1", cards: [{ id: "tcc:w1", tipo: "nota", titulo: "x", corpo: "velho", x: 777, y: 5, w: 300 }] });
    await fixarCardTcc("u1", "aba1", t);
    expect(m.patchBoard.mock.calls[0][2].upsert[0]).toMatchObject({ x: 777, corpo: "Foto · 6 seções · 120 palavras" });
  });
  it("texto igual = não grava; cartolina desligada = nada; erro = engolido", async () => {
    m.findBoard.mockResolvedValue({ id: "b1", cards: [{ id: "tcc:w1", tipo: "nota", corpo: "Foto", x: 0, y: 0, w: 300 }] });
    await fixarCardTcc("u1", "aba1", { workId: "w1", titulo: "Foto" });
    expect(m.patchBoard).not.toHaveBeenCalled();
    delete process.env.CARTOLINA_MEMORIA;
    await fixarCardTcc("u1", "aba1", t);
    expect(m.findBoard).toHaveBeenCalledTimes(1);
    process.env.CARTOLINA_MEMORIA = "1";
    m.findBoard.mockRejectedValue(new Error("x"));
    await expect(fixarCardTcc("u1", "aba1", t)).resolves.toBeUndefined();
  });
});

describe("geração em background (POST /api/tcc e 'crie um TCC' sem texto)", () => {
  // O CAMINHO ANTIGO (um esboço só, sem chamada por seção) agora é o excepcional: desde 2026-11-03
  // `DOC_POR_SECAO` vem LIGADA por padrão, e `=0` é o kill-switch. Os testes abaixo continuam
  // cobrindo o caminho antigo porque é ele que o kill-switch devolve — mas precisam pedir por ele.
  beforeEach(() => { process.env.DOC_POR_SECAO = "0"; });

  const d = { titulo: "Título gerado", introducao: "intro", objetivos: "obj", justificativa: "lacuna", palavrasChave: "a; b", metodologia: "met", referencias: "" };
  it("corposDoEsboco junta intro/objetivos/justificativa/palavras-chave na INTRODUÇÃO", () => {
    const c = corposDoEsboco(d);
    expect(c.introducao).toBe("intro\n\nObjetivos\n\nobj\n\nJustificativa\n\nlacuna\n\nPalavras-chave: a; b");
    expect(c.metodologia).toBe("met");
  });
  it("opsDoEsboco só preenche seções VAZIAS que o esboço cobre", () => {
    const secoes = [{ id: "introducao", titulo: "INTRODUÇÃO", corpo: "o aluno já escreveu" }, { id: "metodologia", titulo: "METODOLOGIA", corpo: "" }, { id: "conclusao", titulo: "CONCLUSÃO", corpo: "" }];
    expect(opsDoEsboco(secoes, d)).toEqual([{ op: "substituir", secaoId: "metodologia", corpo: "met" }]);
  });
  it("escreve UMA seção por vez (o poll vê crescer), título na 1ª, e termina 'pronto'", async () => {
    let doc = [{ id: "introducao", titulo: "INTRODUÇÃO", corpo: "" }, { id: "metodologia", titulo: "METODOLOGIA", corpo: "" }];
    const chamadas: any[] = [];
    m.aplicar.mockImplementation(async (_id: string, _u: string, fn: any, origem: string, extra: any) => {
      const ops = fn({ secoes: doc });
      chamadas.push({ ops, origem, extra });
      const r = aplicarOps(doc, ops);
      if (r.ok) doc = r.secoes;
      return { ok: true, tcc: {}, efeitos: r.ok ? r.efeitos : [] };
    });
    await gerarTccEmBackground("w1", "u1", "foto", async () => d);
    expect(chamadas.map((c) => c.ops.length)).toEqual([1, 1, 0]);
    expect(chamadas[0].extra).toEqual({ titulo: "Título gerado" });
    expect(chamadas[1].extra).toBeUndefined();
    expect(chamadas.every((c) => c.origem === "estudos")).toBe(true);
    expect(doc.map((s) => s.corpo.slice(0, 5))).toEqual(["intro", "met"]);
    expect(m.marcar).toHaveBeenCalledWith("w1", "u1", "pronto");
  });
  it("modelo fora = status 'erro' (o cliente para de pollar e avisa)", async () => {
    await gerarTccEmBackground("w1", "u1", "foto", async () => { throw new Error("vertex 404"); });
    expect(m.marcar).toHaveBeenCalledWith("w1", "u1", "erro");
  });
  it("PADRÃO (sem a variável) vai pela escrita POR SEÇÃO, não pelo esboço único", async () => {
    delete process.env.DOC_POR_SECAO;
    m.getTcc.mockResolvedValue(null);          // sem documento → a F2 aborta, e é só o DESVIO que importa aqui
    m.aplicar.mockResolvedValue({ ok: true, tcc: {}, efeitos: [] });
    await gerarTccEmBackground("w1", "u1", "foto", async () => d);
    expect(m.getTcc).toHaveBeenCalledWith("w1", "u1");   // só a F2 relê o documento
    // a ÚNICA gravação até aqui é o título (ops vazias) — nenhum corpo do esboço antigo entrou
    expect(m.aplicar.mock.calls.map((c: any[]) => c[2])).toEqual([[]]);
    expect(m.marcar).toHaveBeenCalledWith("w1", "u1", "erro");
  });

  it("sem gen injetado usa o geminiJson (mockado aqui)", async () => {
    m.gen.mockResolvedValue({});
    m.aplicar.mockResolvedValue({ ok: true, tcc: {}, efeitos: [] });
    await gerarTccEmBackground("w1", "u1", "foto");
    expect(m.gen).toHaveBeenCalled();
    expect(m.marcar).toHaveBeenCalledWith("w1", "u1", "pronto");
  });
});

describe("chat único — VÁRIOS trabalhos na mesma conversa", () => {
  const base = { userId: "u1", scopeId: "aba1", surface: "pesquisa", intent: "criar_trabalho" as const, kind: "artigo" as const, multi: true };
  const artigo = (x: any = {}) => tcc({ id: "a1", titulo: "fotossíntese", workType: "Artigo", ...x });
  beforeEach(() => {
    delete process.env.TCC_CROSS;
    process.env.CHAT_UNICO = "1"; // o chat único liga o motor sozinho
  });

  it("pedeNovoTrabalho: sem aberto = novo; 'outro sobre Y' = novo; seção/revisão = edição; tema novo = novo", () => {
    const aberto = { titulo: "fotossíntese" };
    expect(pedeNovoTrabalho("escreva um artigo sobre fotossíntese", null)).toBe(true);
    expect(pedeNovoTrabalho("agora outro sobre a mitose", aberto)).toBe(true);
    expect(pedeNovoTrabalho("escreva mais um artigo sobre ética na IA", aberto)).toBe(true);
    expect(pedeNovoTrabalho("now another one on black holes", aberto)).toBe(true);
    expect(pedeNovoTrabalho("escreva a metodologia do artigo", aberto)).toBe(false);
    expect(pedeNovoTrabalho("reescreva a introdução do artigo sobre fotossíntese", aberto)).toBe(false);
    expect(pedeNovoTrabalho("escreva um artigo sobre fotossíntese", aberto)).toBe(false); // mesmo tema = o mesmo trabalho
    expect(pedeNovoTrabalho("escreva um artigo sobre buracos negros", aberto)).toBe(true);
  });

  it("dois pedidos na mesma conversa = DOIS trabalhos (o 1º não é sobrescrito)", async () => {
    m.criar.mockImplementation(async (i: any) => artigo({ id: i.titulo === "fotossíntese" ? "a1" : "a2", titulo: i.titulo, workType: i.workType, secoes: i.secoes.map((s: any, k: number) => ({ id: `s${k}`, titulo: s.titulo, corpo: s.corpo ?? "" })) }));
    const sec = { work: { kind: "artigo", sections: [{ title: "INTRODUÇÃO", body: "texto" }] } };
    const r1 = await tccDoTurno({ ...base, prompt: "escreva um artigo sobre fotossíntese", answer: ans(sec) as any });
    expect(r1).toMatchObject({ workId: "a1", criado: true, tipo: "Artigo" });
    m.listar.mockResolvedValue([artigo()]);
    const r2 = await tccDoTurno({ ...base, kind: "tcc", prompt: "agora outro sobre a mitose", answer: ans(sec) as any });
    expect(r2).toMatchObject({ workId: "a2", titulo: "a mitose", criado: true, tipo: "TCC" });
    expect(m.criar).toHaveBeenCalledTimes(2);
    expect(m.criar.mock.calls[1][0]).toMatchObject({ workType: "TCC", scopeId: "aba1" });
    expect(m.aplicar).not.toHaveBeenCalled();
  });

  it("sem seções do modelo: esqueleto do TIPO (artigo tem resumo) + geração em background", async () => {
    const gerar = vi.fn();
    const r = await tccDoTurno({ ...base, gerar, prompt: "escreva um artigo sobre fotossíntese", answer: ans() as any });
    expect(m.criar.mock.calls[0][0].secoes[0].titulo).toBe("RESUMO");
    expect(gerar).toHaveBeenCalledWith("novo", "u1", "fotossíntese");
    expect(r).toMatchObject({ gerando: true, tipo: "Artigo" });
  });

  it("edição vai pro trabalho ABERTO no editor (não pro mais recente)", async () => {
    m.listar.mockResolvedValue([artigo({ id: "a2", titulo: "mitose" }), artigo({ id: "a1" })]);
    m.aplicar.mockImplementation(async (id: string, _u: string, fn: any) => {
      const r = aplicarOps(tcc().secoes, fn(tcc()));
      return { ok: true, tcc: artigo({ id }), efeitos: r.ok ? r.efeitos : [] };
    });
    const r = await tccDoTurno({ ...base, intent: "explicar_conceito", abertoId: "a1", prompt: "melhore a metodologia", answer: ans({ work: { kind: "artigo", sections: [{ title: "METODOLOGIA", body: "nova" }] } }) as any });
    expect(m.aplicar.mock.calls[0][0]).toBe("a1");
    expect(r).toMatchObject({ workId: "a1", criado: false, alteradas: 1, tipo: "Artigo" });
  });

  it("vale no modo pesquisa (surface pesquisa) — o legado não escrevia lá", async () => {
    const r = await tccDoTurno({ ...base, prompt: "escreva um artigo sobre x", answer: ans({ work: { kind: "artigo", sections: [{ title: "A", body: "b" }] } }) as any });
    expect(r?.criado).toBe(true);
  });

  it("aula não é trabalho; flag off / sem conversa = null; erro de banco = null", async () => {
    expect(await tccDoTurno({ ...base, kind: "aula", prompt: "aula sobre x", answer: ans() as any })).toBeNull();
    expect(await tccDoTurno({ ...base, scopeId: undefined, prompt: "artigo sobre x", answer: ans() as any })).toBeNull();
    m.listar.mockRejectedValue(new Error("db"));
    expect(await tccDoTurno({ ...base, prompt: "artigo sobre x", answer: ans() as any })).toBeNull();
    delete process.env.CHAT_UNICO;
    expect(await tccDoTurno({ ...base, prompt: "artigo sobre x", answer: ans() as any })).toBeNull();
  });

  it("bússola lista todos os trabalhos e marca o aberto; trabalhosParaTurno devolve total e tipo", async () => {
    const lista = [artigo({ id: "a2", titulo: "mitose", workType: "TCC" }), artigo({ id: "a1" })];
    const c = contextoDosTrabalhos(lista as any, "a1");
    expect(c).toContain('1) "mitose" (TCC');
    expect(c).toMatch(/2\) "fotossíntese" \(Artigo.*ABERTO NO EDITOR/);
    expect(c).toContain("documento NOVO");
    m.listar.mockResolvedValue(lista);
    expect(await trabalhosParaTurno("u1", "aba1", "zzz")).toMatchObject({ total: 2, kind: "tcc" }); // aberto desconhecido = o mais recente
    expect(await trabalhosParaTurno(null, "aba1")).toEqual({ bloco: "", total: 0 });
  });
});
