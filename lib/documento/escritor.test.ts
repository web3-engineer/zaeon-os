import { describe, it, expect, vi } from "vitest";
import {
  MARCA_A_FAZER, RESUMO_POR_SECAO, TENTATIVAS_POR_SECAO, corpoAFazer, corpoAceitavel,
  escreverDocumento, partesDoCorpo, preenchimentosDaUnidade, promptDaSecao, unidadesDeEscrita,
  type DepsEscritor, type PedidoSecao,
} from "./escritor";
import { MARCA_SEM_FONTE, nenhumVazio, planoDoDocumento } from "./plano";
import { ESQUELETO_TCC } from "@/lib/tcc/secoes";
import { WORK_SECTIONS } from "@/lib/abntTemplate";

const planoTcc = () => planoDoDocumento(WORK_SECTIONS.TCC);
const planoPlano = () => planoDoDocumento(ESQUELETO_TCC);
const texto = (n: number) => "palavra ".repeat(n).trim();

describe("escritor · unidades de escrita", () => {
  it("a unidade é a seção GRAVADA; as subseções entram DENTRO dela", () => {
    const u = unidadesDeEscrita(planoTcc());
    expect(u.map((x) => x.slot.titulo)).toEqual([
      "INTRODUÇÃO", "REFERENCIAL TEÓRICO", "METODOLOGIA", "RESULTADOS E DISCUSSÃO", "CONCLUSÃO",
    ]);
    const ref = u.find((x) => x.slot.id === "referencial-teorico")!;
    expect(ref.subtitulos.map((s) => s.titulo)).toEqual(["Conceitos Fundamentais", "Estado da Arte"]);
  });

  it("REFERÊNCIAS não é unidade de escrita — ela é montada das fontes citadas", () => {
    expect(unidadesDeEscrita(planoTcc()).some((u) => u.slot.papel === "referencias")).toBe(false);
  });

  it("o piso da unidade soma a abertura + cada subseção", () => {
    const ref = unidadesDeEscrita(planoTcc()).find((x) => x.slot.id === "referencial-teorico")!;
    expect(ref.pisoTotal).toBe(ref.slot.pisoPalavras + ref.subtitulos.reduce((a, s) => a + s.pisoPalavras, 0));
  });

  it("esqueleto plano (lib/tcc/secoes) dá unidades sem subtítulo", () => {
    const u = unidadesDeEscrita(planoPlano());
    expect(u).toHaveLength(ESQUELETO_TCC.length - 1); // -1: REFERÊNCIAS
    expect(u.every((x) => x.subtitulos.length === 0)).toBe(true);
  });

  it("subseção órfã não é adotada pela unidade errada", () => {
    const plano = planoDoDocumento([{ title: "METODOLOGIA", subs: ["Etapa 1"] }, "CONCLUSÃO"]);
    const u = unidadesDeEscrita(plano);
    expect(u.find((x) => x.slot.titulo === "CONCLUSÃO")!.subtitulos).toEqual([]);
  });
});

