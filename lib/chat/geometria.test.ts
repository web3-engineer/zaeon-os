import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  MAX_ELEMENTOS, TIPOS_GEOMETRIA, caixaDaConstrucao, ehGeometria, parseGeometria, pontosLivres,
} from "@/lib/chat/geometria";

const j = (v: unknown) => JSON.stringify(v);
const P = (nome: string, x: number, y: number) => ({ nome, tipo: "point", pais: [x, y], papel: "ponto livre" });
const erro = (v: unknown): string => {
  const r = parseGeometria(typeof v === "string" ? v : j(v));
  return r.ok ? "" : r.erro;
};

const MEDIATRIZ = [
  P("A", -3, 0), P("B", 3, 1),
  { nome: "s", tipo: "segment", pais: ["A", "B"], papel: "o segmento AB" },
  { nome: "M", tipo: "midpoint", pais: ["A", "B"], papel: "ponto médio de AB" },
  { nome: "m", tipo: "perpendicular", pais: ["s", "M"], papel: "mediatriz de AB" },
];

describe("parseGeometria — o portão entre o modelo e o JSXGraph", () => {
  it("aceita a construção da mediatriz, na ordem", () => {
    const r = parseGeometria(j(MEDIATRIZ));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.elementos.map((e) => e.nome)).toEqual(["A", "B", "s", "M", "m"]);
  });

  it("tolera a cerca de markdown em volta do JSON", () => {
    expect(ehGeometria("```json\n" + j(MEDIATRIZ) + "\n```")).toBe(true);
    expect(ehGeometria("```\n" + j(MEDIATRIZ) + "\n```")).toBe(true);
  });

  it("o exemplo e a tabela do SKILL.md são exatamente o que o validador aceita", () => {
    const md = readFileSync(".claude/skills/geometria-jsxgraph/SKILL.md", "utf8");
    const exemplo = [...md.matchAll(/```\n(\[[\s\S]*?)\n```/g)].pop()![1];
    expect(erro(exemplo)).toBe("");
    // todo tipo da tabela do card existe no validador, e vice-versa: card e código não divergem
    const daTabela = [...md.matchAll(/^\| (`[a-z`, ]+`) \|/gm)].flatMap((m) => m[1].replace(/`/g, "").split(", ")).filter((t) => t !== "tipo");
    expect([...daTabela].sort()).toEqual([...TIPOS_GEOMETRIA].sort());
  });

  it("JSON de outra skill NÃO é geometria — slides e achados seguem como código", () => {
    expect(ehGeometria(j([{ titulo: "Slide 1", conteudo: "…" }]))).toBe(false);
    expect(ehGeometria(j([{ trecho: "x", problema: "y", base_legal: "z", severidade: "alta" }]))).toBe(false);
    expect(ehGeometria("[1, 2, 3]")).toBe(false);
    expect(ehGeometria("[]")).toBe(false);
    expect(ehGeometria('{"nome":"A"}')).toBe(false);
    expect(ehGeometria('[{"nome":"A","tipo":"point","pais":[0')).toBe(false); // streaming pela metade
  });

  it("o nome vira rótulo na figura: nada de marcação", () => {
    for (const nome of ["<b>A</b>", "A B", "<img src=x onerror=alert(1)>", "", "1A", "A".repeat(13)]) {
      expect(erro([{ ...P("A", 0, 0), nome }]), nome).toMatch(/nome inválido/);
    }
    expect(erro([P("A'", 0, 0), P("P_1", 1, 1)])).toBe("");
  });

  it("nome repetido e tipo fora do vocabulário são recusados", () => {
    expect(erro([P("A", 0, 0), P("A", 1, 1)])).toMatch(/repetido/);
    expect(erro([{ nome: "x", tipo: "text", pais: ["<script>"], papel: "" }])).toMatch(/tipo desconhecido/);
    expect(erro([{ nome: "x", tipo: "slider", pais: [], papel: "" }])).toMatch(/tipo desconhecido/);
  });

  it("dependência em ordem: não cita quem não veio antes, nem a si mesmo", () => {
    expect(erro([P("A", 0, 0), { nome: "s", tipo: "segment", pais: ["A", "B"], papel: "" }, P("B", 1, 1)]))
      .toMatch(/não foi construído antes/);
    expect(erro([P("A", 0, 0), { nome: "s", tipo: "segment", pais: ["A", "s"], papel: "" }]))
      .toMatch(/não foi construído antes/);
  });

  it("o pai tem de ser do tipo certo", () => {
    const base = [P("A", 0, 0), P("B", 2, 0), { nome: "s", tipo: "segment", pais: ["A", "B"], papel: "" }];
    expect(erro([...base, { nome: "r", tipo: "line", pais: ["A", "s"], papel: "" }])).toMatch(/não é um ponto/);
    expect(erro([...base, { nome: "p", tipo: "perpendicular", pais: ["A", "B"], papel: "" }])).toMatch(/não é uma reta/);
    expect(erro([...base, { nome: "c", tipo: "circle", pais: ["A"], papel: "" }])).toMatch(/dois pontos/);
    expect(erro([...base, { nome: "t", tipo: "polygon", pais: ["A", "B"], papel: "" }])).toMatch(/3 a 12 pontos/);
    expect(erro([...base, { nome: "b", tipo: "bisector", pais: ["A", "B"], papel: "" }])).toMatch(/três pontos/);
  });

  it("perpendicular e paralela aceitam [ponto, reta] e normalizam para [reta, ponto]", () => {
    const r = parseGeometria(j([P("A", 0, 0), P("B", 2, 0), P("C", 1, 3),
      { nome: "s", tipo: "segment", pais: ["A", "B"], papel: "" },
      { nome: "h", tipo: "perpendicular", pais: ["C", "s"], papel: "altura" },
      { nome: "p", tipo: "parallel", pais: ["s", "C"], papel: "paralela" }]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.elementos[4].pais).toEqual(["s", "C"]);
      expect(r.elementos[5].pais).toEqual(["s", "C"]);
    }
  });

  it("interseção: duas retas ou círculos, índice 0 ou 1 (padrão 0)", () => {
    const base = [P("A", 0, 0), P("B", 2, 0), P("C", 1, 3),
      { nome: "r", tipo: "line", pais: ["A", "B"], papel: "" },
      { nome: "c", tipo: "circle", pais: ["C", "A"], papel: "" }];
    const r = parseGeometria(j([...base, { nome: "I", tipo: "intersection", pais: ["r", "c"], papel: "" }]));
    expect(r.ok && r.elementos[5].pais).toEqual(["r", "c", 0]);
    expect(erro([...base, { nome: "I", tipo: "intersection", pais: ["r", "c", 1] }])).toBe("");
    expect(erro([...base, { nome: "I", tipo: "intersection", pais: ["r", "c", 2] }])).toMatch(/0 ou 1/);
    expect(erro([...base, { nome: "I", tipo: "intersection", pais: ["r", "A"] }])).toMatch(/não é uma reta ou círculo/);
  });

  it("ponto livre: só [x, y] finitos e dentro do limite", () => {
    expect(erro([{ nome: "A", tipo: "point", pais: ["1", 2], papel: "" }])).toMatch(/numéricos/);
    expect(erro([{ nome: "A", tipo: "point", pais: [1], papel: "" }])).toMatch(/numéricos/);
    expect(erro([{ nome: "A", tipo: "point", pais: [1e9, 0], papel: "" }])).toMatch(/numéricos/);
    expect(erro('[{"nome":"A","tipo":"point","pais":[1e999,0],"papel":""}]')).not.toBe("");
  });

  it("função: passa pelo parser fechado — código não entra", () => {
    const f = (expr: unknown) => [{ nome: "f", tipo: "functiongraph", pais: [expr], papel: "parábola" }];
    expect(erro(f("x^2 - 3*x + 2"))).toBe("");
    expect(erro(f("sin(x)/x"))).toBe("");
    expect(erro(f("alert(1)"))).toMatch(/expressão inválida/);
    expect(erro(f("x; document.cookie"))).toMatch(/expressão inválida/);
    expect(erro(f("(function(){return 1})()"))).toMatch(/expressão inválida/);
    expect(erro(f(42))).toMatch(/expressão em x/);
  });

  it("limite de elementos, e o papel é cortado em 80 caracteres", () => {
    const muitos = Array.from({ length: MAX_ELEMENTOS + 1 }, (_, i) => P(`P${i}`, i % 5, i % 7));
    expect(erro(muitos)).toMatch(/elementos demais/);
    const r = parseGeometria(j([{ ...P("A", 0, 0), papel: "x".repeat(200) }]));
    expect(r.ok && r.elementos[0].papel.length).toBe(80);
  });

  it("nunca lança, venha o que vier", () => {
    for (const lixo of ["", "null", "{}", "[null]", "[[1,2]]", '[{"nome":1}]', '[{"nome":"A","tipo":"point"}]', undefined as unknown as string]) {
      expect(() => parseGeometria(lixo)).not.toThrow();
      expect(parseGeometria(lixo).ok).toBe(false);
    }
  });
});

