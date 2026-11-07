import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ELEVADOR_MINI, NAVE_MINI, SKINS_MINI, moveisDaMini, noCascoMini } from "./naveMini";
import { ESCADA_ROLANTE, ESCOTILHA, passoDaRolante, BURACOS_ESPACO, SOFA_TETO, assentoDaCadeira, levantaDaCadeira, cadeiraPerto, DOCA_MOTOS, POSE_CUTSCENE, VAGAS_DOCA, vagaDaDocaPerto, CHEGADA_TETO, DESCIDA_TETO, MINHA_NAVE, NAVE_NA_ILHA, buracoAberto, caminhoDoElevador, chaoNoEspaco, pousaNoConves, naCupula, naDescida, nivelDaMinhaNave, paraMundoMini, pistasDoEspaco, resolverNaMini, resolverNoTeto, TETO_MINI } from "./minhaNave";
import { FIO, fiosCosmicos } from "./fiosCosmicos";
import { empurrarDosRetangulos } from "./universidade";

describe("a sua nave e o espaço aberto", () => {
  it("dentro do casco é a nave; no teto e em volta, o espaço; longe, nenhum dos dois", () => {
    const w = (x: number, z: number) => paraMundoMini({ x, z });
    expect(nivelDaMinhaNave(w(0, -8), MINHA_NAVE.y)).toBe("minha-nave");
    expect(nivelDaMinhaNave(w(CHEGADA_TETO.x, CHEGADA_TETO.z), MINHA_NAVE.y + TETO_MINI.y)).toBe("espaco");
    expect(nivelDaMinhaNave(w(-40, -4), MINHA_NAVE.y + 18)).toBe("espaco");
    expect(nivelDaMinhaNave(w(900, 0), MINHA_NAVE.y)).toBeNull();
  });
  it.each(SKINS_MINI)("o elevador (skin %s) fica debaixo da cúpula e livre dos móveis", (skin) => {
    const e = ELEVADOR_MINI[skin]; expect(naCupula(e, 0.8)).toBe(true);
    expect(empurrarDosRetangulos({ x: e.x, z: e.z }, moveisDaMini(skin), e.r)).toEqual({ x: e.x, z: e.z });
    expect(resolverNaMini({ x: NAVE_MINI.chegada.x, z: NAVE_MINI.chegada.z }, skin)).toEqual({ x: NAVE_MINI.chegada.x, z: NAVE_MINI.chegada.z });
  });
  it.each(SKINS_MINI)("o caminho do elevador (skin %s) sobe acima da cúpula e pousa no teto; a descida volta pro anel", (skin) => {
    expect(caminhoDoElevador(skin, "sobe", 0)).toMatchObject({ x: ELEVADOR_MINI[skin].x, z: ELEVADOR_MINI[skin].z, y: 0 });
    const fim = caminhoDoElevador(skin, "sobe", 1); expect(fim.x).toBeCloseTo(CHEGADA_TETO.x); expect(fim.z).toBeCloseTo(CHEGADA_TETO.z); expect(fim.y).toBeCloseTo(TETO_MINI.y);
    expect(Math.max(...Array.from({ length: 21 }, (_, k) => caminhoDoElevador(skin, "sobe", k / 20).y))).toBeGreaterThan(TETO_MINI.y + NAVE_MINI.cupula.alt);
    expect(caminhoDoElevador(skin, "desce", 0).z).toBeCloseTo(DESCIDA_TETO.z); expect(caminhoDoElevador(skin, "desce", 1).y).toBeCloseTo(0);
  });
  it("no teto: a chegada e a descida têm chão e não ficam dentro da cúpula", () => {
    for (const p of [CHEGADA_TETO, DESCIDA_TETO]) { expect(chaoNoEspaco(p)).toBe(true); expect(resolverNoTeto({ x: p.x, z: p.z })).toEqual({ x: p.x, z: p.z }); }
    expect(naDescida(DESCIDA_TETO)).toBe(true);
  });
  it("os buracos negros do espaço têm a escala dos do hub: o mesmo raio, a mesma distância e a pista saindo do teto", () => {
    const hub = fiosCosmicos()[0]!;
    for (const { f } of pistasDoEspaco()) {
      expect(f.bn.r).toBe(hub.bn.r);
      expect(Math.hypot(f.bn.x - NAVE_NA_ILHA.x, f.bn.z - NAVE_NA_ILHA.z)).toBeCloseTo(FIO.alcance, 0);
      expect(Math.hypot(f.boca.x - NAVE_NA_ILHA.x, f.boca.z - NAVE_NA_ILHA.z)).toBeLessThan(10);
      const fim = f.eixo[f.eixo.length - 1]!; expect(Math.hypot(fim.x - f.bn.x, fim.y - f.bn.y, fim.z - f.bn.z)).toBeLessThan(f.bn.r * 1.2);
    }
    expect(pistasDoEspaco().find((p) => p.b.id === "anjos")!.f.saida).toBe(true);
    expect(pistasDoEspaco().find((p) => p.b.id === "lounge")!.f.sala).toBe("lounge");
    expect(chaoNoEspaco({ x: 15, z: 25 })).toBe(false);
  });
  it("no teto: o sofá redondo e a doca das 5 motos cabem no teto, livres da cúpula, da chegada e da descida", () => {
    expect(VAGAS_DOCA).toHaveLength(5);
    const S = SOFA_TETO, borda = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ x: S.x + Math.cos(k * Math.PI / 4) * S.r, z: S.z + Math.sin(k * Math.PI / 4) * S.r }));
    for (const p of [...borda, ...VAGAS_DOCA, { x: DOCA_MOTOS.x0, z: DOCA_MOTOS.z0 }, { x: DOCA_MOTOS.x1, z: DOCA_MOTOS.z0 }]) { expect(chaoNoEspaco(p)).toBe(true); expect(naCupula(p, -0.3)).toBe(false); }
    for (const p of [CHEGADA_TETO, DESCIDA_TETO]) { expect(Math.hypot(p.x - S.x, p.z - S.z)).toBeGreaterThan(S.r + 0.5); for (const q of VAGAS_DOCA) expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThan(1.3); }
    // (o corpo recostado cabe: do encosto, atrás do quadril, até os pés, ~1 m à frente, dentro do disco)
    const a = assentoDaCadeira(); expect(S.z - S.encostoR).toBeLessThan(a.z - 0.45); expect(a.z + 1.0).toBeLessThan(S.z + S.r);
    expect(resolverNoTeto(levantaDaCadeira())).toEqual(levantaDaCadeira()); expect(cadeiraPerto(levantaDaCadeira())).toBe(0); expect(cadeiraPerto(CHEGADA_TETO)).toBe(-1);
    expect(vagaDaDocaPerto({ x: VAGAS_DOCA[2]!.x + 0.9, z: VAGAS_DOCA[2]!.z })).toBe(2); expect(vagaDaDocaPerto(CHEGADA_TETO)).toBe(-1);
  });
  it.each(SKINS_MINI)("a cutscene do login (skin %s): na cabine, livre dos móveis, de frente pro buraco negro do Lounge", (skin) => {
    expect(resolverNaMini(POSE_CUTSCENE, skin)).toEqual({ x: POSE_CUTSCENE.x, z: POSE_CUTSCENE.z });
    expect(BURACOS_ESPACO.find((b) => b.id === "lounge")!.dir).toEqual({ x: 0, z: 1 });
  });
  it.each(SKINS_MINI)("a escada rolante (skin %s): o pé, a faixa e a escotilha livres dos móveis, dentro do casco e do teto", (skin) => {
    const E = ESCADA_ROLANTE, moveis = moveisDaMini(skin);
    for (const z of [E.z0 - 1, E.z0, (E.z0 + E.z1) / 2, E.z1]) for (const x of [E.x - E.meia - 0.2, E.x + E.meia + 0.2]) {
      expect(noCascoMini(x, z, 0.3), `casco ${x},${z}`).toBe(true);
      expect(moveis.some((m) => x > m.x0 - 0.2 && x < m.x1 + 0.2 && z > m.z0 - 0.2 && z < m.z1 + 0.2), `móvel em ${x},${z}`).toBe(false);
    }
    for (const [x, z] of [[ESCOTILHA.x0, ESCOTILHA.z0], [ESCOTILHA.x1, ESCOTILHA.z0], [ESCOTILHA.x0, ESCOTILHA.z1], [ESCOTILHA.x1, ESCOTILHA.z1]] as const) { expect(chaoNoEspaco({ x, z })).toBe(true); expect(naCupula({ x, z })).toBe(false); }
    expect(ESCOTILHA.x1).toBeLessThan(DOCA_MOTOS.x0);
  });
  it("subir a escada rolante andando: entra pelo pé, a rampa leva do piso ao teto e sai em cima; e o caminho de volta", () => {
    const E = ESCADA_ROLANTE;
    let r = passoDaRolante({ x: E.x, z: E.z0 + 0.2 }, false, false); expect(r.naEscada).toBe(true);
    let y = 0; for (let z = E.z0 + 0.2; z <= E.z1 + 0.5; z += 0.25) { r = passoDaRolante({ x: E.x, z }, true, false); expect(r.y).toBeGreaterThanOrEqual(y - 1e-9); y = r.y; }
    r = passoDaRolante({ x: E.x, z: E.z1 + 0.4 }, true, false); expect(r.naEscada).toBe(false); expect(r.y).toBeCloseTo(TETO_MINI.y);
    expect(passoDaRolante({ x: E.x + 3, z: E.z1 }, true, false).p.x).toBeLessThanOrEqual(E.x + E.meia);   // (o corrimão segura)
    expect(passoDaRolante({ x: E.x, z: (E.z0 + E.z1) / 2 }, false, false).naEscada).toBe(false);   // (pelo meio, lá de baixo, não se entra)
    expect(passoDaRolante({ x: E.x, z: E.z1 - 0.2 }, false, true).naEscada).toBe(true);   // (do teto, pelo topo, entra)
    expect(passoDaRolante({ x: E.x, z: (ESCOTILHA.z0 + ESCOTILHA.z1) / 2 }, false, true).naEscada).toBe(false);   // (pelo meio da escotilha, não)
  });
  it("a Cidade dos Anjos só abre pra admin; o lounge pra todo mundo", () => {
    const z = BURACOS_ESPACO.find((b) => b.id === "anjos")!, p = BURACOS_ESPACO.find((b) => b.id === "lounge")!;
    expect(buracoAberto(z, false)).toBe(false); expect(buracoAberto(z, true)).toBe(true); expect(buracoAberto(p, false)).toBe(true);
  });
});

