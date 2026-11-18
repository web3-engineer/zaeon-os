import { describe, it, expect } from "vitest";
import { examinadora } from "./examinadora";
import type { EstadoGuia } from "../tipos";

const estado = (agora: number): EstadoGuia => ({
  fase: "x", objetivoAtual: null, movimento: "movimento", ultimaAtividade: agora, agora,
});

describe("comportamento examinadora (digitou ≠ colou)", () => {
  it("colar cutuca; digitar não", () => {
    const c = examinadora();
    const n = c.aoSinal({ tipo: "atividade", fonte: "colou", em: 0 }, estado(0));
    expect(n).toHaveLength(1);
    expect(n[0].id).toBe("exam-cola");
    expect(n[0].voz).toBe(true);
    expect(c.aoSinal({ tipo: "atividade", fonte: "digitou", em: 100 }, estado(100))).toEqual([]);
  });

  it("não vira tagarela: dentro da janela, a segunda cola é silenciosa", () => {
    const c = examinadora({ janelaMs: 8000 });
    expect(c.aoSinal({ tipo: "atividade", fonte: "colou", em: 0 }, estado(0))).toHaveLength(1);
    expect(c.aoSinal({ tipo: "atividade", fonte: "colou", em: 1000 }, estado(1000))).toEqual([]);
    expect(c.aoSinal({ tipo: "atividade", fonte: "colou", em: 9000 }, estado(9000))).toHaveLength(1);
  });

  it("celebra quando o objetivo é alcançado", () => {
    const c = examinadora();
    const n = c.aoSinal({ tipo: "objetivo", estado: "alcancou", id: "k", em: 0 }, estado(0));
    expect(n).toHaveLength(1);
    expect(n[0].tom).toBe("celebra");
  });
});
