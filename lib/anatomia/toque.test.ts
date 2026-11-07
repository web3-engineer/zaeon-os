/**
 * O discriminador toque-vs-órbita.
 *
 * Por que isto merece teste próprio: no visualizador o MESMO botão gira o corpo e seleciona uma
 * estrutura. Se esta máquina errar para o lado permissivo, cada arrasto para girar abre o painel de
 * uma peça ao acaso; se errar para o restritivo, nada seleciona. Os dois defeitos parecem "a cena
 * está estranha" e nenhum aparece em log.
 */
import { describe, expect, it } from "vitest";
import { DiscriminadorDeToque } from "@/lib/anatomia/toque";

const MOUSE = 5, DEDO = 12;

describe("DiscriminadorDeToque", () => {
  it("ponteiro que não se move é TOQUE", () => {
    const d = new DiscriminadorDeToque();
    d.down(1, 100, 100, MOUSE);
    expect(d.up(1, 100, 100)).toBe(true);
  });

  it("deslocamento dentro do limiar ainda é toque; passar do limiar é ARRASTO", () => {
    const dentro = new DiscriminadorDeToque();
    dentro.down(1, 100, 100, MOUSE);
    dentro.move(1, 103, 100);                      // 3 px < 5
    expect(dentro.up(1, 103, 100)).toBe(true);

    const fora = new DiscriminadorDeToque();
    fora.down(1, 100, 100, MOUSE);
    fora.move(1, 110, 100);                        // 10 px > 5
    expect(fora.up(1, 110, 100)).toBe(false);
  });

  it("o dedo tem limiar maior que o mouse — 8 px é toque no dedo e arrasto no mouse", () => {
    const comDedo = new DiscriminadorDeToque();
    comDedo.down(1, 0, 0, DEDO);
    comDedo.move(1, 8, 0);
    expect(comDedo.up(1, 8, 0), "8 px com dedo").toBe(true);

    const comMouse = new DiscriminadorDeToque();
    comMouse.down(1, 0, 0, MOUSE);
    comMouse.move(1, 8, 0);
    expect(comMouse.up(1, 8, 0), "8 px com mouse").toBe(false);
  });

  it("um arrasto não VOLTA a ser toque ao regressar ao ponto de partida", () => {
    const d = new DiscriminadorDeToque();
    d.down(1, 100, 100, MOUSE);
    d.move(1, 200, 200);
    d.move(1, 100, 100);                           // voltou — mas já girou o corpo
    expect(d.up(1, 100, 100)).toBe(false);
  });

  it("DOIS dedos é pinça ou pan, nunca toque — nem para o dedo que ficou parado", () => {
    const d = new DiscriminadorDeToque();
    d.down(1, 100, 100, DEDO);
    d.down(2, 200, 200, DEDO);
    expect(d.up(1, 100, 100), "primeiro dedo").toBe(false);
    expect(d.up(2, 200, 200), "segundo dedo").toBe(false);
  });

  it("cancelar bloqueia a sequência inteira, e o ponteiro desconhecido nunca é toque", () => {
    const d = new DiscriminadorDeToque();
    d.down(1, 100, 100, DEDO);
    d.cancel(1);
    expect(d.up(1, 100, 100)).toBe(false);
    expect(d.up(99, 0, 0), "ponteiro que nunca desceu").toBe(false);
  });

  it("depois de um gesto bloqueado, o gesto SEGUINTE volta a poder ser toque", () => {
    const d = new DiscriminadorDeToque();
    d.down(1, 0, 0, DEDO); d.down(2, 50, 50, DEDO);
    d.up(1, 0, 0); d.up(2, 50, 50);                // pinça, bloqueada
    d.down(3, 10, 10, DEDO);                       // nova sequência: ativos estava vazio
    expect(d.up(3, 10, 10), "o bloqueio não pode vazar para o gesto seguinte").toBe(true);
  });
});
