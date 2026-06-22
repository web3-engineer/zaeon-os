"use client";

/**
 * Studio da Zaeon — dock de ações no "Meus Estudos". Cada ação gera uma forma
 * mastigada e a ENCAIXA automaticamente no caderno (bloco colapsável) — o usuário
 * só remove se quiser. (O "Salvar na biblioteca" e o resto das ações ficam no
 * próprio bloco, ver StudioBlock.) Tudo passa por modelo GenAI do Google.
 *
 * Comunicação com o feed via evento window "zaeon:study:embed".
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, ImageIcon, Film } from "lucide-react";
import type { TextKind } from "@/lib/studio/transformations";

type DockKind = TextKind | "podcast" | "image" | "video";

const TEXT_ACTIONS: { kind: TextKind; emoji: string; label: string }[] = [
  { kind: "guide", emoji: "📘", label: "Guia" },
  { kind: "mindmap", emoji: "🧠", label: "Mapa mental" },
  { kind: "timeline", emoji: "🕒", label: "Linha do tempo" },
  { kind: "flashcards", emoji: "🃏", label: "Flashcards" },
  { kind: "faq", emoji: "❓", label: "FAQ" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function embed(detail: any) {
  window.dispatchEvent(new CustomEvent("zaeon:study:embed", { detail }));
}

export default function StudioDock({ spaceId }: { spaceId?: string }) {
  const [busy, setBusy] = useState<DockKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cancelPoll = useRef(false);

  useEffect(() => () => { cancelPoll.current = true; }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  // ── geradores de TEXTO (síncronos) → encaixam no caderno ──
  const generateText = async (kind: TextKind) => {
    if (!spaceId) { setError("Abra um estudo primeiro para usar o Studio."); return; }
    setBusy(kind); setError(null);
    try {
      const res = await fetch(`/api/studio/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId, force: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.meta) {
        setError(data?.error || "Não consegui gerar agora. Tente de novo.");
      } else {
        embed({ studioKind: kind, title: data.title, data: data.meta });
        flash("Encaixado no caderno ✓");
      }
    } catch {
      setError("Falha de rede ao gerar o artefato.");
    } finally {
      setBusy(null);
    }
  };

  // ── imagem (síncrona) ──
  const generateImage = async () => {
    if (!spaceId) { setError("Abra um estudo primeiro para usar o Studio."); return; }
    setBusy("image"); setError(null);
    try {
      const res = await fetch("/api/studio/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.dataUrl) {
        setError(data?.error || "Não consegui gerar a imagem.");
      } else {
        embed({ studioKind: "image", title: data.title || "Imagem", data: data.meta, dataUrl: data.dataUrl });
        flash("Encaixado no caderno ✓");
      }
    } catch {
      setError("Falha de rede ao gerar a imagem.");
    } finally {
      setBusy(null);
    }
  };

  // ── async (podcast/vídeo): cria → polling → encaixa ──
  const generateAsync = async (kind: "podcast" | "video") => {
    if (!spaceId) { setError("Abra um estudo primeiro para usar o Studio."); return; }
    setBusy(kind); setError(null); cancelPoll.current = false;
    const maxMs = kind === "video" ? 12 * 60 * 1000 : 10 * 60 * 1000;
    try {
      const res = await fetch(`/api/studio/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) { setError(data?.error || `Não consegui iniciar o ${kind}.`); setBusy(null); return; }
      const done = (d: any) => { embed({ studioKind: kind, title: d.title, data: d.meta, artifactId: d.id }); flash("Encaixado no caderno ✓"); setBusy(null); };
      if (data.status === "done") { done(data); return; }

      const started = Date.now();
      while (Date.now() - started < maxMs) {
        await sleep(kind === "video" ? 3000 : 2500);
        if (cancelPoll.current) return;
        const r = await fetch(`/api/studio/${data.id}`);
        const d = await r.json().catch(() => null);
        if (!d) continue;
        if (d.status === "done") { done(d); return; }
        if (d.status === "error") { setError(d.error || `Falha ao gerar o ${kind}.`); setBusy(null); return; }
      }
      setError(`O ${kind} demorou demais. Tente de novo.`); setBusy(null);
    } catch {
      setError(`Falha de rede ao gerar o ${kind}.`); setBusy(null);
    }
  };

  const pill = "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-colors disabled:opacity-50";
  const pillText = `${pill} text-slate-700 dark:text-white/85 bg-slate-100/80 dark:bg-white/[0.06] hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-200 border border-transparent hover:border-cyan-400/40`;

  return (
    <div className="mb-3">
      <div className="rounded-2xl p-[1.5px] bg-gradient-to-r from-blue-500/30 via-cyan-400/30 to-violet-500/30">
        <div className="rounded-[15px] bg-white/70 dark:bg-white/[0.05] backdrop-blur-2xl border border-white/70 dark:border-white/10 px-2.5 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-cyan-600/90 dark:text-cyan-300/90 pl-1 pr-1 flex items-center gap-1">
            <span className="animate-[spin_16s_linear_infinite] motion-reduce:animate-none">⟁</span> Studio
          </span>
          {/* 1) Podcast (carro-chefe) */}
          <button onClick={() => generateAsync("podcast")} disabled={busy !== null} title="Gerar podcast com 2 vozes"
            className={`${pill} text-white border border-transparent`} style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }}>
            {busy === "podcast" ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />} Podcast
          </button>
          {/* 2) Guia · Mapa mental · Linha do tempo · Flashcards · FAQ */}
          {TEXT_ACTIONS.map((a) => (
            <button key={a.kind} onClick={() => generateText(a.kind)} disabled={busy !== null} title={`Gerar ${a.label}`} className={pillText}>
              {busy === a.kind ? <Loader2 size={13} className="animate-spin" /> : <span>{a.emoji}</span>} {a.label}
            </button>
          ))}
          {/* 3) Imagem */}
          <button onClick={() => generateImage()} disabled={busy !== null} title="Gerar imagem didática (Imagen)" className={pillText}>
            {busy === "image" ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} Imagem
          </button>
          {/* 4) Vídeo */}
          <button onClick={() => generateAsync("video")} disabled={busy !== null} title="Gerar vídeo-resumo (slides + narração)" className={pillText}>
            {busy === "video" ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />} Vídeo
          </button>
        </div>
      </div>

      {busy === "podcast" && (
        <p className="mt-2 pl-1 text-[12px] text-cyan-600 dark:text-cyan-300 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Gravando o podcast (roteiro + 2 vozes)… alguns instantes.
        </p>
      )}
      {busy === "video" && (
        <p className="mt-2 pl-1 text-[12px] text-cyan-600 dark:text-cyan-300 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Montando o vídeo (roteiro + imagens + narração)… pode levar 1–2 minutos.
        </p>
      )}
      {notice && <p className="mt-2 pl-1 text-[12px] text-emerald-600 dark:text-emerald-300">{notice}</p>}
      {error && <p className="mt-2 pl-1 text-[12px] text-rose-600 dark:text-rose-300">{error}</p>}
    </div>
  );
}
