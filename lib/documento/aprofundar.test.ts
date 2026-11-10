/**
 * O aprofundamento das seções, com a SAÍDA REAL de produção como fixture.
 *
 * O texto de `ANFETAMINA_RASO` é o que a Zaeon devolveu em 2026-11-10 para "crie um artigo pra mim
 * sobre anfetamina", colado pelo dono. Não é um exemplo inventado para o teste passar: é o caso que
 * originou o trabalho, e é por isso que ele está aqui e não numa fixture genérica.
 */
import { describe, expect, it, vi } from "vitest";
import { palavras } from "@/lib/documento/plano";
import {
  MAX_SECOES_APROFUNDADAS, aprofundarSecoes, pisoDaSecao, promptDeAprofundamento, secoesRasas,
} from "@/lib/documento/aprofundar";

/** A saída de produção, verbatim. */
const ANFETAMINA_RASO = [
  {
    title: "INTRODUÇÃO E MECANISMO DE AÇÃO",
    body: "As anfetaminas são aminas simpatomiméticas que estimulam o sistema nervoso central. Elas agem "
      + "principalmente revertendo o fluxo dos transportadores de dopamina e noradrenalina, o que resulta em uma "
      + "maior concentração desses neurotransmissores na fenda sináptica. Esse aumento de atividade nas vias "
      + "dopaminérgicas e noradrenérgicas melhora temporariamente o estado de alerta, a atenção e reduz a fadiga.",
  },
  {
    title: "USO CLÍNICO E DIAGNÓSTICOS",
    body: "Na medicina moderna, substâncias dessa classe ou análogas são prescritas para o tratamento do "
      + "Transtorno do Déficit de Atenção com Hiperatividade (TDAH). A medicalização e o aumento dos diagnósticos "
      + "comportamentais na infância e na fase escolar têm gerado discussões importantes sobre os limites entre o "
      + "tratamento terapêutico e a normatização social (MENDOZA, 2014). Professores e famílias frequentemente se "
      + "veem no centro desse processo de diagnóstico e intervenção farmacológica (SÁ, 2014).",
  },
  { title: "O FENÔMENO DO USO INDEVIDO E CONSEQUÊNCIAS PSICOLÓGICAS", body: "O uso fora de indicação médica é frequente." },
];

describe("o caso real: o artigo sobre anfetamina que saiu raso", () => {
  it("as três seções estão ABAIXO do piso — é isso que o aluno recebeu", () => {
    const rasas = secoesRasas(ANFETAMINA_RASO);
    expect(rasas.length, "todas as três deviam estar abaixo do piso").toBe(3);
    // a medida que motivou o trabalho: a introdução tem ~57 palavras e o piso dela é 180
    const intro = rasas.find((r) => r.titulo.startsWith("INTRODUÇÃO"))!;
    expect(intro.piso).toBe(180);
    expect(intro.palavras).toBeLessThan(80);
  });

  it("a ordem é por DÉFICIT ABSOLUTO — o teto é gasto onde mais palavras entram", () => {
    /**
     * Medido nesta fixture: introdução 57/180 (faltam 123), uso indevido 8/100 (faltam 92), uso
     * clínico 75/100 (faltam 25). A introdução vai primeiro mesmo não sendo a proporcionalmente
     * mais vazia — com orçamento para N reescritas, "mudar mais o documento" é acrescentar mais
     * texto, não consertar o pedaço percentualmente pior.
     */
    const rasas = secoesRasas(ANFETAMINA_RASO);
    expect(rasas.map((r) => r.titulo.slice(0, 12)))
      .toEqual(["INTRODUÇÃO E", "O FENÔMENO D", "USO CLÍNICO "]);
  });
});

describe("secoesRasas (PURA)", () => {
  it("seção que CUMPRE o piso não é tocada", () => {
    const longa = { title: "INTRODUÇÃO", body: "palavra ".repeat(200) };
    expect(secoesRasas([longa])).toEqual([]);
  });

  it("REFERÊNCIAS nunca entra — é lista montada, não prosa", () => {
    // pedir ao modelo pra "aprofundar as referências" é pedir bibliografia inventada
    expect(secoesRasas([{ title: "REFERÊNCIAS", body: "ABNT, 2024." }])).toEqual([]);
  });

  it("o piso sai do papel do TÍTULO, e é o mesmo da Sala de Pesquisa", () => {
    expect(pisoDaSecao("INTRODUÇÃO")).toBe(180);
    expect(pisoDaSecao("CONCLUSÃO")).toBe(120);
    expect(pisoDaSecao("REFERENCIAL TEÓRICO")).toBe(250);
    expect(pisoDaSecao("USO CLÍNICO E DIAGNÓSTICOS")).toBe(100);   // "outro"
  });
});

