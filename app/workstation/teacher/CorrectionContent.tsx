"use client";

/**
 * CorrectionContent — tela de CORREÇÃO do professor.
 *
 * Lista as entregas dos alunos (ExamSubmission), abre uma, mostra as respostas, e
 * permite corrigir manualmente OU pedir uma SUGESTÃO à IA (/api/teacher/grade).
 * A IA só sugere; o professor confirma a nota/feedback (PATCH /api/teacher/submissions
 * grava score/feedback e gradedBy = professor). Visual liquid glass, claro/escuro.
 */

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck, Loader2, Sparkles, Check, ArrowLeft, User2, FileText,
} from "lucide-react";

interface Sub {
  id: string; documentId: string; studentId: string; answers: any; score: number | null;
  status: string; feedback: string | null; gradedBy: string | null;
  document?: { title?: string; type?: string; subject?: string };
  student?: { name?: string; email?: string; image?: string };
}

export default function CorrectionContent() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [active, setActive] = useState<Sub | null>(null);

  // estado da correção em edição
  const [score, setScore] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotes, setAiNotes] = useState<any[] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/teacher/submissions?t=${Date.now()}`);
      setSubs(r.ok ? await r.json() : []);
    } catch { setSubs([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (s: Sub) => {
    setActive(s);
    setScore(s.score != null ? String(s.score) : "");
    setFeedback(s.feedback || "");
    setAiNotes(null);
  };

  const suggest = async () => {
    if (!active) return;
    setAiBusy(true); setAiNotes(null);
    try {
      const r = await fetch("/api/teacher/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: active.id }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.suggestion) {
        setScore(String(d.suggestion.score ?? ""));
        setFeedback(d.suggestion.feedback || "");
        setAiNotes(Array.isArray(d.suggestion.perQuestion) ? d.suggestion.perQuestion : []);
      }
    } finally { setAiBusy(false); }
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const body: any = { submissionId: active.id, feedback };
      const n = parseInt(score, 10);
      if (!Number.isNaN(n)) body.score = Math.max(0, Math.min(100, n));
      const r = await fetch("/api/teacher/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) {
        const updated = await r.json();
        setSubs((prev) => prev.map((x) => (x.id === active.id ? { ...x, ...updated } : x)));
        setActive(null);
      }
    } finally { setSaving(false); }
  };

  const list = subs.filter((s) => (filter === "pending" ? s.status !== "graded" : true));
  const answers: any[] = active && Array.isArray(active.answers) ? active.answers : [];

  // ── DETALHE de uma entrega ──────────────────────────────────────────────
  if (active) {
    return (
      <div className="p-6 sm:p-8 max-w-3xl mx-auto">
        <button onClick={() => setActive(null)} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500 dark:text-white/45 hover:text-cyan-600 dark:hover:text-cyan-300 mb-4">
          <ArrowLeft size={14} /> Voltar
        </button>

        <div className="flex items-center gap-3 mb-5">
          <span className="w-11 h-11 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-300 shrink-0"><FileText size={20} /></span>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-slate-900 dark:text-white truncate">{active.document?.title || "Atividade"}</h1>
            <p className="text-[12px] text-slate-500 dark:text-white/45 flex items-center gap-1.5"><User2 size={12} /> {active.student?.name || "Aluno"} · {active.document?.type || "tarefa"}</p>
          </div>
        </div>

        {/* respostas do aluno */}
        <div className="rounded-2xl border bg-white/70 border-slate-200 shadow-sm dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none p-4 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/40 mb-3">Respostas do aluno</p>
          {answers.length === 0 ? (
            <p className="text-[12px] text-slate-400 italic">Sem respostas registradas.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {answers.map((a: any, i: number) => {
                const note = aiNotes?.find((n: any) => n.number === a.number);
                return (
                  <div key={i} className="text-[13px]">
                    <p className="font-bold text-slate-700 dark:text-white/85">Questão {a.number}</p>
                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{String(a.answer ?? "(em branco)")}</p>
                    {note && (
                      <p className={`mt-1 text-[11px] inline-flex items-start gap-1 ${note.correct === true ? "text-emerald-600 dark:text-emerald-400" : note.correct === false ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-white/40"}`}>
                        <Sparkles size={11} className="mt-0.5 shrink-0" /> {note.comment}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* nota + feedback */}
        <div className="rounded-2xl border bg-white/70 border-slate-200 shadow-sm dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/40">Correção</p>
            <button onClick={suggest} disabled={aiBusy} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white px-3 py-1.5 rounded-full disabled:opacity-50" style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}>
              {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Sugerir com IA
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-[12px] font-bold text-slate-600 dark:text-white/70">Nota</label>
            <input value={score} onChange={(e) => setScore(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="0-100"
              className="w-20 rounded-xl px-2.5 py-1.5 text-[13px] text-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-cyan-400/40" />
            <span className="text-[11px] text-slate-400">/ 100</span>
          </div>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="Feedback para o aluno…"
            className="w-full resize-none rounded-xl px-3 py-2.5 text-[13px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400/40" />
          {aiNotes && <p className="mt-2 text-[10px] text-slate-400 dark:text-white/35">Sugestão da IA preenchida — revise antes de salvar. A nota final é sua.</p>}
          <button onClick={save} disabled={saving} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ background: "linear-gradient(135deg,#0ea5e9,#22d3ee)" }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar correção
          </button>
        </div>
      </div>
    );
  }

  // ── LISTA de entregas ───────────────────────────────────────────────────
  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-1.5 text-violet-700 dark:text-violet-300 text-[11px] font-black uppercase tracking-[0.18em]">
        <ClipboardCheck size={14} /> Correção
      </div>
      <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-4">Atividades dos alunos</h1>

      <div className="flex items-center gap-1.5 mb-4">
        {([["pending", "Pendentes"], ["all", "Todas"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${filter === id ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-400/30" : "text-slate-500 dark:text-white/45 border border-slate-200 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : list.length === 0 ? (
        <p className="text-[13px] text-slate-400 dark:text-white/35 py-12 text-center flex flex-col items-center gap-2">
          <Sparkles size={20} className="opacity-50" /> {filter === "pending" ? "Nada para corrigir agora." : "Nenhuma entrega ainda."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((s) => (
            <button key={s.id} onClick={() => open(s)}
              className="text-left flex items-center gap-3 rounded-2xl p-3.5 border bg-white/70 border-slate-200 shadow-sm hover:border-cyan-400/50 transition-all dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none">
              <span className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-300 shrink-0"><FileText size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{s.document?.title || "Atividade"}</p>
                <p className="text-[11px] text-slate-400 dark:text-white/35 truncate">{s.student?.name || "Aluno"} · {s.document?.type || "tarefa"}</p>
              </div>
              {s.status === "graded" ? (
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">{s.score ?? "✓"}{s.score != null ? "/100" : ""}</span>
              ) : (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">pendente</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
