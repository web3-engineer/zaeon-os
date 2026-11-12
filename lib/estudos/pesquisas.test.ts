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
