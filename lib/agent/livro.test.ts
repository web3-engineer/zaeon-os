import { describe, it, expect, vi } from "vitest";
import { buildHarnessDeps, anexarLivros } from "./aura-harness";
import { INTENTS } from "./contracts";
import { classifyHeuristic } from "./router";
import { getTool, type ToolContext } from "./runtime";
import { runTrajectoryTraced } from "./trajectory";
import type { LivroAchado } from "@/lib/livros/busca";

const ctx: ToolContext = { activeTab: "estudos", plan: "free", execMode: "auto" };
const DOM: LivroAchado = { titulo: "Dom Casmurro", autores: ["Machado de Assis"], ano: 1899, idiomas: ["por"], fonte: "openlibrary", acesso: "pdf_livre", pdfUrl: "https://archive.org/download/dc/dc.pdf", lerUrl: null, paginaUrl: "https://openlibrary.org/works/OL1W", licenca: "domínio público" };

describe("buscar_livro — contrato e roteamento", () => {
  it("intenção existe, sem crítico, com book_search", () => {
    expect(INTENTS.buscar_livro).toMatchObject({ tools: ["book_search"], critic: "off", required: ["nucleo"] });
    expect(getTool("book_search")?.risk).toBe("read");
  });
  it("heurística manda pedido de livro pra buscar_livro (antes de 'fontes')", () => {
    expect(classifyHeuristic("me manda o pdf do livro Dom Casmurro", {}).intent).toBe("buscar_livro");
    expect(classifyHeuristic("procura o livro Cálculo do Stewart", {}).intent).toBe("buscar_livro");
    expect(classifyHeuristic("quais as fontes sobre cálculo?", {}).intent).toBe("pesquisar_fontes");
  });
});

describe("buscar_livro — ponta a ponta no harness", () => {
  function deps(livros: LivroAchado[], gen?: any) {
    const runToolImpl = vi.fn(async (name: string) => (name === "book_search"
      ? (livros.length ? { ok: true, findings: [{ claim: "Dom Casmurro: PDF livre", source: { title: "Dom Casmurro", url: DOM.pdfUrl! }, confidence: "alta" }], livros, provenance: {} } : { ok: false, code: "no_results", error: "nenhum livro encontrado", provenance: {} })
      : { ok: true, findings: [], provenance: {} }));
    const genJson = gen ?? vi.fn(async (system: string): Promise<any> => (/reasoning/i.test(system) ? { reasoning: "R" } : { nucleo: "Achei a edição em domínio público — dá pra baixar." }));
    const d = buildHarnessDeps(ctx, { genJson, runToolImpl: runToolImpl as any, retryDelayMs: 0 });
    d.classify = async () => ({ intent: "buscar_livro", mode: "elaborated", academicMode: "flexible" }) as any;
    return { d, runToolImpl, genJson };
  }
  it("roda book_search e a LISTA com o link do PDF chega no nucleo (vinda do código)", async () => {
    const { d, runToolImpl, genJson } = deps([DOM]);
    const { answer, state } = await runTrajectoryTraced("procura o livro Dom Casmurro em pdf", ctx, d);
    expect(runToolImpl).toHaveBeenCalledWith("book_search", { query: "procura o livro Dom Casmurro em pdf" }, expect.anything(), expect.anything());
    expect(answer.nucleo).toMatch(/^Achei a edição/);
    expect(answer.nucleo).toContain("[baixar PDF](https://archive.org/download/dc/dc.pdf)");
    expect(answer.livros?.[0]).toMatchObject({ titulo: "Dom Casmurro", acesso: "pdf_livre" });
    expect(state.stop).toBe("aprovado");
    // o draft recebeu a diretriz do livro (com a lista pra comentar, sem inventar link)
    const sysDraft = (genJson.mock.calls as any[]).map((c) => String(c[0])).find((s) => s.includes("PEDIDO DE LIVRO"));
    expect(sysDraft).toMatch(/não repita links/);
  });
  it("modelo falhou no draft → a lista sai mesmo assim", async () => {
    const gen = vi.fn(async (system: string): Promise<any> => { if (/reasoning/i.test(system)) return { reasoning: "R" }; throw new Error("timeout do modelo"); });
    const { d } = deps([DOM], gen);
    const { answer } = await runTrajectoryTraced("procura o livro Dom Casmurro", ctx, d);
    expect(answer.nucleo).toContain("[baixar PDF]");
  });
  it("nada achado → sem lista, e o draft recebe a orientação de honestidade + caminhos legais", async () => {
    const { d, genJson } = deps([]);
    const { answer } = await runTrajectoryTraced("procura o livro Inexistente", ctx, d);
    expect(answer.livros).toBeUndefined();
    const sys = (genJson.mock.calls as any[]).map((c) => String(c[0])).find((s) => s.includes("PEDIDO DE LIVRO"));
    expect(sys).toMatch(/NÃO achou/);
  });
  it("anexarLivros sem livros não mexe na resposta", () => {
    const a = { nucleo: "x" };
    expect(anexarLivros(a, [])).toBe(a);
  });
});
