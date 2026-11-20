import { describe, it, expect, vi } from "vitest";
import { acharTrechos, pedeTrechos, type Deps, type TrechoDoc } from "@/lib/trechos/achar";
import { comTrechos, blocoDosTrechos } from "@/lib/trechos/bloco";
import { folhasSemLugar, intercalar } from "@/lib/trechos/folhas";

const t = (id: string, doc: string, ordem: number, texto: string, pag = ordem + 1): TrechoDoc => ({
  trechoId: id, documentoId: doc, titulo: doc === "d1" ? "Apostila de Biologia" : "Livro de Química", texto,
  paginaIni: pag, paginaFim: pag, score: 1, similaridade: 0.8, porTexto: false, ordem,
});

const D1 = [
  t("a", "d1", 0, "Introdução à célula. A membrana plasmática controla o que entra e sai."),
  t("b", "d1", 1, "A fotossíntese ocorre nos cloroplastos, onde a clorofila absorve a luz solar."),
  t("c", "d1", 2, "Revisão: sem luz não há fotossíntese, e a planta passa a consumir suas reservas de amido."),
];
const D2 = [t("x", "d2", 0, "Combustão completa do metano libera CO2 e água.")];

function deps(over: Partial<Deps> = {}) {
  const llm = vi.fn(async (p: { fase: string; user: string }) => {
    if (p.fase === "plano") return JSON.stringify({ consultas: ["photosynthesis chloroplast"], termos: ["fotossint"], exaustivo: true });
    // o juiz: acha a citação exata em C(b), inventa uma paráfrase pra C(c), e aponta uma chave que não existe
    const chaves = [...p.user.matchAll(/\[(C\d+)\] ([^\n]+)\n([^\n]+)/g)].map((m) => ({ c: m[1], texto: m[3] }));
    const achados = chaves.flatMap(({ c, texto }) =>
      texto.includes("cloroplastos") ? [{ c, citacao: "A fotossíntese ocorre nos cloroplastos, onde a clorofila absorve a luz solar", motivo: "define onde ocorre", relevancia: 3 }]
        : texto.includes("sem luz") ? [{ c, citacao: "a planta para de crescer no escuro total", motivo: "inventada", relevancia: 2 }]
        : []);
    return JSON.stringify({ achados: [...achados, { c: "C99", citacao: "qualquer coisa longa demais", relevancia: 3 }] });
  });
  const d: Deps = {
    llm,
    buscar: async () => [D1[1]!, D2[0]!],
    lerDocumento: async (id) => (id === "d1" ? D1 : D2),
    ...over,
  };
  return { d, llm };
}

describe("a skill: pergunta em linguagem natural → passagens literais conferidas", () => {
  it("busca, varre o documento inteiro pelos termos, julga e só fica com o que está LETRA POR LETRA no documento", async () => {
    const { d } = deps();
    const r = await acharTrechos("ache todos os trechos da apostila sobre fotossíntese", d);
    expect(r.relatorio.exaustivo).toBe(true);
    expect(r.relatorio.varridos).toBe(4); // leu d1 e d2 inteiros
    expect(r.trechos).toHaveLength(1);
    expect(r.trechos[0]).toMatchObject({
      id: "T1", documentoId: "d1", titulo: "Apostila de Biologia", paginas: "2", relevancia: 3, motivo: "define onde ocorre",
      citacao: "A fotossíntese ocorre nos cloroplastos, onde a clorofila absorve a luz solar",
    });
    expect(r.relatorio.descartados).toBe(2); // a paráfrase e a chave inexistente
  });

  it("a varredura traz o trecho que a busca NÃO trouxe (o 'todas as vezes')", async () => {
    const vistos: string[] = [];
    const { d } = deps({
      llm: vi.fn(async (p: { fase: string; user: string }) => {
        if (p.fase === "plano") return JSON.stringify({ consultas: [], termos: ["fotossint"], exaustivo: true });
        vistos.push(p.user);
        return JSON.stringify({ achados: [] });
      }),
    });
    await acharTrechos("todas as vezes que fala de fotossíntese", d);
    expect(vistos.join("\n")).toContain("sem luz não há fotossíntese"); // trecho c: só a varredura acha
  });

  it("juiz fora do ar: reserva com a frase de mais termos (literal por construção, relevância 1)", async () => {
    const { d } = deps({
      llm: vi.fn(async (p: { fase: string }) => { if (p.fase === "plano") return JSON.stringify({ termos: ["clorofila"] }); throw new Error("503"); }),
    });
    const r = await acharTrechos("onde a apostila fala da clorofila?", d);
    expect(r.relatorio.reserva).toBe(true);
    expect(r.trechos[0]).toMatchObject({ relevancia: 1 });
    expect(r.trechos[0]!.citacao).toContain("clorofila absorve a luz");
  });

  it("base vazia ou tudo falhando: lista vazia, nunca exceção", async () => {
    const { d } = deps({ buscar: async () => { throw new Error("pg fora"); } });
    expect((await acharTrechos("onde fala de x?", d)).trechos).toEqual([]);
    expect((await acharTrechos("   ", d)).trechos).toEqual([]);
  });
});

