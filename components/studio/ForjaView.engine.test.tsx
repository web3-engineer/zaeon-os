// @vitest-environment jsdom
// Testes do caminho ASSÍNCRONO do ForjaView (busca do mapa real ao motor), isolados num arquivo próprio
// pra não disputar o `act()` com os testes de interação síncrona (clique de tab) do ForjaView.test.tsx.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

vi.mock("@/lib/voice/useTTS", () => ({ useTTS: () => ({ speak: vi.fn(() => Promise.resolve()), stop: vi.fn(), speaking: false }), default: () => ({ speak: vi.fn(), stop: vi.fn(), speaking: false }) }));

import ForjaView from "./ForjaView";
import { cursoEsqueletoPorId } from "@/lib/forja/cursoRepo";

const fetchReal = global.fetch;
const respondeMapa = (corpo: unknown) => { global.fetch = vi.fn(async () => new Response(JSON.stringify(corpo), { status: 200 })) as typeof fetch; };
beforeEach(() => respondeMapa({ grafo: null, engine: false }));
afterEach(() => { cleanup(); global.fetch = fetchReal; });

describe("ForjaView — busca do mapa ao motor", () => {
  it("curso real sem mapa: pede o mapa e enche o board com os nós centrais", async () => {
    const real = cursoEsqueletoPorId("quiz")!; // repo real → dispara a análise
    const grafo = {
      nos: [
        { id: "a", tipo: "funcao", nome: "main()", grau: 5, fonte: "graphify" },
        { id: "b", tipo: "arquivo", nome: "app.js", grau: 2, fonte: "graphify" },
      ],
      arestas: [{ de: "a", para: "b", tipo: "chama" }],
      raiz: "a",
    };
    respondeMapa({ grafo, engine: true });
    const { getByText, getByTestId } = render(<ForjaView data={real} />);
    await waitFor(() => expect(getByText("main()")).toBeTruthy());
    expect(getByTestId("forja-mapa-resumo").textContent).toMatch(/2 elementos mapeados/);
  });

  it("curso real mas sem ponte: degrada pro aviso de esqueleto", async () => {
    const real = cursoEsqueletoPorId("quiz")!;
    respondeMapa({ grafo: null, engine: false });
    const { getByText } = render(<ForjaView data={real} />);
    await waitFor(() => expect(getByText(/O mapa do código entra aqui/)).toBeTruthy());
  });
});
