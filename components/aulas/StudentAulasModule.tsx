"use client";

/**
 * Fase 3 — Módulo de aulas do ALUNO (a antiga "Livraria", sem nome).
 *
 * Lista as aulas ENVIADAS das turmas do aluno (nova = em destaque). Abrir → rola e
 * abre o módulo embaixo com: conteúdo (markdown), vídeo YouTube indexado, quiz por
 * texto OU por voz (grava na voz do aluno → audioUrl + transcript) e nota final.
 * Concluir → marca concluída (AulaProgress). Tempo de leitura medido em modo foco.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Loader2, CheckCircle2, Sparkles, Mic, Square, GraduationCap, Volume2, Dices, Trash2, X } from "lucide-react";
import MiniMarkdown from "./MiniMarkdown";
import { useVoiceAnswer } from "./useVoiceAnswer";
import { speak as ttsSpeak } from "@/lib/voice/ttsController";
import type { Aula, QuizMeta, Question, Progress, SubmitResult } from "./types";

type Detail = { aula: Aula; quiz: QuizMeta | null; questions: Question[]; progress: Progress };
type AnswerState = { answer?: string; choiceIndex?: number; transcript?: string; audioUrl?: string; picks?: { index: number; choiceIndex?: number; answer?: string }[] };

export default function StudentAulasModule() {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [progressByAula, setProgressByAula] = useState<Record<string, string>>({});
  const [role, setRole] = useState<string>("");          // "teacher" | "student" (de /api/aulas)
  const [confirmDel, setConfirmDel] = useState<string | null>(null); // id em confirmação de apagar
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const openRef = useRef<HTMLDivElement | null>(null);
  const readStartRef = useRef<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/aulas");
      if (r.ok) {
        const d = await r.json();
        const list: Aula[] = Array.isArray(d.aulas) ? d.aulas : [];
        setAulas(list);
        setRole(typeof d.role === "string" ? d.role : "");
        const seed: Record<string, string> = {};
        for (const a of list) seed[a.id] = (a as any).progressStatus || "new";
        setProgressByAula(seed);
        // Fase 4: avisa o chat se há aula(s) nova(s).
        const newCount = list.filter((a) => ((a as any).progressStatus || "new") === "new").length;
        if (newCount > 0) { try { window.dispatchEvent(new CustomEvent("zaeon:aula:notice", { detail: { count: newCount } })); } catch { /* ignore */ } }
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // envia o tempo de leitura acumulado (modo foco) ao servidor
  const flushReading = useCallback((aulaId: string, status: "in_progress" | "completed" = "in_progress") => {
    const ms = readStartRef.current ? Date.now() - readStartRef.current : 0;
    readStartRef.current = 0;
    if (!aulaId) return;
    try {
      navigator.sendBeacon?.(`/api/aulas/${aulaId}/progress`, new Blob([JSON.stringify({ addMs: ms, status })], { type: "application/json" }));
    } catch { /* ignore */ }
    void fetch(`/api/aulas/${aulaId}/progress`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addMs: ms, status }) }).catch(() => {});
  }, []);

  const open = useCallback(async (id: string) => {
    if (openId && openId !== id) flushReading(openId);
    setOpenId(id); setDetail(null); setResult(null); setAnswers({});
    try {
      const r = await fetch(`/api/aulas/${id}`);
      if (r.ok) {
        const d: Detail = await r.json();
        setDetail(d);
        setProgressByAula((p) => ({ ...p, [id]: d.progress?.status === "completed" ? "completed" : "in_progress" }));
        readStartRef.current = Date.now();
        // marca em andamento já na abertura
        void fetch(`/api/aulas/${id}/progress`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "in_progress" }) }).catch(() => {});
        setTimeout(() => openRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      }
    } catch { /* ignore */ }
  }, [openId, flushReading]);

  // ao desmontar / trocar de aba, contabiliza leitura
  useEffect(() => () => { if (openId) flushReading(openId); }, [openId, flushReading]);

  // Fase 4: o agente do chat pode mandar abrir uma aula por tema.
  useEffect(() => {
    const onOpen = (e: any) => {
      const topic = String(e?.detail?.topic || "").toLowerCase().trim();
      if (!topic) { openRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      const match = aulas.find((a) => a.title.toLowerCase().includes(topic));
      if (match) void open(match.id);
    };
    window.addEventListener("zaeon:aula:open", onOpen);
    return () => window.removeEventListener("zaeon:aula:open", onOpen);
  }, [aulas, open]);

  const setAns = (qid: string, patch: AnswerState) => setAnswers((a) => ({ ...a, [qid]: { ...a[qid], ...patch } }));

  const submit = useCallback(async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const payload = { answers: detail.questions.map((q) => ({ questionId: q.id, ...(answers[q.id] || {}) })) };
      const r = await fetch(`/api/aulas/${detail.aula.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const res: SubmitResult = await r.json();
        setResult(res);
        const status = res.passed ? "completed" : "in_progress";
        setProgressByAula((p) => ({ ...p, [detail.aula.id]: status }));
        flushReading(detail.aula.id, res.passed ? "completed" : "in_progress");
        readStartRef.current = Date.now();
      }
    } catch { /* ignore */ } finally { setSubmitting(false); }
  }, [detail, answers, flushReading]);

  const isNew = (a: Aula) => (progressByAula[a.id] ?? "new") === "new";

  // Apagar aula (só professor dono — DELETE já é teacher-only no backend). Confirm leve.
  const removeAula = async (id: string) => {
    try {
      const r = await fetch(`/api/aulas/${id}`, { method: "DELETE" });
      if (r.ok) {
        setAulas((prev) => prev.filter((a) => a.id !== id));
        if (openId === id) { setOpenId(null); setDetail(null); }
      }
    } catch { /* ignore */ }
    setConfirmDel(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap size={18} className="text-cyan-300" />
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white/70">Minhas aulas</h3>
        {loading && <Loader2 size={14} className="animate-spin text-white/40" />}
      </div>

      {!loading && aulas.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-white/50 text-sm">
          Nenhuma aula ainda. Quando um professor te enviar uma aula, ela aparece aqui.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {aulas.map((a) => {
          const fresh = isNew(a);
          const done = progressByAula[a.id] === "completed";
          return (
            <div key={a.id}
              className={`group relative rounded-2xl border p-3.5 transition-all ${openId === a.id ? "border-cyan-400/60 bg-cyan-500/10" : fresh ? "border-cyan-400/40 bg-cyan-500/[0.06] shadow-[0_0_18px_-6px_rgba(34,211,238,0.5)]" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
              <button onClick={() => open(a.id)} className="w-full text-left flex items-center gap-2">
                <BookOpen size={15} className={fresh ? "text-cyan-300" : "text-white/50"} />
                <span className="flex-1 min-w-0 truncate text-[13.5px] font-bold text-white/90">{a.title}</span>
                {done ? <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-emerald-300"><CheckCircle2 size={12} /> concluída</span>
                  : fresh ? <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-cyan-300"><Sparkles size={11} /> nova</span>
                  : <span className="text-[10px] font-black uppercase tracking-wide text-amber-300/80">em andamento</span>}
              </button>
              {/* Apagar (só professor): ícone no hover → confirm leve inline. */}
              {role === "teacher" && (
                confirmDel === a.id ? (
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-[#0b1220] border border-rose-400/40 px-1.5 py-0.5">
                    <span className="text-[10px] text-white/70 px-1">Apagar?</span>
                    <button onClick={() => removeAula(a.id)} className="text-rose-300 hover:text-rose-200 px-1 text-[11px] font-black">Sim</button>
                    <button onClick={() => setConfirmDel(null)} className="text-white/50 hover:text-white/80"><X size={12} /></button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDel(a.id)} title="Apagar aula"
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-rose-400"><Trash2 size={13} /></button>
                )
              )}
            </div>
          );
        })}
      </div>

      {openId && (
        <div ref={openRef} className="mt-5 rounded-3xl border border-white/12 bg-[#0a0f1c]/80 backdrop-blur-xl overflow-hidden">
          {!detail ? (
            <div className="p-8 flex items-center justify-center text-white/40"><Loader2 size={18} className="animate-spin" /></div>
          ) : (
            <div className="p-5 sm:p-7">
              <h2 className="text-2xl font-black tracking-tight text-white mb-4 bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">{detail.aula.title}</h2>

              {detail.aula.youtubeIds?.length > 0 && (
                <div className="grid gap-3 mb-5 sm:grid-cols-2">
                  {detail.aula.youtubeIds.map((yid) => (
                    <div key={yid} className="aspect-video rounded-xl overflow-hidden border border-white/10">
                      <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${yid}`} title="Vídeo da aula" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  ))}
                </div>
              )}

              {detail.aula.body && <MiniMarkdown source={detail.aula.body} className="mb-6" />}

              {detail.questions.length > 0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={15} className="text-cyan-300" />
                    <h4 className="text-sm font-black uppercase tracking-[0.14em] text-white/70">{detail.quiz?.title || "Quiz"}</h4>
                  </div>

                  <div className="flex flex-col gap-5">
                    {detail.questions.map((q, idx) => (
                      <QuestionView key={q.id} q={q} idx={idx} state={answers[q.id] || {}} onChange={(patch) => setAns(q.id, patch)}
                        graded={result?.graded.find((g) => g.questionId === q.id)} locked={!!result} />
                    ))}
                  </div>

                  {!result ? (
                    <button onClick={submit} disabled={submitting}
                      className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-sm disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }}>
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Enviar respostas
                    </button>
                  ) : (
                    <div className={`mt-5 rounded-2xl p-4 border ${result.passed ? "border-emerald-400/40 bg-emerald-500/10" : "border-amber-400/40 bg-amber-500/10"}`}>
                      <p className="text-lg font-black text-white">{result.passed ? "Aprovado! 🎉" : "Quase lá"} — {result.percentage}%</p>
                      <p className="text-[12.5px] text-white/60 mt-1">{result.passed ? "Aula concluída e registrada." : "Você pode revisar e tentar de novo."}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionView({ q, idx, state, onChange, graded, locked }: {
  q: Question; idx: number; state: AnswerState; onChange: (p: AnswerState) => void;
  graded?: { isCorrect: boolean; marksOutOf: number }; locked: boolean;
}) {
  const voice = useVoiceAnswer();
  const border = graded ? (graded.marksOutOf === 0 ? "border-white/10" : graded.isCorrect ? "border-emerald-400/40" : "border-rose-400/40") : "border-white/10";

  const toggleVoice = async () => {
    if (voice.recording) {
      const res = await voice.stop();
      onChange({ transcript: res.transcript, audioUrl: res.audioUrl, answer: res.transcript });
    } else {
      await voice.start();
    }
  };

  // Resposta ESCRITA: bloqueia colar (anti-cola casual). Honesto: NÃO é à prova de devtools.
  const noPaste = q.noPaste
    ? {
        onPaste: (e: React.ClipboardEvent) => e.preventDefault(),
        onDrop: (e: React.DragEvent) => e.preventDefault(),
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        onKeyDown: (e: React.KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") e.preventDefault(); },
      }
    : {};

  return (
    <div className={`rounded-xl border ${border} bg-white/[0.02] p-3.5`}>
      <div className="flex items-start gap-2 mb-2.5">
        <p className="flex-1 text-[13.5px] font-semibold text-white/90"><span className="text-white/40 mr-1">{idx + 1}.</span>{q.text}</p>
        {q.type === "voice" && (
          <button type="button" title="Ouvir a pergunta" onClick={() => { try { ttsSpeak(q.text); } catch { /* */ } }}
            className="shrink-0 text-cyan-300/80 hover:text-cyan-200"><Volume2 size={15} /></button>
        )}
        {q.marks > 0 && <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-cyan-300/70 bg-cyan-500/10 rounded-full px-2 py-0.5">{q.marks} pt{q.marks > 1 ? "s" : ""}</span>}
      </div>

      {q.type === "choice" && q.options && (
        <div className="flex flex-col gap-1.5">
          {q.options.map((o, i) => (
            <label key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer text-[13px] ${state.choiceIndex === i ? "bg-cyan-500/15 text-white" : "text-white/75 hover:bg-white/5"}`}>
              <input type="radio" name={q.id} disabled={locked} checked={state.choiceIndex === i} onChange={() => onChange({ choiceIndex: i, answer: o.text })} />
              {o.text}
            </label>
          ))}
        </div>
      )}

      {q.type === "input" && (
        <input value={state.answer || ""} disabled={locked} onChange={(e) => onChange({ answer: e.target.value })} {...noPaste}
          placeholder={q.noPaste ? "Digite (colar bloqueado)…" : "Sua resposta…"} className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50" />
      )}

      {q.type === "open" && (
        <textarea value={state.answer || ""} disabled={locked} onChange={(e) => onChange({ answer: e.target.value })} rows={3} {...noPaste}
          placeholder={q.noPaste ? "Responda com suas palavras (colar bloqueado)…" : "Responda com suas palavras…"} className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 resize-none" />
      )}

      {q.type === "voice" && (
        <div className="flex flex-col gap-2">
          <button type="button" disabled={locked || voice.uploading} onClick={toggleVoice}
            className={`self-start inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-bold ${voice.recording ? "bg-rose-500/90 text-white animate-pulse" : "bg-white/10 text-white/85 hover:bg-white/15"}`}>
            {voice.uploading ? <Loader2 size={14} className="animate-spin" /> : voice.recording ? <Square size={14} /> : <Mic size={14} />}
            {voice.recording ? "Parar" : voice.uploading ? "Enviando…" : "Gravar resposta"}
          </button>
          {(voice.transcript || state.transcript) && (
            <p className="text-[12.5px] text-white/60 italic">“{voice.transcript || state.transcript}”</p>
          )}
        </div>
      )}

      {q.type === "roulette" && <RouletteView q={q} state={state} onChange={onChange} locked={locked} />}

      {graded && (
        <p className={`mt-2 text-[11.5px] font-bold ${graded.marksOutOf === 0 ? "text-white/40" : graded.isCorrect ? "text-emerald-300" : "text-rose-300"}`}>
          {graded.marksOutOf === 0 ? "Resposta registrada (avaliação manual)." : graded.isCorrect ? "Correta ✓" : "Incorreta ✗"}
        </p>
      )}
    </div>
  );
}

// ROLETA: gira o pool, mostra a pergunta sorteada, o aluno responde, repete por `rounds`.
function RouletteView({ q, state, onChange, locked }: { q: Question; state: AnswerState; onChange: (p: AnswerState) => void; locked: boolean }) {
  const pool = q.config?.pool || [];
  const rounds = Math.max(1, Math.min(q.config?.rounds || 1, pool.length));
  const picks = state.picks || [];
  const [spinning, setSpinning] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const done = picks.length >= rounds;

  const spin = () => {
    if (spinning || done || locked) return;
    const used = new Set(picks.map((p) => p.index));
    const avail = pool.map((_, i) => i).filter((i) => !used.has(i));
    if (!avail.length) return;
    setSpinning(true); setTyped("");
    let ticks = 0;
    const iv = setInterval(() => {
      setCurrent(avail[Math.floor(Math.random() * avail.length)]);
      if (++ticks > 8) { clearInterval(iv); setCurrent(avail[Math.floor(Math.random() * avail.length)]); setSpinning(false); }
    }, 90);
  };

  const record = (patch: { choiceIndex?: number; answer?: string }) => {
    if (current == null) return;
    onChange({ picks: [...picks, { index: current, ...patch }] });
    setCurrent(null); setTyped("");
  };

  const pq = current != null ? pool[current] : null;
  const showQ = pq && !spinning;

  return (
    <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.06] p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-violet-300/80 mb-2">Rodada {Math.min(picks.length + (showQ ? 1 : 0), rounds)} de {rounds}</p>
      {!done && !showQ && (
        <button type="button" disabled={spinning || locked} onClick={spin}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-black disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}>
          <Dices size={15} className={spinning ? "animate-spin" : ""} /> {spinning ? "Girando…" : "Girar a roleta"}
        </button>
      )}
      {showQ && pq && (
        <div className="mt-1">
          <p className="text-[13px] font-semibold text-white/90 mb-2">{pq.text}</p>
          {pq.type === "choice" && pq.options ? (
            <div className="flex flex-col gap-1.5">
              {pq.options.map((o, i) => (
                <button key={i} disabled={locked} onClick={() => record({ choiceIndex: i, answer: o.text })}
                  className="text-left rounded-lg px-2.5 py-1.5 text-[13px] text-white/80 bg-white/5 hover:bg-cyan-500/15">{o.text}</button>
              ))}
            </div>
          ) : (
            <div className="flex gap-1.5">
              <input value={typed} disabled={locked} onChange={(e) => setTyped(e.target.value)} placeholder="Sua resposta…"
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50" />
              <button disabled={locked || !typed.trim()} onClick={() => record({ answer: typed })}
                className="px-3 rounded-lg text-white text-sm font-bold disabled:opacity-40" style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}>OK</button>
            </div>
          )}
        </div>
      )}
      {done && <p className="text-[12.5px] text-emerald-300/90 font-bold">Roleta concluída ✓ ({picks.length} resposta{picks.length > 1 ? "s" : ""})</p>}
    </div>
  );
}
