"use client";
/**
 * SeletorModeloOcta — a pílula de modelo no composer do agente de código geral do Octa: o aluno
 * escolhe entre "Octa (padrão)" e os premium (Claude/Codex) que o servidor liberou pra ele.
 *
 * A lista vem de GET /api/octa/modelos (flag + plano Max + gateway) — quem não pode só vê o Octa, e
 * a pílula nem aparece (temPremium=false). A escolha mora no localStorage do aparelho. O portão de
 * verdade é server-side na /api/octa/agente; aqui é só conveniência de UI.
 */
import { useEffect, useRef, useState } from "react";

const CHAVE = "octa.modelo";
export type OpcaoModelo = { id: string; nome: string };
const PADRAO: OpcaoModelo[] = [{ id: "octa", nome: "Octa (padrão)" }];

/** A escolha do modelo do Octa + a lista liberada pro usuário (do servidor). */
export function useModeloOcta(): { modelo: string; opcoes: OpcaoModelo[]; escolher: (id: string) => void; temPremium: boolean } {
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
      } catch { /* offline: fica no Octa */ }
    })();
    return () => { vivo = false; };
  }, []);
  // `escolher` é recriada a cada render, então `opcoes` aqui é sempre a lista atual (sem closure velho).
  const escolher = (id: string) => {
    if (!opcoes.some((m) => m.id === id)) return;   // só um id que o servidor liberou
    setModelo(id);
    try { localStorage.setItem(CHAVE, id); } catch { /* só não lembra */ }
  };
  return { modelo, opcoes, escolher, temPremium: opcoes.length > 1 };
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
  const ehPremium = (id: string | undefined) => !!id && id !== "octa";
  const corPilula = ehPremium(atual?.id)
    ? "text-violet-700 dark:text-violet-300 border-violet-500/45 bg-violet-500/10"
    : "text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/10";

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        title={`Modelo do Octa: ${atual?.nome ?? "Octa"}. Clique para trocar.`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors disabled:opacity-50 ${corPilula}`}
      >
        <span aria-hidden className="text-[12px] leading-none">{ehPremium(atual?.id) ? "✦" : "⬢"}</span>
        {atual?.nome ?? "Octa"}
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
            const prem = ehPremium(m.id);
            return (
              <li key={m.id} role="option" aria-selected={sel}>
                <button
                  type="button"
                  onClick={() => { onChange(m.id); setAberto(false); }}
                  className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors ${sel ? "bg-slate-100 dark:bg-white/10" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                >
                  <span aria-hidden className={`text-[13px] ${prem ? "text-violet-600 dark:text-violet-300" : "text-emerald-600 dark:text-emerald-300"}`}>{prem ? "✦" : "⬢"}</span>
                  <span className="flex-1 text-[12.5px] font-semibold text-slate-900 dark:text-white">
                    {m.nome}
                    {prem && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-400 dark:text-violet-300/60">Max</span>}
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
