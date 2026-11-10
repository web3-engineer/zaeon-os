/**
 * lib/documento/aprofundar.ts — o documento do CHAT ganha a profundidade que o da Sala de Pesquisa
 * já tinha. PURO no julgamento; a chamada de modelo entra por injeção.
 *
 * ────────────────────────── o defeito, medido ──────────────────────────
 * O chat escreve o trabalho inteiro numa ÚNICA resposta JSON: `{nucleo, desenvolvimento, conceitos,
 * evidencia, proximos_passos, sources, work{sections[]}, artifacts}`. Tudo disputa o mesmo
 * orçamento de saída, e o que sobra para cada seção é um parágrafo.
 *
 * Medido numa saída real de produção (2026-11-10, "crie um artigo sobre anfetamina"): a primeira
 * seção veio com 57 palavras e a segunda com 75, contra um piso de 180 para introdução e 100 para
 * uma seção de tema. Um terço do mínimo. O mesmo pedido feito a um assistente que escreve UM texto
 * devolveu história, mecanismo em três partes, quadro de riscos, estado legal e fontes.
 *
 * Esse diagnóstico não é novo nesta casa — `lib/documento/escritor.ts` o escreveu primeiro, na F2:
 * "oito campos de texto acadêmico numa resposta só é exatamente o formato que estoura limite de
 * saída e volta truncado". O conserto de lá foi UMA CHAMADA POR SEÇÃO. Só que ele nunca chegou ao
 * chat: `escreverDocumento` é chamado por `gerarTccEmBackground` e por mais ninguém.
 *
 * ────────────────────────── por que aprofundar em vez de reescrever o pipeline ──────────────────────────
 * O caminho do chat tem prévia em stream, orçamento de voltas e um contrato de resposta que o resto
 * da conversa consome. Trocá-lo pelo escritor inteiro seria refazer o turno. O que falta não é o
 * planejamento — o modelo JÁ devolve seções com títulos pertinentes — é a DENSIDADE de cada uma.
 * Então o rascunho vale como plano, e cada seção rasa é reescrita sozinha, com o resto do documento
 * à vista para não repetir nem se contradizer. É o mesmo princípio da F2, no ponto em que ele cabe.
 *
 * O PISO vem de `lib/documento/plano`, a mesma tabela que a Sala de Pesquisa usa. Dois caminhos com
 * duas réguas seria a origem de o mesmo pedido render documentos diferentes conforme a porta.
 */
import { PISO_PALAVRAS, palavras, papelDoTitulo } from "@/lib/documento/plano";
import { blocoDeFontes, type FonteDoc } from "@/lib/documento/fontes";

export type SecaoDoc = { title: string; body: string };

/** Quantas seções uma rodada reescreve. Teto de custo: cada uma é uma chamada de modelo. */
export const MAX_SECOES_APROFUNDADAS = 6;

/**
 * Orçamento de parede da rodada inteira. A rota do chat vive sob `maxDuration = 60`; isto deixa
 * folga para o que já correu antes (rascunho) e para o que vem depois (gravação, resposta).
 */
export const ORCAMENTO_PADRAO_MS = 25_000;

/** Quanto do documento já escrito vai como contexto de cada reescrita. */
const RESUMO_POR_SECAO = 600;

export type Rasa = { indice: number; titulo: string; palavras: number; piso: number };

/** PURA: quais citações (string exata) das fontes aparecem neste texto. */
export function citacoesNoTexto(texto: string, fontes?: readonly FonteDoc[]): string[] {
  const t = String(texto ?? "");
  return (fontes ?? []).map((f) => f.citacao).filter((c) => !!c && t.includes(c));
}

/** PURA: a seção veio num formato utilizável? O modelo pode devolver `null` dentro do array. */
export function secaoValida(s: unknown): s is SecaoDoc {
  return !!s && typeof s === "object" && typeof (s as SecaoDoc).title === "string";
}

/** O piso desta seção, pelo papel que o título anuncia. */
export function pisoDaSecao(titulo: string): number {
  return PISO_PALAVRAS[papelDoTitulo(titulo)];
}

/**
 * PURA: quais seções estão abaixo do piso — em ordem do mais raso para o menos.
 *
 * A ordem importa porque há teto de reescritas: com orçamento para seis, gastá-lo nas seis mais
 * rasas é o que mais muda o documento. REFERÊNCIAS fica fora: ela é lista montada das citações,
 * não prosa, e pedir ao modelo que a "aprofunde" é pedir bibliografia inventada.
 */
