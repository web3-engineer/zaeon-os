import { describe, expect, it } from "vitest";
import { ESCALA_NAVE_QG, CABINE, COMODOS, RAIO_REDOMA, RAMPA, alturaDaRampa, naPontaDaRampa, naRampaLaFora, pousoNaNave, rampaDaNave, ESCADA, TOTAL_ESCADA, pontoDaEscada, MOVEIS_CABINE, MOVEIS_NAVE, NAVE_QG, REATOR, acaoNaNave, alturaDoConves, alturaNoBordo, andarNaNave, comodoEm, docaLivre, paraLocal, paraMundo, pertoDaEntrada, pontoDoTerminal, poseDaDoca, redomaAberta, type Bordo } from "./naveQG";
import { CIDADE, mundo, naIlhaPrincipal } from "./ceu";

/** anda em linha reta de `de` até `ate` (passos de 0,25 m), como o engine faz a cada quadro */
function andar(de: Bordo, ate: { x: number; z: number }, passos = 400): Bordo {
  let b = de;
  for (let k = 0; k < passos; k++) {
    const dx = ate.x - b.x, dz = ate.z - b.z, d = Math.hypot(dx, dz); if (d < 0.2) break;
    b = andarNaNave({ x: b.x + (dx / d) * 0.25, z: b.z + (dz / d) * 0.25 }, b);
  }
  return b;
}
const centro = (c: { x0: number; x1: number; z0: number; z1: number }) => ({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2 });

describe("nave-QG: tamanho e planta", () => {
  it("~68 m de diâmetro; o convés e a cabine cabem dentro do casco", () => {
    expect(NAVE_QG.raio * 2).toBeGreaterThan(66); expect(NAVE_QG.raio * 2).toBeLessThan(70);
    for (const c of [...COMODOS, CABINE]) for (const [x, z] of [[c.x0, c.z0], [c.x1, c.z0], [c.x0, c.z1], [c.x1, c.z1]]) expect(Math.hypot(x!, z!)).toBeLessThan(NAVE_QG.cascoNoConves - 2);
  });
  it("a casa tem os cômodos pedidos (estar, banheiro, servidores, motor) + reuniões, hall e corredor, sem se sobrepor", () => {
    expect(COMODOS.map((c) => c.id)).toEqual(expect.arrayContaining(["hall", "estar", "banheiro", "servidores", "motor", "reunioes", "corredor"]));
    for (const a of COMODOS) for (const b of COMODOS) if (a !== b) expect(a.x1 <= b.x0 + 1e-9 || b.x1 <= a.x0 + 1e-9 || a.z1 <= b.z0 + 1e-9 || b.z1 <= a.z0 + 1e-9).toBe(true);
  });
  it("cômodos com espaço pra andar: cada um tem uma área livre de móveis grande", () => {
    for (const c of COMODOS) expect((c.x1 - c.x0) * (c.z1 - c.z0)).toBeGreaterThan(c.id === "corredor" ? 40 : 90);
    for (const m of MOVEIS_NAVE) expect(comodoEm(centro(m))).not.toBeNull();   // todo móvel dentro de um cômodo
    expect(comodoEm(REATOR)?.id).toBe("motor");
  });
});

