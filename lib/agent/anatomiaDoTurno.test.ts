/**
 * Os dois defeitos que o dono viu no harness (2026-11-12):
 *  1. "the medical agent is not generating specific parts of the human body, instead is giving back
 *     diagrams" — a peça do atlas perdia para o diagrama automático, a imagem e o guia;
 *  2. "'Papers por ano' just show up with no context at all" — a série entrava em todo turno em que
 *     a busca de literatura rodasse, sem dizer do que era.
 */
import { describe, expect, it } from "vitest";
import type { StudioRef } from "@/lib/agent/contracts";
import { artefatosComAnatomia, pediuOutroArtefato } from "@/lib/agent/anatomiaDoTurno";
import { artefatoDeAprender } from "@/lib/agent/aprender";
import { resolveHarnessOutput } from "@/lib/agent/aura-harness";
import { cabePapersPorAno, graficosDoTurno } from "@/lib/agent/graficosDoTurno";
import { carregarAtlas } from "@/lib/anatomia/carregar";
import { estruturaNomeada } from "@/lib/anatomia/pedido";

const atlas = carregarAtlas();
const ref = (studioKind: string, title = "x"): StudioRef => ({ studioKind, title } as StudioRef);
const kinds = (as: readonly StudioRef[]) => as.map((a) => a.studioKind);

describe.runIf(!!atlas)("estruturaNomeada — o pedido nomeia uma peça do atlas?", () => {
  it.each([
    ["me mostra o fêmur", "femur"],
    ["como funciona o coração?", "heart"],
    ["onde fica o fígado", "liver"],
    ["qual a função do diafragma na respiração", "diaphragm"],
    ["quais as partes do cérebro", "brain"],
    ["mostra a artéria femoral", "femoral artery"],
    ["me explica o nervo óptico", "optic nerve"],
    ["sistema respiratório", "respiratory system"],
    ["fêmur", "femur"],
  ])("%s → %s", (frase, nome) => {
    expect(estruturaNomeada(atlas!, frase)?.nome).toBe(nome);
  });

  it("pulmão resolve para um pulmão de verdade (o atlas não tem 'lung' sozinho)", () => {
    expect(estruturaNomeada(atlas!, "desenhe o pulmão")?.nome).toMatch(/lung/);
  });

  it.each([
    "o que é hipertensão arterial",          // "arterial" é adjetivo dentro de `arterial trunk`, não uma peça
    "me explica a fotossíntese",
    "como funciona uma vacina",
    "qual a dose de dipirona",
    "explique o ciclo de Krebs",
    "resuma o artigo sobre mortalidade infantil",
    "como funciona o sistema imune",
    "",
  ])("não nomeia peça: %s", (frase) => {
    expect(estruturaNomeada(atlas!, frase)).toBeNull();
  });

  it("classe genérica não é peça: a skill manda perguntar qual", () => {
    expect(estruturaNomeada(atlas!, "quero ver um osso")).toBeNull();
    expect(estruturaNomeada(atlas!, "me mostra uma artéria")).toBeNull();
  });

  it("texto colado não é pedido de peça", () => {
    expect(estruturaNomeada(atlas!, "o coração ".repeat(60))).toBeNull();
  });
});

describe("artefatosComAnatomia — a peça no lugar do palpite", () => {
  const coracao = { nome: "heart" };

  it("o diagrama, a imagem e o guia que o harness escolheria dão lugar à peça", () => {
    for (const palpite of ["diagram", "image", "guide", "mindmap"]) {
      const r = artefatosComAnatomia({ artefatos: [ref(palpite)], objetivo: "como funciona o coração?", estrutura: coracao });
      expect(r, palpite).toEqual([{ studioKind: "anatomia", title: "heart" }]);
    }
  });

  it("sem artefato nenhum, a peça nasce — não depende mais de o modelo listar `estruturas`", () => {
    expect(artefatosComAnatomia({ artefatos: [], objetivo: "me mostra o fêmur", estrutura: { nome: "femur" } }))
      .toEqual([{ studioKind: "anatomia", title: "femur" }]);
  });

  it("uma peça só: a que o modelo extraiu não duplica a do pedido", () => {
    const r = artefatosComAnatomia({ artefatos: [ref("anatomia", "coração")], objetivo: "como funciona o coração?", estrutura: coracao });
    expect(r).toEqual([{ studioKind: "anatomia", title: "heart" }]);
  });

  it("o que o aluno pediu PELO NOME é dele e fica", () => {
    for (const pedido of ["faz um diagrama do coração", "quero um mapa mental do coração", "cria flashcards do coração", "me dá uma aula sobre o coração", "esquema do coração", "linha do tempo da cirurgia do coração"]) {
      expect(pediuOutroArtefato(pedido), pedido).toBe(true);
      const atuais = [ref("diagram")];
      expect(artefatosComAnatomia({ artefatos: atuais, objetivo: pedido, estrutura: coracao })).toEqual(atuais);
    }
    expect(pediuOutroArtefato("como funciona o coração?")).toBe(false);
    expect(pediuOutroArtefato("me mostra o fêmur")).toBe(false);
    expect(pediuOutroArtefato("desenhe o pulmão")).toBe(false);
  });

  it("sem estrutura no pedido, nada muda", () => {
    const atuais = [ref("diagram")];
    expect(artefatosComAnatomia({ artefatos: atuais, objetivo: "como funciona uma vacina?", estrutura: null })).toEqual(atuais);
  });

  it("o que não é palpite continua (molécula, trabalho da pesquisa), dentro do teto de 2", () => {
    const r = artefatosComAnatomia({ artefatos: [ref("molecule", "oxigênio"), ref("diagram"), ref("research:artigo")], objetivo: "como o pulmão troca oxigênio?", estrutura: { nome: "left lung" } });
    expect(kinds(r)).toEqual(["anatomia", "molecule"]);
  });

  it("pedido de mostrar marca a peça como explícita", () => {
    const r = artefatosComAnatomia({ artefatos: [], objetivo: "me mostra o fêmur", estrutura: { nome: "femur" }, explicito: true });
    expect(r[0]).toMatchObject({ studioKind: "anatomia", explicito: true });
  });
});

