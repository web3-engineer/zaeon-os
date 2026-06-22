"use client";

/**
 * Studio da Zaeon — dock de ações dentro do "Meus Estudos". Cada ação transforma
 * o estudo atual numa forma mastigada (podcast 2 vozes, guia, FAQ, flashcards,
 * mapa mental, linha do tempo), mostra o resultado INLINE com a estética Zaeon e
 * deixa salvar na biblioteca / baixar / regerar. Tudo passa por modelo GenAI do Google.
 *
 * Auto-contido: monta com <StudioDock spaceId={spaceId} /> no cabeçalho do feed.
 * Salvar usa o evento zaeon:study:add (já ouvido pelo MeusEstudosFeed).
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Download, RefreshCw, X, Check, Mic, ImageIcon, Film } from "lucide-react";
import {
  GuideView, FaqView, FlashcardsView, MindmapView, TimelineView, PodcastView, ImageView, VideoView,
} from "@/components/studio/StudioArtifactViews";
import { artifactToText } from "@/lib/studio/artifact-text";
import type { TextKind } from "@/lib/studio/transformations";

type DockKind = TextKind | "podcast" | "image" | "video";

interface DockAction {
  kind: TextKind;
  emoji: string;
  label: string;
}

const ACTIONS: DockAction[] = [
  { kind: "guide", emoji: "📘", label: "Guia" },
  { kind: "faq", emoji: "❓", label: "FAQ" },
  { kind: "flashcards", emoji: "🃏", label: "Flashcards" },
  { kind: "mindmap", emoji: "🧠", label: "Mapa mental" },
  { kind: "timeline", emoji: "🕒", label: "Linha do tempo" },
];

interface ArtifactState {
  kind: DockKind;
  title: string;
  meta: any;
  audioUrl?: string;
  dataUrl?: string;
  videoUrl?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function renderView(a: ArtifactState) {
  switch (a.kind) {
    case "guide": return <GuideView data={a.meta} />;
    case "faq": return <FaqView data={a.meta} />;
    case "flashcards": return <FlashcardsView data={a.meta} />;
    case "mindmap": return <MindmapView data={a.meta} />;
    case "timeline": return <TimelineView data={a.meta} />;
    case "podcast": return <PodcastView audioUrl={a.audioUrl || ""} data={a.meta} />;
    case "image": return <ImageView dataUrl={a.dataUrl || ""} prompt={a.meta?.prompt} />;
    case "video": return <VideoView url={a.videoUrl || ""} />;
    default: return null;
  }
}

export default function StudioDock({ spaceId }: { spaceId?: string }) {
  const [busy, setBusy] = useState<DockKind | null>(null);
  const [artifact, setArtifact] = useState<ArtifactState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const cancelPoll = useRef(false);

  useEffect(() => () => { cancelPoll.current = true; }, []);

  // ── geradores de TEXTO (síncronos) ──
  const generateText = async (kind: TextKind, force = false) => {
    if (!spaceId) { setError("Abra um estudo primeiro para usar o Studio."); return; }
    setBusy(kind); setError(null); setSaved(false);
    try {
      const res = await fetch(`/api/studio/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId, force }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.meta) {
        setError(data?.error || "Não consegui gerar agora. Tente de novo.");
      } else {
        setArtifact({ kind, title: data.title || ACTIONS.find((a) => a.kind === kind)?.label || "Artefato", meta: data.meta });
      }
    } catch {
      setError("Falha de rede ao gerar o artefato.");
    } finally {
      setBusy(null);
    }
  };

  // ── podcast (assíncrono: cria → polling → toca) ──
  const generatePodcast = async (force = false) => {
    if (!spaceId) { setError("Abra um estudo primeiro para usar o Studio."); return; }
    setBusy("podcast"); setError(null); setSaved(false); cancelPoll.current = false;
    try {
      const res = await fetch("/api/studio/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId, force }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) { setError(data?.error || "Não consegui iniciar o podcast."); setBusy(null); return; }
      if (data.status === "done") { finishPodcast(data); return; }

      const started = Date.now();
      while (Date.now() - started < 6 * 60 * 1000) {
        await sleep(2500);
        if (cancelPoll.current) return;
        const r = await fetch(`/api/studio/${data.id}`);
        const d = await r.json().catch(() => null);
        if (!d) continue;
        if (d.status === "done") { finishPodcast(d); return; }
        if (d.status === "error") { setError(d.error || "Falha ao gerar o podcast."); setBusy(null); return; }
      }
      setError("O podcast demorou demais. Tente de novo."); setBusy(null);
    } catch {
      setError("Falha de rede ao gerar o podcast."); setBusy(null);
    }
  };

  const finishPodcast = (d: any) => {
    setArtifact({ kind: "podcast", title: d.title || "Podcast", meta: d.meta, audioUrl: `/api/studio/${d.id}/file` });
    setBusy(null);
  };

  // ── imagem (Imagen, síncrono: gera a partir do estudo) ──
  const generateImage = async () => {
    if (!spaceId) { setError("Abra um estudo primeiro para usar o Studio."); return; }
    setBusy("image"); setError(null); setSaved(false);
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
        setArtifact({ kind: "image", title: data.title || "Imagem", meta: data.meta, dataUrl: data.dataUrl });
      }
    } catch {
      setError("Falha de rede ao gerar a imagem.");
    } finally {
      setBusy(null);
    }
  };

  // ── vídeo (assíncrono: cria → polling → toca) ──
  const finishVideo = (d: any) => {
    setArtifact({ kind: "video", title: d.title || "Vídeo", meta: d.meta, videoUrl: `/api/studio/${d.id}/file` });
    setBusy(null);
  };

  const generateVideo = async (force = false) => {
    if (!spaceId) { setError("Abra um estudo primeiro para usar o Studio."); return; }
    setBusy("video"); setError(null); setSaved(false); cancelPoll.current = false;
    try {
      const res = await fetch("/api/studio/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId, force }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) { setError(data?.error || "Não consegui iniciar o vídeo."); setBusy(null); return; }
      if (data.status === "done") { finishVideo(data); return; }

      const started = Date.now();
      while (Date.now() - started < 8 * 60 * 1000) {
        await sleep(3000);
        if (cancelPoll.current) return;
        const r = await fetch(`/api/studio/${data.id}`);
        const d = await r.json().catch(() => null);
        if (!d) continue;
        if (d.status === "done") { finishVideo(d); return; }
        if (d.status === "error") { setError(d.error || "Falha ao gerar o vídeo."); setBusy(null); return; }
      }
      setError("O vídeo demorou demais. Tente de novo."); setBusy(null);
    } catch {
      setError("Falha de rede ao gerar o vídeo."); setBusy(null);
    }
  };

  const regenerate = () => {
    if (!artifact) return;
    if (artifact.kind === "podcast") void generatePodcast(true);
    else if (artifact.kind === "video") void generateVideo(true);
    else if (artifact.kind === "image") void generateImage();
    else void generateText(artifact.kind, true);
  };

  const saveToLibrary = () => {
    if (!artifact) return;
    if (artifact.kind === "podcast") {
      window.dispatchEvent(new CustomEvent("zaeon:study:add", {
        detail: { type: "ref", title: artifact.title, payload: { url: artifact.audioUrl, text: "Podcast gerado pela Zaeon" } },
      }));
    } else if (artifact.kind === "video") {
      window.dispatchEvent(new CustomEvent("zaeon:study:add", {
        detail: { type: "ref", title: artifact.title, payload: { url: artifact.videoUrl, text: "Vídeo gerado pela Zaeon" } },
      }));
    } else if (artifact.kind === "image") {
      window.dispatchEvent(new CustomEvent("zaeon:study:add", {
        detail: { type: "image", title: artifact.title, payload: { dataUrl: artifact.dataUrl } },
      }));
    } else {
      const text = artifactToText(artifact.kind, artifact.meta);
      window.dispatchEvent(new CustomEvent("zaeon:study:add", {
        detail: { type: "note", title: artifact.title, payload: { text, studioKind: artifact.kind } },
      }));
    }
    setSaved(true);
  };

  const download = () => {
    if (!artifact) return;
    if (artifact.kind === "podcast") {
      if (artifact.audioUrl) window.open(`${artifact.audioUrl}?download=1`, "_blank");
      return;
    }
    if (artifact.kind === "video") {
      if (artifact.videoUrl) window.open(`${artifact.videoUrl}?download=1`, "_blank");
      return;
    }
    if (artifact.kind === "image") {
      if (artifact.dataUrl) {
        const a = document.createElement("a");
        a.href = artifact.dataUrl;
        a.download = `${artifact.title.replace(/[^\w.-]+/g, "_").slice(0, 60) || "imagem"}.png`;
        a.click();
      }
      return;
    }
    const text = artifactToText(artifact.kind, artifact.meta);
    const blob = new Blob([text || JSON.stringify(artifact.meta, null, 2)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/[^\w.-]+/g, "_").slice(0, 60) || "artefato"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pill = "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-colors disabled:opacity-50";

  return (
    <div className="mb-3">
      <div className="rounded-2xl p-[1.5px] bg-gradient-to-r from-blue-500/30 via-cyan-400/30 to-violet-500/30">
        <div className="rounded-[15px] bg-white/70 dark:bg-white/[0.05] backdrop-blur-2xl border border-white/70 dark:border-white/10 px-2.5 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-cyan-600/90 dark:text-cyan-300/90 pl-1 pr-1 flex items-center gap-1">
            <span className="animate-[spin_16s_linear_infinite] motion-reduce:animate-none">⟁</span> Studio
          </span>
          {/* Podcast em destaque (carro-chefe) */}
          <button
            onClick={() => generatePodcast()}
            disabled={busy !== null}
            title="Gerar podcast com 2 vozes"
            className={`${pill} text-white border border-transparent`}
            style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }}
          >
            {busy === "podcast" ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />}
            Podcast
          </button>
          <button
            onClick={() => generateImage()}
            disabled={busy !== null}
            title="Gerar imagem didática (Imagen)"
            className={`${pill} text-slate-700 dark:text-white/85 bg-slate-100/80 dark:bg-white/[0.06] hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-200 border border-transparent hover:border-cyan-400/40`}
          >
            {busy === "image" ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
            Imagem
          </button>
          <button
            onClick={() => generateVideo()}
            disabled={busy !== null}
            title="Gerar vídeo-resumo (slides + narração)"
            className={`${pill} text-slate-700 dark:text-white/85 bg-slate-100/80 dark:bg-white/[0.06] hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-200 border border-transparent hover:border-cyan-400/40`}
          >
            {busy === "video" ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}
            Vídeo
          </button>
          {ACTIONS.map((a) => (
            <button
              key={a.kind}
              onClick={() => generateText(a.kind)}
              disabled={busy !== null}
              title={`Gerar ${a.label}`}
              className={`${pill} text-slate-700 dark:text-white/85 bg-slate-100/80 dark:bg-white/[0.06] hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-200 border border-transparent hover:border-cyan-400/40`}
            >
              {busy === a.kind ? <Loader2 size={13} className="animate-spin" /> : <span>{a.emoji}</span>}
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {busy === "podcast" && !artifact && (
        <p className="mt-2 pl-1 text-[12px] text-cyan-600 dark:text-cyan-300 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Gravando o podcast (roteiro + 2 vozes)… isso leva alguns instantes.
        </p>
      )}
      {busy === "video" && !artifact && (
        <p className="mt-2 pl-1 text-[12px] text-cyan-600 dark:text-cyan-300 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Montando o vídeo (roteiro + imagens + narração)… pode levar 1–2 minutos.
        </p>
      )}
      {error && <p className="mt-2 pl-1 text-[12px] text-rose-600 dark:text-rose-300">{error}</p>}

      {artifact && (
        <div className="mt-2.5 rounded-2xl p-[1.5px] bg-gradient-to-r from-blue-500/40 via-cyan-400/40 to-violet-500/40">
          <div className="rounded-[15px] bg-white/85 dark:bg-[#0a1020]/90 backdrop-blur-2xl border border-white/70 dark:border-white/10 p-3.5">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="flex-1 min-w-0 text-[14px] font-black tracking-tight text-[#0b3a66] dark:text-white truncate">{artifact.title}</h3>
              <button onClick={saveToLibrary} title="Salvar na biblioteca"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold transition-colors ${saved ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-200 hover:bg-cyan-500/20"}`}>
                {saved ? <><Check size={12} /> Salvo</> : <><Save size={12} /> Salvar</>}
              </button>
              <button onClick={download} title="Baixar" className="p-1.5 rounded-full text-slate-500 dark:text-white/60 hover:bg-slate-500/10">
                <Download size={14} />
              </button>
              <button onClick={regenerate} disabled={busy !== null} title="Regerar"
                className="p-1.5 rounded-full text-slate-500 dark:text-white/60 hover:bg-slate-500/10 disabled:opacity-40">
                {busy === artifact.kind ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              </button>
              <button onClick={() => setArtifact(null)} title="Fechar" className="p-1.5 rounded-full text-slate-500 dark:text-white/60 hover:bg-slate-500/10">
                <X size={14} />
              </button>
            </div>
            {renderView(artifact)}
          </div>
        </div>
      )}
    </div>
  );
}
