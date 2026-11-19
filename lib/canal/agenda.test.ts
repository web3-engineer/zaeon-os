import { describe, it, expect } from "vitest";
import {
  HORA_INICIO, HORA_FIM, HORAS, DIAS_ORDEM, PALETA,
  normalizarBloco, aplicarBloco, ocupantes, proximoClique, corDaPessoa, textoBloco, type Bloco,
} from "./agenda";

const A = "a".repeat(24), B = "b".repeat(24);
const bl = (userId: string, dia: Bloco["dia"], inicio: number, fim: number, id?: string): Bloco => ({ id, userId, dia, inicio, fim });

describe("agenda · grade", () => {
  it("horas de HORA_INICIO a HORA_FIM, de 1 em 1, e semana começando na segunda", () => {
    expect(HORAS[0]).toBe(HORA_INICIO);
    expect(HORAS[HORAS.length - 1]).toBe(HORA_FIM);
    expect(HORAS.length).toBe(HORA_FIM - HORA_INICIO + 1);
    expect(DIAS_ORDEM).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});

describe("agenda · normalizarBloco", () => {
  it("aceita os dois cliques em qualquer ordem", () => {
    expect(normalizarBloco(2, 15, 9)).toEqual({ dia: 2, inicio: 9, fim: 15 });
    expect(normalizarBloco(2, 9, 15)).toEqual({ dia: 2, inicio: 9, fim: 15 });
  });
  it("um quadrado só = bloco de 1h", () => {
    expect(normalizarBloco(1, 10, 10)).toEqual({ dia: 1, inicio: 10, fim: 10 });
  });
  it("aceita números vindos como texto (body JSON/querystring)", () => {
    expect(normalizarBloco("3", "8", "12")).toEqual({ dia: 3, inicio: 8, fim: 12 });
  });
  it("recusa dia e hora fora da grade ou não inteiros", () => {
    expect(normalizarBloco(7, 9, 10)).toBeNull();
    expect(normalizarBloco(-1, 9, 10)).toBeNull();
    expect(normalizarBloco(1, HORA_INICIO - 1, 10)).toBeNull();
    expect(normalizarBloco(1, 9, HORA_FIM + 1)).toBeNull();
    expect(normalizarBloco(1, 9.5, 10)).toBeNull();
    expect(normalizarBloco(1, "x", 10)).toBeNull();
    expect(normalizarBloco(undefined, 9, 10)).toBeNull();
  });
});

describe("agenda · aplicarBloco (redesenhar o próprio horário)", () => {
  it("#850: bloco novo meu que se sobrepõe a um meu no mesmo dia JUNTA com ele (vira um só)", () => {
    const antigo = bl(A, 2, 9, 12, "x1");
    const r = aplicarBloco([antigo], bl(A, 2, 11, 15));
    expect(r.removidos).toEqual([antigo]);
    expect(r.blocos.map((b) => [b.inicio, b.fim])).toEqual([[9, 15]]);
  });
  it("não mexe nos blocos de outra pessoa no mesmo horário (dá pra dividir o horário)", () => {
    const dela = bl(B, 2, 9, 15, "y1");
    const r = aplicarBloco([dela], bl(A, 2, 10, 12));
    expect(r.removidos).toEqual([]);
    expect(r.blocos).toHaveLength(2);
  });
  it("blocos meus que NÃO se sobrepõem ficam (manhã e tarde no mesmo dia)", () => {
    const manha = bl(A, 2, 8, 10, "m");
    const r = aplicarBloco([manha], bl(A, 2, 14, 17));
    expect(r.removidos).toEqual([]);
    expect(r.blocos).toHaveLength(2);
  });
  it("#850: encostar (o quadrado 10 termina às 11h e o novo começa às 11h) junta num bloco só", () => {
    const antigo = bl(A, 2, 8, 10, "m");
    const r = aplicarBloco([antigo], bl(A, 2, 11, 12));
    expect(r.removidos).toEqual([antigo]);
    expect(r.blocos.map((b) => [b.inicio, b.fim])).toEqual([[8, 12]]);
  });
  it("#850: com uma hora vazia no meio, não junta", () => {
    const r = aplicarBloco([bl(A, 2, 8, 9, "m")], bl(A, 2, 11, 12));
    expect(r.removidos).toEqual([]);
  });
  it("outro dia não é afetado", () => {
    const r = aplicarBloco([bl(A, 3, 9, 15, "q")], bl(A, 2, 9, 15));
    expect(r.removidos).toEqual([]);
  });
});

describe("agenda · ocupantes (quem aparece no quadrado)", () => {
  const blocos = [bl(A, 2, 9, 15), bl(B, 2, 12, 13)];
  it("foto só no quadrado inicial; cor em todos até o final (inclusive)", () => {
    expect(ocupantes(blocos, 2, 9)).toEqual([{ bloco: blocos[0], inicial: true }]);
    expect(ocupantes(blocos, 2, 15)).toEqual([{ bloco: blocos[0], inicial: false }]);
    expect(ocupantes(blocos, 2, 16)).toEqual([]);
  });
  it("duas pessoas no mesmo quadrado", () => {
    expect(ocupantes(blocos, 2, 12).map((o) => [o.bloco.userId, o.inicial])).toEqual([[A, false], [B, true]]);
  });
  it("outro dia vazio", () => {
    expect(ocupantes(blocos, 4, 12)).toEqual([]);
  });
});

describe("agenda · dois cliques", () => {
  it("o exemplo do card: terça 9 + terça 15 → das 9h às 16h", () => {
    const r1 = proximoClique(null, { dia: 2, hora: 9 });
    expect(r1).toEqual({ ancora: { dia: 2, hora: 9 }, bloco: null });
    const r2 = proximoClique(r1.ancora, { dia: 2, hora: 15 });
    expect(r2).toEqual({ ancora: null, bloco: { dia: 2, inicio: 9, fim: 15 } });
    expect(textoBloco(r2.bloco!)).toBe("terça, das 9h às 16h");
  });
  it("2º clique em outra coluna recomeça a seleção ali", () => {
    const r = proximoClique({ dia: 2, hora: 9 }, { dia: 4, hora: 10 });
    expect(r).toEqual({ ancora: { dia: 4, hora: 10 }, bloco: null });
  });
  it("clicar duas vezes no mesmo quadrado = 1h", () => {
    expect(proximoClique({ dia: 1, hora: 10 }, { dia: 1, hora: 10 }).bloco).toEqual({ dia: 1, inicio: 10, fim: 10 });
  });
});

describe("agenda · cor da pessoa", () => {
  it("é sempre a mesma pra mesma pessoa e vem da paleta", () => {
    expect(corDaPessoa(A)).toBe(corDaPessoa(A));
    expect(PALETA).toContain(corDaPessoa(A));
    expect(PALETA).toContain(corDaPessoa(""));
  });
});
