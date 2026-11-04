import { describe, it, expect, vi } from "vitest";
import {
  MARCA_A_FAZER, RESUMO_POR_SECAO, TENTATIVAS_POR_SECAO, corpoAFazer, corpoAceitavel,
  ehCorpoAFazer, escreverDocumento, esqueletoEnriquecido, partesDoCorpo, preenchimentosDaUnidade,
  promptDaSecao, unidadesDeEscrita,
  type DepsEscritor, type PedidoSecao,
} from "./escritor";
import { MARCA_SEM_FONTE, nenhumVazio, planoDoDocumento } from "./plano";
import { fonteDeDocumento, fonteDePaper, juntarFontes } from "./fontes";
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

  it("D1 · SEM fontes, o prompt não promete citação — e o ⟨sem fonte⟩ é a saída certa", () => {
    const { sys, user } = promptDaSecao(pedido());
    expect(user).not.toContain("FONTES DISPONÍVEIS");
    expect(sys).not.toContain("CITE ASSIM");
    expect(sys).toContain("nunca invente a fonte");   // a regra de sempre continua
  });

  it("D1 · COM fontes, elas entram no prompt com a citação pronta e o que cada uma diz", () => {
    const fontes = juntarFontes([
      fonteDePaper({ title: "Bicamada lipídica", authors: "Ana Lima", year: 2020 }),
      fonteDeDocumento({ titulo: "Apostila do professor", paginas: "7", extrato: "a membrana é seletiva" }),
    ]);
    const { sys, user } = promptDaSecao(pedido({ fontes }));
    expect(user).toContain("FONTES DISPONÍVEIS");
    expect(user).toContain("CITE ASSIM: (LIMA, 2020)");
    expect(user).toContain("DIZ: a membrana é seletiva");
    // e o sys passa a cobrar a citação, reservando a marca ao que NENHUMA fonte sustenta
    expect(sys).toContain("copiando EXATAMENTE");
    expect(sys).toContain("reservado ao que NENHUMA das fontes sustenta");
  });

  it("D1 · as fontes chegam a TODA seção pelo laço de escrita", async () => {
    const fontes = juntarFontes([fonteDePaper({ title: "T", authors: "Ana Lima", year: 2020 })]);
    const vistos: (readonly unknown[] | undefined)[] = [];
    await escreverDocumento(
      { escrever: async (pd) => { vistos.push(pd.fontes); return "corpo ".repeat(400); }, salvar: async () => "gravou" },
      { tema: "T", tipo: "TCC", plano: planoTcc(), fontes },
    );
    expect(vistos.length).toBeGreaterThan(1);
    expect(vistos.every((f) => f?.length === 1)).toBe(true);
  });

  it("D5 · o quadro é OFERECIDO, com a ordem de não alterar valor e de ignorar se não couber", () => {
    const { user } = promptDaSecao(pedido({ quadro: "Quadro 1 — Papers por ano\n2020  3\nFonte: a busca." }));
    expect(user).toContain("QUADRO DISPONÍVEL");
    expect(user).toContain("NÃO altere nenhum valor");
    expect(user).toContain("Se não couber aqui, ignore");
    expect(user).toContain("Quadro 1 — Papers por ano");
  });

  it("D5 · entrou numa seção ACEITA, some das seguintes (quadro repetido é pior que nenhum)", async () => {
    const quadro = "Quadro 1 — Papers por ano\n2020  3\nFonte: a busca.";
    const ofertas: (string | undefined)[] = [];
    let n = 0;
    await escreverDocumento(
      {
        // a 1ª seção (INTRODUÇÃO, sem subtítulos obrigatórios) devolve o quadro e é ACEITA
        escrever: async (pd) => { ofertas.push(pd.quadro); n++; return (n === 1 ? `${quadro}\n` : "") + "corpo ".repeat(400); },
        salvar: async () => "gravou",
      },
      { tema: "T", tipo: "TCC", plano: planoTcc(), quadro },
    );
    expect(ofertas[0]).toBe(quadro);
    expect(ofertas.length).toBeGreaterThan(1);
    expect(ofertas.slice(1).some((o) => o === quadro)).toBe(false);
  });

  it("D5 · corpo REJEITADO não consome o quadro — ele não entrou no documento, então segue em oferta", async () => {
    // achado escrevendo o teste acima: a seção com subtítulos obrigatórios recusa um corpo sem
    // `##`, o laço reescreve, e o quadro se perde. Continuar oferecendo é o certo — o que não pode
    // é a marca "já usei" valer por uma tentativa que foi jogada fora.
    const quadro = "Quadro 1 — X\n2020  3\nFonte: f.";
    const ofertas: (string | undefined)[] = [];
    let n = 0;
    await escreverDocumento(
      { escrever: async (pd) => { ofertas.push(pd.quadro); n++; return n === 1 ? `${quadro}\n curto` : "corpo ".repeat(400); }, salvar: async () => "gravou" },
      { tema: "T", tipo: "TCC", plano: planoTcc(), quadro },
    );
    expect(ofertas[1]).toBe(quadro);   // a retentativa ainda recebe o quadro
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
      salvar: async (u, corpo) => { salvos.push({ titulo: u.slot.titulo, corpo }); return "gravou" as const; },
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
    const { d } = deps({ salvar: async (u) => (u.slot.id === "introducao" ? "falhou" as const : "gravou" as const) });
    const vistos: string[][] = [];
    const escrever = vi.fn(async (p: PedidoSecao) => { vistos.push(p.rascunho.map((x) => x.titulo)); return d.escrever(p); });
    const r = await escreverDocumento({ ...d, escrever }, { tema: "x", tipo: "TCC", plano: planoPlano() });
    expect(r.itens[0].detalhe).toBe("não deu pra gravar");
    expect(vistos[1]).toEqual([]); // a 2ª seção não recebe uma introdução que não foi salva
  });

  it("REGRESSÃO (achado 🔴): o aluno escreve DURANTE a geração e o texto dele vence", async () => {
    // O retrato de antes do laço diria "vazia" e passaria por cima. A trava é no `salvar`, sobre o
    // estado fresco — é a garantia que o caminho antigo tinha (ele filtrava `!s.corpo.trim()`
    // dentro do callback do `aplicarNoTcc`) e que eu havia perdido.
    const { d, salvos } = deps();
    const salvar = vi.fn(async (u: any, corpo: string) => {
      if (u.slot.id === "metodologia") return "ja_escrita" as const;   // o aluno chegou primeiro
      salvos.push({ titulo: u.slot.titulo, corpo });
      return "gravou" as const;
    });
    const r = await escreverDocumento({ ...d, salvar }, { tema: "x", tipo: "TCC", plano: planoPlano() });
    expect(salvos.map((s) => s.titulo)).not.toContain("METODOLOGIA");
    const met = r.itens.find((i) => i.slotId === "metodologia")!;
    expect(met.desfecho).toBe("pulada");                 // não é falha nem pendência
    expect(met.detalhe).toMatch(/aluno escreveu aqui enquanto a geração corria/);
    expect(r.aFazer).toBe(0);
    expect(r.puladas).toBe(1);
  });

  it("o que o aluno escreveu no meio não entra no rascunho das próximas", async () => {
    const { d } = deps();
    const vistos: string[][] = [];
    const salvar = vi.fn(async (u: any) => (u.slot.id === "introducao" ? "ja_escrita" as const : "gravou" as const));
    const escrever = vi.fn(async (p: PedidoSecao) => { vistos.push(p.rascunho.map((x) => x.titulo)); return d.escrever(p); });
    await escreverDocumento({ ...d, salvar, escrever }, { tema: "x", tipo: "TCC", plano: planoPlano() });
    expect(vistos[1]).toEqual([]); // não damos continuidade a um texto que não lemos
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

describe("escritor · o stub é NOSSO, o texto é do aluno (achados 🔴 e 🟡)", () => {
  const u = () => unidadesDeEscrita(planoTcc()).find((x) => x.slot.id === "referencial-teorico")!;

  it("reconhece o próprio stub — senão um documento marcado nunca seria completado", () => {
    expect(ehCorpoAFazer(corpoAFazer(u()))).toBe(true);
    const semSubs = unidadesDeEscrita(planoTcc()).find((x) => x.slot.id === "conclusao")!;
    expect(ehCorpoAFazer(corpoAFazer(semSubs))).toBe(true);
  });

  it("QUALQUER prosa junto do stub o torna do aluno", () => {
    const c = `${corpoAFazer(u())}\n\nComecei a escrever aqui.`;
    expect(ehCorpoAFazer(c)).toBe(false);
  });

  it("texto do aluno nunca é confundido com stub", () => {
    expect(ehCorpoAFazer("A bicamada lipídica organiza-se…")).toBe(false);
    expect(ehCorpoAFazer("")).toBe(false);
    // menciona a marca no meio do próprio texto: ainda é dele
    expect(ehCorpoAFazer("vou deixar ⟨a escrever⟩ pra depois, mas já adianto que…")).toBe(false);
  });
});

describe("escritor · subtítulos por TIPO de trabalho (achado 🟡)", () => {
  it("TCC recebe os subtítulos declarados pra ele", () => {
    const e = esqueletoEnriquecido(["REFERENCIAL TEÓRICO"], "TCC");
    expect(e[0].subs).toEqual(["Conceitos Fundamentais", "Estado da Arte"]);
  });

  it("ARTIGO NÃO herda os subtítulos do TCC — o template dele não os declara", () => {
    // ESQUELETO_ARTIGO tem REFERENCIAL TEÓRICO, mas WORK_SECTIONS.Artigo não declara subs.
    const e = esqueletoEnriquecido(["REFERENCIAL TEÓRICO"], "Artigo");
    expect(e[0].subs).toBeUndefined();
  });

  it("sem tipo (ou tipo desconhecido) cai no casamento por título — melhor que nenhum subtítulo", () => {
    expect(esqueletoEnriquecido(["REFERENCIAL TEÓRICO"])[0].subs).toEqual(["Conceitos Fundamentais", "Estado da Arte"]);
    expect(esqueletoEnriquecido(["REFERENCIAL TEÓRICO"], "Monografia")[0].subs).toHaveLength(2);
  });

  it("a ordem e o conjunto vêm sempre dos títulos GRAVADOS, não do template", () => {
    const e = esqueletoEnriquecido(["CONCLUSÃO", "INTRODUÇÃO"], "TCC");
    expect(e.map((x) => x.title)).toEqual(["CONCLUSÃO", "INTRODUÇÃO"]);
  });
});

describe("D7 · o PEDIDO da pessoa chega ao escritor", () => {
  const pedido = (over: Partial<PedidoSecao> = {}): PedidoSecao => ({
    tema: "Membranas celulares",
    tipo: "TCC",
    unidade: unidadesDeEscrita(planoTcc()).find((x) => x.slot.id === "referencial-teorico")!,
    rascunho: [],
    ...over,
  });
  const comBriefing = (over: Partial<PedidoSecao["briefing"]> = {}) =>
    pedido({
      briefing: {
        instrucoes: "Tom: português formal e impessoal. Não invente números; use [COMPLETAR: descrição].",
        marcadores: ["COMPLETAR", "VERIFICAR CITAÇÃO"],
        secoes: [{ numero: 1, titulo: "Introdução" }, { numero: 5, titulo: "Resultados", soMarcadores: true }],
        ...(over as object),
      } as PedidoSecao["briefing"],
    });

  it("as instruções entram no prompt — era isto que se perdia (160 caracteres truncados)", () => {
    const { user } = promptDaSecao(comBriefing());
    expect(user).toContain("O PEDIDO DA PESSOA");
    expect(user).toContain("português formal e impessoal");
  });

  it("o MARCADOR do pedido vence o nosso: quem pede [COMPLETAR] não recebe ⟨sem fonte⟩", () => {
    const { sys } = promptDaSecao(comBriefing());
    expect(sys).toContain("[COMPLETAR: descrição do que falta]");
    expect(sys).not.toContain(MARCA_SEM_FONTE);
    // a REGRA não mudou — só a palavra com que a lacuna é marcada
    expect(sys).toContain("NÃO invente dado, número, autor nem referência.");
    expect(sys).toContain("NÃO invente");
  });

  it("sem briefing, nada muda: ⟨sem fonte⟩ segue sendo a marca", () => {
    const { sys, user } = promptDaSecao(pedido());
    expect(sys).toContain(MARCA_SEM_FONTE);
    expect(user).not.toContain("O PEDIDO DA PESSOA");
  });

  it("seção que o pedido mandou NÃO redigir recebe a ordem de só deixar marcadores", () => {
    const u = unidadesDeEscrita(planoTcc()).find((x) => x.slot.id === "referencial-teorico")!;
    const b = comBriefing({ secoes: [{ numero: 2, titulo: u.slot.titulo, soMarcadores: true }] });
    expect(promptDaSecao(b).user).toContain("NÃO redigir esta seção");
  });

  it("seção que o pedido MANDOU escrever não recebe essa ordem", () => {
    expect(promptDaSecao(comBriefing()).user).not.toContain("NÃO redigir esta seção");
  });
});
