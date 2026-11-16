// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import SalaCurso from "./SalaCurso";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/studio/CursoArvoreView", () => ({
  default: ({ acoes }: { acoes: ReactNode }) => <>{acoes}</>,
}));
vi.mock("@/components/study/CardArquivo", () => ({
  default: ({ card }: { card: { arquivo: string } }) => <input aria-label={card.arquivo} />,
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("preserva a digitação ao alternar arquivos", async () => {
  const cards = ["primeiro.py", "segundo.py"].map((arquivo) => ({ arquivo, abas: [{ snippets: [{ codigo: "pass" }] }] }));
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/mapa") ? {} : {
    meta: {
      arvore: { raiz: { titulo: "Curso", filhos: [{ id: "mod:0", titulo: "Exercício" }] } },
      licoesPorNo: { "mod:0": { sandbox: { linguagem: "python", inicial: "pass" } } },
    },
    cards,
  }))));
  render(<SalaCurso cursoId="curso" />);
  fireEvent.click(await screen.findByRole("button", { name: "forja.sala.praticar" }));

  const seletor = screen.getByRole("combobox");
  fireEvent.change(seletor, { target: { value: "arquivo:0" } });
  fireEvent.change(screen.getByRole("textbox", { name: "primeiro.py" }), { target: { value: "print(1)" } });
  fireEvent.change(seletor, { target: { value: "arquivo:1" } });
  expect(screen.getByRole("textbox", { name: "segundo.py" })).toBeTruthy();
  fireEvent.change(seletor, { target: { value: "arquivo:0" } });
  expect((screen.getByRole("textbox", { name: "primeiro.py" }) as HTMLInputElement).value).toBe("print(1)");
});
