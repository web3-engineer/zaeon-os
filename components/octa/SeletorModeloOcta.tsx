"use client";
/**
 * SeletorModeloOcta — a pílula de modelo no composer do agente de código geral do Octa: o aluno escolhe
 * entre "Gemini" (padrão da casa), os LOCAIS grátis que o servidor liberou (qwen3-coder, plano Plus) e os
 * PREMIUM (Claude/Codex, plano Max).
 *
 * A lista vem de GET /api/octa/modelos (flag + plano + gateway), cada item com um `tipo` que pinta a cor/
 * selo. Quem só tem o Gemini nem vê a pílula (temEscolha=false). A escolha mora no localStorage do aparelho.
 * O portão de verdade é server-side na /api/octa/agente; aqui é só conveniência de UI.
 */
import { useEffect, useRef, useState } from "react";

const CHAVE = "octa.modelo";
export type TipoModelo = "padrao" | "local" | "premium";
export type OpcaoModelo = { id: string; nome: string; tipo?: TipoModelo };
const PADRAO: OpcaoModelo[] = [{ id: "octa", nome: "Gemini", tipo: "padrao" }];

/** Cor, símbolo e selo por tipo de modelo. */
const ESTILO: Record<TipoModelo, { simbolo: string; pilula: string; icone: string; selo?: string; seloCor?: string }> = {
  padrao: { simbolo: "⬢", pilula: "text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/10", icone: "text-emerald-600 dark:text-emerald-300" },
  local: { simbolo: "⬡", pilula: "text-sky-700 dark:text-sky-300 border-sky-500/45 bg-sky-500/10", icone: "text-sky-600 dark:text-sky-300", selo: "Plus", seloCor: "text-sky-500 dark:text-sky-300/70" },
  premium: { simbolo: "✦", pilula: "text-violet-700 dark:text-violet-300 border-violet-500/45 bg-violet-500/10", icone: "text-violet-600 dark:text-violet-300", selo: "Max", seloCor: "text-violet-400 dark:text-violet-300/60" },
};
const estiloDe = (o?: OpcaoModelo) => ESTILO[o?.tipo ?? "padrao"];

/** A escolha do modelo do Octa + a lista liberada pro usuário (do servidor). */
export function useModeloOcta(): { modelo: string; opcoes: OpcaoModelo[]; escolher: (id: string) => void; temEscolha: boolean } {
  const [opcoes, setOpcoes] = useState<OpcaoModelo[]>(PADRAO);
  const [modelo, setModelo] = useState("octa");
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/octa/modelos");
        const j = await r.json().catch(() => ({}));
        if (!vivo || !Array.isArray(j?.modelos) || !j.modelos.length) return;
        setOpcoes(j.modelos);
        let salvo = "octa";
        try { salvo = localStorage.getItem(CHAVE) || "octa"; } catch { /* sem storage: padrão */ }
        setModelo(j.modelos.some((m: OpcaoModelo) => m.id === salvo) ? salvo : "octa");  // escolha salva só vale se ainda liberada
      } catch { /* offline: fica no Gemini */ }
    })();
    return () => { vivo = false; };
  }, []);
  // `escolher` é recriada a cada render, então `opcoes` aqui é sempre a lista atual (sem closure velho).
  const escolher = (id: string) => {
    if (!opcoes.some((m) => m.id === id)) return;   // só um id que o servidor liberou
    setModelo(id);
    try { localStorage.setItem(CHAVE, id); } catch { /* só não lembra */ }
  };
  return { modelo, opcoes, escolher, temEscolha: opcoes.length > 1 };
}

export function SeletorModeloOcta({ modelo, opcoes, onChange, desabilitado }: { modelo: string; opcoes: OpcaoModelo[]; onChange: (id: string) => void; desabilitado?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  const atual = opcoes.find((m) => m.id === modelo) ?? opcoes[0];
  const est = estiloDe(atual);

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        title={`Modelo do Octa: ${atual?.nome ?? "Gemini"}. Clique para trocar.`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors disabled:opacity-50 ${est.pilula}`}
      >
        <span aria-hidden className="text-[12px] leading-none">{est.simbolo}</span>
        {atual?.nome ?? "Gemini"}
        <span aria-hidden className="text-[9px] opacity-70">▾</span>
      </button>
      {aberto && (
        <ul
          role="listbox"
          aria-label="Escolher o modelo do Octa"
          className="absolute bottom-full mb-2 left-0 z-[80] w-[15rem] rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0b0d14]/95 backdrop-blur-xl shadow-xl p-1.5"
        >
          {opcoes.map((m) => {
            const sel = m.id === modelo;
            const e = estiloDe(m);
            return (
              <li key={m.id} role="option" aria-selected={sel}>
                <button
                  type="button"
                  onClick={() => { onChange(m.id); setAberto(false); }}
                  className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors ${sel ? "bg-slate-100 dark:bg-white/10" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                >
                  <span aria-hidden className={`text-[13px] ${e.icone}`}>{e.simbolo}</span>
                  <span className="flex-1 text-[12.5px] font-semibold text-slate-900 dark:text-white">
                    {m.nome}
                    {e.selo && <span className={`ml-1.5 text-[10px] font-bold uppercase tracking-wide ${e.seloCor}`}>{e.selo}</span>}
                  </span>
                  {sel && <span aria-hidden className="text-[12px] text-slate-500">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
