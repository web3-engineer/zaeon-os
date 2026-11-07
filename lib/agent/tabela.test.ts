/**
 * A regra da tabela.
 *
 * O teste que manda é o da PERDA: `desmontarTabela` converte, e converter só é defensável se nada
 * sumir. Por isso ele não confere um exemplo — ele extrai TODAS as células da tabela de entrada e
 * exige que cada uma apareça na saída. Se um dia a conversão passar a resumir, descartar coluna ou
 * cortar linha, este teste cai.
 *
 * O segundo que manda é o CORPUS: o portão erra de dois jeitos opostos e os dois são ruins. Abrir
 * demais devolve a queixa do dono ("tabela do nada"); fechar demais troca uma grade por uma lista.
 * Então há frases dos dois lados, e as negativas são do tipo que PRODUZIU a queixa.
 */
import { describe, expect, it } from "vitest";
import {
  DIRETRIZ_SEM_TABELA, DIRETRIZ_TABELA_PERMITIDA, desmontarTabela, diretrizDeTabela,
  pedeTabela, semTabelaNaoPedida, temTabelaMarkdown,
} from "@/lib/agent/tabela";

// ───────────────────────────── o portão ─────────────────────────────

/** Perguntas que NÃO pedem dados. É aqui que a tabela aparecia do nada. */
const NAO_PEDE = [
  "oi, tudo bem?",
  "me explica o que é fotossíntese",
  "não entendi a parte da mitocôndria, pode explicar de novo?",
  "por que o céu é azul?",
  "como eu estudo melhor pra prova de amanhã?",
  "qual a importância da Revolução Francesa?",
  "escreve uma introdução pro meu TCC sobre energia solar",
  "o que você achou do meu texto?",
  "me ajuda a entender a diferença de ritmo entre os dois parágrafos",  // "diferença de", não "entre X e Y"
  "resume esse artigo pra mim",
  "traduz isso pro inglês",
  "qual é a fórmula de Bhaskara?",
  "me dá um exemplo de reação exotérmica",
  "como funciona o ciclo da água?",
  "preciso de ajuda com a conclusão",
  "o que significa 'epistemologia'?",
  "corrige a gramática desse parágrafo",
  "me conta sobre a vida do Darwin",
  "obrigado!",
  "pode continuar de onde parou?",
  "monta um tabuleiro de xadrez em ASCII",   // "tabul*" solto engoliria isto
  "desenha um tabuleiro de damas",
];

/** Pedidos que de fato pedem dados — várias entidades × vários atributos. */
const PEDE = [
  "faz uma tabela com os planetas do sistema solar",
  "monta um quadro comparativo entre capitalismo e socialismo",
  "compare o Brasil e a Argentina em PIB e população",
  "qual a diferença entre RNA e DNA?",
  "prós e contras da energia nuclear",
  "vantagens e desvantagens do ensino a distância",
  "Python vs JavaScript pra ciência de dados",
  "me dá os dados de produção de soja por estado",
  "liste os preços médios de cada tipo de combustível",
  "quais são as taxas de juros dos principais bancos",
  "quais os valores de referência para cada exame",
  "tabula os resultados por ano",
  "qual é melhor: metodologia qualitativa ou quantitativa?",
  "semelhanças e diferenças entre mitose e meiose",
];

describe("pedeTabela — o padrão é NÃO", () => {
  it("nenhuma pergunta comum abre o portão (é esta a queixa que originou o arquivo)", () => {
    const abriram = NAO_PEDE.filter(pedeTabela);
    expect(abriram, "tabela liberada em pergunta que não pede dados").toEqual([]);
  });

  it("todo pedido por dados abre", () => {
    const fecharam = PEDE.filter((p) => !pedeTabela(p));
    expect(fecharam, "pedido de dados sem tabela liberada").toEqual([]);
  });

  it("enumerar SOZINHO é lista, não tabela — uma dimensão só não vira grade", () => {
    for (const p of ["quais são os tipos de célula", "liste os continentes", "quais os principais filósofos gregos"]) {
      expect(pedeTabela(p), p).toBe(false);
    }
    // com dado quantitativo junto, aí sim
    expect(pedeTabela("liste os continentes com a população de cada um")).toBe(true);
  });

  it("acento e caixa não importam, e vazio nunca abre", () => {
    expect(pedeTabela("COMPARAÇÃO entre A e B")).toBe(true);
    expect(pedeTabela("comparacao entre A e B")).toBe(true);
    for (const v of ["", "   ", "\n"]) expect(pedeTabela(v), JSON.stringify(v)).toBe(false);
  });

  it("a diretriz do turno é derivada do portão, não escolhida à mão", () => {
    expect(diretrizDeTabela("oi, tudo bem?")).toBe(DIRETRIZ_SEM_TABELA);
    expect(diretrizDeTabela("compare A e B")).toBe(DIRETRIZ_TABELA_PERMITIDA);
    expect(DIRETRIZ_SEM_TABELA).toMatch(/NÃO use tabelas/);
    expect(DIRETRIZ_TABELA_PERMITIDA, "liberar sem exigir fonte repetiria o defeito do gráfico sem fonte").toMatch(/fonte/);
  });
});

