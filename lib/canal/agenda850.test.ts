/**
 * #850 · a agenda do escritório: minutos, juntar os pedaços, o que já passou nesta semana, a próxima vez,
 * cores sem repetir no canal e os painéis que precisam caber na tela do celular.
 */
import { describe, it, expect } from "vitest";
import {
  aplicarBloco, blocoDeMinutos, coresDoCanal, faixas, jaPassou, minutosDo, naCelula, proximaVez, textoBloco, textoData,
  textoHora, PALETA, type Bloco,
} from "./agenda";
import { deslocamentoPraCaber } from "@/lib/ui/useCabeNaTela";

const A = "a".repeat(24), B = "b".repeat(24);
const bl = (userId: string, dia: Bloco["dia"], inicio: number, fim: number, id?: string, de?: number, ate?: number): Bloco =>
  ({ id, userId, dia, inicio, fim, ...(de !== undefined ? { de, ate } : {}) });
// quinta-feira, 19/11/2026, 15h40 (horário local)
const QUINTA = new Date(2026, 10, 19, 15, 40);

describe("#850 · minutos", () => {
  it("bloco sem minutos vale a hora cheia; com minutos, os minutos", () => {
    expect(minutosDo(bl(A, 1, 8, 9))).toEqual({ de: 480, ate: 600 });
    expect(minutosDo(bl(A, 1, 7, 9, undefined, 450, 600))).toEqual({ de: 450, ate: 600 });
  });
  it("blocoDeMinutos aceita de 15 em 15 dentro da grade e calcula os quadrados", () => {
    expect(blocoDeMinutos(1, 450, 600)).toEqual({ dia: 1, inicio: 7, fim: 9, de: 450, ate: 600 });
    expect(blocoDeMinutos(1, 455, 600)).toBeNull();      // fora do passo
    expect(blocoDeMinutos(1, 390, 600)).toBeNull();      // antes das 7h
    expect(blocoDeMinutos(1, 600, 600)).toBeNull();      // vazio
    expect(blocoDeMinutos(9, 450, 600)).toBeNull();      // dia inválido
  });
  it("textos: 7h30, 10h e o bloco por extenso", () => {
    expect(textoHora(450)).toBe("7h30");
    expect(textoHora(600)).toBe("10h");
    expect(textoBloco(bl(A, 1, 7, 9, undefined, 450, 600))).toBe("segunda, das 7h30 às 10h");
  });
});

describe("#850 · juntar", () => {
  it("marcar hora por hora vira um bloco só (9h, 10h, 11h → 9h–12h)", () => {
    let blocos: Bloco[] = [];
    for (const [h, id] of [[9, "x"], [10, "y"], [11, "z"]] as const) {
      blocos = aplicarBloco(blocos, bl(A, 2, h, h)).blocos.map((b, i) => ({ ...b, id: b.id ?? `${id}${i}` }));
    }
    expect(blocos).toHaveLength(1);
    expect([blocos[0]!.inicio, blocos[0]!.fim]).toEqual([9, 11]);
  });
  it("com minutos, a união guarda os minutos", () => {
    const r = aplicarBloco([bl(A, 2, 9, 9, "x")], bl(A, 2, 7, 8, undefined, 450, 540));
    expect(minutosDo(r.blocos[0]!)).toEqual({ de: 450, ate: 600 });
  });
  it("faixas: os pedaços antigos (hora por hora) da mesma pessoa aparecem juntos, com os ids de todos", () => {
    const fs = faixas([bl(A, 2, 9, 9, "1"), bl(A, 2, 10, 10, "2"), bl(B, 2, 10, 10, "3"), bl(A, 2, 13, 13, "4")]);
    const daA = fs.filter((f) => f.userId === A);
    expect(daA.map((f) => [f.de, f.ate, f.ids])).toEqual([[540, 660, ["1", "2"]], [780, 840, ["4"]]]);
  });
  it("naCelula: 7h30 pinta só a metade de baixo do quadrado das 7h, e a foto fica nele", () => {
    const [o] = naCelula(faixas([bl(A, 1, 7, 9, "1", 450, 600)]), 1, 7);
    expect([o!.topo, o!.altura, o!.inicial]).toEqual([50, 50, true]);
    expect(naCelula(faixas([bl(A, 1, 7, 9, "1", 450, 600)]), 1, 8)[0]!.inicial).toBe(false);
  });
});

describe("#850 · o que já passou nesta semana (sem bloquear)", () => {
  it("numa quinta às 15h40: segunda já passou; sexta não; quinta 14h passou, quinta 15h ainda não", () => {
    expect(jaPassou(1, 9, QUINTA)).toBe(true);
    expect(jaPassou(5, 9, QUINTA)).toBe(false);
    expect(jaPassou(0, 9, QUINTA)).toBe(false);   // domingo é o fim da semana da grade
    expect(jaPassou(4, 14, QUINTA)).toBe(true);
    expect(jaPassou(4, 15, QUINTA)).toBe(false);
  });
  it("a próxima vez: segunda → seg, 23/11; quinta às 16h ainda é hoje; quinta às 9h é a semana que vem", () => {
    expect(textoData(proximaVez(1, 480, QUINTA))).toBe("seg, 23/11");
    expect(textoData(proximaVez(4, 960, QUINTA))).toBe("qui, 19/11");
    expect(textoData(proximaVez(4, 540, QUINTA))).toBe("qui, 26/11");
  });
});

describe("#850 · cores", () => {
  it("cada pessoa do canal tem uma cor diferente (até acabar a paleta)", () => {
    const ids = Array.from({ length: 6 }, (_, i) => String(i).repeat(24));
    const cores = coresDoCanal(ids);
    expect(new Set(cores.values()).size).toBe(6);
  });
  it("a paleta não tem cores repetidas", () => {
    expect(new Set(PALETA).size).toBe(PALETA.length);
  });
});

describe("#850 · painel dentro da tela (useCabeNaTela)", () => {
  it("o sino no celular: 223→563 numa tela de 375 → volta 196 px pra caber com 8 de folga", () => {
    expect(deslocamentoPraCaber(223, 563, 375)).toBe(-196);
  });
  it("mais largo que a tela: encosta na folga da esquerda", () => {
    expect(deslocamentoPraCaber(100, 500, 375)).toBe(-92);
  });
  it("já cabe: não mexe", () => {
    expect(deslocamentoPraCaber(20, 300, 375)).toBe(0);
  });
});
