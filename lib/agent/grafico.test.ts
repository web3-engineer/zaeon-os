import { describe, it, expect } from "vitest";
import { COR_SERIE, MAX_PONTOS, descricaoDaSerie, escaparSvg, pontosValidos, svgDoGrafico, tabelaDoGrafico } from "@/lib/agent/grafico";
import { papersToFindings } from "@/lib/agent/runtime";
import {
  MAX_GRAFICOS, MIN_ANOS, MIN_DOCS, MIN_PAPERS,
  graficoCoberturaPorDocumento, graficoLigado, graficoPapersPorAno, graficosDoTurno,
} from "@/lib/agent/graficosDoTurno";

const ano = (y: number, n = 1) => Array.from({ length: n }, () => ({ year: y }));

describe("svgDoGrafico · o desenho", () => {
  const g = { forma: "barras" as const, titulo: "Papers por ano", fonte: "a busca", pontos: [{ label: "2020", valor: 2 }, { label: "2021", valor: 5 }, { label: "2022", valor: 1 }] };

  it("sai SVG válido, com a cor validada e sem legenda (série única)", () => {
    const svg = svgDoGrafico(g)!;
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain(COR_SERIE);
    expect(svg).toContain('role="img"');
    // série única não leva caixa de legenda — o título nomeia a série
    expect(svg).not.toMatch(/legend/i);
  });

  it("a TINTA do texto é currentColor — é o que faz servir tema claro e escuro sem segundo desenho", () => {
    const svg = svgDoGrafico(g)!;
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('stroke="currentColor"');
    // e nenhuma cor de texto fixa que quebraria num dos dois temas
    expect(svg).not.toMatch(/fill="#(?!0891b2)[0-9a-f]{6}"/i);
  });

  it("a série inteira vai no <desc> — é a 'table view' possível dentro da bolha", () => {
    const svg = svgDoGrafico(g)!;
    expect(svg).toContain("<desc>");
    for (const p of g.pontos) expect(svg).toContain(`${p.label}: ${p.valor}`);
  });

  it("rótulo de valor é SELETIVO: todas quando são poucas, só a máxima quando são muitas", () => {
    const poucas = svgDoGrafico(g)!;
    expect((poucas.match(/font-weight="600"/g) ?? []).length).toBe(3);
    const muitas = svgDoGrafico({ ...g, pontos: Array.from({ length: 10 }, (_, i) => ({ label: `20${10 + i}`, valor: i + 1 })) })!;
    expect((muitas.match(/font-weight="600"/g) ?? []).length).toBe(1);   // só a máxima
  });

  it("menos de dois pontos não vira gráfico (a frase já diz o que o desenho diria)", () => {
    expect(svgDoGrafico({ ...g, pontos: [{ label: "2020", valor: 3 }] })).toBeNull();
    expect(svgDoGrafico({ ...g, pontos: [] })).toBeNull();
  });

  it("série toda zero não vira gráfico", () => {
    expect(svgDoGrafico({ ...g, pontos: [{ label: "a", valor: 0 }, { label: "b", valor: 0 }] })).toBeNull();
  });

  it("valor ZERO não desenha barra — achado OLHANDO o render, não no teste", () => {
    // um toco de 2px fazia "nenhum paper neste ano" parecer "quase um", que é a leitura errada que
    // o preenchimento com zero existe pra evitar. O rótulo do ano fica; o vazio é a informação.
    const comZero = svgDoGrafico({ ...g, pontos: [{ label: "2020", valor: 3 }, { label: "2021", valor: 0 }, { label: "2022", valor: 2 }] })!;
    expect((comZero.match(/<path /g) ?? []).length).toBe(2);   // duas barras, três rótulos
    expect(comZero).toContain(">2021<");
    expect(comZero).toContain("2021: 0");                       // e o zero está no desc/title
    const faixas = svgDoGrafico({ forma: "faixas", titulo: "t", fonte: "f", pontos: [{ label: "a", valor: 0 }, { label: "b", valor: 4 }] })!;
    expect((faixas.match(/<path /g) ?? []).length).toBe(1);
  });

  it("o rótulo de valor na faixa vai SEM unidade (ela já está no título) — senão estoura a margem", () => {
    const svg = svgDoGrafico({ forma: "faixas", titulo: "Trechos por documento", fonte: "f", unidade: " trechos", pontos: [{ label: "a", valor: 3 }, { label: "b", valor: 1 }] })!;
    expect(svg).toContain("<desc>");
    expect(svg).toContain("a: 3 trechos");           // no desc e no title do hover, sim
    expect(svg).not.toMatch(/>3 trechos</);          // escrito na barra, não
  });

  it("ESCAPA o rótulo — título de documento é conteúdo, não código", () => {
    const svg = svgDoGrafico({
      forma: "faixas", titulo: 'Doc <img src=x onerror="alert(1)">', fonte: "a base",
      pontos: [{ label: '<script>alert(1)</script>', valor: 2 }, { label: "ok & bom", valor: 1 }],
    })!;
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("<img");
    // a PALAVRA sobrevive como texto escapado, e isso é inofensivo: sem aspas crua não há como
    // fechar o atributo. O que não pode sobreviver é o atributo de verdade.
    expect(svg).not.toContain('onerror="');
    expect(svg).toContain("&lt;script");
    expect(svg).toContain("&amp;");
  });

  it("escaparSvg cobre os cinco caracteres", () => {
    expect(escaparSvg(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });

  it("pontosValidos descarta lixo e respeita o teto", () => {
    expect(pontosValidos([
      { label: "a", valor: 1 }, { label: "  ", valor: 2 }, { label: "b", valor: NaN },
      { label: "c", valor: -1 }, { label: "d", valor: Infinity },
    ]).map((p) => p.label)).toEqual(["a"]);
    expect(pontosValidos(Array.from({ length: 30 }, (_, i) => ({ label: `x${i}`, valor: 1 })))).toHaveLength(MAX_PONTOS);
  });

  it("descricaoDaSerie carrega a unidade e a fonte", () => {
    const d = descricaoDaSerie({ ...g, unidade: " trechos" }, g.pontos);
    expect(d).toContain("2021: 5 trechos");
    expect(d).toContain("Fonte: a busca");
  });
});

describe("graficoPapersPorAno · o gráfico que mostra tema pouco explorado", () => {
  it("O PONTO DA FASE: ano SEM paper entra com ZERO (buraco escondido sugere produção que não existe)", () => {
    // três anos ATIVOS (o mínimo) com vão no meio: 2021 e 2022 não têm paper nenhum
    const g = graficoPapersPorAno([...ano(2019, 2), ...ano(2020), ...ano(2023, 3)])!;
    expect(g.svg).toContain("2021: 0");
    expect(g.svg).toContain("2022: 0");
    expect(g.svg).toContain("2019: 2");
    expect(g.svg).toContain("2023: 3");
  });

  it("o recibo diz de onde veio o número", () => {
    const g = graficoPapersPorAno([...ano(2019), ...ano(2020), ...ano(2021, 2)])!;
    expect(g.fonte).toMatch(/4 papers que a busca de literatura devolveu/);
  });

  it("poucos papers ou poucos anos = sem gráfico", () => {
    expect(MIN_PAPERS).toBe(4);
    expect(MIN_ANOS).toBe(3);
    expect(graficoPapersPorAno(ano(2020, 3))).toBeNull();            // papers de menos
    // o mínimo conta ano ATIVO, não o tamanho do intervalo: dois clusters distantes não bastam
    expect(graficoPapersPorAno([...ano(2020, 5), ...ano(2021, 5)])).toBeNull();
    expect(graficoPapersPorAno([...ano(2010, 2), ...ano(2024, 3)])).toBeNull();
  });

  it("ano inválido é descartado, não desenhado", () => {
    const fontes = [...ano(2019), ...ano(2020), ...ano(2021), ...ano(2022), { year: 12 }, { year: 99999 }, {}];
    const g = graficoPapersPorAno(fontes)!;
    expect(g.fonte).toMatch(/4 papers/);
    expect(g.svg).not.toContain("99999");
  });

  it("intervalo longo fica com os anos MAIS RECENTES", () => {
    const fontes = Array.from({ length: 20 }, (_, i) => ({ year: 2000 + i }));
    const g = graficoPapersPorAno(fontes)!;
    expect(g.svg).toContain("2019: 1");
    expect(g.svg).not.toContain("2000: 1");
  });
});

describe("graficoCoberturaPorDocumento", () => {
  it("conta os trechos por documento", () => {
    const g = graficoCoberturaPorDocumento([
      { titulo: "Artigo A", trechos: [1, 2, 3] },
      { titulo: "Artigo B", trechos: [1] },
    ])!;
    expect(g.svg).toContain("Artigo A: 3 trechos");
    expect(g.titulo).toBe("Trechos usados por documento");
  });

  it("um documento não é comparação", () => {
    expect(MIN_DOCS).toBe(2);
    expect(graficoCoberturaPorDocumento([{ titulo: "A", trechos: [1, 2] }])).toBeNull();
    expect(graficoCoberturaPorDocumento([{ titulo: "A", trechos: [] }, { titulo: "B", trechos: [1] }])).toBeNull();
  });
});

describe("DADO REAL · o gráfico é ligado ao produtor de verdade, não a um fixture meu", () => {
  // A pergunta do dono: "os gráficos são gerados com dados reais e não esporadicamente?".
  // Ler o código e afirmar que sim não prova nada — então o teste parte da MESMA função que o
  // `literature_search` usa pra transformar paper em evidência (`papersToFindings`, runtime.ts).
  // Se um dia ela parar de carregar o ano, ESTE teste cai, e o gráfico não passa a mentir em
  // silêncio.
  const papers = [
    { title: "A", year: 2019, authors: ["X"], url: "https://doi.org/1" },
    { title: "B", year: 2019, authors: ["Y"] },
    { title: "C", year: 2020 },
    { title: "D", year: 2022, doi: "10.1/d" },
  ];

  it("paper do literature_search → evidência → gráfico, com a contagem CERTA", () => {
    const fontes = papersToFindings(papers).map((f) => f.source!).filter(Boolean);
    const g = graficoPapersPorAno(fontes)!;
    expect(g).toBeTruthy();
    expect(g.svg).toContain("2019: 2");   // dois papers em 2019
    expect(g.svg).toContain("2020: 1");
    expect(g.svg).toContain("2021: 0");   // sem paper: vão de verdade
    expect(g.svg).toContain("2022: 1");
    expect(g.fonte).toContain("4 papers");
  });

  it("o que NÃO é paper não entra: busca na web e livro não têm ano", () => {
    // web_search e book_search montam `source` sem `year` (runtime.ts) — então não viram barra, e
    // o título "Papers por ano" continua verdadeiro. É o que impede o recibo de mentir.
    // tipado como Source: sem o `year` opcional explícito o tsc recusa o objeto "fraco" (TS2345),
    // e é exatamente o shape que web_search/book_search devolvem
    const semAno: { title: string; year?: number }[] =
      [{ title: "página qualquer" }, { title: "um livro" }, { title: "outra" }, { title: "mais" }];
    expect(graficoPapersPorAno(semAno)).toBeNull();
    // misturado: só os papers contam, e o recibo diz o número certo
    const g = graficoPapersPorAno([...papersToFindings(papers).map((f) => f.source!), ...semAno])!;
    expect(g.fonte).toContain("4 papers");
  });

  it("paper SEM ano não vira barra fantasma", () => {
    const fontes = papersToFindings([...papers, { title: "E" }, { title: "F" }]).map((f) => f.source!);
    expect(graficoPapersPorAno(fontes)!.fonte).toContain("4 papers");
  });
});

describe("tabelaDoGrafico · o gráfico no DOCUMENTO é quadro, não figura (D5)", () => {
  const g = { forma: "barras" as const, titulo: "Papers por ano", fonte: "a busca de literatura", pontos: [{ label: "2019", valor: 2 }, { label: "2020", valor: 0 }, { label: "2021", valor: 5 }] };

  it("sai como QUADRO ABNT: título numerado, números reais e linha de fonte", () => {
    const t = tabelaDoGrafico(g)!;
    expect(t.split("\n")[0]).toBe("Quadro 1 — Papers por ano");
    expect(t).toContain("2021");
    expect(t).toContain("5");
    expect(t.trimEnd().endsWith("Fonte: a busca de literatura.")).toBe(true);
    // o corpo da seção é TEXTO: nada de SVG nem de marcação que o aluno veria crua
    expect(t).not.toContain("<svg");
    expect(t).not.toContain("<");
  });

  it("o ano sem paper aparece com ZERO, igual ao gráfico — o vão é a informação", () => {
    expect(tabelaDoGrafico(g)!).toMatch(/2020\s+0/);
  });

  it("numera conforme o documento (pode haver quadro antes)", () => {
    expect(tabelaDoGrafico(g, 3)!.startsWith("Quadro 3 —")).toBe(true);
  });

  it("menos de dois pontos não vira quadro (mesma regra do desenho)", () => {
    expect(tabelaDoGrafico({ ...g, pontos: [{ label: "2020", valor: 1 }] })).toBeNull();
  });

  it("os PONTOS vêm junto do gráfico — ninguém precisa parsear o SVG de volta", () => {
    const gt = graficoPapersPorAno([{ year: 2019 }, { year: 2019 }, { year: 2020 }, { year: 2022 }])!;
    expect(gt.pontos.map((p) => `${p.label}:${p.valor}`)).toEqual(["2019:2", "2020:1", "2021:0", "2022:1"]);
    expect(tabelaDoGrafico({ forma: "barras", titulo: gt.titulo, fonte: gt.fonte, pontos: [...gt.pontos] })).toContain("2019");
  });
});

describe("graficosDoTurno · onde CABE é regra, não opinião do modelo", () => {
  const fontes = [...ano(2019), ...ano(2020), ...ano(2021), ...ano(2022)];
  const docs = [{ titulo: "A", trechos: [1, 2] }, { titulo: "B", trechos: [1] }];

  it("liga por padrão e desliga com HARNESS_GRAFICO=0", () => {
    expect(graficoLigado({})).toBe(true);
    expect(graficoLigado({ HARNESS_GRAFICO: "" })).toBe(true);
    expect(graficoLigado({ HARNESS_GRAFICO: "0" })).toBe(false);
    expect(graficoLigado({ HARNESS_GRAFICO: "nao" })).toBe(false);
    expect(graficosDoTurno({ fontes, env: { HARNESS_GRAFICO: "0" } })).toEqual([]);
  });

  it("turno sem número nenhum não produz gráfico (e isso é o caso comum)", () => {
    expect(graficosDoTurno({ env: {} })).toEqual([]);
    expect(graficosDoTurno({ fontes: [{}, {}], env: {} })).toEqual([]);
  });

  it("os dois juntos saem na ordem de utilidade, dentro do teto", () => {
    const gs = graficosDoTurno({ fontes, docsDaBase: docs, env: {} });
    expect(gs).toHaveLength(2);
    expect(gs.length).toBeLessThanOrEqual(MAX_GRAFICOS);
    expect(gs[0].titulo).toBe("Papers por ano");
    expect(gs[1].titulo).toBe("Trechos usados por documento");
  });
});

describe("#745 · o SVG do gráfico é válido", () => {
  it("sem height=\"auto\" como atributo (o navegador reclamava no console); a altura vai no style", () => {
    let feitos = 0;
    for (const forma of ["barras", "faixas", "linha"] as const) {
      const svg = svgDoGrafico({ forma, titulo: "t", pontos: [{ label: "a", valor: 1 }, { label: "b", valor: 2 }, { label: "c", valor: 3 }] } as any);
      feitos += svg ? 1 : 0;
      if (!svg) continue;
      expect(svg).not.toMatch(/<svg[^>]*\sheight="auto"/);
      expect(svg).toMatch(/style="height:auto;/);
    }
    expect(feitos).toBeGreaterThan(0);
  });
});
