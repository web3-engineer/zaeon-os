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
import { UserPlus, Copy, Check, X, Loader2 } from "lucide-react";

type Invite = { code: string; usedCount: number; maxUses: number; remaining: number; link: string };

export default function InviteButton() {
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

  return (
    <div className="relative" ref={popRef}>
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

      {open && (
        <div
          className="absolute right-0 top-full z-[200] mt-3 w-[290px] rounded-[18px] p-4"
          style={{
            background: "rgba(15,15,28,0.95)",
            border: "1px solid rgba(139,92,246,0.55)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            boxShadow: "0 16px 48px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "#cfcfe8" }}>
              Convidar para a Zaeon
            </span>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
              <X size={13} />
            </button>
          </div>

          {loading || !data ? (
            <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-white/50">
              <Loader2 size={14} className="animate-spin" /> Carregando…
            </div>
          ) : (
            <>
              <p className="mb-2 text-[11px] leading-relaxed text-white/60">
                Compartilhe seu link. Quem entrar por ele passa por um onboarding rápido.
              </p>

              <div className="mb-2 flex items-center justify-between rounded-[12px] bg-white/5 px-3 py-2" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                <span className="font-mono text-[15px] font-black tracking-widest text-white">{data.code}</span>
                <span className="text-[9px] font-bold uppercase" style={{ color: data.remaining > 0 ? "#22d3ee" : "#f87171" }}>
                  {data.remaining}/{data.maxUses} restantes
                </span>
              </div>

              <button
                onClick={copy}
                disabled={data.remaining <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-[12px] py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-transform hover:scale-[1.02] disabled:opacity-40"
                style={{
                  background: "linear-gradient(180deg, rgba(139,92,246,0.6), rgba(34,211,238,0.25))",
                  border: "1px solid rgba(255,255,255,0.30)",
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Link copiado!" : "Copiar link de convite"}
              </button>

              {data.remaining <= 0 && (
                <p className="mt-2 text-center text-[10px] text-rose-300/80">
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