describe("escritor · o prompt de UMA seção", () => {
  const pedido = (over: Partial<PedidoSecao> = {}): PedidoSecao => ({
    tema: "Membranas celulares",
    tipo: "TCC",
    unidade: unidadesDeEscrita(planoTcc()).find((x) => x.slot.id === "referencial-teorico")!,
    rascunho: [],
    ...over,
  });

  it("pede UMA seção, com o piso e a instrução do papel", () => {
    const { sys, user } = promptDaSecao(pedido());
    expect(user).toContain("SEÇÃO A ESCREVER: REFERENCIAL TEÓRICO");
    expect(user).toContain("estado da arte");
    expect(sys).toMatch(/Extensão mínima: \d+ palavras/);
  });

  it("proíbe o título da seção — senão `secoesDeMarkdown` criaria uma seção fantasma", () => {
    const { sys } = promptDaSecao(pedido());
    expect(sys).toContain("NÃO escreva o título da seção");
    expect(sys).toContain('NÃO use "#" no começo de linha');
  });

  it("manda os `##` exatamente, porque é por eles que a verificação parte o corpo", () => {
    const { sys } = promptDaSecao(pedido());
    expect(sys).toContain("## Conceitos Fundamentais");
    expect(sys).toContain("## Estado da Arte");
  });

  it("seção sem subtítulo diz isso em vez de mandar uma lista vazia", () => {
    const u = unidadesDeEscrita(planoTcc()).find((x) => x.slot.id === "conclusao")!;
    expect(promptDaSecao(pedido({ unidade: u })).sys).toContain("não tem subtítulos");
  });

  it("manda escrever e MARCAR em vez de inventar fonte (decisão do dono)", () => {
    const { sys } = promptDaSecao(pedido());
    expect(sys).toContain("NÃO invente dado, número, autor nem referência");
    expect(sys).toContain(MARCA_SEM_FONTE);
  });

  it("o RASCUNHO-ATÉ-AGORA entra comprimido — é o que evita a conclusão contradizer a introdução", () => {
    const longo = texto(500);
    const { user } = promptDaSecao(pedido({ rascunho: [{ titulo: "INTRODUÇÃO", corpo: longo }] }));
    expect(user).toContain("## INTRODUÇÃO");
    expect(user).toContain("…");
    expect(user.length).toBeLessThan(longo.length); // não manda o documento inteiro: o pool não aceita
    const soIntro = user.split("JÁ FOI ESCRITO")[1];
    expect(soIntro.length).toBeLessThan(RESUMO_POR_SECAO + 200);
  });

  it("primeira seção diz que é a primeira, em vez de um bloco vazio", () => {
    expect(promptDaSecao(pedido()).user).toContain("(esta é a primeira seção)");
  });
});

describe("escritor · do corpo gerado aos slots", () => {
  const ref = () => unidadesDeEscrita(planoTcc()).find((x) => x.slot.id === "referencial-teorico")!;

  it("parte o corpo nos `##`; o texto antes do primeiro é a abertura", () => {
    const corpo = "Abertura do capítulo.\n\n## Conceitos Fundamentais\nA bicamada.\n\n## Estado da Arte\nOs trabalhos recentes.";
    const { abertura, porSlot } = partesDoCorpo(corpo, ref().subtitulos);
    expect(abertura).toBe("Abertura do capítulo.");
    expect(porSlot.get("referencial-teorico/conceitos-fundamentais")).toBe("A bicamada.");
    expect(porSlot.get("referencial-teorico/estado-da-arte")).toBe("Os trabalhos recentes.");
  });

  it("casa o subtítulo por texto normalizado — acento e caixa do modelo não zeram a subseção", () => {
    const corpo = "## conceitos FUNDAMENTAIS\nx\n\n## Estado da arte\ny";
    const { porSlot } = partesDoCorpo(corpo, ref().subtitulos);
    expect(porSlot.get("referencial-teorico/conceitos-fundamentais")).toBe("x");
    expect(porSlot.get("referencial-teorico/estado-da-arte")).toBe("y");
  });

  it("subtítulo que o modelo inventou não faz o texto dele desaparecer", () => {
    const corpo = "Abertura.\n\n## Inventado\nconteúdo que o aluno não pode perder";
    const { abertura } = partesDoCorpo(corpo, ref().subtitulos);
    expect(abertura).toContain("conteúdo que o aluno não pode perder");
    expect(abertura).toContain("Inventado");
  });

  it("sem subtítulos, o corpo inteiro é da seção", () => {
    const u = unidadesDeEscrita(planoTcc()).find((x) => x.slot.id === "conclusao")!;
    const p = preenchimentosDaUnidade(u, "Retomando a pergunta…");
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ slotId: "conclusao", corpo: "Retomando a pergunta…" });
  });

  it("a marca de sem-fonte propaga pro slot certo, não pra seção toda", () => {
    const corpo = `Abertura.\n\n## Conceitos Fundamentais\nA bicamada ${MARCA_SEM_FONTE}\n\n## Estado da Arte\nSem marca aqui.`;
    const p = preenchimentosDaUnidade(ref(), corpo);
    expect(p.find((x) => x.slotId === "referencial-teorico/conceitos-fundamentais")!.semFonte).toBe(true);
    expect(p.find((x) => x.slotId === "referencial-teorico/estado-da-arte")!.semFonte).toBeUndefined();
    expect(p.find((x) => x.slotId === "referencial-teorico")!.semFonte).toBeUndefined();
  });

  it("corpoAceitavel exige o piso DA SEÇÃO e de CADA subseção", () => {
    const u = ref();
    const bom = [
      texto(u.slot.pisoPalavras),
      `## Conceitos Fundamentais\n${texto(u.subtitulos[0].pisoPalavras)}`,
      `## Estado da Arte\n${texto(u.subtitulos[1].pisoPalavras)}`,
    ].join("\n\n");
    expect(corpoAceitavel(u, bom)).toBe(true);
    // total suficiente, mas uma subseção vazia → recusa (é o buraco de hoje)
    const tortoMasLongo = `${texto(u.pisoTotal)}\n\n## Conceitos Fundamentais\nx\n\n## Estado da Arte\n`;
    expect(corpoAceitavel(u, tortoMasLongo)).toBe(false);
  });
});

