/**
 * #861 (PR 1 — o bloco) · cada horário desenhado como UMA barra: posição em px pela altura da hora, lado a lado
 * quando se cruza com outro (a coluna não muda no meio), e como a foto entra conforme o tamanho.
 */
import { describe, it, expect } from "vitest";
import { ALTURA_HORA, blocosDoDia, modoDoBloco, MIN_INICIO, type Faixa } from "./agenda";

const f = (userId: string, dia: Faixa["dia"], de: number, ate: number): Faixa => ({ userId, dia, de, ate, ids: [`${userId}-${de}`] });
const H = ALTURA_HORA.computador;

describe("#861 · blocosDoDia", () => {
  it("uma barra do começo ao fim: 7h30–8h30 começa no meio da 1ª hora e tem uma hora de altura", () => {
    const [b] = blocosDoDia([f("a", 1, 450, 510)], 1, H);
    expect(b!.topo).toBe(((450 - MIN_INICIO) / 60) * H);
    expect(b!.altura).toBe(H);
    expect([b!.coluna, b!.colunas]).toEqual([0, 1]);
  });

  it("só o dia pedido", () => {
    expect(blocosDoDia([f("a", 1, 480, 540), f("b", 2, 480, 540)], 2, H).map((b) => b.faixa.userId)).toEqual(["b"]);
  });

  it("três pessoas que se cruzam: três colunas, e cada uma fica na sua o bloco todo", () => {
    const bs = blocosDoDia([f("g", 2, 480, 660), f("a", 2, 540, 720), f("m", 2, 600, 660)], 2, H);
    expect(bs.map((b) => [b.faixa.userId, b.coluna, b.colunas])).toEqual([["g", 0, 3], ["a", 1, 3], ["m", 2, 3]]);
  });

  it("encostar não é cruzar: um termina quando o outro começa → cada um com a largura toda", () => {
    const bs = blocosDoDia([f("g", 4, 600, 720), f("m", 4, 720, 840)], 4, H);
    expect(bs.map((b) => b.colunas)).toEqual([1, 1]);
  });

  it("uma coluna livre é reaproveitada no mesmo grupo", () => {
    // g 8–9 e a 8–12 se cruzam; m 9–10 entra na coluna que o g deixou livre
    const bs = blocosDoDia([f("g", 3, 480, 540), f("a", 3, 480, 720), f("m", 3, 540, 600)], 3, H);
    const col = Object.fromEntries(bs.map((b) => [b.faixa.userId, [b.coluna, b.colunas]]));
    expect(col).toEqual({ a: [0, 2], g: [1, 2], m: [1, 2] });
  });
});

describe("#861 · modoDoBloco (a foto conforme o tamanho)", () => {
  it("largura inteira: 15 min = curto, 30 min e 1 h = linha, 1h30 ou mais = cartão", () => {
    expect(modoDoBloco(H / 4, 1)).toBe("curto");
    expect(modoDoBloco(H / 2, 1)).toBe("linha");
    expect(modoDoBloco(H, 1)).toBe("linha");
    expect(modoDoBloco(H * 1.5, 1)).toBe("cartao");
    expect(modoDoBloco(ALTURA_HORA.celular / 2, 1)).toBe("linha");
  });
  it("dividindo o horário: alto = estreito (foto + hora), baixo = mini (só a foto, sem invadir o vizinho)", () => {
    expect(modoDoBloco(H, 2)).toBe("estreito");
    expect(modoDoBloco(H / 2, 3)).toBe("mini");
    expect(modoDoBloco(H / 4, 2)).toBe("mini");
  });
});
