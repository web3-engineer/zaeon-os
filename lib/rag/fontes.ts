/**
 * lib/rag/fontes.ts — o CATÁLOGO das fontes de base por área.
 *
 * O dono perguntou "quantos datasets temos e pertencentes a quais agentes" e a resposta estava
 * espalhada: as fontes moram nos `if (FONTES.includes(...))` de `scripts/ingerir-bases-area.ts`, a
 * licença de cada uma no comentário ao lado, a área de algumas num mapa próprio, e o dono de cada
 * área em `lib/agent/mentors`. Nada disso era consultável de um lugar só. Isto é esse lugar.
 *
 * NÃO É DOCUMENTAÇÃO. `lib/rag/fontes.test.ts` confere o catálogo contra o script de ingestão nos
 * DOIS sentidos: fonte catalogada que o script não executa é promessa vazia, e fonte que o script
 * executa sem estar aqui é dado entrando sem dono declarado. Já perdemos uma carga por falta
 * exatamente desse casamento.
 *
 * Quem lê isto: `scripts/datasets-inventario.ts` (imprime o inventário) e os docs.
 */
import { AREA_GERAL, SLUGS_AREA } from "./areas";
import { MATERIAS } from "./mmlu";
import { AREAS_DO_ARXIV } from "./arxiv";

/** As áreas que o mapa de matérias do MMLU alcança — derivado, nunca escrito à mão. */
const AREAS_DO_MMLU: readonly string[] = [...new Set(Object.values(MATERIAS).map((m) => m.area ?? AREA_GERAL))].sort();

/** Como a fonte decide em que área o documento cai — é isto que define de quem o dado é. */
export type ComoEscolheArea =
  /** `classificarArea` decide verbete por verbete: pode cair em QUALQUER área. */
  | { tipo: "classificador" }
  /** A fonte grava sempre nestas áreas. */
  | { tipo: "fixa"; areas: readonly string[] }
  /**
   * A fonte tem um mapa próprio (matéria do MMLU → área; categoria do arXiv → área), no módulo
   * indicado. As áreas vêm DERIVADAS desse mapa, nunca escritas à mão aqui — e por isso o campo
   * existe: enquanto havia uma fonte de mapa só, `areasDaFonte` resolvia consultando o MMLU
   * direto, e isso passaria a mentir na segunda fonte de mapa.
   */
  | { tipo: "mapa"; modulo: string; areas: readonly string[] }
  /** A área vem do próprio dado (campo `area` do JSONL, ou o nome da pasta). */
  | { tipo: "no-dado" };

/**
 * A NATUREZA da fonte — e é isto que decide se um agente está coberto ou só acompanhado.
 *
 *   `proprio`       corpus do ofício: artigo acadêmico da área, norma, referência técnica. É o que
 *                   faz o agente ter o que dizer que outro agente não teria.
 *   `prova`         questão de exame com gabarito. Ensina a aplicar, não a fundamentar.
 *   `enciclopedico` verbete geral. Cobre TODAS as áreas, e por isso mesmo não distingue nenhuma:
 *                   contar Wikipédia como cobertura é dizer que todo agente está coberto, o que
 *                   esvazia a palavra. Serve de piso, não de especialidade.
 */
export type Natureza = "proprio" | "prova" | "enciclopedico";

/**
 * Uma medição REAL, com onde e quando. `vps` significa que o dado JÁ ESTÁ no banco de produção;
 * `ensaio` significa que rodou aqui em seco e entra quando o deploy acontecer. Misturar os dois é
 * dizer que temos o que ainda não temos.
 */
export type Medicao = {
  data: string;
  onde: "vps" | "ensaio";
  nota?: string;
  porArea: Readonly<Record<string, number>>;
};

export type FonteDeBase = {
  /** o que se passa em `--fontes` */
  id: string;
  origem: string;
  licenca: string;
  /** uso comercial permitido — conferido NA FONTE, não de memória */
  comercial: boolean;
  area: ComoEscolheArea;
  /**
   * `producao`  — já ingerida em alguma VPS, com contagem medida
   * `pronta`    — código e teste prontos, esperando o deploy/execução
   * `bloqueada` — falta algo externo, e `nota` diz o quê
   */
  estado: "producao" | "pronta" | "bloqueada";
  natureza: Natureza;
  /** o que de fato foi contado, e onde. Vazio = nunca medimos. */
  medicoes?: readonly Medicao[];
  nota?: string;
};

