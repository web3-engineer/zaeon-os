// @vitest-environment jsdom
/**
 * AnatomiaView — a PLACA, sem WebGL.
 *
 * O portão do 3D existe justamente para o caminho padrão não tocar em geometria, e é esse caminho que
 * o teste exerce: nada aqui monta `CenaDoCorpo` nem busca `/models/atlas.json`. Se um dia a placa
 * passar a montar a cena sozinha, estes testes quebram — e é o que a gente quer que quebre.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import AnatomiaView, { cenaUtilizavel, rotuloDeMalhas, type AnatomiaData } from "./AnatomiaView";

afterEach(cleanup);

const ESTADO = {
  explode: 0,
  visible: ["respiratory"] as any,
  selected: ["FJ1234", "FJ1235"],
  isolate: false,
  view: "three-quarter" as any,
  rotate: false,
  reset: 0,
};

const PULMAO: AnatomiaData = {
  conceito: { id: "FMA7310", nome: "left lung" },
  estado: ESTADO,
  sistemas: ["Respiratório"],
  sistemasIds: ["respiratory"] as any,
  pecas: 124,
  explicacao: "As vias aéreas conduzem o ar até os pulmões.",
  termoBuscado: "lung",
  viaSinonimo: true,
  alternativas: [{ id: "FMA7309", nome: "right lung", pecas: 156 }],
  fonte: { title: "BodyParts3D 4.0 (CC BY 4.0)", url: "https://exemplo.invalido/bp3d" },
  aviso: "Atlas educacional, referência de adulto masculino. Não é ferramenta clínica.",
};

describe("rotuloDeMalhas (PURA)", () => {
  it("singular, plural e separador de milhar", () => {
    expect(rotuloDeMalhas(1)).toBe("1 malha");
    expect(rotuloDeMalhas(124)).toBe("124 malhas");
    expect(rotuloDeMalhas(2234)).toContain("malhas");
  });

  it("nada, zero, negativo e lixo não viram '0 malhas' nem NaN", () => {
    for (const v of [undefined, null, 0, -3, NaN, Infinity, "124"]) {
      expect(rotuloDeMalhas(v as unknown), String(v)).toBe("sem malha");
    }
  });
});

describe("cenaUtilizavel (PURA) — sem peça selecionada não há o que destacar", () => {
  it("com peças: sim", () => {
    expect(cenaUtilizavel(PULMAO)).toBe(true);
  });

  it("sem estado, com estado vazio, ou com selected não-array: não", () => {
    expect(cenaUtilizavel({})).toBe(false);
    expect(cenaUtilizavel({ estado: { ...ESTADO, selected: [] } })).toBe(false);
    expect(cenaUtilizavel({ estado: { ...ESTADO, selected: "FJ1" as any } })).toBe(false);
  });
});

describe("AnatomiaView — a placa é o padrão", () => {
  it("mostra nome, id, malhas, sistema e explicação, e NÃO monta canvas", () => {
    const { container, getByText } = render(<AnatomiaView data={PULMAO} />);
    expect(getByText("left lung")).toBeTruthy();
    expect(getByText("FMA7310")).toBeTruthy();
    expect(container.textContent).toContain("124 malhas");
    expect(container.textContent).toContain("Respiratório");
    expect(container.textContent).toContain("vias aéreas");
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("o aviso educacional aparece sem a pessoa pedir", () => {
    const { container } = render(<AnatomiaView data={PULMAO} />);
    expect(container.textContent).toContain("Não é ferramenta clínica");
  });

  it("a fonte vira link com o título da atribuição (exigência da CC BY 4.0)", () => {
    const { container } = render(<AnatomiaView data={PULMAO} />);
    const a = container.querySelector('a[href="https://exemplo.invalido/bp3d"]');
    expect(a).toBeTruthy();
    expect(a?.getAttribute("rel")).toContain("noopener");
    expect(container.textContent).toContain("CC BY 4.0");
  });

  it("oferece 'Ver em 3D' e o atalho para o atlas", () => {
    const { getByText, container } = render(<AnatomiaView data={PULMAO} />);
    expect(getByText("Ver em 3D")).toBeTruthy();
    expect(container.querySelector('a[href="/anatomia"]')).toBeTruthy();
  });

  it("sem cena utilizável NÃO oferece 3D, e ainda assim mostra os dados", () => {
    const semCena: AnatomiaData = { ...PULMAO, estado: { ...ESTADO, selected: [] } };
    const { container } = render(<AnatomiaView data={semCena} />);
    expect(container.textContent).not.toContain("Ver em 3D");
    expect(container.textContent).toContain("left lung");
  });

  it("payload vazio não quebra: cai em 'estrutura' e 'sem malha'", () => {
    const { container } = render(<AnatomiaView data={{}} />);
    expect(container.textContent).toContain("estrutura");
    expect(container.textContent).toContain("sem malha");
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("modo figura (nu): sem moldura de botões, mas com o portão do 3D e legenda acessível", () => {
    const { container } = render(<AnatomiaView data={PULMAO} nu />);
    expect(container.querySelector("figure")).toBeTruthy();
    expect(container.querySelector("figcaption")?.textContent).toBe("left lung");
    expect(container.querySelector('a[href="/anatomia"]')).toBeNull();
    expect(container.textContent).toContain("Ver em 3D");
    expect(container.querySelector("canvas")).toBeNull();
  });
});