export function secoesRasas(secoes: readonly SecaoDoc[]): Rasa[] {
  return secoes
    // entrada do MODELO: um `null` no array derrubaria a função e, com ela, o rascunho inteiro —
    // o `catch` do rascunho devolveria resposta degradada e o aluno perderia até o que deu certo
    .map((s, indice) => (secaoValida(s)
      ? { indice, titulo: s.title, palavras: palavras(s.body ?? ""), piso: pisoDaSecao(s.title) }
      : { indice, titulo: "", palavras: Number.POSITIVE_INFINITY, piso: 0 }))
    .filter((r) => papelDoTitulo(r.titulo) !== "referencias" && r.palavras < r.piso)
    .sort((a, b) => (a.palavras - a.piso) - (b.palavras - b.piso));
}

export type DepsAprofundar = {
  /** devolve o corpo NOVO da seção, ou "" se não deu. Injetada para o teste não tocar em rede. */
  escrever: (sys: string, user: string) => Promise<string>;
  /** teto de seções reescritas nesta rodada */
  teto?: number;
  /** orçamento TOTAL de parede para a rodada inteira (ver o laço). Padrão `ORCAMENTO_PADRAO_MS`. */
  orcamentoMs?: number;
  /** relógio injetável, para o teste medir o orçamento sem esperar de verdade */
  agora?: () => number;
};

export type Entrada = {
  tema: string;
  tipo: string;
  secoes: readonly SecaoDoc[];
  fontes?: readonly FonteDoc[];
  /**
   * A EVIDÊNCIA REUNIDA NO TURNO. Sem ela o pedido "aprofunde com mecanismo, história e
   * consequências" é um convite a inventar: o modelo precisa acrescentar conteúdo e não recebe
   * nada em que se apoiar. Apontado na revisão, e é a doutrina desta casa — fundamentar ou marcar.
   */
  evidencia?: string;
};

export type Relato = {
  secoes: SecaoDoc[];
  /** o que foi reescrito, para o recibo do turno dizer a verdade sobre o que mudou */
  reescritas: { titulo: string; de: number; para: number }[];
  /**
   * As que CONTINUAM rasas, com o motivo. Ausência declarada, nunca escondida: teto de reescritas,
   * orçamento de tempo esgotado, a chamada falhou, ou a resposta não alcançou o piso.
   */
  pendentes: { titulo: string; motivo: "teto" | "tempo" | "falhou" | "curta" }[];
};

/** O pedido de UMA seção. Mesmas três regras do escritor da F2, pelo mesmo motivo. */
export function promptDeAprofundamento(e: Entrada, r: Rasa): { sys: string; user: string } {
  const sys = [
    `Você está reescrevendo UMA seção de um(a) ${e.tipo} em PT-BR, para dar a ela a profundidade que falta.`,
    "Registro acadêmico e impessoal, em parágrafos corridos.",
    `NÃO escreva o título da seção. NÃO use "#" no começo de linha.`,
    `Extensão mínima: ${r.piso} palavras.`,
    // O QUE ACRESCENTAR, e isto é o que separa "mais longo" de "mais fundo": a versão rasa já diz
    // o quê; falta por quê, como, em que condições, e o que a contradiz.
    "Aprofunde com mecanismo, contexto histórico, condições, comparações e consequências — não repita",
    "a versão curta com outras palavras nem encha com generalidades.",
    "Quando um conjunto de itens tiver os MESMOS atributos (riscos por domínio, doses, comparações),",
    "apresente-o como tabela markdown: é o formato que informa mais em menos espaço.",
    "NÃO invente dado, número, autor nem referência.",
    ...(e.fontes?.length
      ? ["Você RECEBEU fontes. Cite copiando EXATAMENTE a string de \"CITE ASSIM\" — sem reescrever."]
      : []),
    // O FORMATO MORA AQUI, e só aqui. A revisão apontou que o sistema pedia texto puro enquanto o
    // chamador pedia JSON — duas instruções contraditórias no mesmo pedido, e um modelo obediente
    // ao sistema devolveria texto que o `genJson` não parsearia. Resultado: reescrita nenhuma, em
    // silêncio. Uma fonte da verdade.
    'Responda APENAS o JSON {"corpo":"<o texto da seção>"}, sem comentar o que você fez.',
  ].join("\n");

  const outras = e.secoes
    .filter((_, i) => i !== r.indice)
    .map((s) => `## ${s.title}\n${String(s.body ?? "").replace(/\s+/g, " ").slice(0, RESUMO_POR_SECAO)}`)
    .join("\n\n");

  const user = [
    `TEMA: ${e.tema}`,
    `\nSEÇÃO A REESCREVER: ${r.titulo}`,
    `\nO QUE ELA DIZ HOJE (${r.palavras} palavras — precisa de pelo menos ${r.piso}):\n${e.secoes[r.indice]?.body ?? ""}`,
    outras ? `\nO RESTO DO DOCUMENTO (para dar continuidade e NÃO repetir):\n${outras}` : "",
    e.evidencia?.trim() ? `\nEVIDÊNCIA REUNIDA (apoie-se nela; não afirme o que ela não sustenta):\n${e.evidencia.trim()}` : "",
    e.fontes?.length ? `\n${blocoDeFontes(e.fontes)}` : "",
    // as citações que a versão curta JÁ tinha: perdê-las na reescrita apaga a referência do
    // documento, porque `fontesCitadas` só lê o texto final
    citacoesNoTexto(e.secoes[r.indice]?.body ?? "", e.fontes).length
      ? `\nMANTENHA estas citações, que já estavam nesta seção: ${citacoesNoTexto(e.secoes[r.indice]?.body ?? "", e.fontes).join(" | ")}`
      : "",
  ].filter(Boolean).join("\n");

  return { sys, user };
}

