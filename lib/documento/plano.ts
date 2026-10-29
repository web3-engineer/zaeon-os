/**
 * lib/documento/plano.ts — o CONTRATO do documento completo (F1 de docs/PLANO_DOCUMENTO_COMPLETO.md).
 * PURO: nenhum IO, nenhum modelo, nenhum Prisma.
 *
 * O PROBLEMA QUE ESTE ARQUIVO EXISTE PARA MATAR: hoje o gerador pede ao modelo um JSON de 8 campos
 * (`DraftJson`) e esse contrato é MENOR que o esqueleto que ele precisa preencher. Para o TCC,
 * `corposDoEsboco` produz corpo para INTRODUÇÃO, METODOLOGIA e REFERÊNCIAS — e REFERENCIAL TEÓRICO,
 * RESULTADOS E DISCUSSÃO e CONCLUSÃO não têm NENHUM caminho de código que as preencha. As
 * subseções ("Conceitos Fundamentais", "Estado da Arte") saem vazias em 100% dos documentos.
 * Não é o modelo falhando: é o contrato sendo pequeno. Aqui o contrato passa a ter o tamanho do
 * documento, subseções incluídas.
 *
 * POR QUE OS TÍTULOS VÊM POR PARÂMETRO, e não de uma constante daqui: o repositório já tem DUAS
 * fontes de esqueleto e elas DIVERGEM —
 *   • `lib/tcc/secoes.ts` (`ESQUELETO_*`): plana, é a que o TCC salvo usa de verdade;
 *   • `lib/abntTemplate.ts` (`WORK_SECTIONS`): tem subseções, é a da Sala de Pesquisa.
 * `ESQUELETO_ARTIGO` tem REFERENCIAL TEÓRICO e `WORK_SECTIONS.Artigo` não; `ESQUELETO_RELATORIO`
 * não tem OBJETIVOS e `WORK_SECTIONS['Relatório']` tem. Inventar uma terceira fonte aqui faria o
 * gerador escrever para seções que o documento salvo não tem. Então este módulo ENRIQUECE a fonte
 * que o chamador já usa, e `divergencia()` existe para a reconciliação ser medida, não esquecida.
 */

/** Norma de formatação. Parâmetro desde o começo pra APA/Vancouver serem um dado, não um refactor. */
export const NORMAS = ["abnt"] as const;
export type Norma = (typeof NORMAS)[number];

/**
 * O PAPEL da seção — o que de fato muda a pergunta que se faz ao modelo. É isto que um JSON único
 * de 8 campos não consegue expressar: "escreva o referencial" e "escreva a conclusão" são pedidos
 * diferentes, com fontes diferentes e critérios de pronto diferentes.
 */
export const PAPEIS = [
  "resumo", "introducao", "objetivos", "justificativa", "referencial",
  "metodologia", "desenvolvimento", "resultados", "conclusao", "referencias", "outro",
] as const;
export type Papel = (typeof PAPEIS)[number];

/** Título do esqueleto → papel. Casamento por conteúdo, sem acento e sem caixa. */
const POR_TITULO: Array<[RegExp, Papel]> = [
  [/^resumo|^abstract/, "resumo"],
  [/^introducao/, "introducao"],
  [/^objetivo/, "objetivos"],
  [/^justificativa/, "justificativa"],
  [/referencial|revisao de literatura|fundamentacao|estado da arte|conceitos/, "referencial"],
  [/^metodologia|^metodo|^materiais e metodos/, "metodologia"],
  [/^desenvolvimento/, "desenvolvimento"],
  [/^resultado|^analise/, "resultados"],
  [/^conclusao|^consideracoes finais/, "conclusao"],
  [/^referencias|^bibliografia/, "referencias"],
];

export const semAcento = (s: string): string =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function papelDoTitulo(titulo: string): Papel {
  const t = semAcento(titulo);
  for (const [re, papel] of POR_TITULO) if (re.test(t)) return papel;
  return "outro";
}

