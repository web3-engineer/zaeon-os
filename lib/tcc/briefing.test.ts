import { describe, it, expect } from "vitest";
import { lerBriefing, referenciasDoPedido, secoesDoPedido, marcadoresDoPedido, ehBriefing, entregaveisDoTurno, blocoDeEntregaveis, MAX_INSTRUCOES } from "@/lib/tcc/briefing";

/** O pedido REAL que quebrou em produção (2026-11-04), encurtado só no que não muda a análise. */
const PEDIDO = `Você é um redator acadêmico e cientista da computação sênior. Sua tarefa é redigir a primeira versão de um artigo científico em conformidade com as diretrizes metodológicas de avaliação de modelos de linguagem (LLMs).

CONTEXTO METODOLÓGICO
- Domínio/Aplicação: [ex.: RAG jurídico / Assistente médico / Chat educacional]
- Métricas:
  * Factualidade: exatidão das afirmações em relação ao conhecimento de mundo real.
  * Fidelidade (Groundedness): consistência estrita com os documentos-fonte fornecidos.
- Protocolo Experimental:
  * Dataset: [N] pares de pergunta-contexto, incluindo perguntas sem resposta no texto-fonte.
  * Protocolo de Cegamento: [Duplo-cego / Cego simples].

REFERÊNCIAS OBRIGATÓRIAS (limite-se estritamente a estas):
- Wang et al. (EMNLP 2024), "Factuality of Large Language Models: A Survey"
- Huang et al. (2023), "A Survey on Hallucination in Large Language Models" (arXiv:2311.05232)
- Liang et al. (2022), "Holistic Evaluation of Language Models (HELM)" (arXiv:2211.09110)
- Sun et al. (ICML 2024), "TrustLLM: Trustworthiness in Large Language Models"
- Zheng et al. (NeurIPS 2023), "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena"

DIRETRIZES DE ESCRITA:
1. Tom: Português formal, acadêmico, impessoal e rigoroso.
2. Não invente números, percentuais ou conclusões empíricas. Onde os dados dependerem dos meus testes, utilize o marcador [COMPLETAR: descrição].
4. Caso faça uma inferência plausível mas não verificável, sinalize com [VERIFICAR CITAÇÃO].

ENTREGA NESTE TURNO:
- Seção 1: Introdução e Justificativa (problematizando alucinação e impacto da falta de factualidade)
- Seção 2: Definições Operacionais (diferença formal entre factualidade e fidelidade)
- Seção 3: Metodologia de Avaliação (critérios da rubrica, cegamento, concordância interanotador)
- Seção 6: Limitações e Trabalhos Futuros
(Para as Seções 4 e 5, insira apenas os marcadores de tabelas e gráficos: [INSERIR TABELA 1: Desempenho geral], [INSERIR GRÁFICO 1: Distribuição das notas]).`;

