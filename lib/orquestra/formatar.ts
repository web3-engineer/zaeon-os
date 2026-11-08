/**
 * lib/orquestra/formatar.ts — texto do motor + registro de evidência → StructuredAnswer da Zaeon.
 *
 * É o que deixa o resto do turno (TCC cross-sala, cartolina, memória, vídeo, cliente) sem saber
 * que a resposta veio de outro laboratório: a forma é a mesma do harness.
 *
 * As chaves internas [E7][E2] viram [1][2] na ordem em que aparecem, e `evidencia`/`sources`/
 * `referencias` saem NESSA ordem — o número no texto é a posição na lista, como no harness.
 */
import type { Source, StructuredAnswer } from "@/lib/agent/contracts";
import { formatAbntReference } from "@/lib/scholar/abnt";
import type { Evidencia, Tarefa } from "@/lib/orquestra/contrato";

export type MetaFormato = { motor: string; modelos: string[]; at?: string };

function autoresDe(s?: Source): string[] {
  return (s?.authors ?? "").split(/\s*[;,]\s*(?=[A-ZÀ-Ý])/).map((a) => a.trim()).filter(Boolean);
}

export function referenciaAbnt(e: Evidencia): string {
  const s = e.source;
  return formatAbntReference({
    id: e.chave, title: s?.title || e.claim.slice(0, 160), authors: autoresDe(s), year: s?.year,
    url: s?.url, openAccess: false, sources: [e.ferramenta],
  });
}

/** PURA: renumera [E#] → [n] pela ordem de aparição; devolve o texto e as evidências citadas, em ordem */
export function renumerar(texto: string, evidencias: readonly Evidencia[]): { texto: string; citadas: Evidencia[] } {
  const porChave = new Map(evidencias.map((e) => [e.chave, e]));
  const ordem: string[] = [];
  const out = texto.replace(/\[(E\d+)\]/g, (m, k: string) => {
    if (!porChave.has(k)) return m;
    let i = ordem.indexOf(k);
    if (i < 0) { ordem.push(k); i = ordem.length - 1; }
    return `[${i + 1}]`;
  });
  return { texto: out, citadas: ordem.map((k) => porChave.get(k)!) };
}

/** PURA: "resumo\n\n## A\n…\n## B\n…" → resumo + seções */
export function separarSecoes(md: string): { resumo: string; secoes: { title: string; body: string }[] } {
  const partes = md.split(/^##\s+/m);
  const resumo = partes.shift()?.trim() ?? "";
  const secoes = partes.map((p) => {
    const [linha, ...resto] = p.split("\n");
    return { title: linha.replace(/^#+\s*/, "").trim(), body: resto.join("\n").trim() };
  }).filter((s) => s.title || s.body);
  return { resumo, secoes };
}

export function paraStructuredAnswer(textoVerificado: string, evidencias: readonly Evidencia[], t: Tarefa, meta: MetaFormato): StructuredAnswer {
  const { texto, citadas } = renumerar(textoVerificado, evidencias);
  const { resumo, secoes } = separarSecoes(texto);
  const blocos = texto.split(/\n{2,}/);
  const nucleo = (resumo.split(/\n{2,}/)[0] || blocos[0] || "").trim();
  const fontes = citadas.map((e) => e.source).filter((s): s is Source => !!s);

  const answer: StructuredAnswer = {
    nucleo,
    evidencia: citadas.map((e) => ({ claim: e.claim.slice(0, 500), source: e.source ?? { title: e.claim.slice(0, 120) } })),
    referencias: citadas.map((e) => ({ abnt: referenciaAbnt(e), titulo: e.source?.title, url: e.source?.url })),
    provenance: {
      by: meta.motor,
      intent: t.intent,
      toolsUsed: [...new Set(evidencias.map((e) => e.ferramenta))],
      sources: fontes,
      model: meta.modelos.join(", "),
      at: meta.at ?? new Date().toISOString(),
      traceId: t.id,
    },
  };

  if (t.intent === "criar_trabalho") {
    const secoesComRef = citadas.length
      ? [...secoes, { title: "Referências", body: citadas.map((e, i) => `[${i + 1}] ${referenciaAbnt(e)}`).join("\n\n") }]
      : secoes;
    answer.work = { kind: t.kind ?? "artigo", sections: secoesComRef.length ? secoesComRef : [{ title: "Texto", body: texto }] };
  } else {
    const resto = texto.slice(texto.indexOf(nucleo) + nucleo.length).trim();
    if (resto) answer.desenvolvimento = resto;
  }
  if (t.intent === "pesquisar_fontes" || fontes.length) answer.sources = fontes;
  return answer;
}