// ───────────────────────────── a detecção ─────────────────────────────

const TABELA = [
  "| Planeta | Distância (UA) | Luas |",
  "|---------|----------------|------|",
  "| Terra   | 1,00           | 1    |",
  "| Marte   | 1,52           | 2    |",
].join("\n");

describe("temTabelaMarkdown", () => {
  it("acha tabela de verdade, com e sem barras nas pontas", () => {
    expect(temTabelaMarkdown(TABELA)).toBe(true);
    expect(temTabelaMarkdown("a | b\n--- | ---\n1 | 2")).toBe(true);
    expect(temTabelaMarkdown(`texto antes\n\n${TABELA}\n\ntexto depois`)).toBe(true);
  });

  it("aceita o separador de UM hífen por coluna, que é GFM válido", () => {
    expect(temTabelaMarkdown("| a | b |\n| - | - |\n| 1 | 2 |")).toBe(true);
    expect(temTabelaMarkdown("| a | b |\n|:--|--:|\n| 1 | 2 |"), "alinhamento com dois-pontos").toBe(true);
  });

  it("NÃO confunde prosa com barra, nem lista, nem linha separadora solta", () => {
    for (const t of [
      "use o comando ls | grep foo para filtrar",
      "a resposta é 10 | ou 20, depende",
      "- item um\n- item dois",
      "----------",
      "texto\n\nmais texto",
      "",
    ]) {
      expect(temTabelaMarkdown(t), JSON.stringify(t.slice(0, 30))).toBe(false);
    }
  });
});

// ───────────────────────────── a conversão ─────────────────────────────

/** Todas as células de dados da tabela acima — o que NÃO pode sumir. */
const CELULAS = ["Terra", "1,00", "1", "Marte", "1,52", "2"];
const CABECALHOS = ["Planeta", "Distância (UA)", "Luas"];

describe("desmontarTabela — converte SEM PERDA", () => {
  it("nenhuma célula e nenhum cabeçalho some", () => {
    const fora = desmontarTabela(TABELA);
    for (const c of [...CELULAS, ...CABECALHOS]) {
      expect(fora, `sumiu: ${c}`).toContain(c);
    }
    expect(temTabelaMarkdown(fora), "a saída não pode continuar sendo tabela").toBe(false);
  });

  it("cada linha de dados vira UM item, com rótulo em cada valor", () => {
    const linhas = desmontarTabela(TABELA).split("\n");
    expect(linhas.length).toBe(2);
    expect(linhas[0]).toBe("- Planeta: Terra · Distância (UA): 1,00 · Luas: 1");
    expect(linhas[1]).toBe("- Planeta: Marte · Distância (UA): 1,52 · Luas: 2");
  });

  it("preserva o texto em volta e converte DUAS tabelas no mesmo texto", () => {
    const t = `Olha só:\n\n${TABELA}\n\nE também:\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\nFim.`;
    const fora = desmontarTabela(t);
    expect(fora).toContain("Olha só:");
    expect(fora).toContain("E também:");
    expect(fora).toContain("Fim.");
    expect(fora).toContain("- a: 1 · b: 2");
    expect(temTabelaMarkdown(fora)).toBe(false);
  });

  it("aguenta linha torta: menos células que o cabeçalho, célula vazia e barra escapada", () => {
    const torta = "| Nome | Valor | Obs |\n| --- | --- | --- |\n| A | 1 |\n| B |  | só isto |\n| C\\|D | 2 | x |";
    const fora = desmontarTabela(torta);
    expect(fora).toContain("Nome: A");
    expect(fora).toContain("Valor: 1");
    expect(fora).toContain("Nome: B");
    expect(fora).not.toContain("Valor: \n");          // célula vazia não vira rótulo órfão
    expect(fora).toContain("Obs: só isto");
    expect(fora, "a barra escapada é CONTEÚDO, não separador").toContain("C|D");
    expect(fora).toContain("Valor: 2");
  });

  it("texto SEM tabela volta idêntico", () => {
    const t = "Uma explicação comum.\n\nCom dois parágrafos e um | solto.";
    expect(desmontarTabela(t)).toBe(t);
  });
});

