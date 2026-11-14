"use client";

/**
 * SalaCurso — a ÁREA PRÓPRIA de um curso de código na Sala de Estudos. Busca o CursoRepo pelo cursoId
 * (rota /api/studio/forja, que resolve curado OU skill-curso) e enche o grafo preguiçosamente pelo motor
 * (/api/studio/forja/mapa); depois renderiza a CursoCodigoView em tela cheia. Sem motor, o board degrada
 * pro esqueleto, sem travar.
 */
import { useEffect, useState } from "react";
import CursoArvoreView from "@/components/studio/CursoArvoreView";
import { comBaseDoGrafo, mesclarEnriquecimento } from "@/lib/forja/arvoreDoGrafo";
import type { CursoRepo } from "@/lib/forja/tipos";
import type { LicaoCurada } from "@/lib/forja/licaoCurada";

const H = { "content-type": "application/json" };
type MetaCurso = CursoRepo & { licoesPorNo?: Record<string, LicaoCurada> };

export default function SalaCurso({ cursoId, titulo, onFechar }: { cursoId: string; titulo?: string; onFechar?: () => void }) {
  const [curso, setCurso] = useState<CursoRepo | null>(null);
  const [licoes, setLicoes] = useState<Record<string, LicaoCurada>>({});
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCurso(null); setLicoes({}); setErro(false);
    (async () => {
      try {
        const r = await fetch("/api/studio/forja", { method: "POST", headers: H, body: JSON.stringify({ topic: cursoId }) });
        const j = await r.json().catch(() => null);
        if (!vivo) return;
        if (!r.ok || !j?.meta) { setErro(true); return; }
        const c = j.meta as MetaCurso;
        setCurso(c);                        // base curada já ensina (não espera o motor)
        setLicoes(c.licoesPorNo ?? {});     // lições reais (estudo/prova/sandbox) por nó
        // Camadas: a base curada (c.arvore) manda. O motor (graphify/understand), quando a box responde,
        // ENRIQUECE por cima — some ramos do código real à base, sem apagá-la. Sem base curada, o
        // enriquecimento É a árvore. Sem motor, nada muda (fica a base). Nunca esvazia.
        const temBaseCurada = (c.arvore?.raiz?.filhos?.length ?? 0) > 0;
        const rm = await fetch("/api/studio/forja/mapa", { method: "POST", headers: H, body: JSON.stringify({ cursoId }) }).then((x) => x.json()).catch(() => null);
        if (vivo && rm && (rm.arvoreUA || rm.grafo?.nos?.length)) {
          const grafo = rm.grafo ?? c.grafo;
          const doMotor = rm.arvoreUA ?? comBaseDoGrafo({ arvore: { raiz: { ...c.arvore.raiz, filhos: [] } }, grafo }, titulo || c.arvore.raiz.titulo);
          const arvore = temBaseCurada ? mesclarEnriquecimento(c.arvore, doMotor) : doMotor;
          setCurso({ ...c, grafo, arvore });
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
  return <CursoArvoreView curso={curso} licoes={licoes} titulo={titulo || curso.arvore.raiz.titulo} onFechar={onFechar} />;
}
