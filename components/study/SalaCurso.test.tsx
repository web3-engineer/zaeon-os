// @vitest-environment jsdom
/** A sala do curso é a árvore e as lições — o botão flutuante de "praticar código" saiu (nov/2026). */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SalaCurso from "./SalaCurso";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const props = vi.hoisted(() => ({ ultimo: null as Record<string, unknown> | null, neuronal: null as Record<string, unknown> | null }));
vi.mock("@/components/studio/CursoArvoreView", () => ({
  default: (p: Record<string, unknown>) => { props.ultimo = p; return <div data-testid="arvore" />; },
}));
vi.mock("@/components/studio/CursoArvoreNeuronal", () => ({
  default: (p: Record<string, unknown>) => { props.neuronal = p; return <div data-testid="neuronal" />; },
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); props.ultimo = null; props.neuronal = null; });

it("mesmo quando o curso traz arquivos de prática, não há botão nem área de 'praticar código'", async () => {
  const cards = [{ arquivo: "primeiro.py", abas: [{ snippets: [{ codigo: "pass" }] }] }];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/mapa") ? {} : {
    meta: { repo: "o/r", arvore: { raiz: { titulo: "Curso", filhos: [{ id: "mod:0", titulo: "Módulo" }] } }, licoesPorNo: { "mod:0": { estudo: "x", prova: [] } } },
    cards, pacotes: ["numpy"], prepararTeste: "x = 1",
  }))));
  render(<SalaCurso cursoId="curso" />);
  await waitFor(() => expect(screen.getByTestId("arvore")).toBeTruthy());
  expect(screen.queryByRole("button", { name: /praticar/i })).toBeNull();
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(Object.keys(props.ultimo!)).not.toContain("acoes");
  expect(props.ultimo!.licoes).toEqual({ "mod:0": { estudo: "x", prova: [] } });
});

const META = { repo: "o/r", arvore: { raiz: { titulo: "Curso", filhos: [{ id: "mod:0", titulo: "Módulo" }] } }, licoesPorNo: {} };
it("flag ARVORE_NEURONAL ligada (servidor manda arvoreNeuronal:true) → Árvore Neuronal, com o cursoId", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/mapa") ? {} : { meta: META, arvoreNeuronal: true }))));
  render(<SalaCurso cursoId="pomodoro" />);
  await waitFor(() => expect(screen.getByTestId("neuronal")).toBeTruthy());
  expect(screen.queryByTestId("arvore")).toBeNull();
  expect(props.neuronal!.cursoId).toBe("pomodoro");
});
it("flag desligada (arvoreNeuronal:false) → a árvore antiga (fallback)", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/mapa") ? {} : { meta: META, arvoreNeuronal: false }))));
  render(<SalaCurso cursoId="pomodoro" />);
  await waitFor(() => expect(screen.getByTestId("arvore")).toBeTruthy());
  expect(screen.queryByTestId("neuronal")).toBeNull();
});