/**
 * Piso de palavras por papel. Existe porque "preenchido" não é "pronto": uma CONCLUSÃO de 12
 * palavras passa em qualquer checagem de string não-vazia e reprova numa banca. REFERÊNCIAS tem
 * piso baixo de propósito — ela é lista, não prosa.
 */
export const PISO_PALAVRAS: Record<Papel, number> = {
  resumo: 80,
  introducao: 180,
  objetivos: 40,
  justificativa: 80,
  referencial: 250,
  metodologia: 140,
  desenvolvimento: 250,
  resultados: 180,
  conclusao: 120,
  referencias: 10,
  outro: 100,
};

/** Subseção pede menos que a seção inteira: ela é um pedaço dela. */
export const FATOR_SUBSECAO = 0.6;

export type Slot = {
  /** Id estável derivado do caminho — é a chave do preenchimento. */
  id: string;
  titulo: string;
  /** Caminho completo: ["REFERENCIAL TEÓRICO"] ou ["REFERENCIAL TEÓRICO", "Estado da Arte"]. */
  caminho: string[];
  nivel: 1 | 2;
  papel: Papel;
  pisoPalavras: number;
  /**
   * REFERÊNCIAS não é escrita pelo gerador: ela é MONTADA das fontes que as outras seções citaram
   * (lib/export/referencias). Pedir ao modelo pra "escrever as referências" é pedir pra ele
   * inventar bibliografia — exatamente o que o `rigor.ts` existe pra impedir.
   */
  geradaPeloModelo: boolean;
};

