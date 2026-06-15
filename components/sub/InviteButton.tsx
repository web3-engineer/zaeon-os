"use client";

/**
 * InviteButton — convite no menu para o usuário logado.
 *
 * Aparece no navbar só quando há sessão. Ao clicar, busca/gera o código pessoal
 * (`/api/convite/meu-codigo`, 3 usos) e mostra o código + link de compartilhar
 * (`/convite?code=XXXX`) + quantos usos restam. Quem recebe o link cai no
 * onboarding (`/convite` → `/onboard`).
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { UserPlus, Copy, Check, X, Loader2, ChevronRight } from "lucide-react";

type Invite = { code: string; usedCount: number; maxUses: number; remaining: number; link: string };

/** variant "pill" = botão da navbar (legado) · "menu" = item no estilo do menu inicial. */
export default function InviteButton({ variant = "pill" }: { variant?: "pill" | "menu" }) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/convite/meu-codigo");
      if (res.ok) setData(await res.json());
    } catch {
      /* offline */
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !data) load();
  };

  // fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const shareUrl = data
    ? (typeof window !== "undefined" ? window.location.origin : "") + data.link
    : "";

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard bloqueado */
    }
  };

  if (status !== "authenticated") return null;

  const isMenu = variant === "menu";

  return (
    <div className={isMenu ? "relative w-full" : "relative"} ref={popRef}>
      {isMenu ? (
        <button
          onClick={toggle}
          title="Convidar pessoas"
          className="group relative overflow-hidden flex items-center justify-between rounded-2xl px-4 min-h-[52px] w-full transition-all duration-300 cursor-pointer font-medium text-slate-800 dark:text-white bg-white/50 hover:bg-white/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/5 hover:border-cyan-400/50 dark:hover:border-cyan-400/30"
        >
          <span className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-cyan-500/80" />
          <span className="flex items-center gap-3 pl-2">
            <UserPlus size={16} className="text-cyan-600 dark:text-cyan-300" />
            <span className="text-sm tracking-tight">Convidar amigos</span>
          </span>
          <ChevronRight size={15} className="opacity-30 group-hover:opacity-100 transition-opacity" />
        </button>
      ) : (
        <button
          onClick={toggle}
          title="Convidar pessoas"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-transform hover:scale-105"
          style={{
            background: "linear-gradient(180deg, #8b5cf6, #7c3aed)",
            boxShadow: "0 6px 16px -6px rgba(139,92,246,0.8)",
          }}
        >
          <UserPlus size={13} />
          <span className="hidden sm:inline">Convidar</span>
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full z-[200] mt-3 w-[290px] rounded-[18px] p-4 border backdrop-blur-2xl shadow-2xl bg-white border-slate-200 dark:bg-[#0f0f1c]/95 dark:border-cyan-500/40">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 dark:text-[#cfcfe8]">
              Convidar para a Zaeon
            </span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white">
              <X size={13} />
            </button>
          </div>

          {loading || !data ? (
            <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-slate-500 dark:text-white/50">
              <Loader2 size={14} className="animate-spin" /> Carregando…
            </div>
          ) : (
            <>
              <p className="mb-2 text-[11px] leading-relaxed text-slate-500 dark:text-white/60">
                Compartilhe seu link. Quem entrar por ele passa por um onboarding rápido.
              </p>

              <div className="mb-2 flex items-center justify-between rounded-[12px] px-3 py-2 bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10">
                <span className="font-mono text-[15px] font-black tracking-widest text-slate-900 dark:text-white">{data.code}</span>
                <span className="text-[9px] font-bold uppercase" style={{ color: data.remaining > 0 ? "#0891b2" : "#f87171" }}>
                  {data.remaining}/{data.maxUses} restantes
                </span>
              </div>

              <button
                onClick={copy}
                disabled={data.remaining <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-[12px] py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-transform hover:scale-[1.02] disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#0ea5e9,#22d3ee)" }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Link copiado!" : "Copiar link de convite"}
              </button>

              {data.remaining <= 0 && (
                <p className="mt-2 text-center text-[10px] text-rose-500 dark:text-rose-300/80">
                  Seu código já atingiu o limite de usos.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
