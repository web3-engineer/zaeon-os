// @vitest-environment jsdom
/** A figura da skill geometria-jsxgraph: o que chega ao JSXGraph, e o que fica na tela quando ele não chega. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

type Chamada = { tipo: string; pais: unknown[]; atributos: Record<string, unknown> };
const jxg = vi.hoisted(() => ({
  chamadas: [] as Chamada[],
  quadros: [] as Record<string, unknown>[],
  liberados: 0,
  falhar: false,
}));

vi.mock("jsxgraph", () => ({
  default: {
    JSXGraph: {
      initBoard: (_el: unknown, attrs: Record<string, unknown>) => {
        if (jxg.falhar) throw new Error("sem biblioteca");
        jxg.quadros.push(attrs);
        return {
          create: (tipo: string, pais: unknown[], atributos: Record<string, unknown>) => {
            jxg.chamadas.push({ tipo, pais, atributos });
            return { __el: atributos.name };
          },
        };
      },
      freeBoard: () => { jxg.liberados++; },
    },
  },
}));

import GeometriaDinamica, { atributosDoElemento, montarConstrucao } from "./GeometriaDinamica";
import ChatMarkdown from "@/components/study/ChatMarkdown";
import { parseGeometria } from "@/lib/chat/geometria";

const MEDIATRIZ = JSON.stringify([
  { nome: "A", tipo: "point", pais: [-3, 0], papel: "ponto livre" },
  { nome: "B", tipo: "point", pais: [3, 1], papel: "ponto livre" },
  { nome: "s", tipo: "segment", pais: ["A", "B"], papel: "o segmento AB" },
  { nome: "M", tipo: "midpoint", pais: ["A", "B"], papel: "ponto médio de AB" },
  { nome: "m", tipo: "perpendicular", pais: ["s", "M"], papel: "mediatriz de AB" },
]);

beforeEach(() => { jxg.chamadas.length = 0; jxg.quadros.length = 0; jxg.liberados = 0; jxg.falhar = false; });
afterEach(() => cleanup());

describe("montarConstrucao — o que chega à biblioteca", () => {
  const els = (json: string) => { const r = parseGeometria(json); if (!r.ok) throw new Error(r.erro); return r.elementos; };
  const quadroFalso = () => {
    const chamadas: Chamada[] = [];
    return { chamadas, create: (tipo: string, pais: unknown[], atributos: Record<string, unknown> = {}) => { chamadas.push({ tipo, pais, atributos }); return { __el: atributos.name }; } };
  };

  it("cria na ordem, e os dependentes recebem os OBJETOS dos pais, não os nomes", () => {
    const q = quadroFalso();
    montarConstrucao(q, els(MEDIATRIZ));
    expect(q.chamadas.map((c) => c.tipo)).toEqual(["point", "point", "segment", "midpoint", "perpendicular"]);
    expect(q.chamadas[0].pais).toEqual([-3, 0]);
    expect(q.chamadas[2].pais).toEqual([{ __el: "A" }, { __el: "B" }]);
    expect(q.chamadas[4].pais).toEqual([{ __el: "s" }, { __el: "M" }]);   // é dependente: acompanha o arrasto
  });

  it("a expressão do modelo chega como FUNÇÃO compilada, nunca como string", () => {
    const q = quadroFalso();
    montarConstrucao(q, els('[{"nome":"f","tipo":"functiongraph","pais":["x^2 - 3*x + 2"],"papel":"parábola"}]'));
    const f = q.chamadas[0].pais[0];
    expect(typeof f).toBe("function");
    expect((f as (x: number) => number)(3)).toBeCloseTo(2);
  });

  it("o índice da interseção passa como número", () => {
    const q = quadroFalso();
    montarConstrucao(q, els(JSON.stringify([
      { nome: "A", tipo: "point", pais: [0, 0], papel: "" }, { nome: "B", tipo: "point", pais: [2, 0], papel: "" },
      { nome: "r", tipo: "line", pais: ["A", "B"], papel: "" }, { nome: "c", tipo: "circle", pais: ["A", "B"], papel: "" },
      { nome: "I", tipo: "intersection", pais: ["r", "c", 1], papel: "" },
    ])));
    expect(q.chamadas[4].pais).toEqual([{ __el: "r" }, { __el: "c" }, 1]);
  });

  it("ponto livre arrasta; ponto dependente é fixo", () => {
    const [a, , , m] = els(MEDIATRIZ);
    expect(atributosDoElemento(a).fixed).toBeUndefined();
    expect(atributosDoElemento(m).fixed).toBe(true);
  });
});

describe("GeometriaDinamica — na tela", () => {
  it("abre o quadro quadrado, sem zoom na roda, e monta a construção", async () => {
    const { container } = render(<GeometriaDinamica json={MEDIATRIZ} />);
    await waitFor(() => expect(jxg.chamadas).toHaveLength(5));
    expect(jxg.quadros[0]).toMatchObject({ keepAspectRatio: true, showCopyright: false, showNavigation: false, zoom: { wheel: false } });
    expect(container.querySelector("[data-geometria][aria-label] [data-geometria-quadro]")).not.toBeNull();
    expect(container.textContent).toContain("Arraste os pontos A, B");
  });

  it("a lista da construção está na tela com ou sem a biblioteca", async () => {
    jxg.falhar = true;
    const { container } = render(<GeometriaDinamica json={MEDIATRIZ} />);
    await waitFor(() => expect(container.textContent).toContain("Não foi possível carregar o desenho"));
    expect(container.querySelectorAll("[data-geometria-passos] li")).toHaveLength(5);
    expect(container.textContent).toContain("mediatriz de AB");
  });

  it("construção inválida avisa com o motivo, sem abrir quadro", () => {
    const { container } = render(<GeometriaDinamica json={'[{"nome":"<b>","tipo":"point","pais":[0,0]}]'} />);
    expect(container.querySelector("[data-geometria-erro]")!.textContent).toMatch(/nome inválido/);
    expect(jxg.quadros).toHaveLength(0);
  });

  it("libera o quadro ao desmontar", async () => {
    const { unmount } = render(<GeometriaDinamica json={MEDIATRIZ} />);
    await waitFor(() => expect(jxg.chamadas).toHaveLength(5));
    unmount();
    expect(jxg.liberados).toBe(1);
  });
});

describe("ChatMarkdown — por onde a construção chega", () => {
  it("bloco ```geometria vira figura", () => {
    const { container } = render(<ChatMarkdown text={"Veja:\n```geometria\n" + MEDIATRIZ + "\n```\nPronto."} />);
    expect(container.querySelector("[data-geometria]")).not.toBeNull();
    expect(container.textContent).toContain("Veja:");
    expect(container.textContent).toContain("Pronto.");
  });

  it("a resposta INTEIRA em JSON (o formato que a skill dita) vira figura", () => {
    const { container } = render(<ChatMarkdown text={MEDIATRIZ} />);
    expect(container.querySelector("[data-geometria]")).not.toBeNull();
  });

  it("bloco ```json com a construção vira figura", () => {
    const { container } = render(<ChatMarkdown text={"```json\n" + MEDIATRIZ + "\n```"} />);
    expect(container.querySelector("[data-geometria]")).not.toBeNull();
  });

  it("JSON de outra coisa continua código — a figura não sequestra o bloco", () => {
    const outro = '[{"titulo":"Slide 1","conteudo":"abertura"}]';
    for (const texto of ["```json\n" + outro + "\n```", outro]) {
      const { container } = render(<ChatMarkdown text={texto} />);
      expect(container.querySelector("[data-geometria]")).toBeNull();
      expect(container.querySelector("[data-geometria-erro]")).toBeNull();
      expect(container.textContent).toContain("Slide 1");
      cleanup();
    }
  });

  it("```geometria quebrado avisa em vez de sumir", () => {
    const { container } = render(<ChatMarkdown text={'```geometria\n[{"nome":"A","tipo":"point","pais":[0\n```'} />);
    expect(container.querySelector("[data-geometria-erro]")).not.toBeNull();
  });
});
