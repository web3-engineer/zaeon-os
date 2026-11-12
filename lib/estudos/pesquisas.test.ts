import { describe, expect, it } from "vitest";
import {
  LIMITES, arquivoDaParte, normalizarEnvio, normalizarPartes, normalizarPesquisa, partesDe, partesDoTrabalho,
  pesquisaParaUI, tamanhoParte, urlSegura,
} from "./pesquisas";
import { filtrarVitrine } from "./vitrine";

const texto = (n: number) => "a".repeat(n);

describe("urlSegura", () => {
  it("aceita só https", () => {
    expect(urlSegura("https://zenodo.org/record/1")).toBe("https://zenodo.org/record/1");
    expect(urlSegura("http://x.org")).toBeNull();
    expect(urlSegura("javascript:alert(1)")).toBeNull();
    expect(urlSegura("data:text/html,oi")).toBeNull();
    expect(urlSegura("")).toBeNull();
  });
});

describe("normalizarPartes", () => {
  it("exige ao menos uma parte e no máximo o limite", () => {
    expect(normalizarPartes([]).erro).toBeTruthy();
    expect(normalizarPartes(undefined).erro).toBeTruthy();
    const muitas = Array.from({ length: LIMITES.partes + 1 }, () => ({ tipo: "anexo", conteudo: "x" }));
    expect(normalizarPartes(muitas).erro).toMatch(/máximo/);
  });

  it("recusa tipo desconhecido, parte sem texto nem link e link que não é https", () => {
    expect(normalizarPartes([{ tipo: "video", conteudo: "x" }]).erro).toMatch(/tipo inválido/);
    expect(normalizarPartes([{ tipo: "dados" }]).erro).toMatch(/texto .* ou um link/);
    expect(normalizarPartes([{ tipo: "dados", url: "http://inseguro.org" }]).erro).toMatch(/https/);
  });

  it("dá o nome padrão quando a parte vem sem título e guarda texto e/ou link", () => {
    const { partes } = normalizarPartes([
      { tipo: "artigo", conteudo: "  o texto  " },
      { tipo: "dados", titulo: "Sequenciamento 16S", url: "https://zenodo.org/r/9" },
    ]);
    expect(partes).toEqual([
      { tipo: "artigo", titulo: "Artigo", conteudo: "o texto" },
      { tipo: "dados", titulo: "Sequenciamento 16S", url: "https://zenodo.org/r/9" },
    ]);
  });

  it("recusa texto acima do limite", () => {
    expect(normalizarPartes([{ tipo: "artigo", conteudo: texto(LIMITES.conteudo + 1) }]).erro).toMatch(/grande demais/);
  });
});

describe("normalizarPesquisa", () => {
  it("no POST exige título e partes", () => {
    expect(normalizarPesquisa({ partes: [{ tipo: "artigo", conteudo: "x" }] }).erro).toMatch(/Título/);
    expect(normalizarPesquisa({ titulo: "T" }).erro).toBeTruthy();
    const { data } = normalizarPesquisa({ titulo: " T ", partes: [{ tipo: "artigo", conteudo: "x" }], tags: "solo, sertão", validadores: 3 });
    expect(data).toMatchObject({ titulo: "T", tags: ["solo", "sertão"], validadores: 3 });
  });

  it("no PATCH aceita só o status (moderação) e recusa status inventado", () => {
    expect(normalizarPesquisa({ status: "publicada" }, { parcial: true }).data).toEqual({ status: "publicada" });
    expect(normalizarPesquisa({ status: "aprovadissima" }, { parcial: true }).erro).toMatch(/status/);
    expect(normalizarPesquisa({ raridade: "mitica" }, { parcial: true }).erro).toMatch(/raridade/);
  });
});

describe("normalizarEnvio (o usuário publicando)", () => {
  it("exige um id de trabalho válido", () => {
    expect(normalizarEnvio({}).erro).toBeTruthy();
    expect(normalizarEnvio({ workId: "../../etc" }).erro).toBeTruthy();
    const ok = normalizarEnvio({ workId: "a".repeat(24), resumo: " r ", nicho: "Agro", tags: ["solo"] });
    expect(ok).toEqual({ workId: "a".repeat(24), resumo: "r", nicho: "Agro", tags: ["solo"] });
  });
});

