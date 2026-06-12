"use client";

/**
 * ExamsGateway — Phase 2 of the liquid-glass-rooms transition.
 *
 * Bidirectional Provas / Knowledge Check gateway shared by all 6 study rooms
 * (each room's exams/page.tsx re-exports this). See
 * docs/superpowers/specs/2026-06-12-provas-gateway-design.md.
 *
 *  • PROFESSOR banner (top): invite keys, publish informe/material/tarefa/prova,
 *    list published docs + submission counts.
 *  • ALUNO body (bottom): take assigned provas → submit (auto-graded closed-form),
 *    see grades, and a self Knowledge Check where every item is a fixed TEXT+AUDIO pair.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Volume2, Loader2, Lock, Send, KeyRound, Upload, GraduationCap } from "lucide-react";
import { GlassPanel, GLASS_ACCENT } from "@/components/ui/GlassPanel";

// ---- shared question shape (teacher docs + generated self-checks) ----
type Question = {
  number: number;
  statement: string;
  options?: string[];
  answer?: string; // present in self-mode; stripped for assigned provas
  type?: "choice" | "input";
};

type TeacherDoc = {
  id: string;
  title: string;
  type: string;
  subject?: string | null;
  status?: string;
  questions?: Question[];
  content?: string;
  dueAt?: string | null;
};

type Submission = {
  id: string;
  documentId: string;
  score: number | null;
  status: string;
  feedback?: string | null;
  document?: { title: string; type: string; subject?: string | null };
  student?: { name?: string | null; email?: string | null };
};

const sectionHeader = "text-[9px] font-black uppercase tracking-[0.16em]";
const normalize = (s: unknown) =>
  String(s ?? "").toLowerCase().replace(/\s/g, "").replace(/,/g, "");

// ---------------------------------------------------------------- AUDIO PAIR
/** The fixed audio half of every Knowledge Check item — calls /api/ai/voice (Piper). */
function AudioButton({ text }: { text: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  const play = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setErr(false);
    try {
      const res = await fetch("/api/ai/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || !data?.audio_base64) throw new Error("voice");
      const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
      await audio.play();
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [text, loading]);

  return (
    <button
      type="button"
      onClick={play}
      title={err ? "Voz indisponível" : "Ouvir"}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
      style={{
        background: err
          ? "rgba(255,255,255,0.08)"
          : "linear-gradient(180deg, rgba(139,92,246,0.5), rgba(34,211,238,0.2))",
        border: "1px solid rgba(255,255,255,0.28)",
      }}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
    </button>
  );
}

// -------------------------------------------------------- QUESTION RUNNER
/** Renders one question with its fixed text+audio pair and captures the answer. */
function QuestionItem({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <GlassPanel variant="inner" className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-2">
        <AudioButton text={q.statement} />
        <p className="text-[13px] font-medium text-white">
          <span style={{ color: GLASS_ACCENT.violet }}>{q.number}. </span>
          {q.statement}
        </p>
      </div>
      {q.type === "choice" && q.options ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(opt)}
              className="rounded-[12px] px-3 py-2 text-left text-[12px] text-white transition-colors"
              style={{
                background: value === opt ? "rgba(139,92,246,0.28)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${value === opt ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.10)"}`,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Sua resposta…"
          className="w-full rounded-[12px] bg-white/5 px-3 py-2 text-[12px] text-white outline-none"
          style={{ border: "1px solid rgba(255,255,255,0.10)" }}
        />
      )}
    </GlassPanel>
  );
}

// =========================================================== MAIN COMPONENT
export default function ExamsGateway() {
  const [role, setRole] = useState<"teacher" | "student" | "loading">("loading");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        const r = s?.user?.role;
        setRole(r === "teacher" || r === "professor" ? "teacher" : "student");
      })
      .catch(() => setRole("student"));
  }, []);

  return (
    <div className="flex w-full flex-col gap-5 p-2 font-sans text-slate-200">
      {role === "teacher" && <TeacherBanner />}
      <StudentBody />
    </div>
  );
}

// --------------------------------------------------------- TEACHER BANNER
function TeacherBanner() {
  const [docs, setDocs] = useState<TeacherDoc[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // publish form
  const [title, setTitle] = useState("");
  const [type, setType] = useState("prova");
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");

  // invite form
  const [iv, setIv] = useState({ subject: "", room: "", location: "", hour: 8, endHour: 10 });

  const loadDocs = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([
        fetch("/api/teacher/documents").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/teacher/submissions").then((r) => (r.ok ? r.json() : [])),
      ]);
      setDocs(Array.isArray(d) ? d : d?.documents ?? []);
      const c: Record<string, number> = {};
      (Array.isArray(s) ? s : []).forEach((sub: Submission) => {
        c[sub.documentId] = (c[sub.documentId] ?? 0) + 1;
      });
      setCounts(c);
    } catch {
      /* offline — leave empty */
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const genInvite = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/teacher/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...iv, days: [1, 3, 5] }),
      });
      const data = await res.json();
      setInviteUrl(res.ok ? data.inviteUrl : data.error || "Erro");
    } finally {
      setBusy(false);
    }
  };

  const publishDoc = async () => {
    if (!title) return;
    setBusy(true);
    try {
      await fetch("/api/teacher/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, subject, questions: [], context }),
      });
      setTitle("");
      setContext("");
      await loadDocs();
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "rounded-[10px] bg-white/5 px-2.5 py-1.5 text-[12px] text-white outline-none";
  const inputStyle = { border: "1px solid rgba(255,255,255,0.10)" } as const;

  return (
    <GlassPanel variant="shell" className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <GraduationCap size={15} style={{ color: GLASS_ACCENT.violet }} />
        <span className={sectionHeader} style={{ color: GLASS_ACCENT.mutedLabel }}>
          Professor · Gateway de Entrada
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* INVITE KEY */}
        <GlassPanel variant="inner" className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-1.5">
            <KeyRound size={12} style={{ color: GLASS_ACCENT.cyan }} />
            <span className={sectionHeader} style={{ color: GLASS_ACCENT.mutedLabel }}>
              Chave de convite
            </span>
          </div>
          <input className={inputCls} style={inputStyle} placeholder="Disciplina" value={iv.subject} onChange={(e) => setIv({ ...iv, subject: e.target.value })} />
          <input className={inputCls} style={inputStyle} placeholder="Sala (cyber, med…)" value={iv.room} onChange={(e) => setIv({ ...iv, room: e.target.value })} />
          <input className={inputCls} style={inputStyle} placeholder="Local / link" value={iv.location} onChange={(e) => setIv({ ...iv, location: e.target.value })} />
          <button onClick={genInvite} disabled={busy} className="mt-1 rounded-[10px] py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-50" style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.5), rgba(34,211,238,0.2))", border: "1px solid rgba(255,255,255,0.28)" }}>
            Gerar chave
          </button>
          {inviteUrl && <p className="break-all text-[10px]" style={{ color: GLASS_ACCENT.cyan }}>{inviteUrl}</p>}
        </GlassPanel>

        {/* PUBLISH */}
        <GlassPanel variant="inner" className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-1.5">
            <Upload size={12} style={{ color: GLASS_ACCENT.cyan }} />
            <span className={sectionHeader} style={{ color: GLASS_ACCENT.mutedLabel }}>Publicar</span>
          </div>
          <input className={inputCls} style={inputStyle} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className={inputCls} style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="informe">Informe</option>
            <option value="material">Material</option>
            <option value="tarefa">Tarefa</option>
            <option value="prova">Prova</option>
          </select>
          <input className={inputCls} style={inputStyle} placeholder="Disciplina" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea className={inputCls} style={inputStyle} placeholder="Descrição / material" rows={2} value={context} onChange={(e) => setContext(e.target.value)} />
          <button onClick={publishDoc} disabled={busy || !title} className="rounded-[10px] py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-50" style={{ background: "rgba(139,92,246,0.28)", border: "1px solid rgba(255,255,255,0.28)" }}>
            Publicar (rascunho)
          </button>
        </GlassPanel>

        {/* PUBLISHED LIST */}
        <GlassPanel variant="inner" className="flex flex-col gap-2 p-3">
          <span className={sectionHeader} style={{ color: GLASS_ACCENT.mutedLabel }}>Publicados</span>
          <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto">
            {docs.length === 0 && <p className="text-[11px]" style={{ color: GLASS_ACCENT.darkerDim }}>Nada publicado ainda.</p>}
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-[10px] bg-white/5 px-2.5 py-1.5" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="truncate text-[11px] text-white">{d.title}</span>
                <span className="ml-2 shrink-0 text-[9px] uppercase" style={{ color: GLASS_ACCENT.cyan }}>
                  {d.type} · {counts[d.id] ?? 0} ✦
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </GlassPanel>
  );
}

// ----------------------------------------------------------- STUDENT BODY
function StudentBody() {
  const [assigned, setAssigned] = useState<TeacherDoc[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [active, setActive] = useState<TeacherDoc | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // self Knowledge Check
  const [topic, setTopic] = useState("");
  const [selfQs, setSelfQs] = useState<Question[]>([]);
  const [selfAnswers, setSelfAnswers] = useState<Record<number, string>>({});
  const [selfScore, setSelfScore] = useState<number | null>(null);
  const [genBusy, setGenBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([
        fetch("/api/student/tasks").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/student/submissions").then((r) => (r.ok ? r.json() : [])),
      ]);
      setAssigned(Array.isArray(a) ? a : []);
      setSubs(Array.isArray(s) ? s : []);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitProva = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const payload = (active.questions ?? []).map((q) => ({ number: q.number, answer: answers[q.number] ?? "" }));
      const res = await fetch("/api/student/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: active.id, answers: payload }),
      });
      const data = await res.json();
      setResult(typeof data?.score === "number" ? data.score : null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const genSelf = async () => {
    setGenBusy(true);
    setSelfScore(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Gere um array JSON de 5 questões sobre "${topic || "Lógica geral"}". Cada item: { "number": number, "type": "choice"|"input", "statement": string, "options": string[] (4 para choice, [] para input), "answer": string }. Retorne APENAS o JSON.`,
          agent: "exam_generator",
        }),
      });
      const data = await res.json();
      let clean = String(data.text ?? "").replace(/```json/g, "").replace(/```/g, "").trim();
      const a = clean.indexOf("["), b = clean.lastIndexOf("]");
      if (a !== -1 && b !== -1) clean = clean.slice(a, b + 1);
      const qs = JSON.parse(clean);
      setSelfQs(Array.isArray(qs) ? qs : []);
      setSelfAnswers({});
    } catch {
      setSelfQs([]);
    } finally {
      setGenBusy(false);
    }
  };

  const gradeSelf = () => {
    if (selfQs.length === 0) return;
    const correct = selfQs.filter((q) => normalize(selfAnswers[q.number]) === normalize(q.answer)).length;
    setSelfScore(Math.round((correct / selfQs.length) * 100));
  };

  // ---- taking an assigned prova ----
  if (active) {
    return (
      <GlassPanel variant="shell" className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <span className={sectionHeader} style={{ color: GLASS_ACCENT.mutedLabel }}>{active.title}</span>
          <button onClick={() => { setActive(null); setAnswers({}); setResult(null); }} className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white">Voltar</button>
        </div>
        {result === null ? (
          <>
            {(active.questions ?? []).map((q) => (
              <QuestionItem key={q.number} q={q} value={answers[q.number] ?? ""} onChange={(v) => setAnswers((p) => ({ ...p, [q.number]: v }))} />
            ))}
            <button onClick={submitProva} disabled={busy} className="inline-flex items-center justify-center gap-2 self-start rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-50" style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.55), rgba(34,211,238,0.22))", border: "1px solid rgba(255,255,255,0.35)" }}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar respostas
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-4xl font-black" style={{ color: GLASS_ACCENT.violet }}>{result}%</span>
            <p className="text-[12px]" style={{ color: GLASS_ACCENT.dimLabel }}>Submissão enviada{result != null ? " e corrigida" : ""}.</p>
          </div>
        )}
      </GlassPanel>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ASSIGNED */}
      <GlassPanel variant="shell" className="flex flex-col gap-3 p-5">
        <span className={sectionHeader} style={{ color: GLASS_ACCENT.mutedLabel }}>Provas e tarefas atribuídas</span>
        {assigned.length === 0 ? (
          <p className="text-[12px]" style={{ color: GLASS_ACCENT.darkerDim }}>Nenhuma prova atribuída pelo professor ainda.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {assigned.map((d) => {
              const sub = subs.find((s) => s.documentId === d.id);
              return (
                <button key={d.id} onClick={() => { if (!sub) { setActive(d); setAnswers({}); setResult(null); } }} className="flex items-center justify-between rounded-[14px] bg-white/5 p-3 text-left transition-colors hover:bg-white/10" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div>
                    <p className="text-[12px] font-medium text-white">{d.title}</p>
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: GLASS_ACCENT.darkerDim }}>{d.type}</p>
                  </div>
                  {sub ? (
                    <span className="text-[12px] font-black" style={{ color: GLASS_ACCENT.cyan }}>{sub.score ?? "✓"}{sub.score != null ? "%" : ""}</span>
                  ) : (
                    <Send size={14} style={{ color: GLASS_ACCENT.violet }} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </GlassPanel>

      {/* SELF KNOWLEDGE CHECK — fixed text+audio pairs */}
      <GlassPanel variant="shell" className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <span className={sectionHeader} style={{ color: GLASS_ACCENT.mutedLabel }}>Knowledge Check</span>
          <span className="text-[9px]" style={{ color: GLASS_ACCENT.darkerDim }}>texto + áudio em cada item</span>
        </div>
        <div className="flex gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Tópico (ex: Cálculo I)" className="flex-1 rounded-[10px] bg-white/5 px-3 py-2 text-[12px] text-white outline-none" style={{ border: "1px solid rgba(255,255,255,0.10)" }} />
          <button onClick={genSelf} disabled={genBusy} className="inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-50" style={{ background: "rgba(139,92,246,0.28)", border: "1px solid rgba(255,255,255,0.28)" }}>
            {genBusy ? <Loader2 size={13} className="animate-spin" /> : "Gerar"}
          </button>
        </div>
        {selfQs.map((q) => (
          <QuestionItem key={q.number} q={q} value={selfAnswers[q.number] ?? ""} onChange={(v) => setSelfAnswers((p) => ({ ...p, [q.number]: v }))} />
        ))}
        {selfQs.length > 0 && (
          selfScore === null ? (
            <button onClick={gradeSelf} className="self-start rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white" style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.55), rgba(34,211,238,0.22))", border: "1px solid rgba(255,255,255,0.35)" }}>Corrigir</button>
          ) : (
            <p className="text-[14px] font-black" style={{ color: GLASS_ACCENT.violet }}>Resultado: {selfScore}%</p>
          )
        )}
      </GlassPanel>

      {/* MY GRADES */}
      {subs.length > 0 && (
        <GlassPanel variant="shell" className="flex flex-col gap-2 p-5">
          <span className={sectionHeader} style={{ color: GLASS_ACCENT.mutedLabel }}>Minhas notas</span>
          {subs.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-[12px] bg-white/5 px-3 py-2" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-[12px] text-white">{s.document?.title ?? "Prova"}</span>
              <span className="text-[12px] font-black" style={{ color: s.status === "graded" ? GLASS_ACCENT.cyan : GLASS_ACCENT.darkerDim }}>
                {s.score != null ? `${s.score}%` : s.status === "graded" ? "—" : "em correção"}
              </span>
            </div>
          ))}
        </GlassPanel>
      )}
    </div>
  );
}