describe("o diagrama automático não acompanha a peça", () => {
  it("artefatoDeAprender cala quando a peça do atlas já viaja com a resposta", () => {
    expect(artefatoDeAprender("explicar_conceito", "como funciona o coração?", { artifacts: [ref("anatomia", "heart")] })).toBeNull();
    // e continua valendo para o resto: pergunta de aprender sem peça ganha o diagrama
    expect(artefatoDeAprender("explicar_conceito", "como funciona uma vacina?", { artifacts: [] })?.studioKind).toBe("diagram");
  });

  it("de ponta a ponta: 'como funciona o coração?' sai com a peça, e só ela", () => {
    const artefatos = artefatosComAnatomia({ artefatos: [], objetivo: "como funciona o coração?", estrutura: { nome: "heart" } });
    const out = resolveHarnessOutput(
      { intent: "explicar_conceito", kind: undefined, artifacts: [] } as any,
      { nucleo: "O coração é uma bomba muscular.", artifacts: artefatos } as any,
      "estudos", "como funciona o coração?",
    );
    expect(out.mode).toBe("structured");
    expect(kinds((out as any).answer.artifacts)).toEqual(["anatomia"]);
  });

  it("…e sem a correção era um diagrama: é o defeito que o dono viu", () => {
    const out = resolveHarnessOutput(
      { intent: "explicar_conceito", kind: undefined, artifacts: [] } as any,
      { nucleo: "O coração é uma bomba muscular." } as any,
      "estudos", "como funciona o coração?",
    );
    expect(kinds((out as any).answer.artifacts)).toEqual(["diagram"]);
  });
});

describe("'Papers por ano' só onde cabe, e com contexto", () => {
  const fontes = [{ year: 2019 }, { year: 2020 }, { year: 2020 }, { year: 2021 }, { year: 2022 }];

  it("pergunta comum não ganha a série, mesmo com a busca de literatura tendo rodado", () => {
    for (const objetivo of ["como funciona o coração?", "me mostra o fêmur", "o que é mitose?", "resolve essa equação"]) {
      expect(graficosDoTurno({ fontes, env: {}, intent: "explicar_conceito", objetivo }), objetivo).toEqual([]);
    }
    expect(graficosDoTurno({ fontes, env: {} })).toEqual([]);   // sem sinal nenhum, não sai
  });

  it("sai quando o turno é sobre a literatura: buscar fontes, escrever trabalho, ou perguntar pelo panorama", () => {
    expect(cabePapersPorAno("pesquisar_fontes", "artigos sobre sepse neonatal")).toBe(true);
    expect(cabePapersPorAno("criar_trabalho", "escreva um artigo sobre sepse")).toBe(true);
    for (const objetivo of ["qual o estado da arte em CRISPR?", "esse tema é pouco explorado?", "quantos artigos existem sobre isso?", "qual a tendência das publicações sobre IA na saúde?", "faz uma revisão de literatura sobre sepse", "onde estão as lacunas da pesquisa?"]) {
      expect(cabePapersPorAno("explicar_conceito", objetivo), objetivo).toBe(true);
    }
    expect(cabePapersPorAno("explicar_conceito", "como funciona o coração?")).toBe(false);
    expect(cabePapersPorAno(undefined, undefined)).toBe(false);
  });

  it("e quando sai, diz do que é e o que mede", () => {
    const [g] = graficosDoTurno({ fontes, env: {}, intent: "pesquisar_fontes", objetivo: "artigos sobre sepse neonatal?" });
    expect(g.titulo).toBe("Papers por ano — artigos sobre sepse neonatal");
    expect(g.fonte).toContain("contagem dos 5 papers que a busca de literatura devolveu");
    expect(g.fonte).toContain("quanto o tema é pesquisado");
    expect(g.alt).toContain(g.titulo);
    expect(g.pontos.map((p) => p.valor)).toEqual([1, 2, 1, 1]);   // os números continuam os da busca
  });

  it("tema longo é cortado no título", () => {
    const [g] = graficosDoTurno({ fontes, env: {}, intent: "pesquisar_fontes", objetivo: "x".repeat(200) });
    expect(g.titulo.length).toBeLessThanOrEqual("Papers por ano — ".length + 70);
  });
});
