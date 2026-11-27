import { describe, expect, it } from "vitest";
import { hashTexto, rngDe, xorshift } from "./rng";
import {
  caminhoAte, contagemDentro, expandirCaminho, frac, indexar, licaoParaContinuar, nosVisiveis,
  proximaDe, resumoProgresso, visaoGeral,
} from "./progresso";
import { ENERGIA_RAIZ, energia, energiaFolha, energias } from "./energia";
import { CONCLUIDO, PENDENTE, corEnergia, rgbDaEnergia } from "./cores";
import {
  colateraisDe, dendritos, dendritosDe, fibrasDe, geometriaAresta, layoutRadial, ramosTerminaisDe, taper, taperPontos,
} from "./geometria";
import { beginPulso, duracaoPulso, inicio, quantidadePulsos } from "./pulsos";
import type { NoArvore } from "./tipos";

const folha = (id: string, tipo: NoArvore["tipo"] = "ideia", grau?: number): NoArvore => ({ id, titulo: id.toUpperCase(), tipo, filhos: [], ...(grau !== undefined ? { grau } : {}) });
// raiz → A(a1,a2) , B(b1(b1x)) , C
const ARVORE: NoArvore = {
  id: "r", titulo: "Raiz", tipo: "raiz", filhos: [
    { id: "A", titulo: "A", tipo: "modulo", filhos: [folha("a1", "ideia"), folha("a2", "codigo")] },
    { id: "B", titulo: "B", tipo: "modulo", filhos: [{ id: "b1", titulo: "b1", tipo: "conceito", filhos: [folha("b1x", "pratica")] }] },
    folha("C", "relacoes"),
  ],
};
const idx = indexar(ARVORE);
const S = (...ids: string[]) => new Set(ids);

describe("rng determinístico", () => {
  it("hash estável e diferente por id", () => {
    expect(hashTexto("abc")).toBe(hashTexto("abc"));
    expect(hashTexto("abc")).not.toBe(hashTexto("abd"));
    expect(hashTexto("")).toBe(2166136261);
  });
  it("xorshift: mesma semente = mesma sequência, em [0,1); semente 0 não trava", () => {
    const a = xorshift(42), b = xorshift(42);
    const sa = Array.from({ length: 50 }, a), sb = Array.from({ length: 50 }, b);
    expect(sa).toEqual(sb);
    for (const v of sa) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
    const z = xorshift(0);
    expect(new Set(Array.from({ length: 10 }, z)).size).toBeGreaterThan(5);
    expect(rngDe("x", "s")()).toBe(rngDe("x", "s")());
    expect(rngDe("x", "s")()).not.toBe(rngDe("x", "t")());
  });
});

describe("índice e ordem (pré-ordem, raiz primeiro)", () => {
  it("ordem", () => expect(idx.ordem).toEqual(["r", "A", "a1", "a2", "B", "b1", "b1x", "C"]));
  it("descendentes e caminho", () => {
    expect(idx.descendentes.get("B")).toEqual(["b1", "b1x"]);
    expect(caminhoAte(idx, "b1x")).toEqual(["r", "B", "b1", "b1x"]);
    expect(caminhoAte(idx, "nada")).toEqual([]);
  });
  it("id repetido não entra duas vezes", () => {
    const i2 = indexar({ id: "r", titulo: "", tipo: "raiz", filhos: [folha("x"), folha("x")] });
    expect(i2.ordem).toEqual(["r", "x"]);
  });
});

describe("proximaDe", () => {
  it("segue a sequência", () => {
    expect(proximaDe(idx, "r", S())).toBe("A");
    expect(proximaDe(idx, "a1", S("r", "A", "a1"))).toBe("a2");
  });
  it("pula concluídas", () => expect(proximaDe(idx, "A", S("A", "a1", "a2"))).toBe("B"));
  it("no fim, salta pra pendente anterior", () => expect(proximaDe(idx, "C", S("r", "A", "a2", "B", "b1", "b1x", "C"))).toBe("a1"));
  it("não devolve a própria lição", () => expect(proximaDe(idx, "a1", S("r", "A", "a2", "B", "b1", "b1x", "C"))).toBeNull());
  it("tudo concluído → null", () => expect(proximaDe(idx, "B", new Set(idx.ordem))).toBeNull());
});

