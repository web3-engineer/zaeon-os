import { describe, it, expect } from "vitest";
import { arquivosDoProjeto, readmeDoProjeto, nomeRepoDoCurso } from "./projetoDoCurso";
import type { CardDeArquivo } from "./tutorialArquivo";

const card = (arquivo: string, codigo: string, residual = false): CardDeArquivo => ({
  arquivo, funcao: "x", ordem: 0, linguagem: "python", residual,
  abas: [{ titulo: "a", snippets: [{ explicacao: "e", codigo }] }],
});

describe("projetoDoCurso — montagem dos arquivos do projeto do aluno", () => {
  it("cada card vira seu arquivo (conteúdo = o arquivo montado) + README", () => {
    const arqs = arquivosDoProjeto([card("a.py", "print('a')"), card("b.py", "print('b')")], { titulo: "Curso X", repo: "o/n" });
    const paths = arqs.map((a) => a.path);
    expect(paths).toContain("README.md");
    expect(paths).toContain("a.py");
    expect(paths).toContain("b.py");
    expect(arqs.find((a) => a.path === "a.py")?.content).toBe("print('a')");
  });

  it("pula cards residuais (vêm do Octa via extras) e deixa os extras sobrescreverem", () => {
    const arqs = arquivosDoProjeto(
      [card("app.py", "print(1)"), card("conftest.py", "", true)],
      { titulo: "T", repo: "o/n", extras: [{ path: "conftest.py", content: "import pytest" }, { path: "app.py", content: "print(2)" }] },
    );
    expect(arqs.find((a) => a.path === "conftest.py")?.content).toBe("import pytest"); // residual veio do extra
    expect(arqs.find((a) => a.path === "app.py")?.content).toBe("print(2)");           // extra sobrescreve
  });

  it("README lista os arquivos e cita o repo de referência", () => {
    const r = readmeDoProjeto("Meu Curso", "owner/repo", ["a.py", "b.py"]);
    expect(r).toContain("# Meu Curso");
    expect(r).toContain("owner/repo");
    expect(r).toContain("`a.py`");
  });

  it("nomeRepoDoCurso: um repo por curso, saneado e prefixado", () => {
    expect(nomeRepoDoCurso("algoritmos-classicos")).toBe("zaeon-algoritmos-classicos");
    expect(nomeRepoDoCurso("Skill: Pandas!!")).toBe("zaeon-skill-pandas");
    expect(nomeRepoDoCurso("")).toBe("zaeon-curso");
  });
});