// ───────────────────────── o que o harness chama ─────────────────────────

describe("semTabelaNaoPedida", () => {
  it("pedido de dados: a tabela FICA intacta", () => {
    const fora = semTabelaNaoPedida(TABELA, "compare os planetas em distância e número de luas");
    expect(fora).toBe(TABELA);
  });

  it("pergunta comum: a tabela vira lista, e nada se perde", () => {
    const fora = semTabelaNaoPedida(TABELA, "me explica o que é o sistema solar")!;
    expect(temTabelaMarkdown(fora)).toBe(false);
    for (const c of CELULAS) expect(fora, `sumiu: ${c}`).toContain(c);
  });

  it("texto sem tabela nunca é tocado, nem quando o objetivo é vazio", () => {
    const t = "Resposta normal, sem grade nenhuma.";
    expect(semTabelaNaoPedida(t, "oi")).toBe(t);
    expect(semTabelaNaoPedida(t, "")).toBe(t);
  });

  it("undefined e vazio passam como vieram (o campo é opcional no contrato)", () => {
    expect(semTabelaNaoPedida(undefined, "oi")).toBeUndefined();
    expect(semTabelaNaoPedida("", "oi")).toBe("");
  });
});

// ─────────────────── a fiação: o harness de fato usa isto ───────────────────

/**
 * Estes dois não testam a regra — testam que ela está LIGADA. Sem eles, `tabela.ts` podia ficar
 * perfeito e morto no repositório, que é o estado em que `pedeGraficoMatematico` está até hoje:
 * escrito, testado e nunca chamado pelo lugar que decide.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeAnswer } from "@/lib/agent/aura-harness";

describe("ligado no harness (senão a regra é código morto)", () => {
  const stDe = (objetivo: string) => ({ intent: "duvida_rapida", objective: objetivo } as never);

  it("normalizeAnswer CONVERTE a tabela não pedida, no `nucleo` e no `desenvolvimento`", () => {
    const a = normalizeAnswer({ nucleo: `Veja:\n\n${TABELA}`, desenvolvimento: TABELA }, stDe("me explica o sistema solar"));
    expect(temTabelaMarkdown(a.nucleo), "núcleo ainda com grade").toBe(false);
    expect(temTabelaMarkdown(a.desenvolvimento!), "desenvolvimento ainda com grade").toBe(false);
    for (const c of CELULAS) {
      expect(a.nucleo, `sumiu do núcleo: ${c}`).toContain(c);
      expect(a.desenvolvimento, `sumiu do desenvolvimento: ${c}`).toContain(c);
    }
  });

  it("e NÃO toca na tabela quando o pedido foi por dados", () => {
    const obj = "compare os planetas em distância e número de luas";
    const a = normalizeAnswer({ nucleo: TABELA, desenvolvimento: TABELA }, stDe(obj));
    expect(a.nucleo).toBe(TABELA);
    expect(a.desenvolvimento).toBe(TABELA);
  });

  it("a diretriz entra no prompt do rascunho, derivada do objetivo", () => {
    const fonte = readFileSync(join(process.cwd(), "lib/agent/aura-harness.ts"), "utf8");
    expect(fonte, "a diretriz não é montada a partir do pedido").toContain("diretrizDeTabela(st.objective)");
    expect(fonte, "o filtro não está no normalizeAnswer").toContain("semTabelaNaoPedida(o.desenvolvimento");
  });
});

describe("a prévia em stream também é filtrada", () => {
  it("o harness passa a prévia pelo filtro, senão a grade aparece viva e some depois", () => {
    const fonte = readFileSync(join(process.cwd(), "lib/agent/aura-harness.ts"), "utf8");
    expect(fonte, "prévia sem filtro = o aluno vê a tabela piscar").toContain("semTabelaNaoPedida(previaDoRascunho(acc)");
  });

  it("texto PARCIAL não quebra: cabeçalho sem linhas ainda não é tabela e passa como veio", () => {
    const meio = "Veja:\n\n| Planeta | Luas |\n|---|---|";
    expect(semTabelaNaoPedida(meio, "me explica o sistema solar")).toBe(meio);
    // e assim que a primeira linha de dados chega, vira lista
    const completo = `${meio}\n| Terra | 1 |`;
    const fora = semTabelaNaoPedida(completo, "me explica o sistema solar")!;
    expect(fora).toContain("- Planeta: Terra · Luas: 1");
    expect(temTabelaMarkdown(fora)).toBe(false);
  });
});
