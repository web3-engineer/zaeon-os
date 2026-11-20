import { describe, it, expect, vi } from "vitest";
import { rodarPaperOrquestra, paperOrquestraLigada, type Deps, type PedidoLlm } from "@/lib/paper-orquestra/pipeline";

const ESQ = ["RESUMO", "INTRODUÇÃO", "REFERENCIAL TEÓRICO", "METODOLOGIA", "RESULTADOS E DISCUSSÃO", "CONSIDERAÇÕES FINAIS", "REFERÊNCIAS"];
const prosa = (n: number, extra = "") => `${"palavra ".repeat(n)}${extra}`.trim();

const ESBOCO = {
  plotting_plan: [],
  intro_related_work_plan: {
    introduction_strategy: { hook_hypothesis: "h", problem_gap_hypothesis: "g", search_directions: ["crispr survey"] },
    related_work_strategy: { subsections: [{ subsection_title: "Off-target", limitation_search_queries: ["crispr off-target"] }] },
  },
  section_plan: [{ section_title: "METODOLOGIA", subsections: [{ subsection_title: "Busca", citation_hints: ["paper introducing 'PRISMA'"] }] }],
};

const PAPERS: Record<string, { title: string; authors: string[]; year: number; abstract: string }[]> = {
  "crispr survey": [{ title: "CRISPR survey", authors: ["Ana Silva"], year: 2020, abstract: "revisão" }],
  "crispr off-target": [{ title: "Off-target effects", authors: ["Bia Souza"], year: 2021, abstract: "efeitos" }],
  PRISMA: [{ title: "PRISMA statement", authors: ["David Moher"], year: 2009, abstract: "diretriz" }],
};

/** um "modelo" roteirizado por fase — é o que o PaperOrchestra chamaria, na ordem dele */
function llmFalso(opts: { notas?: number[]; refinar?: boolean } = {}) {
  const notas = [...(opts.notas ?? [6, 7])];
  const chamadas: PedidoLlm[] = [];
  const llm = vi.fn(async (p: PedidoLlm) => {
    chamadas.push(p);
    switch (p.fase) {
      case "materiais": return JSON.stringify({ titulo: "Edição gênica com CRISPR", area: "bio", ideia: "revisar CRISPR", dados: "" });
      case "esboco": return JSON.stringify(ESBOCO);
      case "literatura": return `# INTRODUÇÃO\n${prosa(120, "[E1].")}\n\n# REFERENCIAL TEÓRICO\n## Off-target\n${prosa(120, "[E2][E99].")}`;
      case "secoes": {
        const alvo: string[] = JSON.parse(p.user.match(/escreva_estas: (\[.*\])/)![1]);
        return alvo.map((t) => `# ${t}\n${prosa(100, t === "METODOLOGIA" ? "[E3]." : ".")}`).join("\n\n");
      }
      case "revisor": return JSON.stringify({ Overall: notas.shift() ?? 6, Clarity: 3, Weaknesses: ["raso"] });
      case "refinamento": {
        if (!opts.refinar) return "nada";
        const corpo = (t: string) => `# ${t}\n${prosa(130, t === "INTRODUÇÃO" ? "revisada [E1]." : "[E2].")}`;
        return "```json\n{\"actions_taken\":[\"x\"]}\n```\n```markdown\n" + ESQ.slice(0, 6).map(corpo).join("\n\n") + "\n```";
      }
    }
    return "";
  });
  return { llm, chamadas };
}

function deps(over: Partial<Deps> = {}) {
  const doc = new Map<string, string>();
  const d: Deps = {
    llm: llmFalso().llm,
    buscar: async (q) => PAPERS[q] ?? [],
    salvarSecao: async (t, c) => { doc.set(t, c); return true; },
    ...over,
  };
  return { d, doc };
}

describe("flag", () => {
  it("só liga com 1/on/true", () => {
    expect(paperOrquestraLigada({})).toBe(false);
    expect(paperOrquestraLigada({ PAPER_ORQUESTRA: "1" })).toBe(true);
    expect(paperOrquestraLigada({ PAPER_ORQUESTRA: "on" })).toBe(true);
    expect(paperOrquestraLigada({ PAPER_ORQUESTRA: "0" })).toBe(false);
  });
});

