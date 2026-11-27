/**
 * lib/knowledge-tree/adaptadorCurso.ts — o curso da Forja (CursoRepo: árvore de entendimento + grafo
 * de código + lições curadas) na forma da Árvore Neuronal (NoArvore). PURO.
 *
 *   raiz → "raiz";  nó com filhos → "modulo" (profundidade 1) ou "conceito";
 *   folha → tipo pela lição real: sandbox = "codigo", desafio = "pratica", prova = "relacoes", só texto = "ideia";
 *   grau  → média do `grau` dos nós do grafo que a lição explica (refs), quando o motor trouxe o grafo.
 */
import type { CursoRepo, NoEntendimento } from "@/lib/forja/tipos";
import type { LicaoCurada } from "@/lib/forja/licaoCurada";
import type { NoArvore, TipoLicaoArvore } from "./tipos";

export function tipoDaFolha(lic: LicaoCurada | undefined): TipoLicaoArvore {
  if (lic?.sandbox && (lic.sandbox.inicial || "").trim()) return "codigo";
  if (lic?.desafio) return "pratica";
  if (lic?.prova?.length) return "relacoes";
  return "ideia";
}

export function noArvoreDoCurso(curso: CursoRepo, licoes: Record<string, LicaoCurada> = {}, titulo?: string): NoArvore {
  const grauPorId = new Map<string, number>();
  for (const n of curso.grafo?.nos ?? []) if (typeof n.grau === "number") grauPorId.set(n.id, n.grau);
  const grauDe = (n: NoEntendimento): number | undefined => {
    const gs = (n.refs ?? []).map((r) => grauPorId.get(r)).filter((g): g is number => typeof g === "number");
    return gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : undefined;
  };
  const vistos = new Set<string>();
  const conv = (n: NoEntendimento, prof: number): NoArvore | null => {
    if (!n?.id || vistos.has(n.id)) return null;
    vistos.add(n.id);
    const filhos = (n.filhos ?? []).map((f) => conv(f, prof + 1)).filter((x): x is NoArvore => !!x);
    const tipo: TipoLicaoArvore = prof === 0 ? "raiz" : filhos.length ? (prof === 1 ? "modulo" : "conceito") : tipoDaFolha(licoes[n.id]);
    const grau = grauDe(n);
    return { id: n.id, titulo: n.titulo || n.id, tipo, resumo: n.resumo, ...(grau !== undefined ? { grau } : {}), filhos };
  };
  const raiz = conv(curso.arvore.raiz, 0) ?? { id: "raiz", titulo: "", tipo: "raiz" as const, filhos: [] };
  return { ...raiz, titulo: (titulo || raiz.titulo || curso.repo || "").trim() };
}
