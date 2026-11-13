"use client";
/**
 * ReaBlueprintView — o MÓDULO do Blueprint REA (engenharia reversa) no chat/Sala de Estudos. Como um paper, mas com o
 * estilo do REA: o mecanismo, os ACHADOS rotulados pela proveniência (observação/derivação/inferência/desconhecido) e
 * os passos de reconstrução. Busca /api/rea/[id] e repesca enquanto está `gerando` (turnos === 0). lib/rea-blueprint.
 */
import { useCallback, useEffect, useState } from "react";
import { Microscope, X, Loader2, RefreshCw, Github, Check } from "lucide-react";
import { ROTULO_PROV, type DocReaBlueprint, type Prov } from "@/lib/rea-blueprint/tipos";
import { OCTA_CODE_LIGADO } from "@/lib/octa/flag";
import { abrirProjetoNaOcta } from "@/lib/octa/ideNav";

const COR_PROV: Record<Prov, string> = {
  observacao: "border-emerald-400/40 bg-emerald-400/[0.08] text-emerald-200",
  derivacao: "border-sky-400/40 bg-sky-400/[0.08] text-sky-200",
  inferencia: "border-amber-400/40 bg-amber-400/[0.08] text-amber-200",
  desconhecido: "border-rose-400/40 bg-rose-400/[0.08] text-rose-200",
};