describe("nave-QG: andar a bordo (casa embaixo, cabine em cima)", () => {
  const porta: Bordo = { x: 0, z: NAVE_QG.portaDentro.z + 1.4, nivel: 0 };
  it("da porta dá pra ir a TODOS os cômodos da casa (paredes com porta, móveis desviam)", () => {
    for (const c of COMODOS.filter((x) => x.id !== "corredor")) {
      // corredor → hall → cômodo (pelo vão da porta de cada um)
      let b = andar(porta, { x: 0, z: 0 });
      expect(comodoEm(b)?.id).toBe("hall");
      const alvo = c.id === "estar" ? { x: 0, z: c.z0 + 3 } : c.id === "servidores" ? { x: c.x0 + 3, z: 0 } : c.id === "reunioes" ? { x: c.x1 - 3, z: 0 } : { x: (c.x0 + c.x1) / 2, z: -8 * (ESCALA_NAVE_QG / 6.3) };
      if (c.id === "banheiro" || c.id === "motor") { b = andar(porta, { x: 0, z: -8 * (ESCALA_NAVE_QG / 6.3) }); b = andar(b, alvo); }
      else if (c.id !== "hall") b = andar(b, alvo);
      expect(comodoEm(b, -0.4)?.id).toBe(c.id);
    }
  });
  it("as paredes seguram: não se atravessa do hall pros servidores fora da porta", () => {
    const hall = COMODOS.find((c) => c.id === "hall")!;
    const b = andar({ x: hall.x1 - 1, z: hall.z1 - 1.5, nivel: 0 }, { x: hall.x1 + 3, z: hall.z1 - 1.5 });
    expect(b.x).toBeLessThan(hall.x1);
  });
  it("a ESCADA EM CARACOL leva do hall até a CABINE lá em cima (a altura sobe girando) e desce de volta", () => {
    const fora = pontoDaEscada(0, ESCADA.rOut + 0.8);   // em frente ao pé, no hall
    let b: Bordo = andar({ x: 0, z: 0, nivel: 0 }, fora);
    // segue o caracol: mira sempre um pouco à frente na espiral
    const subir = (b0: Bordo, sentido: 1 | -1) => { let x = b0; for (let k = 0; k < 600 && (sentido > 0 ? x.nivel === 0 : x.nivel === 1 || x.esc !== undefined); k++) { const alvo = pontoDaEscada((x.esc ?? (sentido > 0 ? 0 : TOTAL_ESCADA)) + sentido * 0.5); x = andarNaNave({ x: x.x + (alvo.x - x.x) * 0.35, z: x.z + (alvo.z - x.z) * 0.35 }, x); } return x; };
    b = andar(b, pontoDaEscada(0));      // entra pelo pé
    expect(b.esc).toBeDefined();
    let meio: Bordo | null = null;
    { let x = b; for (let k = 0; k < 600 && x.nivel === 0; k++) { if (!meio && (x.esc ?? 0) > TOTAL_ESCADA / 2) meio = x; const alvo = pontoDaEscada((x.esc ?? 0) + 0.5); x = andarNaNave({ x: x.x + (alvo.x - x.x) * 0.35, z: x.z + (alvo.z - x.z) * 0.35 }, x); } b = x; }
    expect(b.nivel).toBe(1); expect(alturaNoBordo(b)).toBe(NAVE_QG.cabine);
    expect(alturaNoBordo(meio!)).toBeGreaterThan(0.4 * NAVE_QG.cabine); expect(alturaNoBordo(meio!)).toBeLessThan(0.6 * NAVE_QG.cabine);
    // lá em cima: a cabine fica na altura da redoma (bem acima da casa)
    expect(NAVE_QG.cabine).toBeGreaterThan(8);
    // desce: volta pro vão pelo topo e gira ao contrário
    b = andar(b, pontoDaEscada(TOTAL_ESCADA));
    expect(b.esc).toBeDefined();
    { let x = b; for (let k = 0; k < 600 && x.esc !== undefined; k++) { const alvo = pontoDaEscada(x.esc - 0.5); x = andarNaNave({ x: x.x + (alvo.x - x.x) * 0.35, z: x.z + (alvo.z - x.z) * 0.35 }, x); } b = x; }
    expect(b.nivel).toBe(0); expect(alturaNoBordo(b)).toBe(0);
    void subir;
  });
  it("pelos lados não se sobe a escada (a coluna/os degraus são sólidos); só pelo pé", () => {
    const lado = pontoDaEscada(Math.PI, ESCADA.rOut + 1);   // do lado oposto ao pé
    const b = andar({ ...lado, nivel: 0 }, { x: ESCADA.cx, z: ESCADA.cz });
    expect(b.esc).toBeUndefined(); expect(Math.hypot(b.x - ESCADA.cx, b.z - ESCADA.cz)).toBeGreaterThan(ESCADA.rOut);
  });
  it("na cabine o guarda-corpo segura (não se cai do mezanino); só o vão da escada desce", () => {
    const b = andar({ x: 0, z: 0, nivel: 1 }, { x: CABINE.x1 + 5, z: 0 });
    expect(b.nivel).toBe(1); expect(b.x).toBeLessThan(CABINE.x1);
  });
});

describe("nave-QG: ações (F), redoma e porta", () => {
  it("PILOTAR só na cabine de comando (lá em cima), no leme, e só o dono", () => {
    const noLeme: Bordo = { ...NAVE_QG.emPe, nivel: 1 };
    expect(acaoNaNave(noLeme, true)).toBe("pilotar");
    expect(acaoNaNave(noLeme, false)).not.toBe("pilotar");
    expect(acaoNaNave({ ...NAVE_QG.emPe, nivel: 0 }, true)).not.toBe("pilotar");   // embaixo do leme, na casa: não
  });
  it("ESTUDAR no terminal da cabine; SAIR pela porta da casa", () => {
    expect(acaoNaNave({ ...pontoDoTerminal(), nivel: 1 }, false)).toBe("estudar");
    expect(acaoNaNave({ ...NAVE_QG.portaDentro, nivel: 0 }, false)).toBe("sair");
    expect(MOVEIS_CABINE.some((m) => m.tipo === "terminal")).toBe(true);
  });
  it("a REDOMA abre só com alguém DE PÉ na cabine (sem pilotar); desceu a escada ou pegou o leme, fecha", () => {
    expect(redomaAberta({ x: 0, z: 0, nivel: 1 }, false)).toBe(true);
    expect(redomaAberta({ x: 0, z: 0, nivel: 1 }, true)).toBe(false);
    expect(redomaAberta({ x: 0, z: 0, nivel: 0 }, false)).toBe(false);
    expect(redomaAberta(null, false)).toBe(false);
  });
  it("local ↔ mundo (a nave pode estar virada) e a entrada fica atrás, na altura do convés", () => {
    const p = { x: 50, y: 100, z: -30, yaw: 1.1 }, l = { x: 3, z: -7 };
    const w = paraMundo(p, l), de = paraLocal(p, w); expect(de.x).toBeCloseTo(l.x, 9); expect(de.z).toBeCloseTo(l.z, 9);
    const saida = paraMundo(p, NAVE_QG.saida);
    expect(pertoDaEntrada(p, saida, alturaDoConves(p))).toBe(true);
    expect(pertoDaEntrada(p, saida, alturaDoConves(p) + 30)).toBe(false);
    expect(pertoDaEntrada(p, paraMundo(p, { x: 0, z: 40 }), alturaDoConves(p))).toBe(false);   // na proa, não
  });
});

