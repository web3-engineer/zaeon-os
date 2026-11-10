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

/** Quanto do documento já escrito vai como contexto de cada reescrita. */
const RESUMO_POR_SECAO = 600;

export type Rasa = { indice: number; titulo: string; palavras: number; piso: number };

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
    .map((s, indice) => ({ indice, titulo: s.title ?? "", palavras: palavras(s.body ?? ""), piso: pisoDaSecao(s.title ?? "") }))
    .filter((r) => papelDoTitulo(r.titulo) !== "referencias" && r.palavras < r.piso)
    .sort((a, b) => (a.palavras - a.piso) - (b.palavras - b.piso));
}

export type DepsAprofundar = {
  /** devolve o corpo NOVO da seção, ou "" se não deu. Injetada para o teste não tocar em rede. */
  escrever: (sys: string, user: string) => Promise<string>;
  /** teto de seções reescritas nesta rodada */
  teto?: number;
};

export type Entrada = {
  tema: string;
  tipo: string;
  secoes: readonly SecaoDoc[];
  fontes?: readonly FonteDoc[];
};

export type Relato = {
  secoes: SecaoDoc[];
  /** o que foi reescrito, para o recibo do turno dizer a verdade sobre o que mudou */
  reescritas: { titulo: string; de: number; para: number }[];
  /** rasas que ficaram de fora por causa do teto — ausência declarada, não escondida */
  pendentes: string[];
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
    "Responda APENAS o texto da seção, sem comentar o que você fez.",
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
    e.fontes?.length ? `\n${blocoDeFontes(e.fontes)}` : "",
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
  const secoes: SecaoDoc[] = e.secoes.map((s) => ({ title: s.title, body: s.body }));
  const rasas = secoesRasas(secoes);
  const teto = Math.max(0, d.teto ?? MAX_SECOES_APROFUNDADAS);
  const vao = rasas.slice(0, teto);
  const reescritas: Relato["reescritas"] = [];

  for (const r of vao) {
    const { sys, user } = promptDeAprofundamento({ ...e, secoes }, r);
    let novo = "";
    try {
      novo = String((await d.escrever(sys, user)) ?? "").trim();
    } catch {
      novo = "";
    }
    const antes = palavras(secoes[r.indice]!.body ?? "");
    const depois = palavras(novo);
    if (novo && depois > antes) {
      secoes[r.indice] = { title: secoes[r.indice]!.title, body: novo };
      reescritas.push({ titulo: r.titulo, de: antes, para: depois });
    }
  }

  return { secoes, reescritas, pendentes: rasas.slice(teto).map((r) => r.titulo) };
}