export const FONTES_DE_BASE: readonly FonteDeBase[] = [
  {
    id: "scielo",
    origem: "SciELO em português (parquet convertido por scripts/scielo-para-jsonl.ts)",
    licenca: "CC BY 4.0", comercial: true,
    area: { tipo: "classificador" },
    estado: "pronta",
    natureza: "proprio",
    medicoes: [
      // Contado na VPS pelo scripts/bases-area-placar.ts: este dado JÁ ESTÁ no banco de produção.
      // A execução parou na área 6 de 13, e é por isso que as sete seguintes estavam em zero.
      {
        data: "2026-11-08", onde: "vps", nota: "placar da VPS; execução interrompida na área 6 de 13",
        porArea: { medicina: 1497, enfermagem: 1500, biologia: 1500, "eng-computacao": 626, "eng-energias": 984, matematica: 1185 },
      },
      // O corpus INTEIRO, refeito pelo scripts/scielo-para-jsonl.ts: 154.040 artigos extraídos,
      // 62.032 classificados, e o teto de --por-area 1500 aplicado. As 17 áreas recebem — e é isto
      // que tira agronomia, engenharia civil, veterinária e farmácia de DESCOBERTAS.
      {
        data: "2026-11-08", onde: "ensaio",
        nota: "154.040 artigos extraídos do parquet; ingestão em seco com --por-area 1500",
        porArea: {
          medicina: 1500, enfermagem: 1500, psicologia: 1500, biologia: 1500, agronomia: 1500, veterinaria: 1500,
          quimica: 1410, matematica: 1274, "dados-ia": 1181, "eng-civil": 1169, farmacia: 1017, "eng-energias": 972,
          infra: 608, seguranca: 517, fisica: 471, "eng-computacao": 262, software: 153,
        },
      },
    ],
    nota: "o JSONL foi apagado com o /tmp da VPS, e agora é REFEITO por scripts/scielo-para-jsonl.ts "
      + "(sem Python, sem pyarrow). Pico de 11 GB de RSS no grupo 0, então roda em contêiner "
      + "descartável, NUNCA dentro do zaeon_web; com `--grupos 1` são 3,9 GB e ainda cobre as 17 áreas.",
  },
  {
    id: "wiki",
    origem: "API ao vivo da Wikipédia em português (as sementes de cada área)",
    licenca: "CC BY-SA 4.0", comercial: true,
    area: { tipo: "fixa", areas: [] }, // uma semente por área: ver AREAS[].wikipedia
    estado: "pronta",
    natureza: "enciclopedico",
    medicoes: [{
      data: "2026-11-08", onde: "ensaio", nota: "167 ok · 0 falharam · 1 esboço (Exame físico)",
      porArea: { medicina: 11, enfermagem: 7, biologia: 12, "eng-computacao": 11, "eng-energias": 9, matematica: 10, fisica: 10, agronomia: 9, quimica: 10, "eng-civil": 8, veterinaria: 7, psicologia: 9, farmacia: 8, software: 12, infra: 11, seguranca: 11, "dados-ia": 12 },
    }],
    nota: "167 sementes, uma lista por área. Depende do humor da borda da Wikimedia com o IP de "
      + "saída: na VPS as 122 levaram HTTP 429. Para carga de verdade, use `wikipt`.",
  },
  {
    id: "medicina",
    origem: "rhaymison/medicine-medical_meadow_wikidoc_pt e rhaymison/medicine-information-pt (Hugging Face)",
    licenca: "Apache-2.0", comercial: true,
    area: { tipo: "fixa", areas: ["medicina", "enfermagem", "farmacia"] },
    estado: "pronta",
    natureza: "proprio",
    medicoes: [{
      data: "2026-11-08", onde: "ensaio", nota: "lido direto do parquet (5,5 MB e 3,0 MB), sem arquivo intermediário",
      porArea: { medicina: 753, enfermagem: 493, farmacia: 260 },
    }],
    nota: "passou a ler o PARQUET direto do Hugging Face — não depende mais de arquivo em --dir, "
      + "que é como ela morreu. Os dois são pequenos e bem repartidos (10 e 7 grupos de linha), "
      + "pico de 90 MB de RSS.",
  },
  {
    id: "enem",
    origem: "maritaca-ai/enem (Hugging Face), provas de 2022 a 2024",
    licenca: "Apache-2.0", comercial: true,
    area: { tipo: "fixa", areas: [AREA_GERAL] },
    estado: "producao",
    natureza: "prova",
    medicoes: [{
      data: "2026-11-08", onde: "vps", nota: "ENEM 2022-2024, confirmado no placar da VPS",
      porArea: { geral: 540 },
    }],
    nota: "540 questões ingeridas na VPS em 2026-11-08. É a base que TODO agente consulta.",
  },
  {
    id: "mmlu",
    origem: "FreedomIntelligence/MMLU_Portuguese (Hugging Face), 57 matérias em 114 CSVs",
    licenca: "MIT", comercial: true,
    area: { tipo: "mapa", modulo: "lib/rag/mmlu", areas: AREAS_DO_MMLU },
    estado: "pronta",
    natureza: "prova",
    medicoes: [{
      data: "2026-11-08", onde: "ensaio", nota: "114 CSVs, nenhum erro de rede, nenhuma linha torta",
      porArea: { geral: 406, medicina: 87, matematica: 65, psicologia: 59, fisica: 34, biologia: 24, seguranca: 19, quimica: 17, "dados-ia": 12, "eng-computacao": 12, "eng-energias": 8 },
    }],
    nota: "743 documentos medidos em execução real (114 CSVs, nenhum erro). 406 vão pra `geral`.",
  },
  {
    id: "wikipt",
    origem: "wikimedia/wikipedia (Hugging Face), instantâneo 20231101.pt, 6 shards em parquet",
    licenca: "CC BY-SA 3.0 e GFDL", comercial: true,
    area: { tipo: "classificador" },
    estado: "pronta",
    natureza: "enciclopedico",
    medicoes: [{
      data: "2026-11-08", onde: "ensaio", nota: "shard 0 de 6; 185.375 verbetes varridos. `biologia` encheu o teto de --por-area",
      porArea: { biologia: 1500, medicina: 1362, agronomia: 834, "eng-energias": 741, quimica: 659, matematica: 619, "eng-computacao": 460, "eng-civil": 330, psicologia: 295, veterinaria: 253, software: 237, fisica: 221, seguranca: 154, farmacia: 151, "dados-ia": 143, infra: 116, enfermagem: 33 },
    }],
    nota: "8.108 documentos medidos no shard 0 de 6 (185.375 verbetes varridos), nas 17 áreas. "
      + "Com os 6 shards, ~48 mil. Lido por faixa HTTP: não baixa o arquivo.",
  },
  {
    id: "zenodo",
    origem: "resumos de publicações no Zenodo (artigo, anais, tese), pela API de busca",
    // Única fonte do RAG onde a licença é POR DOCUMENTO: o Zenodo é repositório aberto e cada
    // depósito declara a sua. O portão fica em `licencaPermiteUsoComercial` (lib/rag/zenodo), é
    // allowlist por prefixo e recusa por omissão — licença nova fica de fora até alguém olhar.
    licenca: "por registro; só entram as que permitem uso comercial (cc-by, cc-by-sa, cc0, mit, …)",
    comercial: true,
    area: { tipo: "classificador" },
    estado: "pronta",
    natureza: "proprio",
    medicoes: [{
      data: "2026-11-08", onde: "ensaio",
      nota: "varredura completa das 17 áreas em 556 pedidos, sem disjuntor disparar; "
        + "descartes: sem área 3.807, LICENÇA RECUSADA 1.032, resumo curto 571",
      porArea: {
        medicina: 285, enfermagem: 201, "eng-energias": 152, psicologia: 148, biologia: 125,
        agronomia: 124, "eng-civil": 123, farmacia: 99, software: 86, matematica: 84, quimica: 71,
        seguranca: 51, veterinaria: 45, "eng-computacao": 41, "dados-ia": 35, infra: 35, fisica: 34,
      },
    }],
    nota: "Busca por FRASE em português (os `AREAS[].wikipedia`), não por `language:por`: o idioma é "
      + "declarado pelo depositante e numa fatia dele a descrição vinha em inglês, com 12% de "
      + "aproveitamento. Por frase, \"Enfermagem\" rendeu 23 de 25, todos em enfermagem. "
      + "A API aceita `size` de no máximo 25 e vai até a página 400 — 10.000 registros por consulta, "
      + "dez vezes o teto da DOAJ. O 429 é transitório: a primeira versão abandonava a página na "
      + "recusa e colheu 773 documentos parando na 9ª área; com recuo respeitando `Retry-After` "
      + "foram 1.739 nas 17.",
  },
  {
    id: "doaj",
    origem: "resumos de artigos de revistas de acesso aberto, pela API de busca da DOAJ",
    licenca: "CC0 1.0 (metadado de artigo, pelos Termos da DOAJ)", comercial: true,
    area: { tipo: "classificador" },
    estado: "bloqueada",
    natureza: "proprio",
    // SEM `medicoes` de propósito: nada foi colhido. O que eu medi foram amostras de 50 registros em
    // sondagens manuais, e transformar amostra em contagem de carga seria inventar documento que não
    // existe na base. Elas ficam na nota como evidência de que vale pedir o acesso.
    nota: "A DOAJ responde **HTTP 403** a pedido automatizado sustentado, e isso é POLÍTICA, não "
      + "defeito: os Termos dela encaminham uso em massa pelo dump de dados, liberado caso a caso "
      + "por e-mail ao platform manager (https://doaj.org/docs/public-data-dump/). O código está "
      + "pronto e testado, com disjuntor que para em 3 recusas seguidas — basta o acesso. "
      + "Vale pedir: em sondagem manual, a busca por frase em português teve precisão alta "
      + '("concreto armado" 34 de 50 em eng-civil, "enfermagem" 18 de 50 em enfermagem, que é a '
      + "área mais difícil de alimentar), sobre 1.199.705 artigos de revistas em português. "
      + "NÃO se contorna o 403 trocando User-Agent: seria burlar verificação, não cumprir política.",
  },
  {
    id: "wikilivros",
    origem: "Wikilivros e Wikiversidade em português, dump Enterprise HTML (.json.tar.gz) da Wikimedia",
    licenca: "CC BY-SA 3.0 (declarada em cada registro do dump)", comercial: true,
    area: { tipo: "classificador" },
    estado: "pronta",
    // `enciclopedico`, e isto é escolha conservadora. É material DIDÁTICO — livro aberto e material
    // de curso, não enciclopédia e não artigo acadêmico. Mas é texto de comunidade wiki, a mesma
    // procedência da Wikipédia, e chamá-lo de `proprio` inflaria a cobertura de 16 áreas nas costas
    // de texto wiki. Como as 17 áreas já têm corpus do ofício, classificar aqui não muda veredicto
    // nenhum — só evita contar como especialidade o que não é.
    natureza: "enciclopedico",
    medicoes: [{
      data: "2026-11-08", onde: "ensaio",
      nota: "22.867 páginas lidas por fluxo (13.802 + 9.065); descartes: curto 11.044, sem área 9.266, estrutura 412",
      porArea: {
        "eng-computacao": 463, matematica: 306, biologia: 249, software: 213, medicina: 193,
        infra: 136, "eng-energias": 107, agronomia: 93, quimica: 88, seguranca: 66,
        "dados-ia": 63, psicologia: 63, fisica: 37, "eng-civil": 19, farmacia: 19, veterinaria: 16,
        enfermagem: 3,
      },
    }],
    nota: "Vem do dump Enterprise porque o `pages-articles.xml.bz2` é bz2, e nem o zlib do node nem "
      + "a imagem de produção abrem bz2. `enfermagem` rende quase nada aqui — 3 de 2.134 — porque o "
      + "vocabulário dela empata com medicina em texto curto e `classificarArea` recusa empate "
      + "(está em lib/rag/wikilivros.test). Para comparar: a SciELO lhe dá 1.500 e o Zenodo 201, "
      + "porque resumo acadêmico é longo e específico o bastante pra desempatar.",
  },
  {
    id: "arxiv",
    origem: "resumos do arXiv pela API de consulta, por categoria (physics, math, cs.LG, …)",
    licenca: "CC0 1.0 (metadado: título e resumo)", comercial: true,
    area: { tipo: "mapa", modulo: "lib/rag/arxiv", areas: AREAS_DO_ARXIV },
    estado: "pronta",
    natureza: "proprio",
    medicoes: [{
      data: "2026-11-08", onde: "ensaio",
      nota: "execução real contra a API; TODAS as 11 áreas encostaram no teto de --por-area 1500, "
        + "e o disponível é muito maior (física 1.541.518, matemática 753.931, dados-ia 498.054)",
      porArea: {
        fisica: 1500, matematica: 1500, "dados-ia": 1500, software: 1500, seguranca: 1500,
        infra: 1500, "eng-computacao": 1500, biologia: 1500, "eng-energias": 1500, quimica: 1500, medicina: 1500,
      },
    }],
    nota: "O arXiv já vem ROTULADO pela própria taxonomia, então não passa pelo classificador — e é "
      + "isso que o faz servir onde o peS2o não serve. Entra SÓ o resumo: o metadado é CC0, mas o "
      + "texto completo tem a licença do autor, com opções NonCommercial entre elas.",
  },
  {
    id: "dataset",
    origem: "o DATASET montado por scripts/dataset-montar.mjs (Constituição, Kubernetes, CWE, ATT&CK, MDN, REA-MECC)",
    licenca: "CC0, CC BY 4.0, CC BY-SA 2.5, MITRE comercial, CC BY-SA 3.0 (uma por sub-fonte)",
    comercial: true,
    area: { tipo: "no-dado" },
    estado: "pronta",
    natureza: "proprio",
    medicoes: [{
      data: "2026-11-08", onde: "ensaio", nota: "MDN, Kubernetes, CWE+ATT&CK e 14 PDFs do REA-MECC; a Constituição fica fora até existir o mentor de `direito`",
      porArea: { software: 10654, seguranca: 1662, infra: 1113, matematica: 14 },
    }],
    nota: "13.443 documentos + 14 PDFs alcançáveis. Os 412 artigos da Constituição ficam de fora "
      + "até existir o mentor de `direito`.",
  },
];