describe("o prompt de uma reescrita", () => {
  const rasa = secoesRasas(ANFETAMINA_RASO).find((r) => r.titulo.startsWith("INTRODUÇÃO"))!;
  const p = promptDeAprofundamento({ tema: "anfetamina", tipo: "artigo", secoes: ANFETAMINA_RASO }, rasa);

  it("diz o piso, proíbe o título e proíbe inventar", () => {
    expect(p.sys).toContain("180 palavras");
    expect(p.sys).toContain("NÃO escreva o título");
    expect(p.sys).toContain("NÃO invente dado");
  });

  it("pede PROFUNDIDADE, não comprimento — e autoriza tabela quando ela informa mais", () => {
    // o que separa "mais longo" de "mais fundo", e foi o que faltou na saída real
    expect(p.sys).toMatch(/mecanismo|histórico|condições|consequências/i);
    expect(p.sys).toContain("não repita");
    expect(p.sys).toContain("tabela markdown");
  });

  it("leva o RESTO do documento, para a seção não repetir a vizinha", () => {
    expect(p.user).toContain("USO CLÍNICO E DIAGNÓSTICOS");
    expect(p.user).toContain("O QUE ELA DIZ HOJE");
  });
});

describe("aprofundarSecoes — a orquestração", () => {
  const entrada = { tema: "anfetamina", tipo: "artigo", secoes: ANFETAMINA_RASO };
  const texto = (n: number) => "palavra ".repeat(n).trim();

  it("reescreve as rasas e devolve o documento inteiro, na ordem", async () => {
    const r = await aprofundarSecoes(entrada, { escrever: async () => texto(300) });
    expect(r.secoes.length).toBe(3);
    expect(r.secoes.map((s) => s.title)).toEqual(ANFETAMINA_RASO.map((s) => s.title));
    expect(r.reescritas.length).toBe(3);
    for (const s of r.secoes) expect(palavras(s.body)).toBeGreaterThanOrEqual(pisoDaSecao(s.title));
  });

  it("NUNCA PIORA: resposta mais curta que a original é descartada", async () => {
    const r = await aprofundarSecoes(entrada, { escrever: async () => "duas palavras" });
    expect(r.reescritas).toEqual([]);
    expect(r.secoes[0]!.body).toBe(ANFETAMINA_RASO[0]!.body);
  });

  it("chamada que falha não derruba o documento nem as outras seções", async () => {
    let n = 0;
    const escrever = async () => { n++; if (n === 1) throw new Error("rede"); return texto(300); };
    const r = await aprofundarSecoes(entrada, { escrever });
    expect(r.reescritas.length).toBe(2);        // a que falhou ficou como estava
    expect(r.secoes.length).toBe(3);
  });

  it("é SEQUENCIAL: cada reescrita vê as anteriores já aprofundadas", async () => {
    const vistos: string[] = [];
    const escrever = vi.fn(async (_s: string, u: string) => { vistos.push(u); return texto(300); });
    await aprofundarSecoes(entrada, { escrever });
    // a 2ª chamada já enxerga o corpo NOVO da 1ª (300 palavras), não o raso de origem
    expect(vistos[1]).toContain("palavra palavra");
  });

  it("o teto limita o custo, e o que ficou de fora é DECLARADO, não escondido", async () => {
    const r = await aprofundarSecoes(entrada, { escrever: async () => texto(300), teto: 1 });
    expect(r.reescritas.length).toBe(1);
    expect(r.pendentes.length).toBe(2);
    expect(MAX_SECOES_APROFUNDADAS).toBeGreaterThan(0);
  });

  it("documento sem seção rasa não gasta nenhuma chamada", async () => {
    const escrever = vi.fn(async () => texto(300));
    const r = await aprofundarSecoes({ ...entrada, secoes: [{ title: "INTRODUÇÃO", body: texto(200) }] }, { escrever });
    expect(escrever).not.toHaveBeenCalled();
    expect(r.reescritas).toEqual([]);
  });
});
