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

/** Como a fonte decide em que área o documento cai — é isto que define de quem o dado é. */
export type ComoEscolheArea =
  /** `classificarArea` decide verbete por verbete: pode cair em QUALQUER área. */
  | { tipo: "classificador" }
  /** A fonte grava sempre nestas áreas. */
  | { tipo: "fixa"; areas: readonly string[] }
  /** A fonte tem um mapa próprio (ex.: matéria do MMLU → área), no módulo indicado. */
  | { tipo: "mapa"; modulo: string }
  /** A área vem do próprio dado (campo `area` do JSONL, ou o nome da pasta). */
  | { tipo: "no-dado" };

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
  nota?: string;
};

export const FONTES_DE_BASE: readonly FonteDeBase[] = [
  {
    id: "scielo",
    origem: "SciELO em português (parquet convertido por scripts/scielo-para-jsonl.py)",
    licenca: "CC BY 4.0", comercial: true,
    area: { tipo: "classificador" },
    estado: "bloqueada",
    nota: "precisa de /tmp/bases/scielo.jsonl, que foi apagado quando o /tmp da VPS foi limpo. "
      + "7.292 documentos já ingeridos em 6 áreas; a execução parou na área 6 de 13.",
  },
  {
    id: "wiki",
    origem: "API ao vivo da Wikipédia em português (as sementes de cada área)",
    licenca: "CC BY-SA 4.0", comercial: true,
    area: { tipo: "fixa", areas: [] }, // uma semente por área: ver AREAS[].wikipedia
    estado: "pronta",
    nota: "167 sementes, uma lista por área. Depende do humor da borda da Wikimedia com o IP de "
      + "saída: na VPS as 122 levaram HTTP 429. Para carga de verdade, use `wikipt`.",
  },
  {
    id: "medicina",
    origem: "rhaymison/medicine-medical_meadow_wikidoc_pt e rhaymison/medicine-information-pt (Hugging Face)",
    licenca: "Apache-2.0", comercial: true,
    area: { tipo: "fixa", areas: ["medicina", "enfermagem", "farmacia"] },
    estado: "bloqueada",
    nota: "precisa dos JSONL em --dir, que também foram apagados com o /tmp.",
  },
  {
    id: "enem",
    origem: "maritaca-ai/enem (Hugging Face), provas de 2022 a 2024",
    licenca: "Apache-2.0", comercial: true,
    area: { tipo: "fixa", areas: [AREA_GERAL] },
    estado: "producao",
    nota: "540 questões ingeridas na VPS em 2026-11-08. É a base que TODO agente consulta.",
  },
  {
    id: "mmlu",
    origem: "FreedomIntelligence/MMLU_Portuguese (Hugging Face), 57 matérias em 114 CSVs",
    licenca: "MIT", comercial: true,
    area: { tipo: "mapa", modulo: "lib/rag/mmlu" },
    estado: "pronta",
    nota: "743 documentos medidos em execução real (114 CSVs, nenhum erro). 406 vão pra `geral`.",
  },
  {
    id: "wikipt",
    origem: "wikimedia/wikipedia (Hugging Face), instantâneo 20231101.pt, 6 shards em parquet",
    licenca: "CC BY-SA 3.0 e GFDL", comercial: true,
    area: { tipo: "classificador" },
    estado: "pronta",
    nota: "8.108 documentos medidos no shard 0 de 6 (185.375 verbetes varridos), nas 17 áreas. "
      + "Com os 6 shards, ~48 mil. Lido por faixa HTTP: não baixa o arquivo.",
  },
  {
    id: "dataset",
    origem: "o DATASET montado por scripts/dataset-montar.mjs (Constituição, Kubernetes, CWE, ATT&CK, MDN, REA-MECC)",
    licenca: "CC0, CC BY 4.0, CC BY-SA 2.5, MITRE comercial, CC BY-SA 3.0 (uma por sub-fonte)",
    comercial: true,
    area: { tipo: "no-dado" },
    estado: "pronta",
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
    case "mapa": return [...new Set(Object.values(MATERIAS).map((m) => m.area ?? AREA_GERAL))].sort();
    case "no-dado": return AREAS_DO_DATASET;
    case "fixa": return f.id === "wiki" ? SLUGS_AREA : f.area.areas;
  }
}

/** As fontes que podem alimentar uma área — o inverso de `areasDaFonte`. */
export function fontesDaArea(slug: string): FonteDeBase[] {
  return FONTES_DE_BASE.filter((f) => areasDaFonte(f).includes(slug));
}
