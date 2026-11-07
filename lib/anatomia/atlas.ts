/**
 * lib/anatomia/atlas.ts — O CONTRATO do Atlas de anatomia. PURO: sem React, sem DOM, sem three.
 *
 * ────────────────────────── PROCEDÊNCIA, e ela é dupla ──────────────────────────
 * CÓDIGO: derivado de `app/anatomy.ts` de https://github.com/ashemag/human-atlas — MIT License,
 * Copyright (c) 2026 ashemag. O aviso de licença está em `lib/anatomia/LICENSE.human-atlas.txt`,
 * como o MIT exige.
 *
 * DADOS: BodyParts3D 4.0, © The Database Center for Life Science, **CC BY 4.0** — licença DIFERENTE
 * da do código, e que exige preservar a atribuição ao redistribuir. Ela mora em
 * `public/models/ATTRIBUTION.md`, viaja com os dados, e lista a publicação (Mitsuhashi et al.,
 * 2009, doi:10.1093/nar/gkn613), o arquivo de origem e cada adaptação — as deles e a nossa.
 *
 * ⚠️ ESTE ATLAS É EDUCACIONAL E NÃO É FERRAMENTA CLÍNICA. É uma referência de adulto MASCULINO e
 * não representa toda estrutura ou variação humana. O guardrail HEALTH_EDU do mentor de medicina
 * (lib/agent/mentors) continua valendo por cima disto, e esta nota existe para que quem ler o
 * código saiba disso antes de usar o dado em qualquer outro lugar.
 *
 * ────────────────────────── O que é PEÇA e o que é CONCEITO ──────────────────────────
 * São coisas diferentes e confundi-las dá resposta errada: há 2.234 PEÇAS (malhas individuais, ids
 * `FJ…`) e 3.432 CONCEITOS nomeados (ids `FMA…` do Foundational Model of Anatomy), e um conceito
 * pode AGRUPAR várias peças — "vascular tree" (FMA3710) reúne sete. Busca e inspeção falam em
 * CONCEITO; o desenho e a seleção falam em PEÇA.
 */

/** Os 15 sistemas de exibição. Curadoria do human-atlas, não uma taxonomia oficial. */
export type SistemaId =
  | "skeletal" | "muscular" | "arterial" | "venous" | "nervous" | "digestive" | "respiratory"
  | "urinary" | "reproductive" | "lymphatic" | "endocrine" | "integumentary" | "connective"
  | "sensory" | "cardiac";

export type Sistema = {
  id: SistemaId;
  /** o rótulo que o aluno lê */
  nome: string;
  /** o rótulo original em inglês — é por ele que o dado e a busca se orientam */
  nomeEn: string;
  cor: string;
  descricao: string;
};

/**
 * As cores são as do human-atlas e NÃO são escolha de gosto nossa: elas vêm da curadoria dele e
 * mudá-las quebraria a correspondência com qualquer captura ou material que já exista. Os nomes e
 * as descrições estão em PT-BR porque o aluno é brasileiro; `nomeEn` fica ao lado porque é o que o
 * dado usa.
 */
export const SISTEMAS: readonly Sistema[] = [
  { id: "skeletal", nome: "Esqueleto", nomeEn: "Skeleton", cor: "#e2d9ba",
    descricao: "Os ossos formam a estrutura de sustentação do corpo, protegem órgãos e dão pontos de inserção aos músculos. O tecido interno deles também armazena minerais e produz células do sangue." },
  { id: "muscular", nome: "Músculos", nomeEn: "Muscles", cor: "#a85b50",
    descricao: "Os músculos esqueléticos geram movimento tracionando suas inserções. Junto dos tendões, movem articulações, estabilizam a postura e produzem calor." },
  { id: "cardiac", nome: "Coração", nomeEn: "Heart", cor: "#b96760",
    descricao: "O coração é uma bomba muscular de quatro câmaras. Suas valvas dirigem o sangue adiante pelos circuitos pulmonar e sistêmico." },
  { id: "sensory", nome: "Órgãos dos sentidos", nomeEn: "Sensory organs", cor: "#b0c8ce",
    descricao: "Estas estruturas participam dos sentidos especiais, incluindo visão, audição e equilíbrio. Seus tecidos especializados detectam estímulos e trabalham com o sistema nervoso para transmitir a informação." },
  { id: "arterial", nome: "Artérias", nomeEn: "Arteries", cor: "#c05245",
    descricao: "O coração impulsiona o sangue pela circulação. As artérias levam sangue para longe do coração para irrigar os tecidos ou, no circuito pulmonar, para os pulmões." },
  { id: "venous", nome: "Veias", nomeEn: "Veins", cor: "#527c9f",
    descricao: "As veias trazem o sangue de volta ao coração. Redes superficiais e profundas recolhem o sangue dos tecidos; as veias pulmonares devolvem sangue oxigenado dos pulmões." },
  { id: "nervous", nome: "Sistema nervoso", nomeEn: "Nervous system", cor: "#d8b565",
    descricao: "Encéfalo, medula espinhal e nervos periféricos conduzem e processam sinais. Sustentam sensação, movimento, coordenação e a regulação automática das funções do corpo." },
  { id: "respiratory", nome: "Respiratório", nomeEn: "Respiratory", cor: "#b98991",
    descricao: "As vias aéreas conduzem o ar até os pulmões, onde oxigênio e gás carbônico passam entre o ar e o sangue. A respiração depende das mudanças de pressão produzidas pelos músculos respiratórios." },
  { id: "digestive", nome: "Digestório", nomeEn: "Digestive", cor: "#b8916b",
    descricao: "O tubo digestório quebra o alimento, absorve nutrientes e água e move o resíduo adiante. Órgãos acessórios contribuem com bile e enzimas digestivas." },
  { id: "urinary", nome: "Urinário", nomeEn: "Urinary", cor: "#b47961",
    descricao: "Os rins filtram o sangue e regulam o equilíbrio de líquidos, eletrólitos e ácido-base. A urina percorre os ureteres até a bexiga e sai pela uretra." },
  { id: "lymphatic", nome: "Linfático", nomeEn: "Lymphatic", cor: "#879f7c",
    descricao: "Os vasos linfáticos devolvem à circulação o excesso de líquido dos tecidos. Linfonodos e outros órgãos linfoides sustentam a vigilância e as respostas imunes." },
  { id: "endocrine", nome: "Endócrino", nomeEn: "Endocrine", cor: "#c5a09a",
    descricao: "Os órgãos endócrinos liberam hormônios no sangue para coordenar processos como metabolismo, crescimento, resposta ao estresse e reprodução." },
  { id: "reproductive", nome: "Reprodutor", nomeEn: "Reproductive", cor: "#bda098",
    descricao: "As estruturas reprodutivas masculinas aqui representadas participam da produção, maturação e transporte de espermatozoides e da produção de hormônios sexuais." },
  { id: "integumentary", nome: "Superfície do corpo", nomeEn: "Body surface", cor: "#ba9b7d",
    descricao: "A superfície do corpo dá a referência anatômica externa. O sistema tegumentar forma uma barreira protetora e participa da sensação e da regulação da temperatura." },
  { id: "connective", nome: "Tecido conjuntivo", nomeEn: "Connective tissue", cor: "#aec3bb",
    descricao: "Cartilagem, ligamentos e outros tecidos conjuntivos sustentam, conectam e separam estruturas. Entre suas funções estão estabilizar articulações e distribuir cargas mecânicas." },
];

