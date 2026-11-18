// @vitest-environment jsdom
/**
 * A ÁRVORE do curso (nov/2026): o tronco abre em galhos e TODO módulo sai da copa — nada fica solto.
 * A árvore aparece inteira; UM clique abre a lição; o "continuar" anda pelo curso todo; não há trilha de
 * botões no topo. E o cartão da lição tem fundo próprio (uma chave sobrando no CSS já o deixou transparente,
 * com o texto misturado ao que estava atrás).
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import CursoArvoreView, { corDaArvore, ordemDoCurso } from "./CursoArvoreView";
import type { CursoRepo, NoEntendimento } from "@/lib/forja/tipos";

vi.mock("@/app/agentic-modules/codelab/useCodeRunner", () => ({
  useCodeRunner: () => ({ run: vi.fn(), output: [], isRunning: false, isPyodideReady: true }),
}));
vi.mock("@/components/study/EditorDoCard", () => ({
  default: ({ value }: { value: string }) => <textarea value={value} readOnly />,
}));

afterEach(cleanup);

const no = (id: string, titulo: string, filhos: NoEntendimento[] = []): NoEntendimento => ({ id, titulo, resumo: "lição " + id, desde: "basico", refs: [], filhos });
const mod = (i: number, filhos: NoEntendimento[] = []) => no(`mod:${i}`, `Módulo ${i + 1}`, filhos);
const cursoDe = (filhos: NoEntendimento[]) => ({
  repo: "owner/nome",
  grafo: { nos: [], arestas: [] },
  arvore: { raiz: { id: "raiz", titulo: "Curso Teste", resumo: "raiz", desde: "basico", refs: [], filhos } },
}) as unknown as CursoRepo;
const curso = cursoDe([mod(0), mod(1), mod(2)]);

const abrir = async (container: HTMLElement, i: number) => {
  fireEvent.click(container.querySelectorAll(".av-node")[i]!);
  await waitFor(() => expect(container.querySelector(".av-board.on .av-card h1")).toBeTruthy(), { timeout: 2000 });
};
const h1 = (c: HTMLElement) => c.querySelector(".av-card h1")?.textContent;

describe("CursoArvoreView — a árvore", () => {
  it("o tronco chega à copa e a copa liga a CADA módulo (nenhum módulo solto)", () => {
    const { container } = render(<CursoArvoreView curso={curso} />);
    expect(container.querySelector("path.av-tronco")?.getAttribute("d")).toMatch(/L 600 560$/);
    const galhos = Array.from(container.querySelectorAll('path.av-ramo[data-de="raiz"]'));
    expect(galhos.map((g) => g.getAttribute("data-para"))).toEqual(["mod:0", "mod:1", "mod:2"]);
    for (const g of galhos) expect(g.getAttribute("d")).toMatch(/^M 600\.0 560\.0 /);
  });

  it("a árvore aparece INTEIRA: módulos e conceitos já estão na tela, sem precisar abrir nada", () => {
    const { container } = render(<CursoArvoreView curso={cursoDe([mod(0, [no("c:a", "Conceito A"), no("c:b", "Conceito B")]), mod(1)])} />);
    expect(Array.from(container.querySelectorAll(".av-node")).map((n) => n.getAttribute("data-id"))).toEqual(["raiz", "mod:0", "c:a", "c:b", "mod:1"]);
    expect(container.querySelectorAll('path.av-ramo[data-de="mod:0"]').length).toBe(2);
    expect(container.querySelector(".av-hud.br")?.textContent).toBe("0/4");
  });

  it("não tem trilha de botões no topo registrando o caminho", async () => {
    const { container } = render(<CursoArvoreView curso={curso} />);
    await abrir(container, 1);
    expect(container.querySelector(".av-crumbs, .av-crumb, .av-cue")).toBeNull();
  });

  it("UM clique no nó abre a lição dele", async () => {
    const { container } = render(<CursoArvoreView curso={curso} />);
    await abrir(container, 2);
    expect(h1(container)).toBe("Módulo 2");
  });

  it("'continuar' percorre o curso INTEIRO a partir do 1º módulo: módulo → conceitos dele → módulo seguinte", async () => {
    const { container } = render(<CursoArvoreView curso={cursoDe([mod(0, [no("c:a", "Conceito A"), no("c:b", "Conceito B")]), mod(1)])} />);
    await abrir(container, 1);
    const visto = [h1(container)];
    for (let i = 0; i < 6; i++) {
      const b = container.querySelector(".av-continuar");
      if (!b) break;
      fireEvent.click(b);
      visto.push(h1(container));
    }
    expect(visto).toEqual(["Módulo 1", "Conceito A", "Conceito B", "Módulo 2"]);
    expect(container.querySelector(".av-continuar")).toBeNull();                       // no último não há "continuar"…
    expect(container.querySelector(".av-pill")?.classList.contains("av-voltar")).toBe(true);   // …e sim "concluir"
    expect(container.querySelector(".av-hud.br")?.textContent).toBe("4/4");
  });

  it("voltar à árvore fecha a lição e a árvore reaparece, com o nó visitado aceso", async () => {
    const { container } = render(<CursoArvoreView curso={curso} />);
    await abrir(container, 1);
    fireEvent.click(container.querySelector(".av-voltar")!);
    expect(container.querySelector(".av-board.on")).toBeNull();
    expect(container.querySelector(".av-svg.fade")).toBeNull();
    expect(container.querySelector('.av-node[data-id="mod:0"] .av-ponto')?.getAttribute("fill")).toBe("#ffffff");
    expect(container.querySelector('.av-node[data-id="mod:1"] .av-ponto')?.getAttribute("fill")).not.toBe("#ffffff");
  });

  it("o cartão da lição tem fundo OPACO (o CSS fecha todas as chaves que abre)", () => {
    const { container } = render(<CursoArvoreView curso={curso} />);
    const css = container.querySelector("style")!.textContent!;
    expect((css.match(/\{/g) || []).length).toBe((css.match(/\}/g) || []).length);
    // nenhuma regra solta entre blocos (foi um "}" sobrando que apagou a regra do cartão)
    expect(css).not.toMatch(/\}\s*\}\s*\.av-card\{width/);
    expect(css).toMatch(/\.av-card\{[^}]*background:var\(--panel\)/);
    expect(css).toMatch(/--panel:#[0-9a-f]{6}[;}]/i);
    expect(css).toMatch(/\.av-board\{[^}]*background:var\(--bg\)/);
    expect(css).toMatch(/--bg:#[0-9a-f]{6}[;}]/i);
  });

  it("mostra um editor vazio ao lado da lição com sandbox", async () => {
    const { container } = render(<CursoArvoreView curso={curso} licoes={{
      "mod:0": { estudo: "Aprenda a buscar.", prova: [], sandbox: { linguagem: "python", inicial: "def busca(): pass", teste: "assert busca()" } },
    }} />);
    fireEvent.click(container.querySelectorAll(".av-node")[1]!);
    await waitFor(() => expect(container.querySelector(".av-pair.has-code > .av-editor textarea")).toBeTruthy(), { timeout: 2000 });
    expect(container.querySelector(".av-pair.has-code > .av-lesson h1")?.textContent).toBe("Módulo 1");
    expect(container.querySelector<HTMLTextAreaElement>(".av-editor textarea")?.value).toBe("");
  });

  it("curso sem módulos ainda: só o tronco e o aviso, sem travar", () => {
    const { container } = render(<CursoArvoreView curso={cursoDe([])} />);
    expect(container.querySelector("path.av-tronco")).toBeTruthy();
    expect(container.querySelectorAll(".av-node").length).toBe(1);
    expect(container.querySelector(".av-hud.br")?.textContent).toBe("0/0");
  });
});

describe("peças puras da árvore", () => {
  it("a ordem do curso é em profundidade e deixa a raiz de fora", () => {
    const t = { id: "r", filhos: [{ id: "a", filhos: [{ id: "a1", filhos: [] }, { id: "a2", filhos: [] }] }, { id: "b", filhos: [] }] };
    expect(ordemDoCurso(t).map((n) => n.id)).toEqual(["a", "a1", "a2", "b"]);
    expect(ordemDoCurso({ id: "r", filhos: [] })).toEqual([]);
  });
  it("a cor vai do magenta do tronco ao ciano das pontas e não estoura fora de 0–1", () => {
    expect(corDaArvore(0)).toBe("rgb(240,43,255)");
    expect(corDaArvore(1)).toBe("rgb(94,234,212)");
    expect(corDaArvore(-3)).toBe(corDaArvore(0));
    expect(corDaArvore(9)).toBe(corDaArvore(1));
    expect(corDaArvore(0.5)).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  });
});
