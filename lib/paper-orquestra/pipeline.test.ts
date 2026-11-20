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
  "crispr survey": [{ title: "CRISPR survey", authors: ["Ana Silva"], year: 2020, abstract: "Uma revisão ampla sobre edição gênica com CRISPR e suas aplicações clínicas." }],
  "crispr off-target": [{ title: "Off-target effects", authors: ["Bia Souza"], year: 2021, abstract: "Efeitos fora do alvo em edição com CRISPR e como medi-los em células humanas." }],
  PRISMA: [{ title: "PRISMA statement", authors: ["David Moher"], year: 2009, abstract: "A diretriz PRISMA para relatar revisões sistemáticas e metanálises com transparência." }],
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
      case "literatura": return `# INTRODUÇÃO\n${prosa(420, "[E1].")}\n\n# REFERENCIAL TEÓRICO\n## Off-target\n${prosa(1000, "[E2][E99].")}`;
      case "secoes": {
        const alvo: string[] = JSON.parse(p.user.match(/escreva_estas: (\[.*\])/)![1]);
        const tam: Record<string, number> = { RESUMO: 200, METODOLOGIA: 300, "RESULTADOS E DISCUSSÃO": 900, "CONSIDERAÇÕES FINAIS": 220 };
        return alvo.map((t) => `# ${t}\n${prosa(tam[t] ?? 300, t === "METODOLOGIA" ? "[E3]." : ".")}`).join("\n\n");
      }
      case "revisor": return JSON.stringify({ Overall: notas.shift() ?? 6, Clarity: 3, Weaknesses: ["raso"] });
      case "refinamento": {
        if (!opts.refinar) return "nada";
        const tam: Record<string, number> = { RESUMO: 200, INTRODUÇÃO: 430, "REFERENCIAL TEÓRICO": 1000, METODOLOGIA: 300, "RESULTADOS E DISCUSSÃO": 900, "CONSIDERAÇÕES FINAIS": 220 };
        const corpo = (t: string) => `# ${t}\n${prosa(tam[t] ?? 300, t === "INTRODUÇÃO" ? "revisada [E1]." : "[E2].")}`;
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

    expect(chamadas.map((c) => c.fase).slice(0, 5)).toEqual(["materiais", "esboco", "triagem", "literatura", "secoes"]);
    expect(chamadas.slice(5).every((c) => c.fase === "ajuste")).toBe(true); // o resto é a auditoria de entrega
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
      if (p.fase === "secoes" && primeira) { primeira = false; return `# RESUMO\n${prosa(200)}`; } // trunca o resto
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

  it("TRIAGEM: o que o modelo exclui não vira evidência; o registro de busca conta tudo e vai pro escritor", async () => {
    const base = llmFalso().llm;
    const llm = vi.fn(async (p: PedidoLlm) => {
      if (p.fase === "triagem") {
        const off = p.user.match(/\[(P\d+)\] Off-target/)?.[1];
        const todos = [...p.user.matchAll(/\[(P\d+)\]/g)].map((m) => m[1]).filter((x) => x !== off);
        return JSON.stringify({ incluir: todos, excluir: [{ p: off, motivo: "fora do tema" }] });
      }
      return base(p);
    });
    const { d } = deps({ llm });
    const r = await rodarPaperOrquestra({ tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 0, hoje: new Date("2026-11-20T12:00:00Z") }, d);
    expect(r.evidencias.map((x) => x.titulo)).not.toContain("Off-target effects");
    expect(r.registroDeBusca).toMatchObject({ origem: "busca", encontrados: 3, semResumo: 0, excluidosTriagem: 1, incluidos: 2, motivosExclusao: ["fora do tema"] });
    const secoes = llm.mock.calls.map(([p]) => p).find((p) => p.fase === "secoes")!;
    expect(secoes.user).toContain("registro_de_busca:");
    expect(secoes.user).toContain("OpenAlex, Crossref, arXiv, PubMed e Semantic Scholar");
    expect(secoes.user).toContain("Excluídos por não terem resumo disponível: 0");
  });

  it("biblioteca fixa (avaliação): não busca, mas tria e escreve igual", async () => {
    const buscar = vi.fn(async () => []);
    const { d } = deps({ buscar });
    const r = await rodarPaperOrquestra({
      tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 0,
      bibliotecaFixa: { consultas: ["crispr survey"], papers: PAPERS["crispr survey"]!.map((p) => ({ ...p, secao: "INTRODUÇÃO" })) },
    }, d);
    expect(buscar).not.toHaveBeenCalled();
    expect(r.registroDeBusca.consultas).toEqual(["crispr survey"]);
    expect(r.evidencias).toHaveLength(1);
  });

  it("refinamento devolve SÓ a seção que mudou: as outras ficam; seção que encolheu demais é descartada", async () => {
    const base = llmFalso({ notas: [6, 8] }).llm;
    const llm = vi.fn(async (p: PedidoLlm) => p.fase === "refinamento"
      ? "```json\n{}\n```\n```markdown\n# INTRODUÇÃO\n" + prosa(440, "nova [E1].") + "\n\n# METODOLOGIA\ncurta\n```"
      : base(p));
    const { d, doc } = deps({ llm });
    const antes = new Map<string, string>();
    const salvar = d.salvarSecao;
    d.salvarSecao = async (t, c) => { if (!antes.has(t)) antes.set(t, c); return salvar(t, c); };
    const r = await rodarPaperOrquestra({ tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 1 }, d);
    expect(r.relatorio.voltasAceitas).toBe(1);
    expect(doc.get("INTRODUÇÃO")).toContain("nova");
    expect(doc.get("METODOLOGIA")).toBe(antes.get("METODOLOGIA")); // "curta" foi descartada
    expect(doc.get("CONSIDERAÇÕES FINAIS")).toBe(antes.get("CONSIDERAÇÕES FINAIS"));
  });

  it("ENRICHMENT: fonte sem resumo com DOI ganha o resumo e entra; sem DOI fica de fora e é contada", async () => {
    const buscar = async () => [
      { title: "Com DOI sem resumo", authors: ["Ana Silva"], year: 2022, doi: "10.1/abc" },
      { title: "Sem DOI sem resumo", authors: ["Bia Souza"], year: 2022 },
    ];
    const completarResumos = vi.fn(async (dois: string[]) => new Map(dois.map((d) => [d, "Resumo completado pelo OpenAlex com texto suficiente para citar."])));
    const { d } = deps({ buscar, completarResumos });
    const r = await rodarPaperOrquestra({ tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 0 }, d);
    expect(completarResumos).toHaveBeenCalledWith(["10.1/abc"]);
    expect(r.evidencias.map((x) => x.titulo)).toEqual(["Com DOI sem resumo"]);
    expect(r.registroDeBusca).toMatchObject({ encontrados: 2, resumosCompletados: 1, semResumo: 1, incluidos: 1 });
  });

  it("PISO da triagem: com mais de 12 candidatos, triagem que deixa menos de 12 devolve os mais bem colocados", async () => {
    const muitos = Array.from({ length: 20 }, (_, i) => ({ title: `Paper ${i}`, authors: [`Autor N${i}`], year: 2020, abstract: `Resumo do paper ${i} com texto suficiente para entrar na biblioteca.` }));
    const base = llmFalso().llm;
    const llm = vi.fn(async (p: PedidoLlm) => (p.fase === "triagem" ? JSON.stringify({ incluir: ["P1", "P2"], excluir: [] }) : base(p)));
    let k = 0;
    const buscar = async () => { const lote = muitos.slice(k, k + 6); k += 6; return lote; }; // 6 + 6 + 1 (alvo) = 13 candidatos
    const { d } = deps({ llm, buscar });
    const r = await rodarPaperOrquestra({ tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 0 }, d);
    expect(r.registroDeBusca.encontrados).toBe(13);
    expect(r.registroDeBusca.incluidos).toBe(12);
  });

  it("artigo COM dados: o registro de busca não vai pra metodologia; o orçamento de palavras vai pro escritor", async () => {
    const base = llmFalso().llm;
    const llm = vi.fn(async (p: PedidoLlm) => (p.fase === "materiais" ? JSON.stringify({ titulo: "T", ideia: "i", dados: "| a | b |\n|---|---|\n| 1 | 2 |" }) : base(p)));
    const { d } = deps({ llm });
    await rodarPaperOrquestra({ tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 0 }, d);
    const secoes = llm.mock.calls.map(([p]) => p).find((p) => p.fase === "secoes")!;
    expect(secoes.user).toContain("a busca de literatura NÃO é método deste trabalho");
    expect(secoes.user).not.toContain("Busca automatizada (assistida por IA)");
    expect(secoes.user).toContain("METODOLOGIA: 220–300 palavras");
  });

  it("AUDITORIA: seção com pendência ganha um ajuste; ajuste que inventa chave ou perde citação é recusado", async () => {
    const base = llmFalso().llm;
    const ajustes: string[] = [];
    const llm = vi.fn(async (p: PedidoLlm) => {
      if (p.fase === "secoes") return base(p).then((r) => r.replace(/# CONSIDERAÇÕES FINAIS\n[^#]*/, `# CONSIDERAÇÕES FINAIS\n${prosa(600, "[E1].")}\n\n`));
      if (p.fase === "ajuste") {
        const titulo = p.user.match(/^# (.+)$/m)![1]!;
        ajustes.push(titulo);
        if (titulo === "CONSIDERAÇÕES FINAIS") return `# CONSIDERAÇÕES FINAIS\n${prosa(110, "[E1].")}\n\n${prosa(110)}`; // resolve
        if (titulo === "INTRODUÇÃO") return `# INTRODUÇÃO\n${prosa(420, "[E99].")}`; // inventa chave
        return "";
      }
      return base(p);
    });
    const { d, doc } = deps({ llm });
    const r = await rodarPaperOrquestra({ tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 0 }, d);
    expect(ajustes).toContain("CONSIDERAÇÕES FINAIS");
    expect(doc.get("CONSIDERAÇÕES FINAIS")!.split(/\s+/).length).toBeLessThan(300);
    expect(doc.get("INTRODUÇÃO")).not.toContain("E99"); // ajuste com chave inventada foi descartado
    expect(r.relatorio.ajustes).toBeGreaterThanOrEqual(1);
  });

  it("429 do modelo: tenta de novo com espera crescente; outro erro não é repetido", async () => {
    const base = llmFalso().llm;
    let falhas = 0;
    const llm = vi.fn(async (p: PedidoLlm) => {
      if (p.fase === "literatura" && falhas < 2) { falhas++; throw new Error("llm:rate_limit: got status: 429 Too Many Requests"); }
      return base(p);
    });
    const esperas: number[] = [];
    const { d, doc } = deps({ llm, esperar: async (ms) => { esperas.push(ms); } });
    await rodarPaperOrquestra({ tema: "t", pedido: "p", tipo: "Artigo", esqueleto: ESQ, reflexoes: 0 }, d);
    expect(esperas).toEqual([8000, 20000]);
    expect(doc.get("INTRODUÇÃO")).toContain("(SILVA, 2020)");
  });
});