describe("caixaDaConstrucao — a janela da figura", () => {
  const els = (v: unknown) => { const r = parseGeometria(j(v)); if (!r.ok) throw new Error(r.erro); return r.elementos; };

  it("quadrada, centrada nos pontos livres, com folga para arrastar", () => {
    const [x0, y1, x1, y0] = caixaDaConstrucao(els([P("A", -3, -2), P("B", 4, -1), P("C", 0, 4)]));
    expect(x1 - x0).toBeCloseTo(y1 - y0);                 // quadrada: o círculo sai redondo
    expect((x0 + x1) / 2).toBeCloseTo(0.5);
    expect((y0 + y1) / 2).toBeCloseTo(1);
    expect(x0).toBeLessThan(-3 - 1); expect(x1).toBeGreaterThan(4 + 1);
  });

  it("um ponto só não vira janela de tamanho zero; sem ponto livre, a padrão", () => {
    const [x0, , x1] = caixaDaConstrucao(els([P("A", 2, 2)]));
    expect(x1 - x0).toBeGreaterThanOrEqual(8);
    expect(caixaDaConstrucao(els([{ nome: "f", tipo: "functiongraph", pais: ["x^2"], papel: "" }]))).toEqual([-8, 8, 8, -8]);
  });

  it("pontosLivres são só os `point`", () => {
    expect(pontosLivres(els(MEDIATRIZ)).map((e) => e.nome)).toEqual(["A", "B"]);
  });
});