export const fonteDeBase = (id: string): FonteDeBase | undefined => FONTES_DE_BASE.find((f) => f.id === id);

/** As áreas que o DATASET traz hoje. `direito` fica fora até existir o mentor dele. */
export const AREAS_DO_DATASET: readonly string[] = ["infra", "matematica", "seguranca", "software"];

/**
 * Em que áreas esta fonte REALMENTE pode cair. Nada de "pode em qualquer uma":
 *   · `classificador` só escolhe entre `AREAS` — ele NUNCA devolve `geral`, então scielo e wikipt
 *     não alimentam a base geral, por mais que pareçam gerais;
 *   · o mapa do MMLU é consultável, então a lista sai dele;
 *   · o DATASET tem pastas conhecidas;
 *   · `wiki` tem lista de sementes própria em toda área (`AREAS[].wikipedia`), e nenhuma em `geral`.
 */
export function areasDaFonte(f: FonteDeBase): readonly string[] {
  switch (f.area.tipo) {
    case "classificador": return SLUGS_AREA;
    case "mapa": return f.area.areas;
    case "no-dado": return AREAS_DO_DATASET;
    case "fixa": return f.id === "wiki" ? SLUGS_AREA : f.area.areas;
  }
}

/** As fontes que podem alimentar uma área — o inverso de `areasDaFonte`. */
export function fontesDaArea(slug: string): FonteDeBase[] {
  return FONTES_DE_BASE.filter((f) => areasDaFonte(f).includes(slug));
}