describe("partesDoTrabalho", () => {
  it("o texto do trabalho vira o papel principal, com o nome do tipo do trabalho", () => {
    expect(partesDoTrabalho({ content: "curto" }).erro).toBeTruthy();
    expect(partesDoTrabalho({ content: texto(300), workType: "tcc" }).partes).toEqual([{ tipo: "artigo", titulo: "TCC", conteudo: texto(300) }]);
    expect(partesDoTrabalho({ content: texto(300), workType: "relatorio" }).partes?.[0].titulo).toBe("Relatório");
    expect(partesDoTrabalho({ content: texto(300) }).partes?.[0].titulo).toBe("Artigo");
  });
});

describe("pesquisaParaUI (o card-pasta)", () => {
  const row = {
    slug: "microbioma", titulo: "Microbioma do solo", resumo: "Primeiro parágrafo.\n\nSegundo.", nicho: "Biologia",
    tags: ["solo"], raridade: "epica", autor: "", validadores: 4,
    partes: [{ tipo: "artigo", titulo: "Dissertação", conteudo: texto(5000) }, { tipo: "dados", titulo: "16S", url: "https://z.org/1" }, { lixo: true }],
    conta: { id: "c".repeat(24), name: "Iracema", image: null },
  };

  it("vira uma pasta: tipo pesquisa, os papéis resumidos (sem o texto) e a conta de quem publicou", () => {
    const it = pesquisaParaUI(row);
    expect(it).toMatchObject({ id: "pesquisa-microbioma", tipo: "pesquisa", modelo: "pasta", autor: "Iracema", raridade: "epica", preco: 0, nicho: "Biologia", validadores: 4 });
    expect(it.subtitulo).toBe("Primeiro parágrafo.");
    expect(it.pasta).toEqual({ slug: "microbioma", partes: [
      { tipo: "artigo", titulo: "Dissertação", caracteres: 5000, link: false },
      { tipo: "dados", titulo: "16S", caracteres: 0, link: true },
    ] });
    expect(JSON.stringify(it)).not.toContain("aaaaaaaaaa"); // o texto não vai na lista
    expect(it.conta).toEqual({ id: "c".repeat(24), nome: "Iracema", avatarUrl: null });
  });

  it("sem conta e sem resumo, usa o autor e conta as partes", () => {
    const it = pesquisaParaUI({ ...row, conta: null, autor: "Lab X", resumo: "", raridade: "inexistente" });
    expect(it.autor).toBe("Lab X");
    expect(it.conta).toBeUndefined();
    expect(it.raridade).toBe("comum");
    expect(it.subtitulo).toBe("2 partes nesta pasta");
  });

  it("o filtro Pesquisas mostra só as pastas", () => {
    const pasta = pesquisaParaUI(row);
    const outro = { ...pasta, id: "x", tipo: "curso" as const, pasta: undefined };
    expect(filtrarVitrine([pasta, outro], "pesquisa").map((i) => i.id)).toEqual(["pesquisa-microbioma"]);
  });
});

describe("legendas", () => {
  it("tamanho e nome de arquivo de cada papel", () => {
    expect(tamanhoParte({ tipo: "artigo", titulo: "", caracteres: 1234, link: false })).toBe("1,2 mil caracteres");
    expect(tamanhoParte({ tipo: "dados", titulo: "", caracteres: 0, link: true })).toBe("link externo");
    expect(tamanhoParte({ tipo: "dados", titulo: "", caracteres: 80, link: true })).toBe("80 caracteres · link");
    expect(arquivoDaParte("microbioma", { tipo: "dados" })).toBe("microbioma-dados.md");
    expect(partesDe("não é lista")).toEqual([]);
  });
});

import { apoioDe, pctApoio, solFmt, VALORES_APOIO } from "./pesquisas";
import { PESQUISAS_EXEMPLO } from "./pesquisasExemplos";

