/**
 * lib/rag/limpar.ts — resumo de API com HTML → texto corrido.
 *
 * POR QUE É MÓDULO PRÓPRIO: a DOAJ e o Zenodo mandam o resumo em HTML, e as duas precisam da MESMA
 * limpeza. Copiar a função pra cada fonte é exatamente o defeito que já consertamos duas vezes neste
 * repositório (a regra do `tituloEResumo` duplicada em Python, a contagem de mentores escrita à mão).
 *
 * Medido em 225 resumos reais da DOAJ: `<i>` 56x, `<p>` 10x, `<em>` 10x, `<br>` 6x, `<sub>` 6x,
 * `<strong>` 4x, e as entidades `&gt;`/`&lt;` 93 e 92 vezes — essas quase sempre estatística
 * escapada (`p &lt; 0,05`). No Zenodo a descrição vem com `<p>` e `&ldquo;`/`&rdquo;`. Sem limpar, a
 * marcação aparece no trecho citado ao aluno e atrapalha o casamento de termos do classificador.
 *
 * A ORDEM é o que importa: tira-se a TAG antes de decodificar a ENTIDADE. Ao contrário, `&lt;i&gt;`
 * — que o autor escreveu pra aparecer literalmente — viraria `<i>` e seria removido como se fosse
 * marcação, comendo o texto. Assim, tag real sai e tag escapada sobrevive como texto.
 */
export function limparHtml(bruto: string): string {
  let t = String(bruto ?? "");
  t = t.replace(/<\/?(?:br|p|div|li)\b[^>]*>/gi, " ");   // quebra de bloco vira espaço
  t = t.replace(/<[^>]+>/g, "");                         // o resto da marcação some
  t = t.replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/&rsquo;|&lsquo;/gi, "'").replace(/&rdquo;|&ldquo;/gi, '"')
    .replace(/&ndash;/gi, "–").replace(/&mdash;/gi, "—")
    .replace(/&amp;/gi, "&")                             // por último: não recriar entidade
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  return t.replace(/\s+/g, " ").trim();
}