// ─────────────────────────── COBERTURA ───────────────────────────

/**
 * O nível de cobertura de uma área. A régua é a NATUREZA da fonte, não o volume:
 *
 *   `proprio`       tem corpus do ofício. O agente tem o que dizer que nenhum outro teria.
 *   `prova`         só questão de exame. Sabe aplicar, não tem de onde fundamentar.
 *   `enciclopedico` só verbete geral. É o piso que TODA área tem — então é o mesmo que
 *                   descoberto, e chamar isso de cobertura esvaziaria a palavra.
 *
 * Volume não entra na régua de propósito. 10.654 páginas do MDN e 14 PDFs de matemática são os
 * dois `proprio`, e são ordens de grandeza diferentes; o que eles têm em comum — e o que importa
 * aqui — é que são material do ofício e não enciclopédia.
 */
export type Nivel = "proprio" | "prova" | "enciclopedico";

export type Cobertura = {
  area: string;
  nivel: Nivel;
  /** documentos por natureza, somando só o que JÁ ESTÁ no banco (medições `vps`) */
  naVps: Record<Natureza, number>;
  /** documentos por natureza contando também o que está pronto e espera deploy */
  comDeploy: Record<Natureza, number>;
  /** as fontes que alcançam a área e não estão bloqueadas */
  fontes: string[];
};

