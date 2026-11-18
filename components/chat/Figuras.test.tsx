// @vitest-environment jsdom
/** As figuras de formulas-katex e diagrama-mermaid no chat: o que aparece, e o que fica quando a biblioteca falha. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

const mm = vi.hoisted(() => ({ config: null as Record<string, unknown> | null, pedidos: [] as string[], falhar: false }));
vi.mock("mermaid", () => ({
  default: {
    initialize: (c: Record<string, unknown>) => { mm.config = c; },
    render: async (_id: string, codigo: string) => {
      mm.pedidos.push(codigo);
      if (mm.falhar) throw new Error("Parse error");
      return { svg: '<svg data-falso="1"><g class="node"></g></svg>' };
    },
  },
}));

import PassosMatematica from "./PassosMatematica";
import DiagramaMermaid from "./DiagramaMermaid";
import ChatMarkdown from "@/components/study/ChatMarkdown";

const PASSOS = JSON.stringify([
  { passo: 1, latex: "2x + 6 = 10", explicacao: "Equação original." },
  { passo: 2, latex: "2x = 4", explicacao: "Subtrai 6 dos dois lados." },
  { passo: 3, latex: "x = 2", explicacao: "Divide por 2." },
]);
const DIAG = JSON.stringify({ titulo: "Login", tipo: "flowchart", mermaid: "flowchart TD\n  A[\"Entrar\"] --> B{\"Ok?\"}", leitura: "De cima para baixo." });

beforeEach(() => { mm.pedidos.length = 0; mm.falhar = false; });
afterEach(() => cleanup());

describe("PassosMatematica", () => {
  it("um cartão por passo, a fórmula em KaTeX e a regra embaixo", async () => {
    const { container } = render(<PassosMatematica json={PASSOS} />);
    expect(container.querySelectorAll("[data-passo]")).toHaveLength(3);
    await waitFor(() => expect(container.querySelectorAll(".katex-display")).toHaveLength(3));
    expect(container.textContent).toContain("Subtrai 6 dos dois lados.");
  });

  it("LaTeX do modelo não vira HTML nem link: o KaTeX roda sem `trust`", async () => {
    const mau = JSON.stringify([{ passo: 1, latex: "\\href{javascript:alert(1)}{x} <img src=x onerror=alert(1)>", explicacao: "<b>negrito</b>" }]);
    const { container } = render(<PassosMatematica json={mau} />);
    await waitFor(() => expect(container.querySelector(".katex")).not.toBeNull());
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<b>negrito</b>");   // a explicação é texto
  });

  it("resolução inválida avisa com o motivo", () => {
    const { container } = render(<PassosMatematica json={'[{"latex":"x"}]'} />);
    expect(container.querySelector("[data-passos-erro]")!.textContent).toMatch(/faltam chaves/);
  });
});

describe("DiagramaMermaid", () => {
  it("configura o Mermaid em modo estrito e desenha o SVG com título e leitura", async () => {
    const { container } = render(<DiagramaMermaid json={DIAG} />);
    await waitFor(() => expect(container.querySelector("[data-diagrama-svg] svg")).not.toBeNull());
    expect(mm.config).toMatchObject({ securityLevel: "strict", startOnLoad: false });
    expect(mm.pedidos[0]).toBe("flowchart TD\n  A[\"Entrar\"] --> B{\"Ok?\"}");
    expect(container.querySelector("[data-diagrama]")!.getAttribute("data-diagrama")).toBe("flowchart");
    expect(container.textContent).toContain("Login");
    expect(container.textContent).toContain("De cima para baixo.");
    expect(container.querySelector("[data-diagrama-codigo]")).toBeNull();
  });

  it("sintaxe que o Mermaid recusa: o código fica na tela, com o aviso", async () => {
    mm.falhar = true;
    const { container } = render(<DiagramaMermaid json={DIAG} />);
    await waitFor(() => expect(container.textContent).toContain("Não foi possível desenhar"));
    expect(container.querySelector("[data-diagrama-codigo]")!.textContent).toContain("flowchart TD");
    expect(container.querySelector("[data-diagrama-svg]")).toBeNull();
  });

  it("diretiva de configuração nem chega ao Mermaid", () => {
    const mau = JSON.stringify({ titulo: "x", tipo: "flowchart", mermaid: '%%{init: {"securityLevel":"loose"}}%%\nflowchart TD\n A-->B', leitura: "" });
    const { container } = render(<DiagramaMermaid json={mau} />);
    expect(container.querySelector("[data-diagrama-erro]")!.textContent).toMatch(/diretiva/);
    expect(mm.pedidos).toHaveLength(0);
  });

  it("aceita o código direto, do bloco ```mermaid", async () => {
    const { container } = render(<DiagramaMermaid codigo={"sequenceDiagram\n  A->>B: oi"} />);
    await waitFor(() => expect(container.querySelector("[data-diagrama-svg]")).not.toBeNull());
    expect(container.querySelector("[data-diagrama]")!.getAttribute("data-diagrama")).toBe("sequence");
  });
});

describe("ChatMarkdown — as três entradas de cada figura", () => {
  it("resposta inteira em JSON (o formato que as skills ditam)", async () => {
    expect(render(<ChatMarkdown text={PASSOS} />).container.querySelector("[data-passos]")).not.toBeNull();
    cleanup();
    const { container } = render(<ChatMarkdown text={DIAG} />);
    await waitFor(() => expect(container.querySelector("[data-diagrama-svg]")).not.toBeNull());
  });

  it("bloco com a linguagem da figura, com texto em volta", () => {
    const { container } = render(<ChatMarkdown text={"Veja a conta:\n```passos\n" + PASSOS + "\n```\nE o fluxo:\n```diagrama\n" + DIAG + "\n```\nFim."} />);
    expect(container.querySelector("[data-passos]")).not.toBeNull();
    expect(container.querySelector("[data-diagrama]")).not.toBeNull();
    expect(container.textContent).toContain("Veja a conta:");
    expect(container.textContent).toContain("Fim.");
  });

  it("bloco ```json e bloco ```mermaid", () => {
    expect(render(<ChatMarkdown text={"```json\n" + PASSOS + "\n```"} />).container.querySelector("[data-passos]")).not.toBeNull();
    cleanup();
    expect(render(<ChatMarkdown text={"```mermaid\nflowchart LR\n A-->B\n```"} />).container.querySelector("[data-diagrama]")).not.toBeNull();
  });

  it("JSON e código de outra coisa seguem como código", () => {
    for (const texto of ['```json\n{"nome":"Ana","idade":20}\n```', "```python\nprint([1, 2, 3])\n```", '[{"titulo":"Slide 1","conteudo":"abertura"}]']) {
      const { container } = render(<ChatMarkdown text={texto} />);
      expect(container.querySelector("[data-passos],[data-diagrama],[data-geometria],[data-passos-erro],[data-diagrama-erro]"), texto).toBeNull();
      cleanup();
    }
  });
});
