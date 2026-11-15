/**
 * lib/forja/tutorialArquivo.ts — o TUTORIAL DE ARQUIVO: o curso é o repo REAL, ensinado arquivo por
 * arquivo, com o aluno DIGITANDO o código (sem colar). PURO e testável (sem browser).
 *
 * Cada card é um arquivo do repo. O card quebra o arquivo em `snippets` (explicação + o trecho real a
 * digitar) distribuídos em sub-abas horizontais (pra ficar compacto). A INVARIANTE que o dono pediu — a
 * "harmonia" — é esta: concatenar os `codigo` dos snippets de um card, na ordem, reconstrói o arquivo
 * real e executável. O aluno digita trecho a trecho; o que não se digita é RESIDUAL (montado pelo Octa).
 * O teste do card roda o arquivo montado + `teste` — verde só quando o que o aluno digitou de fato executa.
 */
import type { QuestaoProva } from "./licaoCurada";

export type Snippet = {
  /** o que este pedaço faz — a "lição" do trecho. */
  explicacao: string;
  /** o TRECHO REAL do arquivo: exatamente o que o aluno deve digitar. */
  codigo: string;
};

export type AbaDoCard = {
  titulo: string;
  snippets: Snippet[];
  /** quiz opcional daquela aba (mesmo formato das provas do curso). */
  quiz?: QuestaoProva[];
};

export type CardDeArquivo = {
  /** caminho real no repo, ex.: "searches/binary_search.py". */
  arquivo: string;
  /** o que o arquivo faz no projeto (a explicação do topo do card). */
  funcao: string;
  /** ordem por dependência/complexidade crescente (nº de cards ∝ complexidade do repo). */
  ordem: number;
  linguagem: string;
  /** sub-abas horizontais → card compacto na vertical. */
  abas: AbaDoCard[];
  /** teste ponta-a-ponta do arquivo (estilo LearnPack): roda sobre o arquivo montado. */
  teste?: string;
  /** true = o aluno NÃO digita este arquivo; o Octa monta no background (residual). */
  residual?: boolean;
};

export type CursoRepoTutorial = { repo: string; cards: CardDeArquivo[] };

/** Todos os snippets de um card, achatados na ordem (abas → snippets). PURA. */
export function snippetsDoCard(card: CardDeArquivo): Snippet[] {
  return (card.abas ?? []).flatMap((a) => a.snippets ?? []);
}

/** Concatena os snippets na ordem = o ARQUIVO real. É a invariante da harmonia. PURA. */
export function montarArquivo(card: CardDeArquivo): string {
  return snippetsDoCard(card)
    .map((s) => s.codigo)
    .join("\n");
}

/** Normaliza p/ comparar o digitado: CRLF→LF, tira espaço no fim de cada linha e linhas vazias no fim.
 *  NÃO colapsa indentação (código é sensível a espaço à esquerda). PURA. */
export function normalizar(texto: string): string {
  return String(texto ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "");
}

/** O aluno digitou o snippet certo? Exato, tolerando só espaço no fim de linha. PURA. */
export function validarDigitado(snippet: Snippet, texto: string): boolean {
  return normalizar(texto) === normalizar(snippet.codigo);
}

/** O card inteiro foi digitado certo (todos os snippets)? `digitados[i]` = o texto do i-ésimo snippet. PURA. */
export function estaCompleto(card: CardDeArquivo, digitados: string[]): boolean {
  const snips = snippetsDoCard(card);
  return snips.length > 0 && snips.every((s, i) => validarDigitado(s, digitados[i] ?? ""));
}

/** O programa que o runner executa: o arquivo montado + o teste do card. PURA.
 *  Passar `digitados` roda o que o ALUNO escreveu (ponta-a-ponta real); sem eles, o arquivo de referência. */
export function programaDeTeste(card: CardDeArquivo, digitados?: string[]): string {
  const snips = snippetsDoCard(card);
  const arquivo = digitados
    ? snips.map((_, i) => normalizar(digitados[i] ?? "")).join("\n")
    : montarArquivo(card);
  return card.teste ? `${arquivo}\n\n${card.teste}` : arquivo;
}
