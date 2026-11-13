// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import CodeBox from "./CodeBox";
import type { Sinal } from "@/lib/guia/tipos";

afterEach(() => cleanup());

describe("CodeBox — digitação pura (cola bloqueada)", () => {
  it("colar é barrado e vira sinal `colou` + aviso", () => {
    const sinais: Sinal[] = [];
    const { getByLabelText, getByText } = render(<CodeBox aoSinal={(s) => sinais.push(s)} />);
    const ta = getByLabelText(/caixa de código/) as HTMLTextAreaElement;
    fireEvent.paste(ta, { clipboardData: { getData: () => "x = 1" } });
    expect(sinais.some((s) => s.tipo === "atividade" && s.fonte === "colou")).toBe(true);
    expect(getByText(/Colar está desligado/)).toBeTruthy();
  });

  it("digitar emite `digitou` e, batendo o alvo, o objetivo `alcancou`", () => {
    const sinais: Sinal[] = [];
    const { getByLabelText } = render(<CodeBox aoSinal={(s) => sinais.push(s)} alvo="ok" objetivoId="k" />);
    const ta = getByLabelText(/caixa de código/) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "ok" } });
    expect(sinais.some((s) => s.tipo === "atividade" && s.fonte === "digitou")).toBe(true);
    expect(sinais.some((s) => s.tipo === "objetivo" && s.estado === "alcancou" && s.id === "k")).toBe(true);
  });
});