describe("escritor · a orquestração", () => {
  const deps = (over: Partial<DepsEscritor> = {}) => {
    const salvos: Array<{ titulo: string; corpo: string }> = [];
    const d: DepsEscritor = {
      escrever: async (p) => {
        const u = p.unidade;
        const subs = u.subtitulos.map((s) => `## ${s.titulo}\n${texto(s.pisoPalavras)}`).join("\n\n");
        return [texto(u.slot.pisoPalavras), subs].filter(Boolean).join("\n\n");
      },
      salvar: async (u, corpo) => { salvos.push({ titulo: u.slot.titulo, corpo }); return true; },
      ...over,
    };
    return { d, salvos };
  };

  it("UMA chamada por seção, em ordem — não uma chamada com o documento todo", async () => {
    const { d } = deps();
    const escrever = vi.fn(d.escrever);
    const r = await escreverDocumento({ ...d, escrever }, { tema: "Membranas", tipo: "TCC", plano: planoTcc() });
    expect(escrever).toHaveBeenCalledTimes(5);
    expect(escrever.mock.calls.map((c) => c[0].unidade.slot.titulo)).toEqual([
      "INTRODUÇÃO", "REFERENCIAL TEÓRICO", "METODOLOGIA", "RESULTADOS E DISCUSSÃO", "CONCLUSÃO",
    ]);
    expect(r.escritas).toBe(5);
    expect(r.aFazer).toBe(0);
  });

  it("ESTE É O PONTO DA FASE: o documento sai COMPLETO, subseções incluídas", async () => {
    const { d } = deps();
    const plano = planoTcc();
    const r = await escreverDocumento(d, { tema: "Membranas", tipo: "TCC", plano });
    const c = nenhumVazio(plano, r.preenchimentos);
    expect(c.ok).toBe(true);
    expect(c.pendencias).toEqual([]);
    // as duas subseções que hoje saem vazias em 100% dos documentos
    expect(r.preenchimentos.map((p) => p.slotId)).toContain("referencial-teorico/conceitos-fundamentais");
    expect(r.preenchimentos.map((p) => p.slotId)).toContain("referencial-teorico/estado-da-arte");
  });

  it("o rascunho-até-agora cresce: a CONCLUSÃO vê a INTRODUÇÃO", async () => {
    const { d } = deps();
    const vistos: string[][] = [];
    const escrever = vi.fn(async (p: PedidoSecao) => { vistos.push(p.rascunho.map((x) => x.titulo)); return d.escrever(p); });
    await escreverDocumento({ ...d, escrever }, { tema: "x", tipo: "TCC", plano: planoTcc() });
    expect(vistos[0]).toEqual([]);
    expect(vistos[4]).toEqual(["INTRODUÇÃO", "REFERENCIAL TEÓRICO", "METODOLOGIA", "RESULTADOS E DISCUSSÃO"]);
  });

  it("tenta de novo quando vem curta, e aceita a tentativa boa", async () => {
    const { d } = deps();
    let n = 0;
    const escrever = vi.fn(async (p: PedidoSecao) => (++n === 1 ? "curtinho" : d.escrever(p)));
    const r = await escreverDocumento({ ...d, escrever }, { tema: "x", tipo: "TCC", plano: planoPlano() });
    expect(r.itens[0].tentativas).toBe(1);   // 0-based: a 2ª tentativa resolveu
    expect(r.itens[0].desfecho).toBe("escrita");
  });

  it("no máximo TENTATIVAS_POR_SECAO por seção — teimosia custa o pool", async () => {
    const escrever = vi.fn(async () => "curto");
    const { d } = deps({ escrever });
    const r = await escreverDocumento(d, { tema: "x", tipo: "TCC", plano: planoDoDocumento(["INTRODUÇÃO"]) });
    expect(escrever).toHaveBeenCalledTimes(TENTATIVAS_POR_SECAO);
    expect(r.itens[0].desfecho).toBe("curta");
  });

  it("uma seção que falha NÃO derruba as outras, e sai MARCADA — nunca em branco", async () => {
    const { d, salvos } = deps();
    const escrever = vi.fn(async (p: PedidoSecao) =>
      p.unidade.slot.id === "metodologia" ? Promise.reject(new Error("429")) : d.escrever(p));
    const r = await escreverDocumento({ ...d, escrever }, { tema: "x", tipo: "TCC", plano: planoPlano() });
    expect(r.escritas).toBe(4);
    expect(r.aFazer).toBe(1);
    const met = r.itens.find((i) => i.slotId === "metodologia")!;
    expect(met.desfecho).toBe("a_fazer");
    expect(met.detalhe).toBe("429");
    const corpoMet = salvos.find((s) => s.titulo === "METODOLOGIA")!.corpo;
    expect(corpoMet).toContain(MARCA_A_FAZER);
    expect(corpoMet).toContain("tipo de pesquisa");  // diz o que refazer, não finge ser o trabalho
  });

  it("corpo que o modelo deu, ainda que curto, vence o marcador", async () => {
    const { d, salvos } = deps({ escrever: async () => "texto curto mas real do modelo" });
    const r = await escreverDocumento(d, { tema: "x", tipo: "TCC", plano: planoDoDocumento(["CONCLUSÃO"]) });
    expect(r.itens[0].desfecho).toBe("curta");
    expect(salvos[0].corpo).toBe("texto curto mas real do modelo");
    expect(salvos[0].corpo).not.toContain(MARCA_A_FAZER);
  });

  it("não sobrescreve o que o aluno já escreveu", async () => {
    const { d, salvos } = deps({ jaEscrita: (u) => u.slot.id === "introducao" });
    const r = await escreverDocumento(d, { tema: "x", tipo: "TCC", plano: planoPlano() });
    expect(r.puladas).toBe(1);
    expect(salvos.map((s) => s.titulo)).not.toContain("INTRODUÇÃO");
    expect(r.itens.find((i) => i.slotId === "introducao")!.detalhe).toMatch(/aluno já escreveu/);
  });

  it("falha ao GRAVAR é registrada e não entra no rascunho das próximas", async () => {
    const { d } = deps({ salvar: async (u) => u.slot.id !== "introducao" });
    const vistos: string[][] = [];
    const escrever = vi.fn(async (p: PedidoSecao) => { vistos.push(p.rascunho.map((x) => x.titulo)); return d.escrever(p); });
    const r = await escreverDocumento({ ...d, escrever }, { tema: "x", tipo: "TCC", plano: planoPlano() });
    expect(r.itens[0].detalhe).toBe("não deu pra gravar");
    expect(vistos[1]).toEqual([]); // a 2ª seção não recebe uma introdução que não foi salva
  });

  it("documento vazio não quebra", async () => {
    const { d } = deps();
    expect(await escreverDocumento(d, { tema: "x", tipo: "TCC", plano: [] })).toMatchObject({ escritas: 0, itens: [] });
  });

  it("corpoAFazer nomeia a seção e cada subtítulo que ficou pendente", () => {
    const u = unidadesDeEscrita(planoTcc()).find((x) => x.slot.id === "referencial-teorico")!;
    const c = corpoAFazer(u);
    expect(c).toContain("## Conceitos Fundamentais");
    expect(c).toContain("## Estado da Arte");
    expect(c.match(new RegExp(MARCA_A_FAZER, "g"))).toHaveLength(3);
  });
});
