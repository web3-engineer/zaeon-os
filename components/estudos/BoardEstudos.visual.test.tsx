// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ mudar: vi.fn(), cards: [] as any[] }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "user" } } }) }));
vi.mock("./BlueprintEstudo", () => ({ default: () => null }));
vi.mock("./ConvitesBoard", () => ({ default: () => <button>Pessoas</button> }));
vi.mock("./useBoardEstudos", () => ({ useBoardEstudos: () => ({ board: { id: "board", titulo: "Meus estudos", cards: mocks.cards, papel: "dono", rev: 0 }, compartilhados: [], presentes: [], cursores: {}, gerando: {}, mudar: mocks.mudar, moverCursor: vi.fn(), abrir: vi.fn(), convidar: vi.fn() }) }));
import BoardEstudos from "./BoardEstudos";
afterEach(() => { cleanup(); mocks.mudar.mockClear(); mocks.cards = []; vi.unstubAllGlobals(); });

describe("quadro de estudos", () => {
  it("permite criar uma nota pela barra do quadro", () => {
    render(<BoardEstudos />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar nota" }));
    expect(mocks.mudar).toHaveBeenCalledWith([expect.objectContaining({ tipo: "nota" })]);
  });
  it("salva a nova posição ao soltar um card arrastado", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    mocks.cards = [{ id: "nota-1", tipo: "nota", x: 100, y: 200, w: 260, corpo: "Minha nota" }];
    const { container } = render(<BoardEstudos />);
    const cabecalho = screen.getByText("Minha nota");
    const quadro = container.firstElementChild!;
    fireEvent.pointerDown(cabecalho, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(quadro, { clientX: 155, clientY: 155 });
    fireEvent.pointerUp(quadro, { clientX: 155, clientY: 155 });
    expect(mocks.mudar).toHaveBeenCalledWith([expect.objectContaining({ id: "nota-1", x: 200, y: 300 })]);
  });
  it("oferece controles de zoom identificados", () => {
    render(<BoardEstudos />);
    expect(screen.getByRole("button", { name: "Aumentar zoom" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Diminuir zoom" })).toBeTruthy();
  });
});
