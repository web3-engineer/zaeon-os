// @vitest-environment jsdom
/** A sala do curso é a árvore e as lições — o botão flutuante de "praticar código" saiu (nov/2026). */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SalaCurso from "./SalaCurso";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const props = vi.hoisted(() => ({ ultimo: null as Record<string, unknown> | null }));
vi.mock("@/components/studio/CursoArvoreView", () => ({
  default: (p: Record<string, unknown>) => { props.ultimo = p; return <div data-testid="arvore" />; },
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); props.ultimo = null; });

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
