// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import StructuredAnswerView from "@/components/study/StructuredAnswerView";
import { FolhaDePapel } from "@/components/trechos/FolhaDePapel";
import type { StructuredAnswer, TrechoEmPapel } from "@/lib/agent/contracts";

afterEach(cleanup);

const T = (id: string, extra: Partial<TrechoEmPapel> = {}): TrechoEmPapel => ({
  id, documentoId: "d1", titulo: "Apostila de Biologia", paginas: "12", relevancia: 3,
  citacao: `A fotossíntese ocorre nos cloroplastos (${id}).`, antes: "…no capítulo 2,", depois: "Na fase clara…", motivo: "define onde ocorre",
  ...extra,
});

describe("FolhaDePapel", () => {
  it("mostra título, página, carimbo, a citação literal (com contexto) e o porquê", () => {
    render(<FolhaDePapel trecho={T("T1")} animar={false} />);
    expect(screen.getByText("Apostila de Biologia")).toBeTruthy();
    expect(screen.getByText("· p. 12")).toBeTruthy();
    expect(screen.getByText("responde")).toBeTruthy();
    expect(screen.getByText("A fotossíntese ocorre nos cloroplastos (T1).")).toBeTruthy();
    expect(screen.getByText(/define onde ocorre/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /copiar trecho/i })).toBeTruthy();
  });
});

describe("folhas DENTRO do texto da resposta", () => {
  it("cada folha entra depois do parágrafo âncora; a sem lugar vai pra pilha do fim", () => {
    const answer: StructuredAnswer = {
      nucleo: "Primeiro parágrafo.\n\nSegundo parágrafo.",
      trechos: [T("T1", { ancora: { campo: "nucleo", paragrafo: 0 } }), T("T2")],
    };
    const { container } = render(<StructuredAnswerView answer={answer} />);
    const ordem = [...container.querySelectorAll("p, figure")].map((el) =>
      el.tagName === "FIGURE" ? `folha:${el.getAttribute("data-trecho")}` : el.textContent?.trim()).filter(Boolean);
    const i1 = ordem.indexOf("Primeiro parágrafo."), f1 = ordem.indexOf("folha:T1"), i2 = ordem.indexOf("Segundo parágrafo."), f2 = ordem.indexOf("folha:T2");
    expect(i1).toBeGreaterThanOrEqual(0);
    expect(i1 < f1 && f1 < i2 && i2 < f2).toBe(true);
    expect(screen.getByText("Trecho do seu material")).toBeTruthy();
  });

  it("sem trechos, a resposta é exatamente a de antes (nenhuma folha)", () => {
    const { container } = render(<StructuredAnswerView answer={{ nucleo: "Só texto." }} />);
    expect(container.querySelector("figure.folha-papel")).toBeNull();
  });
});
