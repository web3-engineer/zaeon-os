"use client";

/**
 * MentorPill — a pill "⟁ Aura" do chat vira SELETOR: Aura (base) + os mentores que o usuário
 * plugou na Plugin Store. Chave = SLUG ("farmacia"). Selecionar → POST /api/mentors/activate
 * { slug } (persistido no perfil) e o chat passa a mandar `mentor:<slug>` a cada envio (via
 * onChange). Carrega de /api/mentors/plugged ao montar e quando a loja dispara
 * "zaeon:mentors:changed". Sem mentores plugados = pill "⟁ Aura" com atalho pra loja.
 */
import { lojaHref } from "@/lib/mentores/rota";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

type Plugged = { id: string; slug: string; name: string; course: string; emoji?: string };

export default function MentorPill({
  value,
  onChange,
  emLista = false,
}: {
  value: string | null;                                              // slug ativo ou null (Aura)
  onChange: (slug: string | null, mentor?: Plugged | null) => void;
  /** #845: dentro do painel do celular, as opções abrem NA LISTA (embaixo do botão), não numa janelinha por cima —
   *  a janelinha era cortada pela borda do painel */
  emLista?: boolean;
}) {
  const [mentors, setMentors] = useState<Plugged[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/mentors/plugged");
      if (!r.ok) return;
      const d = await r.json();
      const list: Plugged[] = Array.isArray(d?.mentors) ? d.mentors : [];
      setMentors(list);
      const active = d?.activeMentor && list.some((m) => m.slug === d.activeMentor) ? String(d.activeMentor) : null;
      onChange(active, list.find((m) => m.slug === active) ?? null);
    } catch { /* offline: fica como Aura */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
    const h = () => void load();
    window.addEventListener("zaeon:mentors:changed", h);
    return () => window.removeEventListener("zaeon:mentors:changed", h);
  }, [load]);

  // fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  const select = useCallback(async (slug: string | null) => {
    setOpen(false);
    if (slug === value) return;
    setBusy(true);
    try {
      const r = await fetch("/api/mentors/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
      if (r.ok) onChange(slug, mentors.find((m) => m.slug === slug) ?? null);
    } catch { /* mantém o atual */ } finally { setBusy(false); }
  }, [value, mentors, onChange]);

  const current = mentors.find((m) => m.slug === value) ?? null;
  const label = current ? `${current.name} · ${current.course}` : "Aura";

  return (
    <div ref={wrapRef} className={emLista ? "relative flex w-full flex-col items-start" : "relative inline-flex items-center px-1 pb-1.5"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={current ? `Mentor ativo: ${current.name} (${current.course}). Clique p/ trocar.` : "Aura (base). Clique p/ escolher um mentor plugado."}
        className={`inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full text-[11.5px] font-tech border transition-colors
          ${current
            ? "text-violet-700 dark:text-violet-200 bg-violet-500/10 border-violet-400/35 hover:bg-violet-500/20"
            : "text-cyan-700 dark:text-cyan-200 bg-cyan-500/10 border-cyan-400/30 hover:bg-cyan-500/20"}`}
      >
        <span style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.5))" }}>⟁</span>
        <span className="max-w-[220px] truncate">{label}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className={`${emLista ? "static mt-1.5 w-full" : "absolute left-1 bottom-full mb-1.5 z-30 min-w-[260px]"} p-1.5 rounded-2xl border border-white/60 dark:border-white/10 bg-white/90 dark:bg-[#0b1020]/95 backdrop-blur-2xl shadow-[0_18px_50px_-20px_rgba(37,99,235,0.45)]`}
        >
          <Option active={value === null} onClick={() => select(null)} emoji="⟁" title="Aura" sub="base · todas as áreas" />
          {mentors.map((m) => (
            <Option key={m.slug} active={value === m.slug} onClick={() => select(m.slug)} emoji={m.emoji || "⟁"} title={m.name} sub={m.course} />
          ))}
          <a
            href={lojaHref("/research-lab?tab=sala-de-estudos")}
            className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-slate-500 dark:text-white/50 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
          >
            <Plus size={13} /> {mentors.length ? "Plugar outro mentor" : "Plugar um mentor na loja"}
          </a>
        </div>
      )}
    </div>
  );
}

function Option({ active, onClick, emoji, title, sub }: { active: boolean; onClick: () => void; emoji: string; title: string; sub: string }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors
        ${active ? "bg-violet-500/15 text-violet-700 dark:text-violet-200" : "hover:bg-slate-500/10 text-slate-700 dark:text-white/85"}`}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="flex flex-col min-w-0">
        <span className="text-[13px] font-medium truncate font-tech">{title}</span>
        <span className="text-[11px] text-slate-500 dark:text-white/45 truncate">{sub}</span>
      </span>
      {active && <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-violet-500">ativo</span>}
    </button>
  );
}
