// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import ForjaView from "./ForjaView";
import { cursoEsqueletoPorId } from "@/lib/forja/cursoRepo";

afterEach(() => cleanup());

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
    // básico (padrão): cobra perguntas, não exige digitação
    expect(getByText("perguntas")).toBeTruthy();
    expect(queryByText(/exige digitação/)).toBeNull();
    // avançado: traz o codebox e exige digitação
    fireEvent.click(getByRole("tab", { name: "Avançado" }));
    expect(getByText("digitar (sem colar)")).toBeTruthy();
    expect(getByText(/exige digitação/)).toBeTruthy();
  });

  it("sem saída de engine, mostra o aviso de que o mapa entra depois", () => {
    const { getByText } = render(<ForjaView data={curso} />);
    expect(getByText(/O mapa do código entra aqui/)).toBeTruthy();
  });

  it("sem dados nem artifactId, mostra o carregando", () => {
    const { getByText } = render(<ForjaView />);
    expect(getByText(/Carregando o estudo/)).toBeTruthy();
  });
});