describe("nave-QG: a rampa e a volta de mochila (ninguém fica preso fora)", () => {
  it("a RAMPA é chão firme: da porta se desce por ela até o fim, com corrimão nos lados e no fim (não se cai)", () => {
    let b = andar({ x: 0, z: NAVE_QG.portaDentro.z + 1.4, nivel: 0 }, { x: 0, z: RAMPA.z0 - 5 }, 600);
    expect(naPontaDaRampa(b)).toBe(true); expect(naRampaLaFora(b)).toBe(true);
    expect(alturaNoBordo(b)).toBeCloseTo(-NAVE_QG.deck, 0);
    const meio: Bordo = { x: 0, z: (RAMPA.zCasco + RAMPA.z0) / 2, nivel: 0 };
    expect(alturaNoBordo(meio)).toBeCloseTo(-NAVE_QG.deck / 2, 1);
    b = andar(meio, { x: 8, z: meio.z }); expect(Math.abs(b.x)).toBeLessThan(RAMPA.meia);   // corrimão do lado
    b = andar(b, { x: 0, z: NAVE_QG.portaDentro.z + 1.4 }, 600); expect(comodoEm(b, -0.4)?.id).toBe("corredor");   // e volta pra dentro
    expect(alturaDaRampa(RAMPA.zCasco + 1)).toBeCloseTo(0, 9);   // o túnel é plano
  });
  it("de mochila: pelo vão da REDOMA aberta cai-se no piso da CABINE (com ela fechada, não)", () => {
    const c = NAVE_QG.cabine, l = { x: 6, z: -9 };
    expect(Math.hypot(l.x, l.z)).toBeLessThan(RAIO_REDOMA);
    const b = pousoNaNave(l, c + 0.3, c - 0.1, true)!;
    expect(b.nivel).toBe(1); expect(b.x).toBeLessThan(CABINE.x1); expect(b.z).toBeGreaterThan(CABINE.z0);
    expect(pousoNaNave(l, c + 0.3, c - 0.1, false)).toBeNull();
    expect(pousoNaNave({ x: 30, z: 0 }, c + 0.3, c - 0.1, true)).toBeNull();   // fora do vão
    expect(pousoNaNave({ x: ESCADA.cx, z: ESCADA.cz }, c + 0.3, c - 0.1, true)).toEqual({ ...NAVE_QG.emPe, nivel: 1 });   // não cai no vão da escada
  });
  it("a rampa se ajusta: na DOCA é passarela plana até o piso da Zaeon; pousada, desce até o chão; pairando, tem guarda-corpo no fim", () => {
    const doca = rampaDaNave(poseDaDoca());
    expect(doca.desce).toBe("ilha"); expect(Math.abs(doca.queda)).toBeLessThan(0.5);
    expect(alturaDoConves(poseDaDoca()) + alturaDaRampa(RAMPA.z0, doca.queda)).toBeCloseTo(CIDADE.pisoY, 0);
    const pousada = rampaDaNave({ x: 300, y: 0, z: 300, yaw: 0 }); expect(pousada.desce).toBe("chao"); expect(pousada.queda).toBeCloseTo(NAVE_QG.deck, 6);
    expect(rampaDaNave({ x: 300, y: 80, z: 300, yaw: 0 }).desce).toBeNull();
  });
  it("de mochila: pousa-se na RAMPA (lá fora)", () => {
    const z = (RAMPA.zCasco + RAMPA.z0) / 2, h = alturaDaRampa(z);
    expect(pousoNaNave({ x: 0.2, z }, h + 0.2, h - 0.1, false)).toEqual({ x: 0.2, z, nivel: 0 });
    expect(pousoNaNave({ x: 5, z }, h + 0.2, h - 0.1, false)).toBeNull();
  });
});

describe("nave-QG: a doca (sem hangar)", () => {
  it("atraca PAIRANDO ao lado da Zaeon: o convés na altura do piso e a saída na borda da ilha; sem encostar nas ilhotas", () => {
    const d = poseDaDoca();
    expect(alturaDoConves(d)).toBeCloseTo(CIDADE.pisoY, 6);
    const saida = paraMundo(d, NAVE_QG.saida);
    expect(naIlhaPrincipal(saida)).toBe(true);
    expect(Math.hypot(d.x - mundo({ x: 0, z: 0 }).x, d.z - mundo({ x: 0, z: 0 }).z)).toBeGreaterThan(CIDADE.bordaR);   // o centro da nave fica fora da ilha
    expect(docaLivre()).toBe(true);
  });
});
