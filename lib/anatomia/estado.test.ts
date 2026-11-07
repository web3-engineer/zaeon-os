/**
 * A máquina de estado do visualizador.
 *
 * O teste que mais importa é o primeiro: `pecaVisivel` é a ÚNICA definição de "esta peça aparece",
 * e no original a mesma regra está escrita à mão em quatro lugares. Se a contagem do painel e o
 * descarte no shader discordarem, o aluno clica numa peça que não está desenhada e o painel abre
 * descrevendo o que ele não vê. Aqui a regra é uma, e estes testes dizem qual é.
 */
import { describe, expect, it } from "vitest";
import { VISIVEIS_PADRAO, type Conceito, type EstadoCena, type Parte, type SistemaId } from "@/lib/anatomia/atlas";
import {
  ESTADO_INICIAL, PRESET_ESQUELETO, PRESET_ORGAOS, alternarIsolar, alternarRotacao, alternarSistema,
  contarVisiveis, definirExplosao, definirSistemas, definirVista, dicaDeArraste, escolherConceito,
  escolherPeca, esconderTodos, legenda, limparSelecao, pecaVisivel, presetAtivo, reiniciar, soSistema,
} from "@/lib/anatomia/estado";

const peca = (id: string, system: SistemaId): Parte => ({
  id, name: id, conceptId: `C-${id}`, system, chunk: 0,
  positions: 0, normals: 0, indices: 0, vertexCount: 3, indexCount: 3, bounds: [[0, 0, 0], [1, 1, 1]],
});
const OSSO = peca("osso", "skeletal"), CORACAO = peca("coracao", "cardiac"), PELE = peca("pele", "integumentary");
const TODAS = [OSSO, CORACAO, PELE];

describe("pecaVisivel — a única definição de 'aparece'", () => {
  it("sistema ligado aparece; sistema desligado não", () => {
    const e: EstadoCena = { ...ESTADO_INICIAL, visible: ["skeletal"] };
    expect(pecaVisivel(e, OSSO)).toBe(true);
    expect(pecaVisivel(e, CORACAO)).toBe(false);
  });

  it("a SELEÇÃO vence o sistema desligado — é o que faz a busca funcionar sem ligar nada à mão", () => {
    const e: EstadoCena = { ...ESTADO_INICIAL, visible: ["skeletal"], selected: ["coracao"] };
    expect(pecaVisivel(e, CORACAO), "estrutura buscada tem de aparecer").toBe(true);
  });

  it("ISOLANDO, só o selecionado aparece — nem o sistema ligado salva o resto", () => {
    const e: EstadoCena = { ...ESTADO_INICIAL, visible: ["skeletal", "cardiac"], selected: ["coracao"], isolate: true };
    expect(pecaVisivel(e, CORACAO)).toBe(true);
    expect(pecaVisivel(e, OSSO)).toBe(false);
  });

  it("a pele fica de fora do padrão: ligada por padrão ela esconderia o corpo inteiro", () => {
    expect(pecaVisivel(ESTADO_INICIAL, PELE)).toBe(false);
    expect(VISIVEIS_PADRAO).not.toContain("integumentary");
  });

  it("contarVisiveis usa a mesma regra, e não uma cópia dela", () => {
    expect(contarVisiveis(TODAS, ESTADO_INICIAL)).toBe(2);
    expect(contarVisiveis(TODAS, { ...ESTADO_INICIAL, visible: [] })).toBe(0);
    expect(contarVisiveis(TODAS, { ...ESTADO_INICIAL, visible: [], selected: ["pele"] })).toBe(1);
    expect(contarVisiveis(TODAS, { ...ESTADO_INICIAL, selected: ["pele"], isolate: true })).toBe(1);
  });
});

describe("sistemas", () => {
  it("alternar é reversível e NÃO duplica", () => {
    const sem = alternarSistema(ESTADO_INICIAL, "cardiac");
    expect(sem.visible).not.toContain("cardiac");
    const com = alternarSistema(sem, "cardiac");
    expect(com.visible.filter((s) => s === "cardiac").length, "duplicata").toBe(1);
    expect([...com.visible].sort()).toEqual([...VISIVEIS_PADRAO].sort());
  });

  it("alternar LIMPA seleção e isolamento — senão a peça selecionada fica flutuando sozinha", () => {
    const e: EstadoCena = { ...ESTADO_INICIAL, selected: ["coracao"], isolate: true };
    const d = alternarSistema(e, "skeletal");
    expect(d.selected).toEqual([]);
    expect(d.isolate).toBe(false);
  });

  it("clicar no nome do sistema deixa SÓ ele", () => {
    expect(soSistema(ESTADO_INICIAL, "nervous").visible).toEqual(["nervous"]);
  });

  it("esconder tudo esvazia a tela E a seleção", () => {
    const e = esconderTodos({ ...ESTADO_INICIAL, selected: ["coracao"], isolate: true });
    expect(e.visible).toEqual([]);
    expect(e.selected).toEqual([]);
    expect(contarVisiveis(TODAS, e)).toBe(0);
  });

  it("presetAtivo só acende com o conjunto EXATO, não com um superconjunto", () => {
    expect(presetAtivo(definirSistemas(ESTADO_INICIAL, PRESET_ESQUELETO), PRESET_ESQUELETO)).toBe(true);
    expect(presetAtivo(definirSistemas(ESTADO_INICIAL, PRESET_ORGAOS), PRESET_ORGAOS)).toBe(true);
    expect(presetAtivo(ESTADO_INICIAL, PRESET_ESQUELETO), "padrão não é 'só esqueleto'").toBe(false);
    const quaseOrgaos = definirSistemas(ESTADO_INICIAL, [...PRESET_ORGAOS, "skeletal"]);
    expect(presetAtivo(quaseOrgaos, PRESET_ORGAOS), "órgãos + esqueleto não é o preset de órgãos").toBe(false);
    expect(PRESET_ORGAOS.length).toBe(6);
  });
});