const zero = (): Record<Natureza, number> => ({ proprio: 0, prova: 0, enciclopedico: 0 });

/**
 * A cobertura de uma área, somada das medições reais. `naVps` conta só `onde: "vps"` — e é por isso
 * que a SciELO, mesmo BLOQUEADA pra rodar de novo, continua contando: os 7.292 documentos dela
 * estão no banco. Estado da fonte e presença do dado são coisas diferentes.
 */
export function coberturaDaArea(slug: string): Cobertura {
  const naVps = zero();
  const comDeploy = zero();
  for (const f of FONTES_DE_BASE) {
    // MÁXIMO entre as medições da MESMA fonte, não soma — e isto não é detalhe. A SciELO tem duas
    // medições pra `medicina`: 1.497 que já estão na VPS e 1.500 que entrariam ao refazer o corpus.
    // Somar daria 2.997, e é falso: rodar de novo não acrescenta 1.500 documentos, encosta no mesmo
    // teto de `--por-area` (a ingestão dedupe pelo hash do texto e devolve "reaproveitado").
    // Duas medições da mesma fonte são duas observações de um teto, não duas remessas.
    // Entre fontes DIFERENTES soma, porque aí são documentos diferentes mesmo.
    const medicoes = f.medicoes ?? [];
    const maxDe = (filtro: (m: Medicao) => boolean) =>
      medicoes.filter(filtro).reduce((mx, m) => Math.max(mx, m.porArea[slug] ?? 0), 0);
    comDeploy[f.natureza] += maxDe(() => true);
    naVps[f.natureza] += maxDe((m) => m.onde === "vps");
  }
  // o nível olha o que EXISTE no desenho (pronto ou já dentro); `naVps` fica à vista pra quem
  // precisa saber o que o aluno alcança HOJE
  const nivel: Nivel = comDeploy.proprio > 0 ? "proprio" : comDeploy.prova > 0 ? "prova" : "enciclopedico";
  return {
    area: slug,
    nivel,
    naVps,
    comDeploy,
    fontes: fontesDaArea(slug).filter((f) => f.estado !== "bloqueada").map((f) => f.id),
  };
}