describe("pipeline do PaperOrchestra no documento", () => {
  it("roda as etapas na ordem do paper_writer.py e escreve TODAS as seções no documento, com citação ABNT", async () => {
    const { llm, chamadas } = llmFalso({ notas: [6, 6] });
    const { d, doc } = deps({ llm });
    const r = await rodarPaperOrquestra({ tema: "CRISPR", pedido: "escreva um artigo sobre CRISPR", tipo: "Artigo", esqueleto: ESQ, reflexoes: 0 }, d);

    expect(chamadas.map((c) => c.fase)).toEqual(["materiais", "esboco", "literatura", "secoes"]);
    expect([...doc.keys()].sort()).toEqual(ESQ.slice(0, 6).sort()); // REFERÊNCIAS não é escrita pelo modelo
    expect(doc.get("INTRODUÇÃO")).toContain("(SILVA, 2020)");
    expect(doc.get("REFERENCIAL TEÓRICO")).toContain("(SOUZA, 2021)");
    expect(doc.get("REFERENCIAL TEÓRICO")).not.toContain("E99"); // chave inventada cortada
    expect(doc.get("METODOLOGIA")).toContain("(MOHER, 2009)");
    expect(r.titulo).toBe("Edição gênica com CRISPR");
    expect(r.referencias.map((x) => x.titulo)).toEqual(["CRISPR survey", "Off-target effects", "PRISMA statement"]);
    expect(r.relatorio).toMatchObject({ evidencias: 3, citadas: 3, invalidas: 1, buscas: 3, secoesEscritas: 6 });
  });

  it("nunca toca seção que o aluno já escreveu", async () => {
    const { d, doc } = deps();
    await rodarPaperOrquestra({ tema: "CRISPR", pedido: "p", tipo: "Artigo", esqueleto: ESQ, jaEscritas: new Set(["INTRODUÇÃO", "METODOLOGIA"]), reflexoes: 0 }, d);
    expect(doc.has("INTRODUÇÃO")).toBe(false);
    expect(doc.has("METODOLOGIA")).toBe(false);
    expect(doc.has("REFERENCIAL TEÓRICO")).toBe(true);
  });

  it("referências do pedido SUBSTITUEM a busca (decisão do dono)", async () => {
    const buscar = vi.fn(async () => []);
    const { d } = deps({ buscar });
    const r = await rodarPaperOrquestra({ tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 0, referenciasDoPedido: ["SILVA, A. Título. 2020."] }, d);
    expect(buscar).not.toHaveBeenCalled();
    expect(r.relatorio.evidencias).toBe(1);
  });

  it("refinamento: a versão com nota MAIOR substitui o texto no documento", async () => {
    const { llm } = llmFalso({ notas: [6, 8], refinar: true });
    const { d, doc } = deps({ llm });
    const r = await rodarPaperOrquestra({ tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 1 }, d);
    expect(r.relatorio).toMatchObject({ notaInicial: 6, notaFinal: 8, voltasAceitas: 1 });
    expect(doc.get("INTRODUÇÃO")).toContain("revisada (SILVA, 2020)");
  });

  it("refinamento: nota MENOR é descartada e o documento fica com a versão anterior", async () => {
    const { llm } = llmFalso({ notas: [7, 5], refinar: true });
    const { d, doc } = deps({ llm });
    const r = await rodarPaperOrquestra({ tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 2 }, d);
    expect(r.relatorio).toMatchObject({ notaInicial: 7, notaFinal: 7, voltasAceitas: 0 });
    expect(r.relatorio.motivoFim).toMatch(/rejeitada/);
    expect(doc.get("INTRODUÇÃO")).not.toContain("revisada");
  });

  it("seção que a chamada única não trouxe ganha uma chamada só dela", async () => {
    let primeira = true;
    const base = llmFalso().llm;
    const llm = vi.fn(async (p: PedidoLlm) => {
      if (p.fase === "secoes" && primeira) { primeira = false; return `# RESUMO\n${prosa(90)}`; } // trunca o resto
      return base(p);
    });
    const { d, doc } = deps({ llm });
    await rodarPaperOrquestra({ tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 0 }, d);
    expect(llm.mock.calls.filter(([p]) => p.fase === "secoes")).toHaveLength(4); // 1 + 3 seções faltantes
    expect(doc.has("CONSIDERAÇÕES FINAIS")).toBe(true);
  });

  it("modelo fora do ar nas etapas de JSON: segue com o tema e não derruba o documento", async () => {
    const base = llmFalso().llm;
    const llm = vi.fn(async (p: PedidoLlm) => (p.fase === "materiais" || p.fase === "esboco" ? "não é json" : base(p)));
    const { d, doc } = deps({ llm });
    const r = await rodarPaperOrquestra({ tema: "crispr survey", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 0 }, d);
    expect(r.titulo).toBeNull();
    expect(r.relatorio.buscas).toBe(1); // a busca de reserva é o próprio tema
    expect(doc.size).toBeGreaterThan(0);
  });
});
