// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { readdirSync } from "node:fs";
import { CATALOGO_CURSOS } from "./cursosCatalogo";
import { montarArquivo } from "./tutorialArquivo";
import { arquivosDoProjeto } from "./projetoDoCurso";
import { projetoCuradoDoCurso } from "./projetosCurados";
import { tutoriaisDoCurso } from "./tutoriais";

it("publica uma calculadora que carrega todos os arquivos e executa o fluxo do formulário", () => {
  const projeto = projetoCuradoDoCurso("calculadora")!;
  const cards = tutoriaisDoCurso("calculadora");
  const arquivos = arquivosDoProjeto(cards, {
    titulo: "Calculadora", repo: "zaeon/calculadora", extras: projeto.residual, executar: projeto.executar,
  });
  const porCaminho = new Map(arquivos.map((arquivo) => [arquivo.path, arquivo.content]));
  const html = new DOMParser().parseFromString(porCaminho.get("index.html")!, "text/html");
  const scripts = Array.from(html.querySelectorAll("script[src]"), (script) => script.getAttribute("src")!);
  expect(scripts).toEqual(["calculadora.js", "interface.js"]);
  expect(porCaminho.get("README.md")).toContain("Como executar");
  document.body.innerHTML = html.body.innerHTML;
  try {
    const codigo = scripts.map((path) => porCaminho.get(path)).join("\n");
    expect(() => new Function(`${codigo}\n${cards[1].teste}`)()).not.toThrow();
  } finally {
    document.body.replaceChildren();
  }
});


const cursos = [
  ...Object.keys(CATALOGO_CURSOS),
  ...readdirSync(".claude/skills", { withFileTypes: true })
    .filter((pasta) => pasta.isDirectory() && readdirSync(`.claude/skills/${pasta.name}`).includes("curso.json"))
    .map((pasta) => pasta.name),
];

it.each(cursos)("%s monta um projeto com entrada, instruções e teste final", (id) => {
  const projeto = projetoCuradoDoCurso(id);
  expect(projeto).toBeDefined();
  const cards = tutoriaisDoCurso(id);
  const final = cards.at(-1)!;
  expect(final.teste).toBeTruthy();
  const arquivos = arquivosDoProjeto(cards, {
    titulo: id, repo: "zaeon/exemplo", extras: projeto?.residual, executar: projeto?.executar,
  });
  expect(arquivos[0].content).toContain("## Como executar");
  expect(arquivos.some((a) => a.path === final.arquivo)).toBe(true);
  expect(arquivos.some((a) => ["index.html", "servidor.js", "executar.py"].includes(a.path))).toBe(true);
});

it.each(cursos.filter((id) => id !== "calculadora" && tutoriaisDoCurso(id).at(-1)?.linguagem === "javascript"))(
  "%s executa o teste final JavaScript",
  async (id) => {
    const projeto = projetoCuradoDoCurso(id)!;
    const card = tutoriaisDoCurso(id).at(-1)!;
    document.body.replaceChildren();
    window.name = "";
    try {
      const executar = new Function("matchMedia", "setInterval", `${projeto.prepararTeste}\n${montarArquivo(card)}\n${card.teste}`);
      await executar(() => ({ matches: true }), vi.fn());
    } finally {
      document.body.replaceChildren();
      window.name = "";
    }
  },
);
