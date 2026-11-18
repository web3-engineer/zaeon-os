"use client";

/**
 * StudioPalette — o ⟁ Studio no co-working como um PALETADOR DE PROMPT.
 *
 * Em vez de disparar a geração direto (que precisa de um estudo com conteúdo),
 * clicar numa função injeta no composer o prompt geral daquela função — ex.:
 * "Gere um podcast sobre ". O usuário completa o tema e envia; a Aura conduz.
 * (Na Fase 2 isso vira function-calling de verdade: a Aura chama a função.)
 */

import { BookOpen, Network, Clock, Layers, HelpCircle, Image as ImageIcon, Mic, Video } from "lucide-react";

type Fn = { kind: string; label: string; icon: React.ComponentType<any>; template: string };

/** #837: também no "+" da caixa de escrever do celular */
export const FUNCTIONS: Fn[] = [
  { kind: "guia",       label: "Guia",         icon: BookOpen,   template: "Crie um guia de estudo sobre " },
  { kind: "mapa",       label: "Mapa mental",  icon: Network,    template: "Gere um mapa mental sobre " },
  { kind: "timeline",   label: "Linha do tempo", icon: Clock,    template: "Monte uma linha do tempo sobre " },
  { kind: "flashcards", label: "Flashcards",   icon: Layers,     template: "Crie flashcards sobre " },
  { kind: "faq",        label: "FAQ",          icon: HelpCircle, template: "Gere um FAQ sobre " },
  { kind: "image",      label: "Imagem",       icon: ImageIcon,  template: "Gere uma imagem de " },
  { kind: "podcast",    label: "Podcast",      icon: Mic,        template: "Gere um podcast sobre " },
  { kind: "video",      label: "Vídeo",        icon: Video,      template: "Gere um vídeo sobre " },
];

export default function StudioPalette({ onPick }: { onPick: (template: string) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl p-3">
      <div className="flex items-center gap-1.5 pb-2 mb-1 border-b border-slate-200/70 dark:border-white/10">
        <span className="text-cyan-600 dark:text-cyan-300 text-[13px] leading-none" style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.5))" }}>⟁</span>
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/50 font-tech">Studio</span>
        <span className="text-[11px] font-tech text-slate-400 dark:text-white/35">— escolha e complete o tema</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FUNCTIONS.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.kind}
              type="button"
              onClick={() => onPick(f.template)}
              title={`${f.template}…`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12.5px] font-medium font-tech
                text-slate-700 dark:text-white/85 bg-slate-100/80 dark:bg-white/[0.06]
                border border-transparent hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-200
                transition-colors"
            >
              <Icon size={13} /> {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
