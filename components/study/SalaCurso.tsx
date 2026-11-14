"use client";

/**
 * SalaCurso — a ÁREA PRÓPRIA de um curso de código na Sala de Estudos. Busca o CursoRepo pelo cursoId
 * (rota /api/studio/forja, que resolve curado OU skill-curso) e enche o grafo preguiçosamente pelo motor
 * (/api/studio/forja/mapa); depois renderiza a CursoCodigoView em tela cheia. Sem motor, o board degrada
 * pro esqueleto, sem travar.
 */
import { useEffect, useState } from "react";
import CursoArvoreView from "@/components/studio/CursoArvoreView";
import { comBaseDoGrafo } from "@/lib/forja/arvoreDoGrafo";
import type { CursoRepo } from "@/lib/forja/tipos";

const H = { "content-type": "application/json" };

export default function SalaCurso({ cursoId, titulo, onFechar }: { cursoId: string; titulo?: string; onFechar?: () => void }) {
  const [curso, setCurso] = useState<CursoRepo | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCurso(null); setErro(false);
    (async () => {
      try {
        const r = await fetch("/api/studio/forja", { method: "POST", headers: H, body: JSON.stringify({ topic: cursoId }) });
        const j = await r.json().catch(() => null);
        if (!vivo) return;
        if (!r.ok || !j?.meta) { setErro(true); return; }
        let c = j.meta as CursoRepo;
        setCurso(c); // mostra o esqueleto já; o grafo entra quando o motor responder
        const rm = await fetch("/api/studio/forja/mapa", { method: "POST", headers: H, body: JSON.stringify({ cursoId }) }).then((x) => x.json()).catch(() => null);
        if (vivo && rm?.grafo?.nos?.length) {
          const grafo = rm.grafo;
          setCurso({ ...c, grafo, arvore: comBaseDoGrafo({ arvore: c.arvore, grafo }, titulo || c.arvore.raiz.titulo) });
        }
      } catch {
        if (vivo) setErro(true);
      }
    })();
    return () => { vivo = false; };
  }, [cursoId]);

  if (erro) {
    return (
      <div className="grid h-full place-items-center bg-[#060b16] text-center text-[13px] text-white/60">
        <div>
          Não consegui montar este curso agora.
          {onFechar && <div className="mt-3"><button type="button" onClick={onFechar} className="rounded-full border border-white/15 px-3 py-1 text-white/70 hover:text-white">← voltar</button></div>}
        </div>
      </div>
    );
  }
  if (!curso) return <div className="grid h-full place-items-center bg-[#060b16] text-[13px] text-cyan-300/60">Montando o curso…</div>;
  return <CursoArvoreView curso={curso} titulo={titulo || curso.arvore.raiz.titulo} onFechar={onFechar} />;
}
