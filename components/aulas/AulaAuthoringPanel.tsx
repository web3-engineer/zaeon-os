"use client";

/**
 * Fase 2 — Criar aula (professor), fluido como um estudo.
 *
 * Esquerda: barra ⟁ que GERA um rascunho (corpo markdown + vídeo + quiz) e o editor
 * do rascunho selecionado (título, corpo, vídeos). Direita: painel de rascunhos (estilo
 * biblioteca do Meus Estudos) acumulando vários; botão ENVIAR destacado (escolhe turma)
 * → vira "enviado". Liberdade total: gerar, lapidar, criar manual.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, Loader2, Send, Trash2, Plus, FileText, Save, Youtube, CheckCircle2 } from "lucide-react";
import MiniMarkdown from "./MiniMarkdown";
import type { Aula, QuizMeta, Question, Turma } from "./types";

const GRAD = "linear-gradient(135deg,#2563eb,#06b6d4)";

function parseYoutubeIds(text: string): string[] {
  const ids = new Set<string>();
  for (const tok of text.split(/[\s,]+/).filter(Boolean)) {
    const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(tok) || /^([A-Za-z0-9_-]{11})$/.exec(tok);
    if (m) ids.add(m[1]);
  }
  return [...ids].slice(0, 5);
}

type Detail = { aula: Aula; quiz: QuizMeta | null; questions: Question[] };

export default function AulaAuthoringPanel() {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [command, setCommand] = useState("");
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // campos editáveis do rascunho aberto
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [youtubeText, setYoutubeText] = useState("");
  const [sendTurmaId, setSendTurmaId] = useState("");

  const drafts = useMemo(() => aulas.filter((a) => a.status === "draft"), [aulas]);
  const sent = useMemo(() => aulas.filter((a) => a.status === "sent"), [aulas]);

  const loadList = useCallback(async () => {
    try {
      const [ra, rt] = await Promise.all([fetch("/api/aulas"), fetch("/api/turmas")]);
      if (ra.ok) { const d = await ra.json(); setAulas(Array.isArray(d.aulas) ? d.aulas : []); }
      if (rt.ok) { const d = await rt.json(); setTurmas(Array.isArray(d.turmas) ? d.turmas : Array.isArray(d) ? d : []); }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { void loadList(); }, [loadList]);

  const select = useCallback(async (id: string) => {
    setSelectedId(id); setDetail(null);
    try {
      const r = await fetch(`/api/aulas/${id}`);
      if (r.ok) {
        const d: Detail = await r.json();
        setDetail(d);
        setTitle(d.aula.title || "");
        setBody(d.aula.body || "");
        setYoutubeText((d.aula.youtubeIds || []).join("\n"));
        setSendTurmaId(d.aula.turmaId || "");
      }
    } catch { /* ignore */ }
  }, []);

  const flash = (m: string) => { setStatus(m); setTimeout(() => setStatus(""), 2800); };

  const generate = useCallback(async () => {
    const cmd = command.trim();
    if (!cmd || generating) return;
    setGenerating(true); setStatus("Gerando a aula…");
    try {
      const r = await fetch("/api/aulas/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: cmd }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.aula) { flash(d.message || "Não consegui gerar agora. Tente reformular."); return; }
      setCommand("");
      await loadList();
      await select(d.aula.id);
      flash("Rascunho criado ✓");
    } catch { flash("Falha de rede ao gerar."); } finally { setGenerating(false); }
  }, [command, generating, loadList, select]);

  const newManual = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/aulas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Nova aula" }) });
      if (r.ok) { const d = await r.json(); await loadList(); if (d.aula) await select(d.aula.id); }
    } catch { /* ignore */ } finally { setBusy(false); }
  }, [loadList, select]);

  const save = useCallback(async () => {
    if (!detail) return;
    setBusy(true); setStatus("Salvando…");
    try {
      const r = await fetch(`/api/aulas/${detail.aula.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "Nova aula", body, youtubeIds: parseYoutubeIds(youtubeText) }) });
      if (r.ok) { await loadList(); flash("Salvo ✓"); } else flash("Não consegui salvar.");
    } catch { flash("Falha ao salvar."); } finally { setBusy(false); }
  }, [detail, title, body, youtubeText, loadList]);

  const send = useCallback(async () => {
    if (!detail) return;
    if (!sendTurmaId) { flash("Escolha uma turma para enviar."); return; }
    setBusy(true); setStatus("Enviando…");
    try {
      // salva o estado atual antes de enviar
      await fetch(`/api/aulas/${detail.aula.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "Nova aula", body, youtubeIds: parseYoutubeIds(youtubeText) }) });
      const r = await fetch(`/api/aulas/${detail.aula.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", turmaId: sendTurmaId }) });
      if (r.ok) { await loadList(); await select(detail.aula.id); flash("Aula enviada 🚀"); } else { const d = await r.json().catch(() => ({})); flash(d.error || "Não consegui enviar."); }
    } catch { flash("Falha ao enviar."); } finally { setBusy(false); }
  }, [detail, sendTurmaId, title, body, youtubeText, loadList, select]);

  const remove = useCallback(async (id: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/aulas/${id}`, { method: "DELETE" });
      if (r.ok) { if (selectedId === id) { setSelectedId(null); setDetail(null); } await loadList(); }
    } catch { /* ignore */ } finally { setBusy(false); }
  }, [selectedId, loadList]);

  const isSent = detail?.aula.status === "sent";

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4 sm:p-5">
      {/* ESQUERDA: gerar + editar */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* barra ⟁ */}
        <div className="rounded-[28px] p-[1.5px] bg-gradient-to-r from-blue-500/40 via-cyan-400/40 to-violet-500/40 mb-3">
          <div className="rounded-[27px] flex items-center gap-2.5 px-3 py-2 bg-white/[0.05] backdrop-blur-2xl">
            <span className="text-lg text-cyan-300 animate-[spin_16s_linear_infinite] motion-reduce:animate-none" style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.55))" }}>⟁</span>
            <input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
              disabled={generating} placeholder="Gere uma aula sobre… (ex.: 'fotossíntese para o 9º ano')"
              className="flex-1 min-w-0 bg-transparent text-[13px] text-white placeholder:text-white/35 focus:outline-none disabled:opacity-60 py-1.5" />
            <button onClick={generate} disabled={generating || !command.trim()}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-white text-sm font-bold disabled:opacity-40" style={{ background: GRAD }}>
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Gerar
            </button>
          </div>
        </div>
        {status && <p className="text-[12px] text-cyan-300/90 mb-2 px-1">{status}</p>}

        {/* editor */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-[1.5rem] border border-white/12 bg-[#0a0f1c]/60 p-5">
          {!detail ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-white/40 gap-2">
              <FileText size={28} />
              <p className="text-sm">Gere uma aula com a barra acima, ou escolha um rascunho à direita.</p>
            </div>
          ) : (
            <div className="max-w-2xl">
              <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSent}
                className="w-full bg-transparent text-2xl font-black tracking-tight text-white mb-3 focus:outline-none border-b border-transparent focus:border-white/20 disabled:opacity-80" />

              <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-white/40 mb-1 mt-3"><Youtube size={12} className="inline mr-1" /> Vídeos (urls ou ids, um por linha)</label>
              <textarea value={youtubeText} onChange={(e) => setYoutubeText(e.target.value)} disabled={isSent} rows={2}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[12.5px] text-white/80 focus:outline-none focus:border-cyan-400/50 resize-none mb-4 disabled:opacity-70" />

              <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-white/40 mb-1">Conteúdo (markdown)</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={isSent} rows={14}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-[13px] text-white/90 font-mono leading-relaxed focus:outline-none focus:border-cyan-400/50 resize-y mb-3 disabled:opacity-70" />

              {detail.questions.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 mb-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40 mb-2">Quiz — {detail.questions.length} pergunta(s){detail.quiz ? ` · aprova com ${detail.quiz.passingPct}%` : ""}</p>
                  <ul className="flex flex-col gap-1.5">
                    {detail.questions.map((q, i) => (
                      <li key={q.id} className="text-[12.5px] text-white/70"><span className="text-white/35 mr-1">{i + 1}.</span>{q.text} <span className="text-[10px] uppercase tracking-wide text-cyan-300/70 ml-1">{q.type}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {isSent ? (
                <div className="inline-flex items-center gap-2 text-emerald-300 text-sm font-bold"><CheckCircle2 size={16} /> Enviada{detail.aula.sentAt ? ` em ${new Date(detail.aula.sentAt).toLocaleDateString("pt-BR")}` : ""}</div>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-bold hover:bg-white/15 disabled:opacity-50">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
                  </button>
                  <select value={sendTurmaId} onChange={(e) => setSendTurmaId(e.target.value)} className="rounded-full bg-white/10 border border-white/10 text-white/90 text-sm px-3 py-2 focus:outline-none">
                    <option value="">Escolher turma…</option>
                    {turmas.map((t) => <option key={t.id} value={t.id} className="bg-[#0a0f1c]">{t.name}</option>)}
                  </select>
                  <button onClick={send} disabled={busy || !sendTurmaId} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-black shadow-lg disabled:opacity-40" style={{ background: GRAD }}>
                    <Send size={15} /> ENVIAR
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DIREITA: rascunhos + enviadas */}
      <div className="lg:w-64 shrink-0 flex flex-col min-h-0 rounded-2xl border border-white/12 bg-[#0a0f1c]/60 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <span className="text-[12px] font-black uppercase tracking-[0.16em] text-white/50">Rascunhos</span>
          <span className="text-[11px] font-mono text-white/30">{drafts.length}</span>
          <button onClick={newManual} disabled={busy} className="ml-auto p-1 rounded-lg text-white/40 hover:text-cyan-400" title="Nova aula em branco"><Plus size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 flex flex-col gap-2">
          {drafts.length === 0 && <p className="text-[12px] text-white/30 px-1 py-2">Nenhum rascunho. Gere uma aula 👆</p>}
          {drafts.map((a) => (
            <div key={a.id} className={`group flex items-center gap-2 rounded-xl border p-2 ${selectedId === a.id ? "border-cyan-400/60 bg-cyan-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
              <button onClick={() => select(a.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                <FileText size={14} className="text-violet-300 shrink-0" />
                <span className="flex-1 min-w-0 text-[12.5px] font-medium text-white/85 truncate">{a.title}</span>
              </button>
              <button onClick={() => remove(a.id)} className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-rose-400 shrink-0" title="Apagar"><Trash2 size={12} /></button>
            </div>
          ))}

          {sent.length > 0 && <p className="px-1 pt-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/25">Enviadas</p>}
          {sent.map((a) => (
            <div key={a.id} className={`group flex items-center gap-2 rounded-xl border p-2 ${selectedId === a.id ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/8 bg-white/[0.02] hover:border-white/15"}`}>
              <button onClick={() => select(a.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                <CheckCircle2 size={14} className="text-emerald-300 shrink-0" />
                <span className="flex-1 min-w-0 text-[12.5px] text-white/70 truncate">{a.title}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