describe("frac / contagem / painel", () => {
  it("frac da subárvore abaixo do nó", () => {
    expect(frac(idx, "A", S())).toBe(0);
    expect(frac(idx, "A", S("a1"))).toBe(0.5);
    expect(frac(idx, "A", S("A", "a1", "a2"))).toBe(1);
    expect(frac(idx, "C", S("C"))).toBe(0); // folha
    expect(frac(idx, "r", S("a1"))).toBeCloseTo(1 / 7);
  });
  it("x/y dentro", () => expect(contagemDentro(idx, "B", S("b1x"))).toEqual({ feitas: 1, total: 2 }));
  it("resumo ignora ids que não existem mais", () => expect(resumoProgresso(idx, S("A", "fantasma"))).toEqual({ feitas: 1, total: 8, pct: 13 }));
  it("continuar = primeira pendente", () => {
    expect(licaoParaContinuar(idx, S())).toBe("r");
    expect(licaoParaContinuar(idx, S("r", "A"))).toBe("a1");
    expect(licaoParaContinuar(idx, new Set(idx.ordem))).toBeNull();
  });
});

describe("expandir / visão geral / visíveis", () => {
  it("abre só o caminho até o alvo", () => {
    const ex = expandirCaminho(idx, "b1x");
    expect([...ex].sort()).toEqual(["B", "b1", "b1x", "r"]);
    expect(nosVisiveis(idx, ex)).toEqual(["r", "A", "B", "b1", "b1x", "C"]);
  });
  it("só raiz expandida mostra os filhos dela", () => expect(nosVisiveis(idx, S("r"))).toEqual(["r", "A", "B", "C"]));
  it("visão geral expande tudo que tem progresso", () => {
    const ex = visaoGeral(idx, S("b1x"));
    expect(ex.has("B") && ex.has("b1") && ex.has("r")).toBe(true);
    expect(ex.has("A")).toBe(false);
  });
});

describe("energia (desafio 1..5)", () => {
  it("faixa [1,5] e estável", () => {
    const e1 = energias(idx), e2 = energias(indexar(ARVORE));
    for (const id of idx.ordem) {
      expect(e1.get(id)!).toBeGreaterThanOrEqual(1);
      expect(e1.get(id)!).toBeLessThanOrEqual(5);
      expect(e2.get(id)).toBe(e1.get(id));
    }
  });
  it("memoizada por índice", () => expect(energias(idx)).toBe(energias(idx)));
  it("raiz = 3", () => expect(energia(idx, "r")).toBe(ENERGIA_RAIZ));
  it("pais = média dos filhos", () => {
    expect(energia(idx, "A")).toBeCloseTo((energia(idx, "a1") + energia(idx, "a2")) / 2, 2);
    expect(energia(idx, "b1")).toBeCloseTo(energia(idx, "b1x"), 2);
  });
  it("reserva por tipo: código > prática > relações > ideia (±0.4)", () => {
    const e = (tipo: NoArvore["tipo"]) => energiaFolha({ id: "z", tipo }, 2, 0);
    expect(Math.abs(e("ideia") - 1.2)).toBeLessThanOrEqual(0.4 + 1e-9);
    expect(Math.abs(e("codigo") - 4.2)).toBeLessThanOrEqual(0.4 + 1e-9);
    expect(e("codigo")).toBeGreaterThan(e("pratica"));
    expect(e("pratica")).toBeGreaterThan(e("relacoes"));
    expect(e("relacoes")).toBeGreaterThan(e("ideia"));
  });
  it("com grau no grafo: mais central = mais energia, clampada", () => {
    const baixo = energiaFolha({ id: "q", tipo: "ideia", grau: 1 }, 1, 40);
    const alto = energiaFolha({ id: "q", tipo: "ideia", grau: 40 }, 1, 40);
    expect(alto).toBeGreaterThan(baixo);
    expect(energiaFolha({ id: "q", tipo: "ideia", grau: 40 }, 9, 40)).toBeLessThanOrEqual(5);
  });
});

describe("cores", () => {
  it("extremos 1 e 5 batem com as paradas", () => {
    expect(rgbDaEnergia(1, PENDENTE)).toEqual(PENDENTE[0]);
    expect(rgbDaEnergia(5, PENDENTE)).toEqual(PENDENTE[2]);
    expect(rgbDaEnergia(1, CONCLUIDO)).toEqual(CONCLUIDO[0]);
    expect(rgbDaEnergia(5, CONCLUIDO)).toEqual(CONCLUIDO[2]);
    expect(rgbDaEnergia(3, CONCLUIDO)).toEqual(CONCLUIDO[1]);
  });
  it("fora da faixa clampa; css válido", () => {
    expect(rgbDaEnergia(-3, PENDENTE)).toEqual(PENDENTE[0]);
    expect(rgbDaEnergia(99, PENDENTE)).toEqual(PENDENTE[2]);
    expect(corEnergia(1, true)).toBe("rgb(37,99,235)");
    expect(corEnergia(5, false, 0.5)).toBe("rgba(255,226,244,0.5)");
  });
});