/**
 * Reescreve as seções rasas, uma chamada por seção.
 *
 * SEQUENCIAL de propósito, e isto custa latência: cada reescrita vê as anteriores já aprofundadas,
 * que é o que impede o documento de virar seis textos sobre o mesmo assunto. Em paralelo seria mais
 * rápido e cada seção repetiria o que a vizinha acabou de dizer, sem saber.
 *
 * NUNCA PIORA: se a chamada falhar, ou devolver menos que já havia, a seção original fica. Um
 * aprofundamento que encurta é um defeito, não uma opinião.
 */
export async function aprofundarSecoes(e: Entrada, d: DepsAprofundar): Promise<Relato> {
  const secoes: SecaoDoc[] = e.secoes.map((s) => (secaoValida(s) ? { title: s.title, body: s.body ?? "" } : { title: "", body: "" }));
  const rasas = secoesRasas(secoes);
  const teto = Math.max(0, d.teto ?? MAX_SECOES_APROFUNDADAS);
  const agora = d.agora ?? Date.now;
  const limite = agora() + Math.max(0, d.orcamentoMs ?? ORCAMENTO_PADRAO_MS);

  const reescritas: Relato["reescritas"] = [];
  const pendentes: Relato["pendentes"] = rasas.slice(teto).map((r) => ({ titulo: r.titulo, motivo: "teto" as const }));

  for (const r of rasas.slice(0, teto)) {
    /**
     * ORÇAMENTO DE PAREDE. A rota do chat vive sob `maxDuration = 60`, e seis reescritas
     * sequenciais a 60 s cada não cabem em orçamento nenhum — o pedido morreria depois de ter
     * feito todo o trabalho, e o aluno não receberia nem o rascunho. Então o laço para quando o
     * tempo acaba, e o que não deu tempo é DECLARADO, não perdido em silêncio.
     */
    if (agora() >= limite) {
      pendentes.push({ titulo: r.titulo, motivo: "tempo" });
      continue;
    }

    const { sys, user } = promptDeAprofundamento({ ...e, secoes }, r);
    let novo = "";
    try {
      novo = String((await d.escrever(sys, user)) ?? "").trim();
    } catch {
      novo = "";
    }
    if (!novo) {
      pendentes.push({ titulo: r.titulo, motivo: "falhou" });
      continue;
    }

    const original = secoes[r.indice]!.body ?? "";
    const depois = palavras(novo);

    /**
     * TRÊS PORTÕES, e cada um existe por um motivo apontado na revisão:
     *   1. alcançar o PISO — "mais longo que antes" ainda pode estar abaixo do mínimo, e gravar
     *      isso como "reescrita" declararia pronto o que não está;
     *   2. não ENCURTAR — um aprofundamento que encolhe é defeito, não opinião;
     *   3. não perder CITAÇÃO — `fontesCitadas` só lê o texto final, então uma citação que a
     *      versão curta tinha e a nova não some da bibliografia junto com a referência.
     */
    const perdidas = citacoesNoTexto(original, e.fontes).filter((c) => !novo.includes(c));
    if (depois < r.piso || depois <= palavras(original) || perdidas.length) {
      pendentes.push({ titulo: r.titulo, motivo: "curta" });
      continue;
    }

    secoes[r.indice] = { title: secoes[r.indice]!.title, body: novo };
    reescritas.push({ titulo: r.titulo, de: palavras(original), para: depois });
  }

  return { secoes, reescritas, pendentes };
}
