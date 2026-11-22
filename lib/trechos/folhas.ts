/**
 * lib/trechos/folhas.ts — ONDE cada folha de papel entra no texto da resposta. PURO (cliente).
 *
 * O servidor ancorou cada trecho "depois do parágrafo N do campo X" (lib/trechos/bloco `comTrechos`), contando os
 * parágrafos com `paragrafos()`. Aqui o cliente parte o MESMO texto com a MESMA função e intercala: markdown (os
 * parágrafos agrupados entre uma folha e outra, pra lista e tabela continuarem inteiras) e folhas.
 */
import type { StructuredAnswer, TrechoEmPapel } from "@/lib/agent/contracts";
import { paragrafos } from "@/lib/trechos/literal";

export type Pedaco = { tipo: "md"; md: string } | { tipo: "folhas"; trechos: TrechoEmPapel[] };

/**
 * Intercala o texto com as folhas ancoradas nele. `completo = false` (texto ainda sendo datilografado): a folha do
 * último parágrafo visível espera — ela só entra quando o parágrafo dela terminou de ser escrito.
 */
export function intercalar(texto: string, campo: "nucleo" | "desenvolvimento", trechos: readonly TrechoEmPapel[], completo = true): Pedaco[] {
  const ps = paragrafos(texto);
  const porParagrafo = new Map<number, TrechoEmPapel[]>();
  for (const t of trechos) {
    if (t.ancora?.campo !== campo) continue;
    porParagrafo.set(t.ancora.paragrafo, [...(porParagrafo.get(t.ancora.paragrafo) ?? []), t]);
  }
  const out: Pedaco[] = [];
  let acc: string[] = [];
  ps.forEach((p, i) => {
    acc.push(p);
    const aqui = porParagrafo.get(i);
    const pronto = completo || i < ps.length - 1;
    if (aqui?.length && pronto) {
      out.push({ tipo: "md", md: acc.join("\n\n") });
      acc = [];
      out.push({ tipo: "folhas", trechos: aqui });
    }
  });
  if (acc.length) out.push({ tipo: "md", md: acc.join("\n\n") });
  return out;
}

/** As folhas que não têm lugar no texto (sem âncora, campo vazio ou parágrafo que não existe) — vão pro fim. */
export function folhasSemLugar(a: Pick<StructuredAnswer, "nucleo" | "desenvolvimento" | "trechos">): TrechoEmPapel[] {
  const n = { nucleo: paragrafos(a.nucleo ?? "").length, desenvolvimento: paragrafos(a.desenvolvimento ?? "").length };
  return (a.trechos ?? []).filter((t) => !t.ancora || t.ancora.paragrafo >= n[t.ancora.campo]);
}

export const ROTULO_RELEVANCIA: Record<TrechoEmPapel["relevancia"], string> = { 3: "responde", 2: "sustenta", 1: "relacionado" };

/** O texto pra copiar/compartilhar uma folha: a citação entre aspas + a referência curta. */
export function textoParaCopiar(t: TrechoEmPapel): string {
  return `"${t.citacao}" (${t.titulo}${t.paginas ? `, p. ${t.paginas}` : ""})`;
}