export const slugSlot = (caminho: string[]): string =>
  caminho.map((p) => semAcento(p).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")).filter(Boolean).join("/");

export type SecaoDoEsqueleto = { title: string; subs?: string[] };

/**
 * Esqueleto (a fonte que o chamador já usa) → plano COMPLETO, com um slot por seção E por subseção.
 * Aceita `string[]` (o formato plano de `lib/tcc/secoes`) ou `SecaoDoEsqueleto[]` (o de
 * `lib/abntTemplate`, com `subs`).
 */
export function planoDoDocumento(
  esqueleto: readonly (string | SecaoDoEsqueleto)[],
  _norma: Norma = "abnt",
): Slot[] {
  const slots: Slot[] = [];
  for (const item of esqueleto) {
    const sec: SecaoDoEsqueleto = typeof item === "string" ? { title: item } : item;
    const titulo = String(sec.title ?? "").trim();
    if (!titulo) continue;
    const papel = papelDoTitulo(titulo);
    const subs = (sec.subs ?? []).map((s) => String(s ?? "").trim()).filter(Boolean);

    slots.push({
      id: slugSlot([titulo]),
      titulo,
      caminho: [titulo],
      nivel: 1,
      papel,
      // Seção com subseções: o corpo dela é a abertura, não o capítulo inteiro — daí o piso cair.
      pisoPalavras: Math.round(PISO_PALAVRAS[papel] * (subs.length ? FATOR_SUBSECAO : 1)),
      geradaPeloModelo: papel !== "referencias",
    });

    for (const sub of subs) {
      const papelSub = papelDoTitulo(sub) === "outro" ? papel : papelDoTitulo(sub);
      slots.push({
        id: slugSlot([titulo, sub]),
        titulo: sub,
        caminho: [titulo, sub],
        nivel: 2,
        papel: papelSub,
        pisoPalavras: Math.round(PISO_PALAVRAS[papelSub] * FATOR_SUBSECAO),
        geradaPeloModelo: papelSub !== "referencias",
      });
    }
  }
  return slots;
}

// ───────────────────────────── preenchimento e completude ─────────────────────────────

/**
 * `semFonte`: a seção foi escrita mas não pôde ser fundamentada (nenhum arquivo, nenhum paper).
 * Decisão do dono (2026-10-29): ela SAI ESCRITA E MARCADA — nunca em branco, nunca fingindo fonte.
 * É isso que torna `nenhumVazio()` uma invariante cumprível: há sempre um desfecho escrito, e a
 * honestidade mora no marcador, não num buraco que o aluno descobre na entrega.
 */
export type Preenchimento = { slotId: string; corpo: string; semFonte?: boolean };

export const MARCA_SEM_FONTE = "⟨precisa de fonte⟩";

export const palavras = (t: string): number => (String(t ?? "").trim().match(/\S+/g) ?? []).length;

export const FALTA = ["ausente", "vazio", "curto"] as const;
export type Falta = (typeof FALTA)[number];

export type Pendencia = { slotId: string; caminho: string[]; falta: Falta; palavras: number; piso: number };

export type Completude = {
  ok: boolean;
  /** Slots que o gerador deve produzir (exclui REFERÊNCIAS, que é montada). */
  exigidos: number;
  prontos: number;
  pendencias: Pendencia[];
  /** Escritos mas sem fundamentação — não bloqueiam, aparecem no relatório. */
  semFonte: string[];
};

/**
 * A INVARIANTE: nenhum slot que o modelo deve escrever fica ausente, vazio ou abaixo do piso.
 * Um documento que não passa aqui não é "básico" — é incompleto, e é por isso que esta função
 * devolve as pendências em vez de um booleano: o relatório tem que dizer ONDE.
 */
export function nenhumVazio(plano: readonly Slot[], preenchimentos: readonly Preenchimento[]): Completude {
  const porId = new Map(preenchimentos.map((p) => [p.slotId, p]));
  const exigidos = plano.filter((s) => s.geradaPeloModelo);
  const pendencias: Pendencia[] = [];
  const semFonte: string[] = [];

  for (const s of exigidos) {
    const p = porId.get(s.id);
    const n = palavras(p?.corpo ?? "");
    if (!p) pendencias.push({ slotId: s.id, caminho: s.caminho, falta: "ausente", palavras: 0, piso: s.pisoPalavras });
    else if (n === 0) pendencias.push({ slotId: s.id, caminho: s.caminho, falta: "vazio", palavras: 0, piso: s.pisoPalavras });
    else if (n < s.pisoPalavras) pendencias.push({ slotId: s.id, caminho: s.caminho, falta: "curto", palavras: n, piso: s.pisoPalavras });
    if (p?.semFonte) semFonte.push(s.id);
  }

  return { ok: pendencias.length === 0, exigidos: exigidos.length, prontos: exigidos.length - pendencias.length, pendencias, semFonte };
}

/** Frase pro aluno/relatório. Fala do que FAZER, no padrão do resto da casa. */
export function resumoDaCompletude(c: Completude): string {
  if (c.ok) {
    return c.semFonte.length
      ? `documento completo (${c.prontos}/${c.exigidos}) · ${c.semFonte.length} seção(ões) precisam de fonte`
      : `documento completo (${c.prontos}/${c.exigidos})`;
  }
  const porFalta = (f: Falta) => c.pendencias.filter((p) => p.falta === f).length;
  const partes = [
    porFalta("ausente") && `${porFalta("ausente")} não escrita(s)`,
    porFalta("vazio") && `${porFalta("vazio")} em branco`,
    porFalta("curto") && `${porFalta("curto")} curta(s) demais`,
  ].filter(Boolean);
  return `${c.prontos}/${c.exigidos} prontas — ${partes.join(", ")}`;
}

/**
 * As duas fontes de esqueleto batem para este tipo de trabalho? Devolve o que só existe em uma.
 * Não corrige nada: F1 só MEDE a divergência, pra F2 reconciliar com a decisão na mão em vez de
 * descobrir no meio da geração que escreveu para uma seção que o documento salvo não tem.
 */
export function divergencia(a: readonly string[], b: readonly (string | SecaoDoEsqueleto)[]): { soEmA: string[]; soEmB: string[] } {
  const na = new Set(a.map(semAcento));
  const titulosB = b.map((x) => (typeof x === "string" ? x : x.title));
  const nb = new Set(titulosB.map(semAcento));
  return {
    soEmA: a.filter((t) => !nb.has(semAcento(t))),
    soEmB: titulosB.filter((t) => !na.has(semAcento(t))),
  };
}