describe("taper (axônio afilado)", () => {
  const p0 = { x: 0, y: 0 }, c1 = { x: 40, y: -30 }, c2 = { x: 80, y: 30 }, p1 = { x: 120, y: 0 };
  it("2*(n+1) pontos, string de path válida e fechada", () => {
    const pts = taperPontos(p0, c1, c2, p1, 6, 2, { n: 26 });
    expect(pts).toHaveLength(2 * 27);
    const d = taper(p0, c1, c2, p1, 6, 2, { n: 26 });
    expect(d).toMatch(/^M-?\d+(\.\d)? -?\d+(\.\d)?(L-?\d+(\.\d)? -?\d+(\.\d)?)+Z$/);
    expect(d.split("L")).toHaveLength(2 * 27);
  });
  it("largura > 0 em todo ponto e afina de w0 para w1", () => {
    const n = 20;
    const pts = taperPontos(p0, c1, c2, p1, 8, 1, { n, ondulacao: 0 });
    const larg = (i: number) => Math.hypot(pts[i]!.x - pts[2 * (n + 1) - 1 - i]!.x, pts[i]!.y - pts[2 * (n + 1) - 1 - i]!.y);
    for (let i = 0; i <= n; i++) expect(larg(i)).toBeGreaterThan(0);
    expect(larg(0)).toBeCloseTo(8, 5);
    expect(larg(n)).toBeCloseTo(1, 5);
  });
  it("pontos coincidentes não geram NaN", () => {
    expect(taper(p0, p0, p0, p0, 3, 1)).not.toMatch(/NaN/);
  });
});

describe("regras de energia → forma", () => {
  it("fibras 1/2/3, colaterais, ramos e dendritos", () => {
    expect([fibrasDe(1), fibrasDe(2.49), fibrasDe(2.5), fibrasDe(3.99), fibrasDe(4), fibrasDe(5)]).toEqual([1, 1, 2, 2, 3, 3]);
    expect(colateraisDe(5)).toBe(4);
    expect(ramosTerminaisDe(1)).toBe(3);
    expect(dendritosDe(5)).toBe(7);
  });
  it("aresta: fibras e colaterais pela energia; modo simples = 1 fibra, sem colateral", () => {
    const pai = { x: 0, y: 0, ang: 0, prof: 0 }, filho = { x: 170, y: 20, ang: 0.1, prof: 1 };
    const alta = geometriaAresta(pai, filho, 4.6, "f", 21, 11);
    expect(alta.fibras).toHaveLength(3);
    expect(alta.colaterais).toHaveLength(colateraisDe(4.6));
    expect(alta.eixo).toMatch(/^M.+C.+$/);
    const simples = geometriaAresta(pai, filho, 4.6, "f", 21, 11, true);
    expect(simples.fibras).toHaveLength(1);
    expect(simples.colaterais).toHaveLength(0);
    expect(geometriaAresta(pai, filho, 4.6, "f", 21, 11)).toEqual(alta); // determinística
    expect(dendritos({ x: 0, y: 0 }, 9, 3, "n")).toHaveLength(dendritosDe(3) + 2);
  });
  it("layout radial: raiz no centro, todos os visíveis posicionados", () => {
    const vis = nosVisiveis(idx, new Set(idx.ordem));
    const pos = layoutRadial(idx, vis);
    expect(pos.get("r")).toMatchObject({ x: 0, y: 0 });
    for (const id of vis) expect(Number.isFinite(pos.get(id)!.x)).toBe(true);
    const dist = (id: string) => Math.hypot(pos.get(id)!.x, pos.get(id)!.y);
    expect(dist("b1")).toBeGreaterThan(dist("B"));
  });
});

describe("pulsos em cascata", () => {
  it("duração pela energia", () => {
    expect(duracaoPulso(5)).toBeCloseTo(1.7);
    expect(duracaoPulso(1)).toBeCloseTo(1.7 + 4 * 0.6);
  });
  it("inicio = 0 nos filhos da raiz; soma em profundidade", () => {
    expect(inicio(idx, "A")).toBe(0);
    expect(inicio(idx, "C")).toBe(0);
    expect(inicio(idx, "r")).toBe(0);
    expect(inicio(idx, "a1")).toBeCloseTo(duracaoPulso(energia(idx, "A")));
    expect(inicio(idx, "b1x")).toBeCloseTo(duracaoPulso(energia(idx, "B")) + duracaoPulso(energia(idx, "b1")));
  });
  it("quantidade: destaque 100%, pendente 60%, metade com muitos nós, mínimo 1", () => {
    expect(quantidadePulsos(5, { destaque: true, muitos: false })).toBe(5);
    expect(quantidadePulsos(5, { destaque: false, muitos: false })).toBe(3);
    expect(quantidadePulsos(5, { destaque: true, muitos: true })).toBe(3);
    expect(quantidadePulsos(1, { destaque: false, muitos: true, simples: true })).toBe(1);
  });
  it("begin = agora + inicio + q*dur/n", () => expect(beginPulso(10, 2, 1, 3, 3)).toBeCloseTo(13));
});