export const COBERTURA: readonly Cobertura[] = [...SLUGS_AREA, AREA_GERAL].map(coberturaDaArea);

/** Soma dos documentos medidos, por onde. Serve de conferência contra o placar da VPS. */
export function totalMedido(onde: "vps" | "ensaio"): number {
  // Mesma regra de `coberturaDaArea`: por fonte e por área, o máximo entre as medições daquele
  // `onde` — nunca a soma, que inventaria documentos que a dedupe recusaria.
  let total = 0;
  for (const f of FONTES_DE_BASE) {
    const ms = (f.medicoes ?? []).filter((m) => m.onde === onde);
    const areas = new Set(ms.flatMap((m) => Object.keys(m.porArea)));
    for (const a of areas) total += ms.reduce((mx, m) => Math.max(mx, m.porArea[a] ?? 0), 0);
  }
  return total;
}

// ─────────────────────────── O QUE FICOU DE FORA ───────────────────────────

/**
 * POR QUE AS RECUSAS SÃO DADO, e não um parágrafo na documentação: o dono perguntou "o que
 * deixamos de anexar por falhas", e a resposta estava espalhada em prosa de doc e em mensagem de
 * commit. Fonte recusada é decisão de engenharia com motivo e evidência — e sem registro ela é
 * re-investigada do zero a cada vez, ou pior, anexada por engano depois.
 *
 * Cada entrada traz a EVIDÊNCIA medida, não a impressão. "Não serviu" não é motivo.
 */
