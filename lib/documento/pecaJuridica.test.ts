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
  AVISO_PECA, PARTE_FALTANDO, TIPO_TRABALHO_PECA, esqueletoDaPeca, gerarPecaEmBackground, pedePecaJuridica, pecaUser, secoesDaPeca, tituloDaPeca,
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
    "faça uma pesquisa sobre contratos de trabalho", // revisão #874: pesquisa/estudo SOBRE o tema = trabalho
    "cria um estudo sobre recursos administrativos",
  ])("não é pedido de peça pronta: %s", (texto) => {
    expect(pedePecaJuridica(texto)).toBeNull();
  });

  it("artigo de LEI não atrapalha (revisão #874): a peça que cita o art. 23 continua sendo peça", () => {
    expect(pedePecaJuridica("faz uma petição de cobrança com base no artigo 23 da Lei 8.245")).toBe("peticao_inicial");
    expect(pedePecaJuridica("redija um contrato de locação conforme o artigo nº 4 da lei")).toBe("contrato");
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
  const doc = (corpos: Record<string, string> = {}) => ({
    secoes: esqueletoDaPeca("peticao_inicial").map((titulo, k) => ({ id: `s${k}`, titulo, corpo: corpos[titulo] ?? (titulo === "OBSERVAÇÃO" ? AVISO_PECA : "") })),
  });
  const tudo = (extra: Record<string, string> = {}) => ({
    secoes: esqueletoDaPeca("peticao_inicial").slice(1).map((titulo) => ({ titulo, corpo: extra[titulo] ?? `texto de ${titulo}` })),
  });
  const capturar = (estado: any) => {
    const r: { ops: any[] } = { ops: [] };
    m.aplicar.mockImplementation(async (_id: string, _u: string, f: any) => { r.ops = f(estado); return { ok: true, tcc: {}, efeitos: [] }; });
    return r;
  };

  it("escreve as partes vazias e marca pronto", async () => {
    const gen = vi.fn(async () => tudo({ "ENDEREÇAMENTO": "EXCELENTÍSSIMO SENHOR JUIZ DE DIREITO DA [VARA] DA COMARCA DE [COMARCA]" }));
    const r = capturar(doc());
    await gerarPecaEmBackground("p1", "u1", "faz uma petição inicial de cobrança", "peticao_inicial", gen);
    expect(gen).toHaveBeenCalledTimes(1);
    expect(r.ops).toHaveLength(esqueletoDaPeca("peticao_inicial").length - 1); // o aviso já estava escrito
    expect(r.ops).toContainEqual({ op: "substituir", secaoId: "s1", corpo: expect.stringMatching(/\[COMARCA\]/) });
    expect(m.marcar).toHaveBeenCalledWith("p1", "u1", "pronto");
  });

  it("revisão #874 · o que o aluno escreveu enquanto gerava NÃO é sobrescrito", async () => {
    const r = capturar(doc({ "DOS FATOS": "meu texto dos fatos" }));
    await gerarPecaEmBackground("p1", "u1", "x", "peticao_inicial", vi.fn(async () => tudo()));
    expect(r.ops.find((o) => o.secaoId === "s3")).toBeUndefined(); // DOS FATOS é a 4ª parte
  });

  it("revisão #874 · título com outra grafia casa ('Dos Pedidos.'), sem duplicar", async () => {
    const r = capturar(doc());
    const saida = tudo();
    saida.secoes = saida.secoes.map((s) => (s.titulo === "DOS PEDIDOS" ? { titulo: "Dos Pedidos.", corpo: "1. a citação" } : s));
    await gerarPecaEmBackground("p1", "u1", "x", "peticao_inicial", vi.fn(async () => saida));
    expect(r.ops.filter((o) => o.op === "inserir")).toEqual([]);
    expect(r.ops).toContainEqual({ op: "substituir", secaoId: "s5", corpo: "1. a citação" });
  });

  it("revisão #874 · parte que não veio fica marcada no texto e o documento sai 'erro', não 'pronto'", async () => {
    const r = capturar(doc());
    const saida = tudo();
    saida.secoes = saida.secoes.filter((s) => s.titulo !== "DAS PROVAS");
    await gerarPecaEmBackground("p1", "u1", "x", "peticao_inicial", vi.fn(async () => saida));
    expect(r.ops).toContainEqual({ op: "substituir", secaoId: "s6", corpo: PARTE_FALTANDO });
    expect(m.marcar).toHaveBeenCalledWith("p1", "u1", "erro");
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
    // revisão #874: o aviso nasce ESCRITO (existe mesmo se a geração falhar)
    expect(criado.secoes[0]).toEqual({ titulo: "OBSERVAÇÃO", corpo: AVISO_PECA });
    expect(gerarPeca).toHaveBeenCalledWith("p1", "u1", expect.stringMatching(/petição inicial/), "peticao_inicial");
  });

  it("revisão #874 · o mesmo pedido de novo em poucos minutos não cria outra peça", async () => {
    m.listar.mockResolvedValue([{ id: "p0", titulo: "Petição inicial — ação de cobrança de aluguel atrasado", workType: TIPO_TRABALHO_PECA, status: "gerando", updatedAt: new Date(), secoes: [] }]);
    const gerarPeca = vi.fn();
    const r = await tccDoTurno({ ...base, gerarPeca, prompt: "faz uma petição inicial de ação de cobrança de aluguel atrasado", answer: { nucleo: "ok" } as any });
    expect(r).toMatchObject({ workId: "p0", criado: false });
    expect(m.criar).not.toHaveBeenCalled();
    expect(gerarPeca).not.toHaveBeenCalled();
  });

  it("revisão #874 · também no chat de um trabalho só (sem o chat único)", async () => {
    process.env.TCC_CROSS = "1";
    const gerarPeca = vi.fn();
    const r = await tccDoTurno({ ...base, multi: false, gerarPeca, prompt: "redija um contrato de prestação de serviços", answer: { nucleo: "ok" } as any });
    expect(r).toMatchObject({ criado: true, tipo: TIPO_TRABALHO_PECA });
    expect(gerarPeca).toHaveBeenCalledWith("p1", "u1", expect.any(String), "contrato");
    delete process.env.TCC_CROSS;
  });

  it("com um artigo aberto, a peça é documento NOVO (não edita o artigo)", async () => {
    m.listar.mockResolvedValue([{ id: "a1", titulo: "revisão de aluguel", workType: "Artigo", secoes: [], status: "pronto" }]);
    const gerarPeca = vi.fn();
    await tccDoTurno({ ...base, gerarPeca, prompt: "redija uma contestação sobre revisão de aluguel", answer: { nucleo: "ok", work: { kind: "artigo", sections: [{ title: "INTRODUÇÃO", body: "x" }] } } as any });
    expect(m.criar).toHaveBeenCalledTimes(1);
    expect(m.aplicar).not.toHaveBeenCalled();
  });
});

describe("revisão #874 · outros pontos", () => {
  it("a arena aceita kind 'peca'; o editor não quebra com um tipo sem modelo", async () => {
    expect(readFileSync("lib/orquestra/console.ts", "utf8")).toMatch(/"aula", "peca"\]/);
    const { templateFor, ABNT_TEMPLATE } = await import("@/lib/abntTemplate");
    expect(templateFor(TIPO_TRABALHO_PECA as any)).toBe(ABNT_TEMPLATE);
  });
});

describe("#873 · o Exportar não chama mais o Google direto", () => {
  it("abnt-export usa o envelope", () => {
    const src = readFileSync("app/api/documents/abnt-export/route.ts", "utf8");
    expect(src).not.toMatch(/VertexAI|getGenerativeModel|vertex-credentials/);
    expect(src).toMatch(/geminiJson\(/);
  });
});