describe("o pedido que quebrou em produção", () => {
  const b = lerBriefing(PEDIDO);

  it("é reconhecido como briefing — e o TEMA não é mais uma fatia da instrução", () => {
    // o defeito: temaDoPedido devolvia "Você é um redator acadêmico e cientista da computação
    // sênior. Sua tarefa é redigir a primeira versão de um artigo científico em conformidade com
    // as diretrizes m" — o preâmbulo cortado no meio da palavra, que virava o TÍTULO do documento.
    expect(b.ehBriefing).toBe(true);
    expect(b.tema).toBe("");
    expect(b.tema).not.toMatch(/Você é um redator/);
  });

  it("as 5 REFERÊNCIAS OBRIGATÓRIAS saem inteiras, e só elas", () => {
    expect(b.referencias).toHaveLength(5);
    expect(b.referencias[0]).toContain("Wang et al. (EMNLP 2024)");
    expect(b.referencias[4]).toContain("Zheng et al. (NeurIPS 2023)");
    // a lista FECHA na linha em branco: nada das "DIRETRIZES DE ESCRITA" entra
    expect(b.referencias.join(" ")).not.toMatch(/Tom:|Não invente/);
  });

  it("o plano de seções do pedido é lido, com 4 e 5 marcadas como SÓ MARCADORES", () => {
    expect(b.secoes.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(b.secoes[0]).toMatchObject({ numero: 1, titulo: "Introdução e Justificativa" });
    expect(b.secoes.find((s) => s.numero === 4)?.soMarcadores).toBe(true);
    expect(b.secoes.find((s) => s.numero === 5)?.soMarcadores).toBe(true);
    expect(b.secoes.find((s) => s.numero === 6)?.soMarcadores).toBeUndefined();
  });

  it("o parêntese explicativo não entra no título da seção", () => {
    expect(b.secoes.find((s) => s.numero === 3)?.titulo).toBe("Metodologia de Avaliação");
  });

  it("o vocabulário de marcadores do PEDIDO é capturado (o escritor tem de falar a mesma língua)", () => {
    expect(b.marcadores).toContain("COMPLETAR");
    expect(b.marcadores).toContain("VERIFICAR CITAÇÃO");
    expect(b.marcadores).toContain("INSERIR TABELA");
    expect(b.marcadores).toContain("INSERIR GRÁFICO");
    expect(b.marcadores.some((m) => m.startsWith("EX"))).toBe(false);   // "[ex.: …]" não é marcador
  });

  it("as instruções inteiras viajam (era isto que se perdia)", () => {
    expect(b.instrucoes).toContain("REFERÊNCIAS OBRIGATÓRIAS");
    expect(b.instrucoes).toContain("impessoal e rigoroso");
    expect(b.instrucoes.length).toBeGreaterThan(1000);
  });
});

describe("o caminho simples NÃO pode mudar — é o que os TCCs de hoje usam", () => {
  it("'crie um TCC sobre a fotossíntese' segue sendo tema simples, sem briefing", () => {
    const b = lerBriefing("crie um TCC sobre a fotossíntese");
    expect(b.ehBriefing).toBe(false);
    expect(b.tema).toBe("a fotossíntese");
    expect(b.referencias).toEqual([]);
    expect(b.secoes).toEqual([]);
    expect(b.instrucoes).toBe("");   // nada de instruções = o motor roda como antes
  });

  it("pedido curto sem 'sobre' não vira briefing nem inventa tema", () => {
    const b = lerBriefing("escreve o artigo");
    expect(b.ehBriefing).toBe(false);
    expect(b.tema).toBe("");
  });
});

describe("referenciasDoPedido · só com cabeçalho explícito", () => {
  it("sem cabeçalho, NÃO adivinha: uma lista qualquer não é bibliografia", () => {
    expect(referenciasDoPedido("Quero um artigo.\n- primeiro ponto\n- segundo ponto")).toEqual([]);
  });

  it("aceita lista numerada e fecha na prosa seguinte", () => {
    const refs = referenciasDoPedido(
      "Referências obrigatórias:\n1. Autor A (2020), Título A\n2. Autor B (2021), Título B\nAgora escreva o texto.",
    );
    expect(refs).toEqual(["Autor A (2020), Título A", "Autor B (2021), Título B"]);
  });

  it("'referências fornecidas' e 'permitidas' também abrem a lista", () => {
    expect(referenciasDoPedido("REFERÊNCIAS FORNECIDAS\n- X (2020)")).toEqual(["X (2020)"]);
    expect(referenciasDoPedido("Referências permitidas:\n- Y (2021)")).toEqual(["Y (2021)"]);
  });
});

describe("secoesDoPedido / marcadoresDoPedido · bordas", () => {
  it("número repetido vale a primeira ocorrência, e a ordem é a do PEDIDO", () => {
    const s = secoesDoPedido("Seção 3: Terceira\nSeção 1: Primeira\nSeção 3: Outra qualquer");
    expect(s.map((x) => [x.numero, x.titulo])).toEqual([[1, "Primeira"], [3, "Terceira"]]);
  });

  it("linha sem número de seção é ignorada", () => {
    expect(secoesDoPedido("Escreva a introdução e a metodologia")).toEqual([]);
  });

  it("marcador sem dois-pontos também conta", () => {
    expect(marcadoresDoPedido("use [VERIFICAR CITAÇÃO] quando faltar")).toEqual(["VERIFICAR CITAÇÃO"]);
  });

  it("texto sem marcador nenhum devolve lista vazia", () => {
    expect(marcadoresDoPedido("um texto comum, sem colchetes")).toEqual([]);
  });
});

describe("limites", () => {
  it("pedido gigante é cortado, pra não comer o orçamento do turno", () => {
    const b = lerBriefing("x".repeat(MAX_INSTRUCOES + 5000));
    expect(b.ehBriefing).toBe(true);
    expect(b.instrucoes).toHaveLength(MAX_INSTRUCOES);
  });

  it("ehBriefing pega estrutura mesmo em texto curto", () => {
    expect(ehBriefing("Seção 1: A\nSeção 2: B")).toBe(true);
  });
});

describe("o buraco de ROTEAMENTO · o que é da RESPOSTA, não do documento", () => {
  const FRASE = "Ao final, forneça uma lista em tópicos com todos os dados empíricos exatos que eu preciso fornecer para completar as lacunas do artigo.";

  it("pega o entregável do pedido real — a lista que sumia", () => {
    const e = entregaveisDoTurno(`Redija as seções 1 e 2 do artigo sobre avaliação de LLMs. ${FRASE}`);
    expect(e).toHaveLength(1);
    expect(e[0]).toContain("dados empíricos exatos");
  });

  it("aceita outros fechos e verbos de entrega", () => {
    expect(entregaveisDoTurno("Escreva o artigo completo. Por fim, liste as decisões que ficaram em aberto para mim.")).toHaveLength(1);
    expect(entregaveisDoTurno("Monte o relatório inteiro. Ao término, apresente um resumo das limitações encontradas.")).toHaveLength(1);
  });

  it("CONSERVADOR: imperativo sem marcador de fecho NÃO é entregável do turno", () => {
    // "liste as referências" dentro do corpo do pedido é instrução do DOCUMENTO
    expect(entregaveisDoTurno("Escreva a seção de método e liste as referências usadas nela.")).toEqual([]);
  });

  it("linha de seção nunca vira entregável, mesmo com verbo de entrega", () => {
    expect(entregaveisDoTurno("Seção 5: Resultados — ao final, apresente os números obtidos no estudo.")).toEqual([]);
  });

  it("o bloco do system diz que é NESTA mensagem, e manda não prometer", () => {
    const b = blocoDeEntregaveis([FRASE]);
    expect(b).toContain("NÃO é seção do documento");
    expect(b).toContain("no corpo desta mensagem");
    expect(b).toContain("não diga que vai fornecer depois — forneça agora");
  });

  it("sem entregável, bloco vazio — pedido simples não ganha texto novo no prompt", () => {
    expect(blocoDeEntregaveis([])).toBe("");
    expect(lerBriefing("crie um TCC sobre a fotossíntese").entregaveis).toEqual([]);
  });

  it("o entregável viaja no briefing do pedido real", () => {
    const b = lerBriefing(`${"x".repeat(400)}\n\n${FRASE}`);
    expect(b.entregaveis).toHaveLength(1);
  });
});
