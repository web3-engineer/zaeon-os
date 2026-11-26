// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ mudar: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "user" } } }) }));
vi.mock("./BlueprintEstudo", () => ({ default: () => null }));
vi.mock("./ConvitesBoard", () => ({ default: () => <button>Pessoas</button> }));
vi.mock("./useBoardEstudos", () => ({ useBoardEstudos: () => ({ board: { id: "board", titulo: "Meus estudos", cards: [], papel: "dono", rev: 0 }, compartilhados: [], presentes: [], cursores: {}, gerando: {}, mudar: mocks.mudar, moverCursor: vi.fn(), abrir: vi.fn(), convidar: vi.fn() }) }));
import BoardEstudos from "./BoardEstudos";
afterEach(() => { cleanup(); mocks.mudar.mockClear(); });

describe("quadro de estudos", () => {
  it("permite criar uma nota pela barra do quadro", () => {
    render(<BoardEstudos />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar nota" }));
    expect(mocks.mudar).toHaveBeenCalledWith([expect.objectContaining({ tipo: "nota" })]);
  });
  it("oferece controles de zoom identificados", () => {
    render(<BoardEstudos />);
    expect(screen.getByRole("button", { name: "Aumentar zoom" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Diminuir zoom" })).toBeTruthy();
  });
});