describe("gatilho do turno", () => {
  it.each([
    "ache todos os trechos da minha apostila sobre mitose",
    "onde o livro fala de entropia?",
    "em que página aparece a definição de derivada?",
    "segundo o material, quais são as fases da mitose?",
    "o que o texto diz sobre a revolução francesa?",
    "mostre no meu pdf as partes sobre juros compostos",
    "todas as vezes que o autor cita Kant",
  ])("pede trechos: %s", (p) => expect(pedeTrechos(p)).toBe(true));
  it.each(["o que é mitose?", "me explica derivada", "crie um artigo sobre CRISPR", "oi"])("não pede: %s", (p) => expect(pedeTrechos(p)).toBe(false));
});

describe("no harness: marcadores viram âncoras e o texto sai limpo", () => {
  const trechos = [
    { id: "T1", documentoId: "d1", titulo: "Apostila", paginas: "2", citacao: "c1", relevancia: 3 as const },
    { id: "T2", documentoId: "d1", titulo: "Apostila", paginas: "3", citacao: "c2", relevancia: 2 as const },
  ];
  it("o bloco do prompt lista as chaves e a regra do marcador", () => {
    const b = blocoDosTrechos(trechos);
    expect(b).toContain("[[T1]] Apostila, p. 2 — «c1»");
    expect(b).toMatch(/SOZINHO numa linha/);
    expect(blocoDosTrechos([])).toBe("");
  });
  it("comTrechos: âncora por campo e parágrafo; trecho não marcado fica sem âncora (vai pro fim)", () => {
    const a = comTrechos({ nucleo: "Resposta direta.\n\n[[T2]]", desenvolvimento: "Explicação.\n\n[[T1]]\n\n[[T7]]" }, trechos);
    expect(a.nucleo).toBe("Resposta direta.");
    expect(a.desenvolvimento).toBe("Explicação.");
    expect(a.trechos!.find((x) => x.id === "T2")!.ancora).toEqual({ campo: "nucleo", paragrafo: 0 });
    expect(a.trechos!.find((x) => x.id === "T1")!.ancora).toEqual({ campo: "desenvolvimento", paragrafo: 0 });
    const sem = comTrechos({ nucleo: "Sem marcador nenhum." }, trechos);
    expect(folhasSemLugar(sem).map((x) => x.id)).toEqual(["T1", "T2"]);
  });
  it("o cliente intercala texto e folhas com a MESMA contagem de parágrafos; folha espera o parágrafo terminar", () => {
    const a = comTrechos({ nucleo: "P0.\n\n[[T1]]\n\nP1.\n\nP2.\n\n[[T2]]" }, trechos);
    const ped = intercalar(a.nucleo, "nucleo", a.trechos!);
    expect(ped.map((p) => (p.tipo === "md" ? p.md : p.trechos.map((x) => x.id).join()))).toEqual(["P0.", "T1", "P1.\n\nP2.", "T2"]);
    const digitando = intercalar("P0.\n\nP1", "nucleo", a.trechos!, false);
    expect(digitando.map((p) => p.tipo)).toEqual(["md", "folhas", "md"]); // T1 já pode (P0 terminou)
    expect(intercalar("P0", "nucleo", a.trechos!, false).map((p) => p.tipo)).toEqual(["md"]); // P0 ainda sendo escrito
  });
});
