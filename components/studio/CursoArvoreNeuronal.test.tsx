// @vitest-environment jsdom
/** A tela do curso na Árvore Neuronal: lição curada real no miolo, quiz funcionando, progresso salvo por curso. */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CursoArvoreNeuronal from "./CursoArvoreNeuronal";
import type { CursoRepo } from "@/lib/forja/tipos";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock("@/components/study/PraticaDaLicao", () => ({ default: (p: { titulo: string }) => <div data-testid="pratica">{p.titulo}</div> }));

const no = (id: string, titulo: string, filhos: unknown[] = []) => ({ id, titulo, resumo: "resumo " + id, desde: "basico", refs: [], filhos });
const CURSO = {
  cursoId: "pomodoro", repo: "o/pomodoro", modo: "curso", grafo: { nos: [], arestas: [] }, modulos: [], licoes: [], licencas: [],
  arvore: { raiz: no("raiz", "Pomodoro", [no("m1", "Timer", [no("s1", "Contagem")])]) },
} as unknown as CursoRepo;
const LICOES = {
  m1: { estudo: "O **timer** conta.", prova: [{ tipo: "escolha", enunciado: "Quanto dura?", opcoes: [{ texto: "25 min", correta: true, explicacao: "isso" }, { texto: "2 h" }] }] },
  s1: { estudo: "Conta pra trás.", prova: [], sandbox: { linguagem: "python", inicial: "def f():\n    pass" } },
} as never;

let posts: unknown[] = [];
beforeEach(() => {
  posts = [];
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") { posts.push(JSON.parse(String(init.body))); return new Response(JSON.stringify({ concluidas: [] })); }
    return new Response(JSON.stringify({ userId: "u1", concluidas: ["raiz"] }));
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("carrega o progresso do curso, mostra a lição curada e o quiz responde", async () => {
  render(<CursoArvoreNeuronal curso={CURSO} cursoId="pomodoro" licoes={LICOES} titulo="Pomodoro" />);
  await waitFor(() => expect(screen.getByTestId("an-contagem").textContent).toBe("1/3 lições"));
  expect((fetch as any).mock.calls[0][0]).toBe("/api/studio/forja/progresso?cursoId=pomodoro");
  fireEvent.click(document.querySelector('[data-no="m1"]')!);
  expect(screen.getByRole("dialog").textContent).toContain("O timer conta.");
  const certa = [...document.querySelectorAll(".av-opt")].find((o) => o.textContent === "25 min")!;
  fireEvent.click(certa);
  expect(certa.classList.contains("ok")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "concluir ✓" }));
  await waitFor(() => expect(posts).toEqual([{ cursoId: "pomodoro", op: "concluir", nos: ["m1"] }]));
  expect(screen.getByTestId("an-contagem").textContent).toBe("2/3 lições");
  expect(JSON.parse(localStorage.getItem("zaeon.arvore.v1:u1:pomodoro")!).concluidas.sort()).toEqual(["m1", "raiz"]);
});

it("lição com sandbox abre a prática ao lado", async () => {
  render(<CursoArvoreNeuronal curso={CURSO} cursoId="pomodoro" licoes={LICOES} />);
  await waitFor(() => expect(screen.getByTestId("an-contagem").textContent).toBe("1/3 lições"));
  fireEvent.click(screen.getByRole("button", { name: "visão geral" }));
  fireEvent.click(document.querySelector('[data-no="m1"]')!);
  fireEvent.click(document.querySelector('[data-filho="s1"]')!);
  expect(screen.getByTestId("pratica").textContent).toBe("Contagem");
});

it("reiniciar manda op reiniciar", async () => {
  render(<CursoArvoreNeuronal curso={CURSO} cursoId="pomodoro" licoes={LICOES} />);
  await waitFor(() => expect(screen.getByTestId("an-contagem").textContent).toBe("1/3 lições"));
  fireEvent.click(screen.getByRole("button", { name: "reiniciar progresso" }));
  fireEvent.click(screen.getByRole("button", { name: "clique de novo para reiniciar" }));
  await waitFor(() => expect(posts).toEqual([{ cursoId: "pomodoro", op: "reiniciar" }]));
  expect(screen.getByTestId("an-contagem").textContent).toBe("0/3 lições");
});
