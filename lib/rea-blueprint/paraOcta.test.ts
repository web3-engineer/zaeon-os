import { describe, expect, it, vi } from "vitest";
import { blueprintParaOcta, temConteudo, type DepsParaOcta } from "@/lib/rea-blueprint/paraOcta";
import { docVazio, sanitizarDoc, type DocReaBlueprint } from "@/lib/rea-blueprint/tipos";
import { tipoProjeto } from "@/lib/octa/tipoProjeto";

const doc: DocReaBlueprint = sanitizarDoc({
  ...docVazio("Como o Shazam reconhece música"),
  alvo: "Audio fingerprinting", resumo: "resumo",
  comoFunciona: "o mecanismo",
  achados: [{ afirmacao: "x", prov: "observacao" }],
  reconstrucao: [{ titulo: "passo 1", verifica: "checa" }],
  turnos: 1,
})!;

function deps(over: Partial<DepsParaOcta> = {}): DepsParaOcta & { salvos: Record<string, any> } {
  const salvos: Record<string, any> = {};
  return {
    salvos,
    lerBlueprint: async () => ({ doc }),
    criarProjeto: async (_u, nome) => ({ id: "p1", userId: "u1", nome, slug: "como-o-shazam", arquivos: {}, designId: null, permissao: "auto", avisoPublicoAceito: false, repoFullName: null, repoCriadoPeloOcta: false, pagesUrl: null }) as any,
    salvarArquivos: async (_u, id, arquivos) => { salvos[id] = arquivos; return { id, userId: "u1", nome: "Como o Shazam reconhece música", slug: "como-o-shazam", arquivos, designId: null, permissao: "auto", avisoPublicoAceito: false, repoFullName: null, repoCriadoPeloOcta: false, pagesUrl: null } as any; },
    ...over,
  };
}

describe("temConteudo", () => {
  it("branco é vazio; com qualquer campo de substância, não", () => {
    expect(temConteudo(docVazio())).toBe(false);
    expect(temConteudo(doc)).toBe(true);
  });
});

describe("blueprintParaOcta — a ponte", () => {
  it("cria o projeto e grava um site estático", async () => {
    const d = deps();
    const r = await blueprintParaOcta(d, "rea1", "u1");
    expect(r).toMatchObject({ ok: true, projetoId: "p1", slug: "como-o-shazam", nome: "Como o Shazam reconhece música" });
    expect(r.ok && r.arquivos).toContain("index.html");
    expect(tipoProjeto(d.salvos["p1"])).toBe("estatico");
  });

  it("o nome do projeto sai do título do blueprint", async () => {
    const criarProjeto = vi.fn(deps().criarProjeto);
    await blueprintParaOcta(deps({ criarProjeto }), "rea1", "u1");
    expect(criarProjeto).toHaveBeenCalledWith("u1", "Como o Shazam reconhece música");
  });

  it("blueprint inexistente / de outro dono → nao_encontrado (nada é criado)", async () => {
    const criarProjeto = vi.fn();
    const r = await blueprintParaOcta(deps({ lerBlueprint: async () => null, criarProjeto }), "rea1", "u1");
    expect(r).toEqual({ ok: false, motivo: "nao_encontrado" });
    expect(criarProjeto).not.toHaveBeenCalled();
  });

  it("blueprint ainda em branco → vazio (não vira site)", async () => {
    const criarProjeto = vi.fn();
    const r = await blueprintParaOcta(deps({ lerBlueprint: async () => ({ doc: docVazio() }), criarProjeto }), "rea1", "u1");
    expect(r).toEqual({ ok: false, motivo: "vazio" });
    expect(criarProjeto).not.toHaveBeenCalled();
  });

  it("se o projeto some entre criar e salvar → falhou (não mente sucesso)", async () => {
    const r = await blueprintParaOcta(deps({ salvarArquivos: async () => null }), "rea1", "u1");
    expect(r).toEqual({ ok: false, motivo: "falhou" });
  });
});
