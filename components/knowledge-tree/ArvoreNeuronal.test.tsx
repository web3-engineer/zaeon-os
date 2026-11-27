// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import ArvoreNeuronal from "./ArvoreNeuronal";
import type { NoArvore } from "@/lib/knowledge-tree/tipos";

const f = (id: string, tipo: NoArvore["tipo"] = "ideia"): NoArvore => ({ id, titulo: "Lição " + id, tipo, filhos: [] });
const ARVORE: NoArvore = {
  id: "r", titulo: "Curso Exemplo", tipo: "raiz", filhos: [
    { id: "A", titulo: "Módulo A", tipo: "modulo", filhos: [f("a1"), f("a2", "codigo")] },
    { id: "B", titulo: "Módulo B", tipo: "modulo", filhos: [f("b1", "pratica")] },
  ],
};

function Controlado({ inicial = [] as string[], onReiniciar = () => {} }) {
  const [c, setC] = useState<string[]>(inicial);
  return (
    <ArvoreNeuronal arvore={ARVORE} concluidas={c} titulo="Curso Exemplo"
      onConcluir={(ids) => setC((x) => Array.from(new Set([...x, ...ids])))}
      onReiniciar={() => { setC([]); onReiniciar(); }}
      renderLicao={(no) => <p data-testid="corpo">corpo de {no.id}</p>} />
  );
}
const dialogo = () => screen.queryByRole("dialog");
const tituloLicao = () => dialogo()?.querySelector("h1")?.textContent;
const no = (id: string) => document.querySelector(`[data-no="${id}"]`) as Element;

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("ArvoreNeuronal — fluxo de lições", () => {
  it("renderiza a raiz e os nós visíveis com aria-label", () => {
    render(<Controlado />);
    expect(no("r")).toBeTruthy();
    expect(no("A").getAttribute("role")).toBe("button");
    expect(no("A").getAttribute("aria-label")).toMatch(/Módulo A.*Pendente.*0 de 2 dentro.*Desafio \d de 5/);
    expect(screen.getByTestId("an-contagem").textContent).toBe("0/6 lições");
    expect(screen.getByTestId("an-pct").textContent).toBe("0%");
  });

  it("clicar num nó abre a lição dele; raiz mostra 'começar a jornada ▸'", () => {
    render(<Controlado />);
    fireEvent.click(no("r"));
    expect(tituloLicao()).toBe("Curso Exemplo");
    expect(screen.getByRole("button", { name: "começar a jornada ▸" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "próxima lição ▸" })).toBeNull();
    expect(screen.getByTestId("corpo").textContent).toBe("corpo de r");
  });

  it("'próxima lição ▸' marca a atual, mostra a árvore, expande o caminho e abre a próxima", () => {
    render(<Controlado />);
    fireEvent.click(no("A"));
    expect(tituloLicao()).toBe("Módulo A");
    fireEvent.click(screen.getByRole("button", { name: "próxima lição ▸" }));
    // a árvore fica à mostra (~1,3 s) antes de abrir a próxima
    expect(dialogo()).toBeNull();
    expect(no("a1")).toBeTruthy();                       // caminho até a próxima aberto
    expect(no("b1")).toBeNull();                         // o resto recolhido
    expect(screen.getByTestId("an-contagem").textContent).toBe("1/6 lições");
    act(() => { vi.advanceTimersByTime(1300); });
    expect(tituloLicao()).toBe("Lição a1");
  });

  it("três 'próxima lição' seguidas a partir da raiz concluem 3 lições na ordem", () => {
    render(<Controlado />);
    fireEvent.click(no("r"));
    fireEvent.click(screen.getByRole("button", { name: "começar a jornada ▸" }));
    act(() => { vi.advanceTimersByTime(1300); });
    expect(tituloLicao()).toBe("Módulo A");
    fireEvent.click(screen.getByRole("button", { name: "próxima lição ▸" }));
    act(() => { vi.advanceTimersByTime(1300); });
    fireEvent.click(screen.getByRole("button", { name: "próxima lição ▸" }));
    act(() => { vi.advanceTimersByTime(1300); });
    expect(tituloLicao()).toBe("Lição a2");
    expect(screen.getByTestId("an-contagem").textContent).toBe("3/6 lições");
    expect(screen.getByTestId("an-pct").textContent).toBe("50%");
  });

  it("'concluir ✓' marca e volta pra árvore; o nó fica azul (concluído)", () => {
    render(<Controlado />);
    fireEvent.click(no("B"));
    fireEvent.click(screen.getByRole("button", { name: "concluir ✓" }));
    expect(dialogo()).toBeNull();
    expect(no("B").classList.contains("an-feito")).toBe(true);
    expect(screen.getByTestId("an-contagem").textContent).toBe("1/6 lições");
  });

  it("cards dos filhos mostram '✓ concluída' e 'x/y dentro'", () => {
    render(<Controlado inicial={["a1"]} />);
    fireEvent.click(no("r"));
    const cardA = document.querySelector('[data-filho="A"]')!;
    expect(cardA.textContent).toContain("1/2 dentro");
    fireEvent.click(cardA);
    expect(tituloLicao()).toBe("Módulo A");
    expect(document.querySelector('[data-filho="a1"]')!.textContent).toContain("✓ concluída");
  });

  it("anel de progresso contínuo (fração da subárvore) nos nós com descendentes; raiz sem anel nem círculos extras", () => {
    render(<Controlado inicial={["a1"]} />);
    const anel = no("A").querySelector(".an-anel")!;
    expect(anel.getAttribute("data-frac")).toBe("0.500");
    expect(anel.querySelector("path")!.getAttribute("d")).toMatch(/A/);
    const raiz = no("r");
    expect(raiz.querySelector(".an-anel")).toBeNull();
    expect(raiz.querySelectorAll("circle")).toHaveLength(2);     // brilho + corpo, só
    expect(raiz.querySelector("animateTransform")).toBeNull();
    expect(raiz.querySelector('circle[r="21"]')).toBeTruthy();
  });

  it("nenhuma stroke-dasharray em lugar nenhum (regressão do tracejado)", () => {
    render(<Controlado inicial={["A", "a1"]} />);
    fireEvent.click(screen.getByRole("button", { name: "visão geral" }));
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/stroke-dasharray|strokeDasharray/i);
    expect(document.querySelectorAll(".an-aresta").length).toBeGreaterThan(0);
    for (const a of document.querySelectorAll(".an-aresta path")) {
      expect(a.getAttribute("fill")).not.toBe("none");   // axônios são preenchidos
    }
  });

  it("'começar ▸' vira 'continuar ▸' e abre a primeira pendente", () => {
    render(<Controlado inicial={["r", "A"]} />);
    fireEvent.click(screen.getByRole("button", { name: "continuar ▸" }));
    expect(tituloLicao()).toBe("Lição a1");
  });

  it("'visão geral' expande o que tem progresso", () => {
    render(<Controlado inicial={["b1"]} />);
    expect(no("b1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "visão geral" }));
    expect(no("b1")).toBeTruthy();
  });

  it("reiniciar exige 2 cliques", () => {
    const spy = vi.fn();
    render(<Controlado inicial={["r", "A"]} onReiniciar={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "reiniciar progresso" }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByTestId("an-contagem").textContent).toBe("2/6 lições");
    fireEvent.click(screen.getByRole("button", { name: "clique de novo para reiniciar" }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("an-contagem").textContent).toBe("0/6 lições");
  });

  it("o 1º clique em reiniciar expira sozinho", () => {
    const spy = vi.fn();
    render(<Controlado inicial={["r"]} onReiniciar={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "reiniciar progresso" }));
    act(() => { vi.advanceTimersByTime(4100); });
    fireEvent.click(screen.getByRole("button", { name: "reiniciar progresso" }));
    expect(spy).not.toHaveBeenCalled();
  });

  it("árvore completa mostra o aviso", () => {
    render(<Controlado inicial={["r", "A", "a1", "a2", "B"]} />);
    fireEvent.click(screen.getByRole("button", { name: "continuar ▸" }));
    expect(tituloLicao()).toBe("Lição b1");
    fireEvent.click(screen.getByRole("button", { name: "próxima lição ▸" }));
    expect(screen.getByRole("status").textContent).toMatch(/Árvore completa/);
    expect(screen.queryByRole("button", { name: "continuar ▸" })).toBeNull();
    expect(screen.getByTestId("an-pct").textContent).toBe("100%");
  });

  it("teclado: Enter no nó abre a lição; Esc volta pra árvore", () => {
    render(<Controlado />);
    fireEvent.keyDown(no("A"), { key: "Enter" });
    expect(tituloLicao()).toBe("Módulo A");
    fireEvent.keyDown(dialogo()!, { key: "Escape" });
    expect(dialogo()).toBeNull();
  });

  it("sem movimento (reduced-motion): nenhum pulso animado", () => {
    render(<ArvoreNeuronal arvore={ARVORE} concluidas={[]} onConcluir={() => {}} onReiniciar={() => {}} semMovimento />);
    expect(document.querySelectorAll("animateMotion")).toHaveLength(0);
    expect(document.querySelector(".an-coracao")).toBeNull();
  });

  it("com movimento: pulsos com <set> de opacidade e animateMotion; começam invisíveis", () => {
    render(<ArvoreNeuronal arvore={ARVORE} concluidas={[]} onConcluir={() => {}} onReiniciar={() => {}} />);
    const p = document.querySelector(".an-pulso")!;
    expect(p.getAttribute("opacity")).toBe("0");
    expect(p.querySelector("set")!.getAttribute("attributeName")).toBe("opacity");
    expect(p.querySelector("animateMotion")!.getAttribute("repeatCount")).toBe("indefinite");
    expect(document.querySelector(".an-coracao")).toBeTruthy();
  });
});
