import { describe, expect, it } from "vitest";
import { TEMAS_ID } from "@/lib/rooms/temas";
import { ITENS_VISTOS, limparItens } from "@/lib/onboarding/vistosConta";
import { deveMostrarOnboardingTema, problemasDoRoteiro, roteiroDoTema, type PassoOnboarding } from "./porTema";

const p = (id: string, extra: Partial<PassoOnboarding> = {}): PassoOnboarding =>
  ({ id, dica: "dica", fala: "fala", alvos: ['[data-tour="x"]'], cta: "Próximo", ...extra });

describe("onboarding por tema (o encaixe)", () => {
  it("monta os comuns primeiro e depois os do tema", () => {
    const roteiros = { comuns: [p("ola")], porTema: { med: [p("medlab")] } };
    expect(roteiroDoTema("med", roteiros).map((x) => x.id)).toEqual(["ola", "medlab"]);
    expect(roteiroDoTema("bio", roteiros).map((x) => x.id)).toEqual(["ola"]);
  });

  it("o roteiro registrado de TODO tema está são (hoje vazio; continua valendo quando for escrito)", () => {
    for (const tema of TEMAS_ID) expect(problemasDoRoteiro(roteiroDoTema(tema)), tema).toEqual([]);
  });

  it("aponta id repetido, passo sem alvo e texto vazio", () => {
    expect(problemasDoRoteiro([p("a"), p("a")])).toEqual(["id repetido: a"]);
    expect(problemasDoRoteiro([p("b", { alvos: [] })])).toEqual(["b: sem alvo"]);
    expect(problemasDoRoteiro([p("c", { fala: "  " })])).toEqual(["c: texto vazio"]);
  });

  it("só mostra com flag, passos, 1ª vez, fora do tutorial, sem outro tour e em tela larga", () => {
    const ok = { ligado: true, passos: 2, noTutorial: false, visto: false, outroTour: false, largura: 1280 };
    expect(deveMostrarOnboardingTema(ok)).toBe(true);
    expect(deveMostrarOnboardingTema({ ...ok, ligado: false })).toBe(false);
    expect(deveMostrarOnboardingTema({ ...ok, passos: 0 })).toBe(false);
    expect(deveMostrarOnboardingTema({ ...ok, noTutorial: true })).toBe(false);
    expect(deveMostrarOnboardingTema({ ...ok, visto: true })).toBe(false);
    expect(deveMostrarOnboardingTema({ ...ok, outroTour: true })).toBe(false);
    expect(deveMostrarOnboardingTema({ ...ok, largura: 390 })).toBe(false);
  });

  it("a conta aceita guardar o 'já vi' deste onboarding", () => {
    expect(ITENS_VISTOS).toContain("onboarding-tema");
    expect(limparItens(["onboarding-tema", "qualquer"])).toEqual(["onboarding-tema"]);
  });
});