describe("seleção, isolamento e explosão", () => {
  it("escolher um CONCEITO seleciona todas as peças dele", () => {
    const c: Conceito = { id: "FMA3710", name: "vascular tree", elements: ["a", "b", "c"] };
    const e = escolherConceito({ ...ESTADO_INICIAL, rotate: true }, c);
    expect(e.selected).toEqual(["a", "b", "c"]);
    expect(e.rotate, "girar enquanto se lê um painel é hostil").toBe(false);
    expect(e.isolate).toBe(false);
  });

  it("escolher uma PEÇA seleciona uma só", () => {
    expect(escolherPeca(ESTADO_INICIAL, "osso").selected).toEqual(["osso"]);
  });

  it("isolar zera a explosão, e desisolar não devolve a explosão antiga", () => {
    const explodido = definirExplosao(ESTADO_INICIAL, 0.6);
    const isolado = alternarIsolar({ ...explodido, selected: ["coracao"] });
    expect(isolado.isolate).toBe(true);
    expect(isolado.explode).toBe(0);
    expect(alternarIsolar(isolado).explode).toBe(0);
  });

  it("isolar SEM seleção apagaria a cena — a UI só oferece isolar dentro do painel de uma estrutura", () => {
    const vazio = alternarIsolar(ESTADO_INICIAL);
    expect(contarVisiveis(TODAS, vazio), "é esta a consequência, e é por isso que a UI não oferece").toBe(0);
  });

  it("limpar seleção também sai do isolamento", () => {
    const e = limparSelecao({ ...ESTADO_INICIAL, selected: ["osso"], isolate: true });
    expect(e.selected).toEqual([]);
    expect(e.isolate).toBe(false);
  });

  it("a explosão é presa a 0–1 e acima de 0,8 vira a vista de frente e para a rotação", () => {
    expect(definirExplosao(ESTADO_INICIAL, -3).explode).toBe(0);
    expect(definirExplosao(ESTADO_INICIAL, 9).explode).toBe(1);
    expect(definirExplosao({ ...ESTADO_INICIAL, view: "side", rotate: true }, 0.9).view).toBe("front");
    expect(definirExplosao({ ...ESTADO_INICIAL, view: "side", rotate: true }, 0.9).rotate).toBe(false);
    expect(definirExplosao({ ...ESTADO_INICIAL, view: "side" }, 0.5).view, "abaixo de 0,8 a vista fica").toBe("side");
  });
});

describe("vistas, reinício e rótulos", () => {
  it("trocar de vista incrementa `reset` — é esse contador que faz a câmera reenquadrar", () => {
    const e = definirVista(ESTADO_INICIAL, "back");
    expect(e.view).toBe("back");
    expect(e.reset).toBe(ESTADO_INICIAL.reset + 1);
    expect(e.rotate).toBe(false);
  });

  it("reiniciar volta ao padrão e NÃO zera o contador de reenquadramento", () => {
    const sujo: EstadoCena = {
      ...ESTADO_INICIAL, explode: 0.7, visible: ["skeletal"], selected: ["osso"],
      isolate: true, view: "side", rotate: true, reset: 4,
    };
    const e = reiniciar(sujo);
    expect(e.explode).toBe(0);
    expect([...e.visible].sort()).toEqual([...VISIVEIS_PADRAO].sort());
    expect(e.selected).toEqual([]);
    expect(e.isolate).toBe(false);
    expect(e.view).toBe("three-quarter");
    expect(e.rotate).toBe(false);
    expect(e.reset, "zerar aqui faria a câmera não reenquadrar no reinício").toBe(5);
  });

  it("reiniciar não compartilha o array de sistemas com o estado inicial", () => {
    const e = reiniciar(ESTADO_INICIAL);
    e.visible.push("integumentary");
    expect(ESTADO_INICIAL.visible, "o estado inicial foi mutado").not.toContain("integumentary");
  });

  it("alternarRotacao é só liga/desliga", () => {
    expect(alternarRotacao(ESTADO_INICIAL).rotate).toBe(true);
    expect(alternarRotacao(alternarRotacao(ESTADO_INICIAL)).rotate).toBe(false);
  });

  it("a legenda tem quatro estados, e o isolamento nomeia a estrutura", () => {
    expect(legenda(ESTADO_INICIAL)).toBe("ADULTO HUMANO · MASCULINO");
    expect(legenda(definirExplosao(ESTADO_INICIAL, 0.3))).toBe("ESTRUTURAS SEPARADAS");
    expect(legenda(definirExplosao(ESTADO_INICIAL, 1))).toBe("INVENTÁRIO ANATÔMICO");
    expect(legenda({ ...ESTADO_INICIAL, isolate: true }, "coração")).toBe("CORAÇÃO");
    expect(legenda({ ...ESTADO_INICIAL, isolate: true }, null), "isolado sem nome").toBe("ESTRUTURA SELECIONADA");
  });

  it("a dica do rodapé acompanha a troca de botão: girar vira deslocar", () => {
    expect(dicaDeArraste(ESTADO_INICIAL)).toMatch(/girar/);
    expect(dicaDeArraste(definirExplosao(ESTADO_INICIAL, 0.9))).toMatch(/deslocar/);
  });
});