export default function ReaBlueprintView({ id, onFechar }: { id: string; onFechar?: () => void }) {
  const [doc, setDoc] = useState<DocReaBlueprint | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/rea/${id}`, { cache: "no-store" });
      if (!r.ok) { setErro(r.status === 404 ? "Blueprint não encontrado." : "Não deu pra carregar."); return; }
      const j = await r.json(); setDoc(j.view?.doc ?? null); setErro(null);
    } catch { setErro("Sem conexão."); }
  }, [id]);
  useEffect(() => { void carregar(); }, [carregar]);
  // enquanto está montando (turnos 0 e sem mecanismo), repesca a cada 4 s
  useEffect(() => {
    if (!doc || doc.turnos > 0 || doc.comoFunciona) return;
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
  }, [doc, carregar]);

  const montando = doc && doc.turnos === 0 && !doc.comoFunciona && !doc.achados.length;

  // Ponte REA → Octa → GitHub: cria um projeto na Octa com o scaffold (site estático) do blueprint
  // e abre a IDE, onde o botão "Publicar" leva ao repo + GitHub Pages na conta do aluno.
  const [paraOcta, setParaOcta] = useState<"idle" | "criando" | "feito">("idle");
  const [erroOcta, setErroOcta] = useState<string | null>(null);
  const temConteudo = !!doc && !montando && (!!doc.comoFunciona || doc.achados.length > 0 || doc.reconstrucao.length > 0 || !!doc.resumo);
  const criarNaOcta = useCallback(async () => {
    setParaOcta("criando"); setErroOcta(null);
    try {
      const r = await fetch(`/api/rea/${id}/para-octa`, { method: "POST" });
      if (!r.ok) {
        setErroOcta(r.status === 409 ? "O blueprint ainda está vazio." : "Não deu pra criar o projeto.");
        setParaOcta("idle"); return;
      }
      const j = await r.json();
      setParaOcta("feito");
      if (typeof j?.projetoId === "string") abrirProjetoNaOcta(j.projetoId);
    } catch { setErroOcta("Sem conexão."); setParaOcta("idle"); }
  }, [id]);

  return (
    <div className="h-full overflow-y-auto bg-[#0a0f1a] text-slate-100">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0a0f1a]/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <Microscope size={16} className="text-emerald-400 shrink-0" />
          <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-emerald-200/90">Blueprint · Engenharia reversa</span>
        </div>
        <div className="flex items-center gap-2">
          {OCTA_CODE_LIGADO && temConteudo ? (
            <button
              onClick={criarNaOcta}
              disabled={paraOcta !== "idle"}
              title="Cria um projeto na Octa com este blueprint e abre a IDE para publicar no seu GitHub"
              className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.08] px-2.5 py-1 text-[12px] font-semibold text-emerald-200 transition hover:bg-emerald-400/[0.16] disabled:opacity-60"
            >
              {paraOcta === "criando" ? <Loader2 size={13} className="animate-spin" /> : paraOcta === "feito" ? <Check size={13} /> : <Github size={13} />}
              {paraOcta === "criando" ? "Criando…" : paraOcta === "feito" ? "Aberto na Octa" : "Criar projeto na Octa"}
            </button>
          ) : null}
          <button onClick={carregar} title="Atualizar" className="p-1.5 rounded hover:bg-white/10"><RefreshCw size={14} className="text-slate-400" /></button>
          {onFechar && <button onClick={onFechar} title="Fechar" className="p-1.5 rounded hover:bg-white/10"><X size={16} className="text-slate-400" /></button>}
        </div>
      </div>

      {erroOcta ? <div className="border-b border-rose-400/20 bg-rose-400/[0.06] px-5 py-2 text-[12px] text-rose-300">{erroOcta}</div> : null}
      {erro ? <div className="p-6 text-[13px] text-rose-300">{erro}</div> : !doc ? (
        <div className="flex items-center gap-2 p-6 text-slate-400"><Loader2 className="animate-spin" size={16} /> carregando…</div>
      ) : (
        <article className="mx-auto max-w-3xl px-6 py-7 prose-invert">
          <h1 className="text-[22px] font-bold leading-tight text-white">{doc.titulo}</h1>
          {doc.alvo ? <p className="mt-1 text-[12.5px] uppercase tracking-wide text-emerald-300/70">Alvo: {doc.alvo}</p> : null}
          {doc.ferramentas.length ? <p className="mt-1 text-[11.5px] text-slate-500">Motor do REA: {doc.ferramentas.join(", ")}</p> : null}

          {montando ? (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-3 text-[13px] text-emerald-200/90">
              <Loader2 className="animate-spin" size={15} /> Montando o blueprint a partir do que você está estudando…
            </div>
          ) : (
            <>
              {doc.resumo ? <p className="mt-4 text-[14.5px] leading-relaxed text-slate-200">{doc.resumo}</p> : null}

              {doc.comoFunciona ? (
                <section className="mt-6">
                  <h2 className="text-[15px] font-semibold text-white">Como funciona</h2>
                  <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-300">{doc.comoFunciona}</p>
                </section>
              ) : null}

              {doc.achados.length ? (
                <section className="mt-6">
                  <h2 className="text-[15px] font-semibold text-white">Achados <span className="text-[11px] font-normal text-slate-500">· rotulados pela proveniência</span></h2>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {doc.achados.map((a) => (
                      <li key={a.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-start gap-2">
                          <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${COR_PROV[a.prov]}`}>{ROTULO_PROV[a.prov]}</span>
                          <span className="text-[13.5px] leading-snug text-slate-100">{a.afirmacao}</span>
                        </div>
                        {a.detalhe ? <p className="mt-1.5 pl-1 text-[12.5px] leading-relaxed text-slate-400">{a.detalhe}</p> : null}
                        {a.fonte ? <p className="mt-1 pl-1 text-[11px] text-slate-500">fonte: {a.fonte}</p> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {doc.reconstrucao.length ? (
                <section className="mt-6">
                  <h2 className="text-[15px] font-semibold text-white">Como reconstruir</h2>
                  <ol className="mt-3 flex flex-col gap-2.5">
                    {doc.reconstrucao.map((p, i) => (
                      <li key={p.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="text-[13.5px] font-semibold text-slate-100"><span className="mr-1.5 text-emerald-300">{i + 1}.</span>{p.titulo}</div>
                        {p.corpo ? <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400">{p.corpo}</p> : null}
                        {p.verifica ? <p className="mt-1.5 text-[11.5px] text-sky-300/80">✓ verificar: {p.verifica}</p> : null}
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {doc.incertezas.length ? (
                <section className="mt-6">
                  <h2 className="text-[15px] font-semibold text-white">O que ainda não se sabe</h2>
                  <ul className="mt-2 list-disc pl-5 text-[13px] leading-relaxed text-rose-200/80">
                    {doc.incertezas.map((u, i) => <li key={i}>{u}</li>)}
                  </ul>
                </section>
              ) : null}
            </>
          )}
          <p className="mt-8 border-t border-white/10 pt-3 text-[11px] text-slate-600">O REA separa o que foi observado do que foi inferido e nunca finge saber. Uso lícito: estudo, interoperabilidade, segurança, software próprio ou autorizado.</p>
        </article>
      )}
    </div>
  );
}
