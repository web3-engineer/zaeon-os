import { describe, it, expect } from "vitest";
import { criarGuia } from "./motor";
import { ociosidade } from "./comportamentos/ociosidade";
import type { Comportamento, Nudge } from "./tipos";

function cenario(comportamentos: Comportamento[], tickMs = 5_000) {
  let t = 0;
  let tickFn = () => {};
  const nudges: Nudge[] = [];
  const g = criarGuia({
    comportamentos,
    agora: () => t,
    tickMs,
    reaparecerMs: 12_000,
    programar: (fn) => { tickFn = fn; return () => { tickFn = () => {}; }; },
  });
  g.assinar((n) => nudges.push(n));
  g.iniciar();
  return {
    g, nudges,
    tick(ms: number) { t += ms; tickFn(); },                                   // avança o relógio e dispara 1 tick
    atividade(fonte: "tocou" | "digitou" | "colou" = "tocou") { g.enviar({ tipo: "atividade", fonte, em: t }); },
    objetivo(estado: "iniciou" | "alcancou", id = "o1") { g.enviar({ tipo: "objetivo", estado, id, em: t }); },
    fase(fase: string) { g.enviar({ tipo: "fase", fase, em: t }); },
  };
}

describe("motor do guia — estado de movimento", () => {
  it("começa parado; atividade entra em movimento; objetivo alcançado vira pausa; iniciar objetivo volta ao movimento", () => {
    const c = cenario([]);
    expect(c.g.estado().movimento).toBe("parado");
    c.atividade();
    expect(c.g.estado().movimento).toBe("movimento");
    c.objetivo("alcancou");
    expect(c.g.estado()).toMatchObject({ movimento: "pausa", objetivoAtual: null });
    c.objetivo("iniciou", "o2");
    expect(c.g.estado()).toMatchObject({ movimento: "movimento", objetivoAtual: "o2" });
    c.fase("modulo-2");
    expect(c.g.estado().fase).toBe("modulo-2");
  });
});

describe("comportamento: ociosidade", () => {
  it("cutuca uma vez quando o movimento trava além do limite", () => {
    const c = cenario([ociosidade({ limiteMs: 25_000 })]);
    c.atividade();            // t=0, em movimento
    c.tick(10_000);           // 10s parado — ainda não
    expect(c.nudges).toHaveLength(0);
    c.tick(20_000);           // 30s parado — cutuca
    expect(c.nudges).toHaveLength(1);
    expect(c.nudges[0]).toMatchObject({ tom: "retomada", voz: true });
    c.tick(5_000);            // 35s — já cutucado, não repete
    expect(c.nudges).toHaveLength(1);
  });

  it("não cutuca PARADO (antes de começar) nem em PAUSA (descanso entre objetivos)", () => {
    const parado = cenario([ociosidade({ limiteMs: 10_000 })]);
    parado.tick(60_000);      // nunca houve atividade → segue parado
    expect(parado.nudges).toHaveLength(0);

    const pausa = cenario([ociosidade({ limiteMs: 10_000 })]);
    pausa.atividade();
    pausa.objetivo("alcancou"); // entra em pausa
    pausa.tick(60_000);
    expect(pausa.nudges).toHaveLength(0);
  });

  it("rearma: depois que o aluno volta a se mexer, uma nova ociosidade cutuca de novo", () => {
    const c = cenario([ociosidade({ limiteMs: 25_000 })]);
    c.atividade();
    c.tick(30_000);           // cutuca (1)
    expect(c.nudges).toHaveLength(1);
    c.atividade();            // voltou a tocar → rearma
    c.tick(30_000);           // de novo ocioso → cutuca (2)
    expect(c.nudges).toHaveLength(2);
  });
});

describe("motor — janela de silêncio (reaparecerMs)", () => {
  it("o mesmo nudge (por id) não repete dentro da janela", () => {
    // comportamento tagarela: tenta emitir o MESMO id a cada sinal
    const tagarela: Comportamento = {
      nome: "teste",
      aoSinal: (_s, e) => [{ id: "fixo", texto: "oi", tom: "incentivo", em: e.agora }],
    };
    const c = cenario([tagarela], 5_000);
    c.tick(5_000);   // emite (1)
    c.tick(5_000);   // 10s depois do 1º? não — só 5s < 12s → silenciado
    expect(c.nudges).toHaveLength(1);
    c.tick(5_000);   // t=15s, 15-5=10 < 12 → ainda silenciado
    expect(c.nudges).toHaveLength(1);
    c.tick(5_000);   // t=20s, 20-5=15 >= 12 → reaparece (2)
    expect(c.nudges).toHaveLength(2);
  });
});
