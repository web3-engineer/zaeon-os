import { describe, it, expect } from "vitest";
import { narracaoDoTurno } from "./narracao";
import type { EventoTurno } from "./passos";

// monta eventos de turno mínimos: uma tool que grava arquivo, outra que publica, um erro.
const gravou = (seq: number, path: string): EventoTurno[] => [
  { seq, tipo: "tool", dados: { tool: "octa_escrever_arquivo", path } },
  { seq: seq + 1, tipo: "resultado", dados: { seq, ok: true } },
  { seq: seq + 2, tipo: "arquivo", dados: { path, acao: "gravado" } },
];

describe("narracaoDoTurno (a voz da Octa)", () => {
  it("conta os arquivos escritos", () => {
    const n = narracaoDoTurno([...gravou(1, "a.ts"), ...gravou(4, "b.ts")], "ok");
    expect(n).toMatch(/escrevi 2 arquivos/);
    expect(n).toMatch(/olhada/);
  });

  it("menciona a publicação no GitHub", () => {
    const ev: EventoTurno[] = [
      ...gravou(1, "index.html"),
      { seq: 10, tipo: "tool", dados: { tool: "octa_publicar_github" } },
      { seq: 11, tipo: "resultado", dados: { seq: 10, ok: true } },
    ];
    expect(narracaoDoTurno(ev, "ok")).toMatch(/publiquei no GitHub/);
  });

  it("status de erro vira um convite a tentar de novo", () => {
    expect(narracaoDoTurno([], "erro")).toMatch(/erro/i);
  });

  it("turno sem nada a dizer devolve vazio", () => {
    expect(narracaoDoTurno([], "ok")).toBe("");
  });
});
