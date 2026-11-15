/**
 * lib/forja/cardsDoRepo.ts — a GERAÇÃO de cards de tutorial a partir do repo REAL (F2). PURO.
 *
 * A invariante crítica (a harmonia): os snippets de um card, concatenados, têm de ser EXATAMENTE o
 * arquivo real. Pra garantir isso, o LLM NÃO reproduz o código — ele só decide ONDE cortar e o que
 * ENSINAR (um "plano" por arquivo). O split em si é feito AQUI, de forma determinística, a partir do
 * conteúdo real do arquivo: `cardDoPlano(plano, conteudo)` fatia o conteúdo nos cortes do plano. Assim o
 * card digitado reconstrói o arquivo byte a byte (a menos de espaço no fim de linha), e o teste roda.
 *
 * Roda na BOX durante a geração (onde o repo está clonado) e é testável em qualquer lugar.
 */
import type { QuestaoProva } from "./licaoCurada";
import { montarArquivo, normalizar, type CardDeArquivo, type AbaDoCard, type Snippet } from "./tutorialArquivo";

/** Um CORTE do plano: onde começa um snippet (1-indexado), o que ele ensina, e em qual sub-aba vai. */
export type CortePlano = {
  linha: number;        // linha onde o snippet começa (1-indexado)
  explicacao: string;   // o que este trecho faz
  aba?: string;         // título da sub-aba (agrupa snippets); default: uma aba só
};

/** O PLANO de um arquivo que o LLM produz: pedagogia + cortes, NUNCA o código (vem do arquivo real). */
export type PlanoDeArquivo = {
  arquivo: string;
  funcao: string;
  ordem: number;
  linguagem: string;
  cortes: CortePlano[];
  quiz?: Record<string, QuestaoProva[]>; // quiz por título de aba (opcional)
  teste?: string;
  residual?: boolean;                     // true = aluno não digita; Octa monta
};

const linhasDe = (t: string): string[] => String(t ?? "").replace(/\r\n/g, "\n").split("\n");

/**
 * Fatia o conteúdo REAL do arquivo nos cortes do plano → um CardDeArquivo cujos snippets concatenados
 * reconstroem o arquivo. Normaliza os cortes (ordena, começa na linha 1, remove duplicados). PURA.
 */
export function cardDoPlano(plano: PlanoDeArquivo, conteudo: string): CardDeArquivo {
  const linhas = linhasDe(conteudo);
  const n = linhas.length;

  // cortes saneados: dentro do arquivo, ordenados, únicos, começando na linha 1.
  const brutos = (plano.cortes ?? [])
    .map((c) => ({ ...c, linha: Math.max(1, Math.min(n, Math.floor(c.linha || 1))) }))
    .sort((a, b) => a.linha - b.linha);
  const cortes: CortePlano[] = [];
  for (const c of brutos) {
    if (cortes.length && cortes[cortes.length - 1].linha === c.linha) continue; // sem duplicar linha
    cortes.push(c);
  }
  if (!cortes.length || cortes[0].linha !== 1) {
    cortes.unshift({ linha: 1, explicacao: cortes[0]?.explicacao || "O começo do arquivo.", aba: cortes[0]?.aba });
  }

  // cada corte i vai da sua linha até a linha anterior ao próximo corte (ou EOF).
  const snippetsComAba: { snip: Snippet; aba: string }[] = cortes.map((c, i) => {
    const ini = c.linha - 1;
    const fim = i + 1 < cortes.length ? cortes[i + 1].linha - 1 : n;
    return { snip: { explicacao: c.explicacao, codigo: linhas.slice(ini, fim).join("\n") }, aba: c.aba || "O arquivo" };
  });

  // agrupa em sub-abas preservando a ordem de aparição.
  const abas: AbaDoCard[] = [];
  for (const { snip, aba } of snippetsComAba) {
    let alvo = abas.find((a) => a.titulo === aba);
    if (!alvo) { alvo = { titulo: aba, snippets: [], ...(plano.quiz?.[aba] ? { quiz: plano.quiz[aba] } : {}) }; abas.push(alvo); }
    alvo.snippets.push(snip);
  }

  return {
    arquivo: plano.arquivo,
    funcao: plano.funcao,
    ordem: plano.ordem ?? 0,
    linguagem: plano.linguagem,
    abas,
    ...(plano.teste ? { teste: plano.teste } : {}),
    ...(plano.residual ? { residual: true } : {}),
  };
}

/** A harmonia vale? Os snippets concatenados = o arquivo real (a menos de espaço no fim de linha). PURA. */
export function validarCardContraArquivo(card: CardDeArquivo, conteudo: string): boolean {
  return normalizar(montarArquivo(card)) === normalizar(conteudo);
}

/** Aplica os planos aos arquivos reais e DESCARTA cards que quebram a harmonia (geração à prova de erro). PURA. */
export function cardsValidados(planos: PlanoDeArquivo[], conteudos: Record<string, string>): CardDeArquivo[] {
  const cards: CardDeArquivo[] = [];
  for (const p of planos.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))) {
    const conteudo = conteudos[p.arquivo];
    if (conteudo == null) continue;
    const card = cardDoPlano(p, conteudo);
    if (p.residual || validarCardContraArquivo(card, conteudo)) cards.push(card);
  }
  return cards;
}
