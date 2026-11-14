"use client";
// DEV ONLY: prova do understand-anything REAL. Carrega o knowledge-graph.json gerado de verdade no
// karpathy/micrograd, deriva a árvore (arvoreDoUA) e renderiza a jornada — o board mostra os RESUMOS REAIS.
import CursoArvoreView from "@/components/studio/CursoArvoreView";
import { arvoreDoUA, type UAGrafo } from "@/lib/forja/understand";
import sample from "@/lib/forja/understand.sample.json";
import type { CursoRepo } from "@/lib/forja/tipos";

export default function Page() {
  const arvore = arvoreDoUA(sample as unknown as UAGrafo);
  const curso: CursoRepo = { cursoId: "micrograd", repo: "karpathy/micrograd", modo: "curso", grafo: { nos: [], arestas: [] }, arvore, modulos: [], licoes: [], licencas: [] };
  return (
    <div className="h-screen w-screen">
      <CursoArvoreView curso={curso} titulo={arvore.raiz.titulo} />
      <div className="pointer-events-none fixed bottom-2 right-3 z-50 font-mono text-[11px] text-emerald-300/70">understand-anything REAL · {sample.nodes.length} nós · {sample.layers.length} camadas (karpathy/micrograd)</div>
    </div>
  );
}
