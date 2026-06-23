"use client";
import GlitchReveal from "@/components/research/GlitchReveal";
import SpeakButton from "@/components/voice/SpeakButton";

export default function InsightsModule({ insights }: { insights: any }) {
  if (!insights) return null;
  return (
    <div className="space-y-3 text-sm">
      {/* Insight revelado com glitch → assenta na cor normal. Grande, como o texto do estudo. */}
      <div className="flex items-start gap-2">
        <p className="flex-1 text-slate-700 dark:text-white/80 text-lg md:text-xl leading-relaxed">
          <GlitchReveal text={insights.summary ?? ""} />
        </p>
        <SpeakButton text={insights.summary ?? ""} size={16} title="Ouvir os insights" />
      </div>
      {!!insights.trends?.length && (
        <div><p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">Tendências</p>
          <ul className="list-disc pl-5 text-slate-600 dark:text-white/60 text-base leading-relaxed space-y-1">{insights.trends.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul></div>
      )}
      {!!insights.contradictions?.length && (
        <div><p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Contradições</p>
          <ul className="list-disc pl-5 text-slate-600 dark:text-white/60 text-base leading-relaxed space-y-1">{insights.contradictions.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul></div>
      )}
    </div>
  );
}