export type MotivoRecusa =
  /** licença não permite uso comercial, ou não existe licença declarada */
  | "licenca"
  /** precisa de autenticação, chave ou liberação caso a caso */
  | "acesso"
  /** o endereço público não responde */
  | "inalcancavel"
  /** licença e acesso em ordem, mas o conteúdo não serve ao RAG por área */
  | "inadequado"
  /** corpus em inglês que o nosso classificador em português não consegue rotear */
  | "idioma";

export type FonteRecusada = {
  id: string;
  origem: string;
  motivo: MotivoRecusa;
  /** o que foi MEDIDO, com número quando houver */
  evidencia: string;
  /** o que destravaria — vazio quando nada destrava */
  destrava?: string;
};

export const FONTES_RECUSADAS: readonly FonteRecusada[] = [
  {
    id: "allenai/peS2o",
    origem: "Hugging Face — ~40M artigos acadêmicos, ODC-By",
    motivo: "idioma",
    evidencia: "licença e acesso OK. Medi 84.967 registros reais do shard 0: o classificador "
      + "aproveitou 5,4%, com física, química, eng-computação, eng-civil e dados-ia em ZERO. Os "
      + "5,4% foram cognato (`medicin` casando com `medicine`), não classificação.",
    destrava: "uma lista de termos EM INGLÊS por área em lib/rag/areas, ou área fixa por subcorpus",
  },
  {
    id: "bigscience-data/roots_pt_*",
    origem: "Hugging Face — Wikilivros/Wikiversidade/Wikipédia pt em parquet, CC BY-SA 3.0",
    motivo: "acesso",
    evidencia: "HTTP 401 `GatedRepo` no resolve do arquivo: exige autenticação e pedido de acesso.",
    destrava: "token do Hugging Face com acesso aprovado — mas a fonte `wikilivros` já traz o mesmo "
      + "conteúdo pelo dump Enterprise da Wikimedia, sem porteiro",
  },
  {
    id: "embrapa",
    origem: "Embrapa Infoteca-e e Alice — 59.700 registros em português, OAI-PMH funcionando",
    motivo: "licenca",
    evidencia: "o OAI responde 200 e o acervo é grande e em português, mas `dc:rights` diz só "
      + "`openAccess` — que é declaração de ACESSO, não licença. Sem licença por item não entra.",
    destrava: "licença explícita por item no metadado, ou permissão escrita da Embrapa",
  },
  {
    id: "doaj",
    origem: "DOAJ — 1.199.705 artigos de revistas em português, metadado CC0 1.0",
    motivo: "acesso",
    evidencia: "HTTP 403 a pedido automatizado sustentado. O código está pronto e testado "
      + "(lib/rag/doaj), e em sondagem manual a precisão era alta: \"concreto armado\" 34 de 50 em "
      + "eng-civil, \"enfermagem\" 18 de 50 em enfermagem.",
    destrava: "o dump de dados da DOAJ, liberado caso a caso por e-mail ao platform manager. "
      + "NÃO se contorna trocando User-Agent: seria burlar verificação, não cumprir política",
  },
  {
    id: "github/acervos-de-pdf",
    origem: "GitHub — free-educa/books, AIExxplorer/ACERVO_DE_MEDICINA_VETERINARIA e semelhantes",
    motivo: "licenca",
    evidencia: "acervos de PDF de livros COMERCIAIS, sem licença real. Li o arquivo `LICENSE` do "
      + "acervo de veterinária e é um Código de Conduta (Contributor Covenant), não licença. "
      + "É material infringente, e nenhuma licença no repositório mudaria isso.",
  },
  {
    id: "github/material-aberto-minimo",
    origem: "GitHub — EngenhariaLivre/Tabelas (Unlicense), ArvoreDosSaberes (CC0)",
    motivo: "inadequado",
    evidencia: "licença boa, conferida lendo o `LICENSE` de cada um (Unlicense e CC0 1.0). "
      + "Conteúdo mínimo: tabelas em LaTeX e perfil de organização — não é livro-texto nem corpus.",
  },
  {
    id: "core.ac.uk",
    origem: "CORE — agregador de repositórios acadêmicos",
    motivo: "acesso",
    evidencia: "HTTP 429 em `api.core.ac.uk/v3/search/works` sem chave, no primeiro pedido — "
      + "não é limite por volume, é exigência de credencial.",
    destrava: "chave de API do CORE",
  },
  {
    id: "openalex",
    origem: "OpenAlex — metadado de ~250M obras",
    motivo: "acesso",
    evidencia: "HTTP 429 em `api.openalex.org/works` no primeiro pedido; a API passou a exigir "
      + "chave a partir de 2026-02-13.",
    destrava: "chave de API da OpenAlex",
  },
  {
    id: "repositorios-oai-brasileiros",
    origem: "BDTD/IBICT, SciELO Books, Teses USP, Repositório UNESP, Lume/UFRGS",
    motivo: "inalcancavel",
    evidencia: "os endpoints OAI-PMH públicos não respondem: 404 em BDTD, SciELO Books e UNESP; "
      + "sem conexão em Teses USP e Lume.",
    destrava: "endpoint correto, se existir — vale perguntar a cada repositório",
  },
  {
    id: "gutenberg",
    origem: "Project Gutenberg via Gutendex — domínio público",
    motivo: "inalcancavel",
    evidencia: "HTTP 000 (sem conexão) em `gutendex.com/books?languages=pt` deste ambiente; o "
      + "domínio público em si não é o problema.",
  },
  {
    id: "libretexts-openstax",
    origem: "LibreTexts e OpenStax — livros-texto abertos",
    motivo: "licenca",
    evidencia: "CC BY-NC-SA nos dois: a cláusula NonCommercial impede o uso num produto pago, e "
      + "isso não se resolve com engenharia.",
  },
  {
    id: "stackexchange",
    origem: "Stack Exchange — dumps de perguntas e respostas",
    motivo: "licenca",
    evidencia: "a restrição de julho de 2024 passou a excluir uso comercial, redistribuição e "
      + "treino de modelo.",
  },
  {
    id: "alpaca-data-pt-br",
    origem: "Hugging Face — instruções em português",
    motivo: "licenca",
    evidencia: "CC BY-NC no cardData: a cláusula NonCommercial impede uso num produto pago.",
  },
  {
    id: "U4R/SurveyBench",
    origem: "Hugging Face — avaliação de geração de survey",
    motivo: "licenca",
    evidencia: "nenhuma licença declarada no cardData (campo `license` vazio), apesar dos 29 "
      + "arquivos de dado — sem licença não entra.",
  },
  {
    id: "ByteDance-Seed/WideSearch",
    origem: "Hugging Face — avaliação de busca ampla",
    motivo: "licenca",
    evidencia: "cardData traz licença `other` e 201 arquivos: `other` não diz nada, e precisa "
      + "ser lida antes de qualquer uso.",
  },
  {
    id: "scielo-pequenos",
    origem: "Hugging Face — MTEB-BR/scielo-clustering e CEIA-GAIA-EDU/gaia-edu-scielo, CC BY 4.0",
    motivo: "inadequado",
    evidencia: "licença boa, mas tamanho não substitui nada: 4.000 e 200 linhas, contra os 154.218 "
      + "artigos de `dataseek/ptbr-scielo` que já usamos.",
  },
  {
    id: "benchmarks-de-deep-research",
    origem: "mangopy/Deep-Research-Survey — 14 datasets no Hugging Face",
    motivo: "inadequado",
    evidencia: "são benchmarks de AVALIAÇÃO de agente, não corpus de conhecimento, e nenhum em "
      + "português. O repositório em si é lista de leitura (265 links) e não tem LICENSE. "
      + "Os de licença limpa — ReportBench (CC0), frames-benchmark e WebWalkerQA (Apache-2.0) — "
      + "servem a outro buraco: medir o nosso modo de pesquisa, que hoje não tem medida externa.",
  },
];

export const recusasPorMotivo = (): Record<MotivoRecusa, FonteRecusada[]> => {
  const m = {} as Record<MotivoRecusa, FonteRecusada[]>;
  for (const f of FONTES_RECUSADAS) (m[f.motivo] ??= []).push(f);
  return m;
};
