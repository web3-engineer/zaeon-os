"use client";
/**
 * MinhaBase — a base pessoal do RAG no composer do chat (F3), nas duas salas:
 *  - BarraBase: a bandeja dos PDFs subindo (um chip por arquivo: na fila / enviando / guardado / erro) + o botão
 *    "📚 Minha base (N)", que abre a lista dos documentos da pessoa com status e remover (pede confirmação).
 * Sem sessão (401) ou base fora do ar: o botão some — a bandeja só aparece enquanto há envio.
 */
import { BookOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { EnvioBase } from "@/components/chat/useAnexoChat";
import { motivoDoErro, type ErroEnvio } from "@/lib/rag/minhaBase";

type DocBase = { id: string; titulo: string; nomeArquivo: string; paginas: number; status: "indexando" | "pronto" | "erro"; erro: string | null };

const PILULA = "inline-flex items-center gap-1.5 max-w-full min-h-[28px] px-2.5 rounded-full text-[11.5px] font-semibold border";

function ChipEnvio({ e }: { e: EnvioBase }) {
  const cor =
    e.estado === "erro" ? "bg-rose-500/10 border-rose-400/40 text-rose-700 dark:text-rose-200"
    : e.estado === "guardado" ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-700 dark:text-emerald-200"
    : "bg-cyan-500/10 border-cyan-400/30 text-cyan-800 dark:text-cyan-100";
  const icone = e.estado === "erro" ? "⚠" : e.estado === "guardado" ? "✓" : e.estado === "enviando" ? "⟳" : "…";
  const dica = e.estado === "erro" ? motivoDoErro(e.erro) : e.estado === "guardado" ? "Guardado na sua base" : e.estado === "enviando" ? "Lendo e guardando…" : "Na fila";
  return (
    <span className={`${PILULA} ${cor}`} title={dica}>
      <span aria-hidden className={e.estado === "enviando" ? "inline-block animate-spin" : ""}>{icone}</span>
      <span className="truncate max-w-[11rem]">{e.nome}</span>
    </span>
  );
}

export function BarraBase({ envios, versao }: { envios: EnvioBase[]; versao: number }) {
  const [docs, setDocs] = useState<DocBase[] | null>(null); // null = sem sessão / fora do ar ⇒ sem botão
  const [aberta, setAberta] = useState(false);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/rag/minha-base", { cache: "no-store" });
      if (!r.ok) { setDocs(null); return; }
      const j = await r.json();
      setDocs(Array.isArray(j?.documentos) ? j.documentos : []);
    } catch { setDocs(null); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar, versao]);
  // documento "indexando" vira "pronto" em segundos: com a lista aberta, confere de novo
  useEffect(() => {
    if (!aberta || !docs?.some((d) => d.status === "indexando")) return;
    const t = setTimeout(() => void carregar(), 4000);
    return () => clearTimeout(t);
  }, [aberta, docs, carregar]);

  const remover = async (id: string) => {
    setConfirmar(null);
    setFalhou(false);
    try {
      const r = await fetch(`/api/rag/minha-base?documentoId=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!r.ok && r.status !== 404) { setFalhou(true); return; }
      setDocs((v) => v?.filter((d) => d.id !== id) ?? v);
    } catch { setFalhou(true); }
  };

  const temBotao = docs !== null && (docs.length > 0 || envios.length > 0);
  if (!envios.length && !temBotao) return null;

  return (
    <div className="px-1 pb-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {temBotao && (
          <button type="button" onClick={() => setAberta((v) => !v)} aria-expanded={aberta}
            className={`${PILULA} ${aberta ? "bg-violet-500/15 border-violet-400/50 text-violet-700 dark:text-violet-200" : "bg-transparent border-slate-300 dark:border-white/15 text-slate-600 dark:text-white/70 hover:border-violet-400/50"}`}
            title="Os PDFs que você guardou: a Aura responde com base neles e cita a página">
            <BookOpen size={13} aria-hidden /> Minha base{docs!.length ? ` (${docs!.length})` : ""}
          </button>
        )}
        {envios.map((e) => <ChipEnvio key={e.chave} e={e} />)}
      </div>
      {aberta && docs && (
        <div className="mt-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] max-h-56 overflow-y-auto custom-scrollbar">
          {docs.length === 0 ? (
            <p className="px-3 py-2.5 text-[12px] text-slate-500 dark:text-white/50">Nada guardado ainda. Solte PDFs (ou uma pasta) na conversa.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-2 px-3 py-2 text-[12.5px]">
                  <span aria-hidden title={d.status === "pronto" ? "Pronto" : d.status === "indexando" ? "Preparando a busca por significado (palavras já funcionam)" : motivoDoErro((d.erro ?? undefined) as ErroEnvio | undefined)}>
                    {d.status === "pronto" ? "✓" : d.status === "indexando" ? "⟳" : "⚠"}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-white/85" title={d.nomeArquivo}>{d.titulo}</span>
                  {d.paginas > 0 && <span className="shrink-0 text-slate-400 dark:text-white/40">{d.paginas} p.</span>}
                  {confirmar === d.id ? (
                    <span className="shrink-0 flex items-center gap-1">
                      <button type="button" onClick={() => void remover(d.id)} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-200">Remover</button>
                      <button type="button" onClick={() => setConfirmar(null)} className="px-2 py-0.5 rounded-full text-[11px] text-slate-500 dark:text-white/50">Manter</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmar(d.id)} aria-label={`Remover ${d.titulo} da sua base`}
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-500/10">×</button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {falhou && <p className="px-3 pb-2 text-[11.5px] text-rose-600 dark:text-rose-300">Não consegui remover agora. Tente de novo.</p>}
        </div>
      )}
    </div>
  );
}
