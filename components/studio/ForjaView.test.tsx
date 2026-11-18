// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";

vi.mock("@/lib/voice/useTTS", () => ({ useTTS: () => ({ speak: vi.fn(() => Promise.resolve()), stop: vi.fn(), speaking: false }), default: () => ({ speak: vi.fn(), stop: vi.fn(), speaking: false }) }));

import ForjaView from "./ForjaView";
import { cursoEsqueletoPorId } from "@/lib/forja/cursoRepo";

// o demo "exemplo" NÃO dispara análise (repo owner/exemplo) → estes testes ficam síncronos.
// (O caminho de busca do mapa, que é assíncrono, vive em ForjaView.engine.test.tsx, isolado.)
const fetchReal = global.fetch;
beforeEach(() => { global.fetch = vi.fn(async () => new Response(JSON.stringify({ grafo: null, engine: false }), { status: 200 })) as typeof fetch; });
afterEach(() => { cleanup(); global.fetch = fetchReal; });

const curso = cursoEsqueletoPorId("exemplo")!;

describe("ForjaView — board n8n + temperatura", () => {
  it("desenha o board: repo, módulos conectados em ordem e as conexões", () => {
    const { getByText, getByTestId } = render(<ForjaView data={curso} />);
    expect(getByText("owner/exemplo")).toBeTruthy();
    expect(getByText("Estudo de repositório")).toBeTruthy();
    const board = getByTestId("forja-board");
    expect(board.textContent).toContain("Entender o código");
    expect(board.textContent).toContain("Espelho do repositório");
    expect(board.textContent).toContain("Entregar (Octa)");
    expect(getByText(/2 conexão/)).toBeTruthy();
  });

  it("o regulador de temperatura muda o que a Zaeon COBRA", () => {
    const { getByText, getByRole, queryByText } = render(<ForjaView data={curso} />);
    expect(getByText("perguntas")).toBeTruthy();
    expect(queryByText(/exige digitação/)).toBeNull();
    fireEvent.click(getByRole("tab", { name: "Avançado" }));
    expect(getByText("digitar (sem colar)")).toBeTruthy();
    expect(getByText(/exige digitação/)).toBeTruthy();
  });

  it("as lições seguem a temperatura: básico sem codebox, avançado com a caixa sem-colar", () => {
    const { getByTestId, getByLabelText, queryByLabelText, getByRole } = render(<ForjaView data={curso} />);
    const sec = getByTestId("forja-licoes");
    expect(sec.textContent).toContain("Perguntas de compreensão");
    expect(queryByLabelText(/caixa de código/)).toBeNull();
    fireEvent.click(getByRole("tab", { name: "Avançado" }));
    expect(getByLabelText(/caixa de código/)).toBeTruthy();
  });

  it("monta o guia examinador da Zaeon", () => {
    const { container } = render(<ForjaView data={curso} />);
    expect(container.querySelector('[aria-label="Zaeon, sua guia"]')).toBeTruthy();
  });

  it("sem saída de engine (demo), mostra o aviso de que o mapa entra depois", () => {
    const { getByText } = render(<ForjaView data={curso} />);
    expect(getByText(/O mapa do código entra aqui/)).toBeTruthy();
  });

  it("sem dados nem artifactId, mostra o carregando", () => {
    const { getByText } = render(<ForjaView />);
    expect(getByText(/Carregando o estudo/)).toBeTruthy();
  });
});
