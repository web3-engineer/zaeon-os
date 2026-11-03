/**
 * lib/agent/graficosDoTurno.ts — QUAIS gráficos cabem neste turno, e com que números (G3 de
 * docs/PLANO_RESPOSTA_GRAFICA.md). PURO.
 *
 * O pedido do dono tinha duas metades difíceis de conciliar: gráfico "apenas onde coubesse", e
 * gráfico **inclusive em tema pouco explorado**. A saída não é afrouxar o lastro — é notar que a
 * plataforma JÁ APURA números que ninguém desenha:
 *
 *  | gráfico                     | de onde vem o número                          | inventável? |
 *  | papers por ano              | resultado do `literature_search`               | não |
 *  | cobertura por documento     | o agrupamento da F4 (`agruparPorDocumento`)    | não |
 *
 * E "papers por ano" é justamente o gráfico que faz um tema pouco explorado PARECER pouco
 * explorado — que é a informação honesta e útil, não um enfeite.
 *
 * ONDE CABE é regra determinística, não opinião do modelo: cada construtor tem um mínimo de dados
 * abaixo do qual devolve `null`. Dois papers não são uma série temporal; um documento não é
 * cobertura comparada.
 */
import { svgDoGrafico, type Grafico } from "@/lib/agent/grafico";

const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

/**
 * LIGADO POR PADRÃO, como o resto do harness (decisão do dono, 2026-11-03); `HARNESS_GRAFICO=0` é o
 * kill-switch. Não custa chamada de modelo: os números já estão no turno e o desenho é código.
 */
export function graficoLigado(env: Record<string, string | undefined> = process.env): boolean {
  return !DESLIGADO.test(env.HARNESS_GRAFICO?.trim() ?? "");
}

/** O gráfico pronto pra resposta: o desenho + o recibo + o texto alternativo. */
export type GraficoNaResposta = {
  titulo: string;
  /** de onde vem o número (aparece embaixo do gráfico) */
  fonte: string;
  /** o SVG inteiro, já desenhado pelo servidor */
  svg: string;
  /** a série em texto — leitor de tela, e a legenda da figura quando isto virar documento */
  alt: string;
};

/** Mínimos pra uma série de ANO valer: menos que isso é frase, não gráfico. */
export const MIN_PAPERS = 4, MIN_ANOS = 3;

/** Mínimo de documentos pra "cobertura por documento" significar comparação. */
export const MIN_DOCS = 2;

/** Teto de gráficos por resposta. Mais de um já é muito numa bolha de chat. */
export const MAX_GRAFICOS = 2;

const pronto = (g: Grafico): GraficoNaResposta | null => {
  const svg = svgDoGrafico(g);
  if (!svg) return null;
  return { titulo: g.titulo, fonte: g.fonte, svg, alt: `${g.titulo} — ${g.fonte}` };
};

/**
 * PAPERS POR ANO, da busca de literatura. O número é a contagem de papers que a busca devolveu
 * naquele ano: apurado aqui, nunca digitado pelo modelo.
 *
 * Os anos SEM paper entram com zero dentro do intervalo observado, de propósito: um eixo de ano com
 * buracos escondidos sugere uma produção contínua que não existe. É o furo da série temporal que
 * mais engana, e é o que faz um tema pouco explorado parecer movimentado.
 */
export function graficoPapersPorAno(
  fontes: readonly { year?: number }[],
  rotulo = "Papers por ano",
): GraficoNaResposta | null {
  const anos = fontes
    .map((f) => Number(f?.year))
    .filter((y) => Number.isInteger(y) && y >= 1500 && y <= new Date().getFullYear() + 1);
  if (anos.length < MIN_PAPERS) return null;
  const conta = new Map<number, number>();
  for (const y of anos) conta.set(y, (conta.get(y) ?? 0) + 1);
  if (conta.size < MIN_ANOS) return null;
  const ini = Math.min(...conta.keys()), fim = Math.max(...conta.keys());
  const serie: { label: string; valor: number }[] = [];
  for (let y = ini; y <= fim; y++) serie.push({ label: String(y), valor: conta.get(y) ?? 0 });
  // intervalo longo: fica com os anos MAIS RECENTES (é o que responde "isto está vivo?")
  const pontos = serie.length > 12 ? serie.slice(-12) : serie;
  return pronto({
    forma: "barras",
    titulo: rotulo,
    fonte: `contagem dos ${anos.length} papers que a busca de literatura devolveu`,
    pontos,
  });
}

/**
 * COBERTURA POR DOCUMENTO: quantos trechos de cada documento da base entraram na resposta. O número
 * é o tamanho da lista que a busca devolveu — recibo puro.
 */
export function graficoCoberturaPorDocumento(
  docs: readonly { titulo: string; trechos: readonly unknown[] }[],
): GraficoNaResposta | null {
  const pontos = docs
    .filter((d) => d && String(d.titulo ?? "").trim() && Array.isArray(d.trechos) && d.trechos.length > 0)
    .map((d) => ({ label: String(d.titulo).trim(), valor: d.trechos.length }));
  if (pontos.length < MIN_DOCS) return null;
  return pronto({
    forma: "faixas",
    titulo: "Trechos usados por documento",
    fonte: "contagem dos trechos que a busca na sua base devolveu",
    pontos,
    unidade: " trechos",
  });
}

/**
 * Os gráficos deste turno, na ordem de utilidade. Nada aqui consulta modelo: ou o turno apurou o
 * número, ou não há gráfico.
 */
export function graficosDoTurno(entrada: {
  fontes?: readonly { year?: number }[];
  docsDaBase?: readonly { titulo: string; trechos: readonly unknown[] }[];
  env?: Record<string, string | undefined>;
}): GraficoNaResposta[] {
  if (!graficoLigado(entrada.env ?? process.env)) return [];
  const out: GraficoNaResposta[] = [];
  const ano = entrada.fontes?.length ? graficoPapersPorAno(entrada.fontes) : null;
  if (ano) out.push(ano);
  const cob = entrada.docsDaBase?.length ? graficoCoberturaPorDocumento(entrada.docsDaBase) : null;
  if (cob) out.push(cob);
  return out.slice(0, MAX_GRAFICOS);
}