/**
 * O POUSO NO CONVÉS — a regressão do "pulou e nunca mais pousou".
 *
 * Reproduzido no navegador antes de existir este arquivo: quem nasce na própria nave e aperta espaço descia, o
 * empurrão que torna o casco sólido por fora o jogava 9 m para fora do convés, e a pergunta "tem piso aqui?", feita
 * DEPOIS do empurrão, respondia não. Resultado: `noAr` verdadeiro para sempre, caindo a 17 m/s, câmera dentro do
 * casco. O caso 5 é o que importa — um quadro lento passa do convés inteiro de uma vez, e isso TEM de ser pouso.
 */
describe("pousaNoConves · o pulo em cima da própria nave", () => {
  const Y = MINHA_NAVE.y, TOPO = Y + TETO_MINI.y;
  const noConves = { x: CHEGADA_TETO.x, z: CHEGADA_TETO.z };
  const foraDoConves = { x: 15, z: 25 };

  it("1 · descendo sobre o convés, vindo de cima = POUSO", () => {
    expect(pousaNoConves({ yAnt: TOPO + 1.2, y: TOPO - 0.05, vy: -4, l: noConves, naveY: Y })).toBe(true);
  });

  it("2 · SUBINDO pelo convés não é pouso (senão o pulo nem começa)", () => {
    expect(pousaNoConves({ yAnt: TOPO - 0.1, y: TOPO - 0.05, vy: +6, l: noConves, naveY: Y })).toBe(false);
  });

  it("3 · vindo DE BAIXO não é pouso — o convés é piso, não teto", () => {
    expect(pousaNoConves({ yAnt: TOPO - 3, y: TOPO - 2.9, vy: -1, l: noConves, naveY: Y })).toBe(false);
  });

  it("4 · fora do convés não há piso nenhum (é espaço aberto, e cair ali é o certo)", () => {
    expect(pousaNoConves({ yAnt: TOPO + 1.2, y: TOPO - 0.05, vy: -4, l: foraDoConves, naveY: Y })).toBe(false);
  });

  it("5 · QUADRO LENTO: passou do convés inteiro de uma vez e AINDA é pouso", () => {
    // 50 ms a −17 m/s = 0,85 m num quadro só: era exatamente aqui que ele atravessava
    expect(pousaNoConves({ yAnt: TOPO + 0.2, y: TOPO - 0.85, vy: -17, l: noConves, naveY: Y })).toBe(true);
    // e mesmo um quadro catastrófico (meio segundo parado) não pode virar queda eterna
    expect(pousaNoConves({ yAnt: TOPO + 0.1, y: TOPO - 8, vy: -22, l: noConves, naveY: Y })).toBe(true);
  });

  it("6 · parado em cima do convés (vy 0) continua sendo pouso", () => {
    expect(pousaNoConves({ yAnt: TOPO, y: TOPO, vy: 0, l: noConves, naveY: Y })).toBe(true);
  });
});

/**
 * O PORTÃO DA ORDEM: a pergunta tem de ser feita ANTES do empurrão do casco. Isto afirma sobre o TEXTO do engine
 * porque é a ORDEM das linhas que estava errada, e ordem não aparece em teste de comportamento de função pura.
 */
describe("a ordem no engine (o que o defeito realmente era)", () => {
  it("o empurrão do casco não roda quando o quadro é um pouso", () => {
    const eng = readFileSync(join(process.cwd(), "components/cyber/engine.ts"), "utf8");
    expect(eng, "o engine não usa a regra pura — ela viraria código morto").toContain("pousaNoConves({");
    const iPouso = eng.indexOf("pousandoNoConves = pousaNoConves({");
    const iEmpurrao = eng.indexOf("!pousandoNoConves && v.y < n.y + TETO_MINI.y - 0.2");
    expect(iPouso, "o pouso não é calculado").toBeGreaterThan(0);
    expect(iEmpurrao, "o empurrão do casco não está travado pelo pouso").toBeGreaterThan(0);
    expect(iPouso, "calcular o pouso DEPOIS do empurrão é o bug original").toBeLessThan(iEmpurrao);
  });
});
