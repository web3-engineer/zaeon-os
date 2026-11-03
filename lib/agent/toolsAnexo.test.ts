import { describe, it, expect } from "vitest";
import { MAX_CHARS_TRECHO, anexoDe } from "@/lib/agent/anexos";
import { anexosDoCtx, lerAnexoDef, listarAnexosDef } from "@/lib/agent/toolsAnexo";
import { getTool, permit, runToolByName, toolsDoTurno, type ToolContext } from "@/lib/agent/runtime";

const a1 = anexoDe({ id: "a1", nome: "artigo.pdf", tipo: "application/pdf", texto: "Corpo do artigo sobre entropia.", paginas: 3 });
const a2 = anexoDe({ id: "a2", nome: "notas.md", tipo: "text/markdown", texto: "Notas da aula." });

const semAnexo: ToolContext = { activeTab: "estudos", plan: "free", execMode: "auto" };
const comAnexo = { ...semAnexo, anexos: [a1, a2] } as ToolContext;

describe("anexosDoCtx · tolera contexto malformado", () => {
  it("lê os anexos do ToolContext", () => {
    expect(anexosDoCtx(comAnexo).map((a) => a.id)).toEqual(["a1", "a2"]);
  });
  it("sem anexos, ou com lixo, devolve lista vazia", () => {
    for (const c of [semAnexo, {}, null, undefined, { anexos: "x" }, { anexos: [null, { nome: "x" }] }]) {
      expect(anexosDoCtx(c), JSON.stringify(c)).toEqual([]);
    }
  });
});

describe("DISPONIBILIDADE POR TURNO · o conceito que a F3 precisou", () => {
  it("as duas tools ESTÃO no registry (quem decide é o turno, não o boot)", () => {
    expect(getTool("ler_anexo")?.name).toBe("ler_anexo");
    expect(getTool("listar_anexos")?.name).toBe("listar_anexos");
  });

  it("o permit NEGA num turno sem anexo e LIBERA num turno com anexo", () => {
    expect(permit(lerAnexoDef, semAnexo)).toBe("DENY");
    expect(permit(listarAnexosDef, semAnexo)).toBe("DENY");
    expect(permit(lerAnexoDef, comAnexo)).toBe("ALLOW");
    expect(permit(listarAnexosDef, comAnexo)).toBe("ALLOW");
  });

  it("`toolsDoTurno` é o que o cardápio da F0 e o menu da F2 devem usar", () => {
    const sem = toolsDoTurno(semAnexo).map((t) => t.name);
    const com = toolsDoTurno(comAnexo).map((t) => t.name);
    expect(sem).not.toContain("ler_anexo");
    expect(sem).not.toContain("listar_anexos");
    expect(com).toContain("ler_anexo");
    expect(com).toContain("listar_anexos");
    // as outras tools não são afetadas
    expect(sem).toContain("literature_search");
  });

  it("o gate é o permit, não a boa vontade de quem chama: por nome também nega", async () => {
    const r = await runToolByName("ler_anexo", { anexo: "a1" }, semAnexo);
    expect(r.ok).toBe(false);
    expect(r.code).toBe("tool_denied");
  });
});

describe("listar_anexos", () => {
  it("devolve o inventário (ids, nomes, tamanhos) — não o conteúdo", async () => {
    const r = await listarAnexosDef.run({}, comAnexo);
    expect(r.ok).toBe(true);
    const claim = r.findings![0].claim;
    expect(claim).toContain("a1");
    expect(claim).toContain("artigo.pdf");
    expect(claim).toContain("a2");
    expect(claim).not.toContain("Corpo do artigo");
  });

  it("sem anexo (se alguém chamar direto) responde `sem_anexo`, não vazio", async () => {
    const r = await listarAnexosDef.run({}, semAnexo);
    expect(r.ok).toBe(false);
    expect(r.code).toBe("sem_anexo");
  });
});

describe("ler_anexo", () => {
  it("sem referência, lê o primeiro", async () => {
    const r = await lerAnexoDef.run({}, comAnexo);
    expect(r.findings![0].claim).toContain("Corpo do artigo sobre entropia.");
    expect(r.findings![0].source).toEqual({ title: "artigo.pdf" });
  });

  it("por id e por nome", async () => {
    expect((await lerAnexoDef.run({ anexo: "a2" }, comAnexo)).findings![0].claim).toContain("Notas da aula.");
    expect((await lerAnexoDef.run({ anexo: "notas.md" }, comAnexo)).findings![0].claim).toContain("Notas da aula.");
  });

  it("id INVENTADO não cai no primeiro em silêncio", async () => {
    // responder sobre o documento errado é pior que dizer que não achou
    const r = await lerAnexoDef.run({ anexo: "tese-do-vizinho" }, comAnexo);
    expect(r.ok).toBe(false);
    expect(r.code).toBe("anexo_desconhecido");
  });

  it("documento grande vem em pedaços, e o claim avisa que sobrou", async () => {
    const grande = anexoDe({ id: "a1", nome: "tese.pdf", tipo: "application/pdf", texto: "x".repeat(MAX_CHARS_TRECHO + 5000) });
    const ctx = { ...semAnexo, anexos: [grande] } as ToolContext;
    const p1 = await lerAnexoDef.run({}, ctx);
    expect(p1.findings![0].claim).toContain("HÁ MAIS DEPOIS DISTO");
    const p2 = await lerAnexoDef.run({ de: MAX_CHARS_TRECHO }, ctx);
    expect(p2.findings![0].claim).toContain("até o fim");
  });

  it("`de` inválido não devolve trecho vazio (seria lido como 'acabou')", async () => {
    for (const de of ["abc", null, -1, 99_999_999]) {
      const r = await lerAnexoDef.run({ de }, comAnexo);
      expect(r.ok, String(de)).toBe(true);
      expect(r.findings![0].claim.length, String(de)).toBeGreaterThan(30);
    }
  });

  it("é tool de LEITURA (nunca cai em aprovação no modo guiado)", () => {
    expect(lerAnexoDef.risk).toBe("read");
    expect(listarAnexosDef.risk).toBe("read");
  });
});
