/** #873 · peça jurídica no chat: reconhecer o pedido, estrutura da peça, aviso, geração pelo envelope e o turno. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

const m = vi.hoisted(() => ({ listar: vi.fn(), criar: vi.fn(), aplicar: vi.fn(), marcar: vi.fn(), findBoard: vi.fn(), gen: vi.fn() }));
vi.mock("@/lib/tcc/store", async (orig) => ({
  ...(await orig<any>()),
  listarTrabalhosDoEscopo: m.listar, criarTcc: m.criar, aplicarNoTcc: m.aplicar, marcarStatus: m.marcar,
}));
vi.mock("@/lib/cartolina/store", async (orig) => ({ ...(await orig<any>()), findOwnBoard: m.findBoard, createBoard: vi.fn(), patchBoard: vi.fn() }));
vi.mock("@/lib/scholar/gemini", () => ({ geminiJson: m.gen }));
vi.mock("@/lib/agent/transcript", () => ({ resolveUserId: async () => null }));
vi.mock("@/src/lib/ratelimit", () => ({ guard: async () => ({ ok: true }) }));

import {
  AVISO_PECA, TIPO_TRABALHO_PECA, esqueletoDaPeca, gerarPecaEmBackground, pedePecaJuridica, pecaUser, secoesDaPeca, tituloDaPeca,
} from "./pecaJuridica";
import { classifyHeuristic } from "@/lib/agent/router";
import { tccDoTurno } from "@/lib/tcc/turno";

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.listar.mockResolvedValue([]);
  m.findBoard.mockResolvedValue(null);
  m.marcar.mockResolvedValue(undefined);
  m.criar.mockImplementation(async (i: any) => ({
    id: "p1", titulo: i.titulo, workType: i.workType, scopeId: "aba1", rev: 0, status: i.status, papel: "dono", updatedAt: new Date(), content: "",
    secoes: i.secoes.map((s: any, k: number) => ({ id: `s${k}`, titulo: s.titulo, corpo: s.corpo ?? "" })),
  }));
});

describe("#873 · reconhecer o pedido de peça", () => {
  it.each([
    ["Faz uma petição inicial simples de ação de cobrança por uma dívida de R$ 3.000 de aluguel atrasado, em documento pra eu baixar.", "peticao_inicial"],
    ["redija uma contestação para uma ação de despejo", "contestacao"],
    ["elabore um recurso de apelação contra a sentença", "recurso"],
    ["preciso de um contrato de prestação de serviços de design", "contrato"],
    ["faça um parecer jurídico sobre a LGPD em escolas", "parecer"],
    ["cria uma procuração para representar minha mãe no INSS", "procuracao"],
    ["me passa uma notificação extrajudicial de cobrança", "notificacao"],
    ["gera uma peça processual para o meu caso", "peca"],
  ])("%s → %s", (texto, tipo) => {
    expect(pedePecaJuridica(texto)).toBe(tipo);
  });

  it.each([
    "como fazer uma petição inicial?",
    "me ensina a redigir um contrato",
    "o que é uma contestação",
    "faz um artigo sobre contratos de trabalho", // trabalho acadêmico SOBRE o tema = artigo
    "escreva um TCC sobre recursos no processo civil",
    "uma petição precisa de quais requisitos",
  ])("não é pedido de peça pronta: %s", (texto) => {
    expect(pedePecaJuridica(texto)).toBeNull();
  });

  it("o roteador manda a peça pra criar_trabalho com kind=peca (antes virava explicação)", () => {
    const r = classifyHeuristic("Faz uma petição inicial de ação de cobrança de aluguel atrasado", { activeTab: "estudos" } as any);
    expect(r).toMatchObject({ intent: "criar_trabalho", kind: "peca" });
    expect(classifyHeuristic("escreva um artigo sobre contratos", { activeTab: "estudos" } as any).kind).toBe("artigo");
    expect(classifyHeuristic("como fazer uma petição inicial?", { activeTab: "estudos" } as any).intent).not.toBe("criar_trabalho");
  });

  it("o roteador por modelo também respeita (a regra vem antes do palpite)", () => {
    const src = readFileSync("lib/agent/router.ts", "utf8");
    expect(src).toMatch(/const peca = pedePecaJuridica\(text\)/);
    expect(src).toMatch(/peca \? "peca" : normalizeKind/);
    expect(src).toMatch(/aula\|peca\|null/);
  });
});

describe("#873 · a estrutura é de PEÇA, não de artigo", () => {
  it("petição: endereçamento, qualificação, fatos, direito, pedidos, provas, valor da causa e fechamento — com o aviso primeiro", () => {
    const e = esqueletoDaPeca("peticao_inicial");
    expect(e[0]).toBe("OBSERVAÇÃO");
    expect(e).toEqual(expect.arrayContaining(["ENDEREÇAMENTO", "QUALIFICAÇÃO DAS PARTES", "DOS FATOS", "DO DIREITO", "DOS PEDIDOS", "DO VALOR DA CAUSA"]));
    expect(e).not.toEqual(expect.arrayContaining(["RESUMO", "METODOLOGIA", "REFERÊNCIAS"]));
  });

  it("contrato tem cláusulas (objeto, preço, rescisão, foro); procuração tem outorgante e poderes", () => {
    expect(esqueletoDaPeca("contrato")).toEqual(expect.arrayContaining(["DO OBJETO", "DO PREÇO E DO PAGAMENTO", "DA RESCISÃO", "DO FORO"]));
    expect(esqueletoDaPeca("procuracao")).toEqual(expect.arrayContaining(["OUTORGANTE", "OUTORGADO", "PODERES"]));
  });

  it("título: tipo da peça + assunto, sem o 'pra eu baixar'", () => {
    expect(tituloDaPeca("peticao_inicial", "Faz uma petição inicial de ação de cobrança por aluguel atrasado, em documento pra eu baixar."))
      .toBe("Petição inicial — ação de cobrança por aluguel atrasado");
    expect(tituloDaPeca("procuracao", "cria uma procuração")).toBe("Procuração");
  });

  it("o pedido ao modelo leva o tipo, o pedido e as seções; o sistema proíbe inventar dados e jurisprudência", async () => {
    const u = pecaUser("contrato", "contrato de aluguel de sala comercial");
    expect(u).toMatch(/Tipo de peça: Contrato/);
    expect(u).toMatch(/DO OBJETO \| DAS OBRIGAÇÕES DAS PARTES/);
    const { PECA_SYS } = await import("./pecaJuridica");
    expect(PECA_SYS).toMatch(/\[NOME DO AUTOR\]/);
    expect(PECA_SYS).toMatch(/Não invente jurisprudência/);
    expect(PECA_SYS).toMatch(/NÃO é artigo acadêmico/);
  });

  it("o AVISO é sempre o nosso (o modelo não troca nem apaga)", () => {
    const s = secoesDaPeca("peticao_inicial", { secoes: [{ titulo: "Observação", corpo: "pode usar à vontade" }, { titulo: "dos fatos", corpo: "O réu deixou de pagar…" }, { titulo: "DO DIREITO", corpo: "" }] });
    expect(s).toEqual([{ titulo: "OBSERVAÇÃO", corpo: AVISO_PECA }, { titulo: "DOS FATOS", corpo: "O réu deixou de pagar…" }]);
    expect(AVISO_PECA).toMatch(/Não substitui um advogado/);
  });
});

describe("#873 · gerar a peça (envelope, sem Google direto)", () => {
  it("escreve as seções no documento e marca pronto", async () => {
    const gen = vi.fn(async () => ({ titulo: "x", secoes: [{ titulo: "ENDEREÇAMENTO", corpo: "EXCELENTÍSSIMO SENHOR JUIZ DE DIREITO DA [VARA] DA COMARCA DE [COMARCA]" }, { titulo: "DOS PEDIDOS", corpo: "1. a citação do réu…" }] }));
    let ops: any[] = [];
    m.aplicar.mockImplementation(async (_id: string, _u: string, f: any) => {
      ops = f({ secoes: [{ id: "s0", titulo: "OBSERVAÇÃO", corpo: "" }, { id: "s1", titulo: "ENDEREÇAMENTO", corpo: "" }, { id: "s2", titulo: "DOS PEDIDOS", corpo: "" }] });
      return { ok: true, tcc: {}, efeitos: [] };
    });
    await gerarPecaEmBackground("p1", "u1", "faz uma petição inicial de cobrança", "peticao_inicial", gen);
    expect(gen).toHaveBeenCalledTimes(1);
    expect(ops).toEqual([
      { op: "substituir", secaoId: "s0", corpo: AVISO_PECA },
      { op: "substituir", secaoId: "s1", corpo: expect.stringMatching(/\[COMARCA\]/) },
      { op: "substituir", secaoId: "s2", corpo: "1. a citação do réu…" },
    ]);
    expect(m.marcar).toHaveBeenCalledWith("p1", "u1", "pronto");
  });

  it("falhou (provedor fora / resposta vazia) → status 'erro', nunca lança", async () => {
    await gerarPecaEmBackground("p1", "u1", "x", "contrato", vi.fn(async () => { throw new Error("429"); }));
    expect(m.marcar).toHaveBeenCalledWith("p1", "u1", "erro");
    m.marcar.mockClear();
    await gerarPecaEmBackground("p1", "u1", "x", "contrato", vi.fn(async () => ({ secoes: [] })));
    expect(m.marcar).toHaveBeenCalledWith("p1", "u1", "erro");
  });

  it("o padrão usa o envelope (geminiJson), não o Vertex direto", () => {
    const src = readFileSync("lib/documento/pecaJuridica.ts", "utf8");
    expect(src).toMatch(/import\("@\/lib\/scholar\/gemini"\)/);
    expect(src).not.toMatch(/VertexAI|getGenerativeModel/);
  });
});

describe("#873 · o turno do chat cria o documento da peça", () => {
  const base = { userId: "u1", scopeId: "aba1", surface: "estudos", intent: "criar_trabalho" as const, kind: "peca" as const, multi: true };
  beforeEach(() => { process.env.CHAT_UNICO = "1"; });

  it("cria 'Peça jurídica' com a estrutura da peça e dispara a escrita", async () => {
    const gerarPeca = vi.fn();
    const r = await tccDoTurno({ ...base, gerarPeca, prompt: "faz uma petição inicial de ação de cobrança de aluguel atrasado", answer: { nucleo: "ok" } as any });
    expect(r).toMatchObject({ workId: "p1", criado: true, gerando: true, tipo: TIPO_TRABALHO_PECA, titulo: "Petição inicial — ação de cobrança de aluguel atrasado" });
    const criado = m.criar.mock.calls[0][0];
    expect(criado).toMatchObject({ workType: TIPO_TRABALHO_PECA, status: "gerando" });
    expect(criado.secoes.map((s: any) => s.titulo)).toEqual(esqueletoDaPeca("peticao_inicial"));
    expect(gerarPeca).toHaveBeenCalledWith("p1", "u1", expect.stringMatching(/petição inicial/), "peticao_inicial");
  });

  it("com um artigo aberto, a peça é documento NOVO (não edita o artigo)", async () => {
    m.listar.mockResolvedValue([{ id: "a1", titulo: "revisão de aluguel", workType: "Artigo", secoes: [], status: "pronto" }]);
    const gerarPeca = vi.fn();
    await tccDoTurno({ ...base, gerarPeca, prompt: "redija uma contestação sobre revisão de aluguel", answer: { nucleo: "ok", work: { kind: "artigo", sections: [{ title: "INTRODUÇÃO", body: "x" }] } } as any });
    expect(m.criar).toHaveBeenCalledTimes(1);
    expect(m.aplicar).not.toHaveBeenCalled();
  });
});

describe("#873 · o Exportar não chama mais o Google direto", () => {
  it("abnt-export usa o envelope", () => {
    const src = readFileSync("app/api/documents/abnt-export/route.ts", "utf8");
    expect(src).not.toMatch(/VertexAI|getGenerativeModel|vertex-credentials/);
    expect(src).toMatch(/geminiJson\(/);
  });
});