describe("apoio (financiamento em SOL)", () => {
  it("apoioDe só devolve quando está ativo e tem meta > 0; limita o arrecadado à meta", () => {
    expect(apoioDe({ apoioAtivo: false, metaSol: 100 })).toBeUndefined();
    expect(apoioDe({ apoioAtivo: true, metaSol: 0 })).toBeUndefined();
    expect(apoioDe({ apoioAtivo: true, metaSol: 100, arrecadadoSol: 250, apoiadores: 3 }))
      .toEqual({ ativo: true, metaSol: 100, arrecadadoSol: 100, apoiadores: 3 });
    expect(apoioDe({ apoioAtivo: true, metaSol: 100, arrecadadoSol: -5, apoiadores: -2 }))
      .toEqual({ ativo: true, metaSol: 100, arrecadadoSol: 0, apoiadores: 0 });
  });

  it("pctApoio e solFmt", () => {
    expect(pctApoio({ ativo: true, metaSol: 100, arrecadadoSol: 25, apoiadores: 0 })).toBe(0.25);
    expect(pctApoio({ ativo: true, metaSol: 0, arrecadadoSol: 5, apoiadores: 0 })).toBe(0);
    expect(solFmt(12.5)).toBe("12,5 SOL");
    expect(solFmt(10)).toBe("10 SOL");
    expect(VALORES_APOIO.length).toBeGreaterThan(0);
  });

  it("normalizarPesquisa valida os campos de apoio", () => {
    expect(normalizarPesquisa({ apoioAtivo: true, metaSol: -1 }, { parcial: true }).erro).toMatch(/meta/);
    expect(normalizarPesquisa({ arrecadadoSol: -1 }, { parcial: true }).erro).toMatch(/apoiado/);
    expect(normalizarPesquisa({ apoiadores: 2.5 }, { parcial: true }).erro).toMatch(/apoiadores/);
    expect(normalizarPesquisa({ apoioAtivo: 1, metaSol: 120, arrecadadoSol: 30, apoiadores: 5 }, { parcial: true }).data)
      .toEqual({ apoioAtivo: true, metaSol: 120, arrecadadoSol: 30, apoiadores: 5 });
  });

  it("pesquisaParaUI leva o apoio quando ativo", () => {
    const base = { slug: "x", titulo: "T", resumo: "", nicho: "", tags: [], raridade: "comum", autor: "", validadores: 0, partes: [{ tipo: "artigo", titulo: "A", conteudo: "t" }] };
    expect(pesquisaParaUI({ ...base, apoioAtivo: true, metaSol: 50, arrecadadoSol: 10, apoiadores: 4 }).apoio)
      .toEqual({ ativo: true, metaSol: 50, arrecadadoSol: 10, apoiadores: 4 });
    expect(pesquisaParaUI(base).apoio).toBeUndefined();
  });
});

describe("as 10 pesquisas de exemplo", () => {
  it("são 10, todas abertas a apoio e válidas pelo normalizador", () => {
    expect(PESQUISAS_EXEMPLO).toHaveLength(10);
    const titulos = new Set<string>();
    for (const ex of PESQUISAS_EXEMPLO) {
      titulos.add(ex.titulo);
      expect(ex.apoioAtivo).toBe(true);
      expect(ex.metaSol).toBeGreaterThan(0);
      expect(ex.arrecadadoSol).toBeLessThanOrEqual(ex.metaSol);
      expect(ex.partes.length).toBeGreaterThan(0);
      const { erro } = normalizarPesquisa(ex, { parcial: false });
      expect(erro, `exemplo "${ex.titulo}"`).toBeUndefined();
    }
    expect(titulos.size).toBe(10); // títulos únicos (o seed é idempotente por título)
  });

  it("não prometem cura nem dão recomendação clínica", () => {
    const texto = JSON.stringify(PESQUISAS_EXEMPLO).toLowerCase();
    expect(texto).not.toMatch(/\bcura\b|\bcurar\b/);
    expect(texto).not.toContain("rnafoundry");
  });
});