export const SISTEMAS_POR_ID: ReadonlyMap<SistemaId, Sistema> = new Map(SISTEMAS.map((s) => [s.id, s]));

/** Uma PEÇA: uma malha individual, com os offsets dela dentro do binário do pedaço (`chunk`). */
export type Parte = {
  id: string; name: string; conceptId: string; system: SistemaId; chunk: number;
  positions: number; normals: number; indices: number; vertexCount: number; indexCount: number;
  bounds: [number[], number[]];
};

/** Um CONCEITO nomeado (FMA). `elements` são os ids das PEÇAS que ele agrupa — pode ser mais de uma. */
export type Conceito = { id: string; name: string; elements: string[] };

export type PedacoBinario = { url: string; bytes: number; gzip?: string; gzipBytes?: number };

export type Atlas = {
  version: string; sex?: string; source?: string; scope?: string;
  parts: Parte[]; concepts: Conceito[]; chunks: PedacoBinario[]; triangles: number;
};

export type Vista = "three-quarter" | "front" | "back" | "side";

export type EstadoCena = {
  inspectorOpen?: boolean; explode: number; visible: SistemaId[]; selected: string[];
  isolate: boolean; view: Vista; rotate: boolean; reset: number;
};

/** O que vem ligado ao abrir. `integumentary` fica FORA: a pele opaca esconderia todo o resto. */
export const VISIVEIS_PADRAO: readonly SistemaId[] = [
  "cardiac", "sensory", "skeletal", "muscular", "arterial", "venous", "nervous",
  "respiratory", "digestive", "urinary", "lymphatic", "endocrine", "reproductive", "connective",
];

/**
 * Explicações de ÓRGÃO, por nome (minúsculo, em inglês — é a chave que o dado usa). Nove, as mesmas
 * do human-atlas, traduzidas. Fora dessas, a explicação cai na descrição do SISTEMA: é menos
 * específico, e é melhor que inventar texto sobre uma estrutura que ninguém revisou.
 */
export const EXPLICACOES: Readonly<Record<string, string>> = {
  "heart": "Bomba muscular no tórax. O lado direito manda sangue aos pulmões; o esquerdo manda sangue pela circulação sistêmica.",
  "liver": "Órgão grande sob o lado direito do diafragma. Processa os nutrientes absorvidos, produz bile e sintetiza muitas das proteínas transportadas no sangue.",
  "brain": "Órgão central do sistema nervoso. Suas regiões interligadas sustentam percepção, movimento, memória, linguagem e a regulação das funções do corpo.",
  "stomach": "Câmara muscular entre o esôfago e o intestino delgado. Armazena e mistura o alimento com ácido e enzimas antes de liberá-lo no duodeno.",
  "spleen": "Órgão linfoide no quadrante superior esquerdo do abdome. Filtra o sangue, remove hemácias envelhecidas e participa das respostas imunes.",
  "pancreas": "Órgão abdominal com papéis digestivo e endócrino. Fornece enzimas ao intestino delgado e libera hormônios, entre eles insulina e glucagon.",
  "urinary bladder": "Reservatório muscular na pelve que armazena a urina vinda dos rins pelos ureteres.",
  "trachea": "Via aérea principal, que liga a laringe aos brônquios. Seus anéis de cartilagem mantêm a via aberta durante a respiração.",
  "diaphragm": "Músculo largo que separa o tórax do abdome. Ao contrair, aumenta o volume do tórax e ajuda a puxar o ar para dentro.",
};

/** A explicação de uma estrutura: a do órgão quando existe, senão a do sistema. Nunca inventa. */
export function explicacao(nome: string, sistema: SistemaId): string {
  return EXPLICACOES[(nome || "").toLowerCase()] ?? SISTEMAS_POR_ID.get(sistema)?.descricao ?? "";
}

/** `true` se o id é de um sistema conhecido — usado para não confiar em string vinda de fora. */
export const ehSistema = (v: unknown): v is SistemaId =>
  typeof v === "string" && SISTEMAS_POR_ID.has(v as SistemaId);
