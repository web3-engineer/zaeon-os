/**
 * lib/collab/realtime.test.ts — o recibo do tempo real.
 *
 * "A colaboração está no ar" e "a colaboração é instantânea" são afirmações DIFERENTES: sem as
 * quatro envs do Pusher, `getPusher()` devolve null, a feature cai no poll de 6 s e isso é invisível
 * de fora. Estas asserções existem pra que o recibo diga a verdade — e pra que ele nunca imprima um
 * segredo ao dizê-la.
 */
import { describe, it, expect } from "vitest";
import { pusherFaltando } from "@/lib/collab/realtime";

const COMPLETO = {
  PUSHER_APP_ID: "123", NEXT_PUBLIC_PUSHER_KEY: "k", PUSHER_SECRET: "s", NEXT_PUBLIC_PUSHER_CLUSTER: "us2",
};

describe("pusherFaltando", () => {
  it("as quatro presentes: nada faltando", () => {
    expect(pusherFaltando(COMPLETO)).toEqual([]);
  });

  it("nomeia exatamente o que falta — e cada uma das quatro conta", () => {
    for (const k of Object.keys(COMPLETO)) {
      expect(pusherFaltando({ ...COMPLETO, [k]: undefined }), k).toEqual([k]);
      expect(pusherFaltando({ ...COMPLETO, [k]: "   " }), `${k} em branco`).toEqual([k]);
    }
  });

  it("ambiente vazio: lista as quatro, e o recibo fica legível", () => {
    expect(pusherFaltando({})).toHaveLength(4);
  });

  it("NUNCA devolve valor, só NOME — o recibo não pode vazar o segredo", () => {
    const saida = JSON.stringify(pusherFaltando({ ...COMPLETO, PUSHER_SECRET: undefined, PUSHER_APP_ID: undefined }));
    expect(saida).toContain("PUSHER_SECRET");
    for (const v of ["123", "us2", '"k"', '"s"']) expect(saida, v).not.toContain(v);
  });
});
