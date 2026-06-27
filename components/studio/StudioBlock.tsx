"use client";

/**
 * Bloco do Studio encaixado no caderno (ou em preview na biblioteca): cartão
 * COLAPSÁVEL que renderiza inline o artefato (mapa, flashcards, podcast, vídeo…),
 * reaproveitando as views de StudioArtifactViews. Ações: abrir/fechar, salvar na
 * biblioteca, baixar, remover.
 */
import { ChevronDown, ChevronRight, Save, Download, Trash2, Check, Volume2, Square } from "lucide-react";
import {
  GuideView, FaqView, FlashcardsView, MindmapView, TimelineView, PodcastView, ImageView, VideoView,
} from "@/components/studio/StudioArtifactViews";
import { artifactToText } from "@/lib/studio/artifact-text";
import type { TextKind } from "@/lib/studio/transformations";
import useTTS from "@/lib/voice/useTTS";

export interface StudioBlockData {
  studioKind: string;
  title: string;
  data: any;
  artifactId?: string; // p/ podcast/vídeo (arquivo via /api/studio/[id]/file)
  dataUrl?: string; // p/ imagem (base64)
}

const KIND_META: Record<string, { emoji: string; label: string }> = {
  guide: { emoji: "📘", label: "Guia" },
  faq: { emoji: "❓", label: "FAQ" },
  flashcards: { emoji: "🃏", label: "Flashcards" },
  mindmap: { emoji: "🧠", label: "Mapa mental" },
  timeline: { emoji: "🕒", label: "Linha do tempo" },
  podcast: { emoji: "🎙️", label: "Podcast" },
  image: { emoji: "🖼️", label: "Imagem" },
  video: { emoji: "🎬", label: "Vídeo" },
};

const TEXT_KINDS = new Set(["guide", "faq", "flashcards", "mindmap", "timeline"]);

function renderView(b: StudioBlockData) {
  const fileUrl = b.artifactId ? `/api/studio/${b.artifactId}/file` : "";
  switch (b.studioKind) {
    case "guide": return <GuideView data={b.data} />;
    case "faq": return <FaqView data={b.data} />;
    case "flashcards": return <FlashcardsView data={b.data} />;
    case "mindmap": return <MindmapView data={b.data} />;
    case "timeline": return <TimelineView data={b.data} />;
    case "podcast": return <PodcastView audioUrl={fileUrl} data={b.data} />;
    case "video": return <VideoView url={fileUrl} />;
    case "image": return <ImageView dataUrl={b.dataUrl || ""} prompt={b.data?.prompt} />;
    default: return <div className="text-[12px] text-slate-400">Conteúdo indisponível.</div>;
  }
}

function safeName(t: string): string {
  return (t || "artefato").replace(/[^\w.-]+/g, "_").slice(0, 60) || "artefato";
}

export default function StudioBlock({
  block,
  collapsed,
  saved,
  onToggle,
  onRemove,
  onSaveLibrary,
}: {
  block: StudioBlockData;
  collapsed: boolean;
  saved?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  onSaveLibrary?: () => void;
}) {
  const meta = KIND_META[block.studioKind] || { emoji: "⟁", label: "Studio" };
  const tts = useTTS();
  const canSpeak = TEXT_KINDS.has(block.studioKind); // só blocos de texto têm leitura por voz

  // Ouvir o bloco com a MESMA voz do app (ttsController). Clica de novo = parar.
  const speakBlock = () => {
    if (tts.speaking) { tts.stop(); return; }
    const text = artifactToText(block.studioKind as TextKind, block.data) || "";
    if (!text.trim()) return;
    let voice: string | undefined; let gender: "f" | "m" | undefined;
    try {
      voice = localStorage.getItem("zaeon.voice.id") || undefined;
      gender = (localStorage.getItem("zaeon.voice.gender") as "f" | "m") || undefined;
    } catch { /* ignore */ }
    tts.speak(text, { voice, gender });
  };

  const download = () => {
    const k = block.studioKind;
    if (k === "podcast" || k === "video") {
      if (block.artifactId) window.open(`/api/studio/${block.artifactId}/file?download=1`, "_blank");
      return;
    }
    if (k === "image") {
      if (block.dataUrl) {
        const a = document.createElement("a");
        a.href = block.dataUrl;
        a.download = `${safeName(block.title)}.png`;
        a.click();
      }
      return;
    }
    if (TEXT_KINDS.has(k)) {
      const text = artifactToText(k as TextKind, block.data) || JSON.stringify(block.data, null, 2);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName(block.title)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="my-3 rounded-2xl p-[1.5px] bg-gradient-to-r from-blue-500/30 via-cyan-400/30 to-violet-500/30">
      <div className="rounded-[15px] bg-white/85 dark:bg-[#0a1020]/90 backdrop-blur-2xl border border-white/70 dark:border-white/10">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <button onClick={onToggle} className="flex items-center gap-1.5 flex-1 min-w-0 text-left" title={collapsed ? "Abrir" : "Fechar"}>
            {collapsed ? <ChevronRight size={15} className="text-cyan-500 shrink-0" /> : <ChevronDown size={15} className="text-cyan-500 shrink-0" />}
            <span className="shrink-0">{meta.emoji}</span>
            <span className="truncate text-[13px] font-black tracking-tight text-[#0b3a66] dark:text-white">{block.title || meta.label}</span>
          </button>
          {canSpeak && (
            <button onClick={speakBlock} title={tts.speaking ? "Parar a leitura" : "Ouvir"}
              className={`p-1.5 rounded-full transition-colors ${tts.speaking ? "text-cyan-500" : "text-slate-400 dark:text-white/50 hover:bg-slate-500/10 hover:text-cyan-500"}`}>
              {tts.speaking ? <Square size={14} /> : <Volume2 size={14} />}
            </button>
          )}
          {onSaveLibrary && (
            <button onClick={onSaveLibrary} title="Salvar na biblioteca"
              className={`p-1.5 rounded-full transition-colors ${saved ? "text-emerald-500" : "text-slate-400 dark:text-white/50 hover:bg-slate-500/10 hover:text-cyan-500"}`}>
              {saved ? <Check size={14} /> : <Save size={14} />}
            </button>
          )}
          <button onClick={download} title="Baixar" className="p-1.5 rounded-full text-slate-400 dark:text-white/50 hover:bg-slate-500/10 hover:text-cyan-500">
            <Download size={14} />
          </button>
          {onRemove && (
            <button onClick={onRemove} title="Remover do caderno" className="p-1.5 rounded-full text-slate-400 dark:text-white/50 hover:bg-slate-500/10 hover:text-rose-400">
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {!collapsed && <div className="px-3 pb-3">{renderView(block)}</div>}
      </div>
    </div>
  );
}
