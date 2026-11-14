"use client";
// DEV ONLY: busca o grafo REAL (graphify local) e renderiza a cena do curso com ele.
import { useEffect, useState } from "react";
import CursoArvoreView from "@/components/studio/CursoArvoreView";
import { comBaseDoGrafo } from "@/lib/forja/arvoreDoGrafo";
import type { CursoRepo } from "@/lib/forja/tipos";

export default function CursoRealPreview({ curso, repo, titulo }: { curso: CursoRepo; repo: string; titulo: string }) {
  const [c, setC] = useState<CursoRepo>(curso);
  const [status, setStatus] = useState("analisando o repositório com o graphify…");
  useEffect(() => {
    let vivo = true;
    fetch(`/api/dev/grafo?repo=${encodeURIComponent(repo)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!vivo) return;
        if (j?.grafo?.nos?.length) { setC((x) => { const grafo = j.grafo; return { ...x, grafo, arvore: comBaseDoGrafo({ arvore: x.arvore, grafo }, titulo) }; }); setStatus(`grafo REAL: ${j.nos} nós · ${j.arestas} arestas (${repo})`); }
        else setStatus(`sem grafo de ${repo} (motor local desligado ou falhou)`);
      })
      .catch(() => { if (vivo) setStatus("falha na análise"); });
    return () => { vivo = false; };
  }, [repo]);
  return (
    <div className="relative h-screen w-screen">
      <CursoArvoreView curso={c} titulo={titulo} />
      <div className="pointer-events-none fixed bottom-2 right-3 z-50 font-mono text-[11px] text-cyan-300/70">{status}</div>
    </div>
  );
}
