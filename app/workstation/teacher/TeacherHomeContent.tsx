"use client";

/**
 * TeacherHomeContent — a SALA INICIAL do professor.
 *
 * Ambiente "estilo professor" (menos aluno): saudação por turno, visão geral da
 * turma (alunos, correções pendentes, materiais) e cards de ação que levam ao que
 * o professor faz no dia a dia — convidar alunos (sem teto), conferir/corrigir
 * atividades, criar provas/tarefas, e entrar nas salas de Pesquisa, Estudos e
 * Agentes. Mesmo visual liquid glass, claro e escuro.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, ClipboardCheck, FileText, FlaskConical, BookOpen, Bot,
  Send, ArrowRight, GraduationCap, Loader2, Sparkles,
} from "lucide-react";

function greetingForNow(): { hi: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 12) return { hi: "Bom dia", emoji: "🌅" };
  if (h < 18) return { hi: "Boa tarde", emoji: "☀️" };
  return { hi: "Boa noite", emoji: "🌙" };
}

interface Stats { students: number; pending: number; documents: number; links: number; }

export default function TeacherHomeContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const firstName = (session?.user?.name || "Professor").split(" ")[0];
  const { hi, emoji } = greetingForNow();

  const [stats, setStats] = useState<Stats>({ students: 0, pending: 0, documents: 0, links: 0 });
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRes, subRes, docRes, linkRes] = await Promise.all([
        fetch(`/api/teacher/students?t=${Date.now()}`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch(`/api/teacher/submissions?t=${Date.now()}`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch(`/api/teacher/documents?t=${Date.now()}`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch(`/api/teacher/links?t=${Date.now()}`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      const subs = Array.isArray(subRes) ? subRes : [];
      const pend = subs.filter((s: any) => s.status !== "graded");
      setPendingList(pend.slice(0, 6));
      setStats({
        students: Array.isArray(stuRes) ? stuRes.length : 0,
        pending: pend.length,
        documents: Array.isArray(docRes) ? docRes.length : 0,
        links: Array.isArray(linkRes) ? linkRes.length : 0,
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const go = (path: string) => router.push(path);

  const statCards = [
    { label: "Alunos", value: stats.students, icon: Users, hint: "na sua turma" },
    { label: "Correções", value: stats.pending, icon: ClipboardCheck, hint: "aguardando você", glow: stats.pending > 0 },
    { label: "Materiais", value: stats.documents, icon: FileText, hint: "tarefas e provas" },
    { label: "Convites", value: stats.links, icon: Send, hint: "links de turma" },
  ];

  // Cards de ação — o coração da sala do professor.
  const actions = [
    { title: "Convidar alunos", desc: "Gere um link de turma sem limite de alunos.", icon: Send, to: "/workstation/teacher/work", accent: "from-cyan-500 to-sky-600" },
    { title: "Atividades & correção", desc: "Confira entregas e corrija (com ajuda da IA).", icon: ClipboardCheck, to: "/workstation/teacher/review", accent: "from-violet-500 to-fuchsia-600", badge: stats.pending },
    { title: "Criar prova ou tarefa", desc: "Monte avaliações com o assistente.", icon: FileText, to: "/workstation/teacher/work", accent: "from-emerald-500 to-teal-600" },
    { title: "Sala de Pesquisa", desc: "Sua pesquisa: documento, PDFs e citações.", icon: FlaskConical, to: "/workstation/teacher/research", accent: "from-indigo-500 to-blue-600" },
    { title: "Pesquisa Agêntica", desc: "Agentes e laboratórios — crie novos se precisar.", icon: Bot, to: "/workstation/teacher/agentic", accent: "from-amber-500 to-orange-600" },
    { title: "Repositórios", desc: "Acervo e materiais institucionais.", icon: BookOpen, to: "/workstation/teacher/repos", accent: "from-rose-500 to-pink-600" },
  ];

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto">
      {/* Saudação */}
      <div className="mb-7">
        <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300 text-[11px] font-black uppercase tracking-[0.18em] mb-1.5">
          <GraduationCap size={14} /> Sala do Professor
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {hi}, {firstName} {emoji}
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-white/45 mt-1">
          {stats.pending > 0
            ? `Você tem ${stats.pending} ${stats.pending === 1 ? "entrega aguardando correção" : "entregas aguardando correção"}.`
            : "Tudo em dia por aqui. Bom trabalho!"}
        </p>
      </div>

      {/* Visão geral */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label}
              className={`rounded-2xl p-4 border bg-white/70 border-slate-200 shadow-sm dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none ${s.glow ? "ring-1 ring-violet-400/40" : ""}`}>
              <div className="flex items-center justify-between">
                <Icon size={18} className="text-cyan-600 dark:text-cyan-300" />
                <span className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                  {loading ? <Loader2 size={18} className="animate-spin text-slate-300" /> : s.value}
                </span>
              </div>
              <p className="mt-2 text-[12px] font-bold text-slate-700 dark:text-white/85">{s.label}</p>
              <p className="text-[10px] text-slate-400 dark:text-white/35">{s.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Ações */}
      <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/40 mb-3">O que vamos fazer hoje?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.title} onClick={() => go(a.to)}
              className="group text-left rounded-2xl p-4 border bg-white/70 border-slate-200 shadow-sm hover:border-cyan-400/50 hover:shadow-md transition-all dark:bg-white/[0.04] dark:border-white/10 dark:hover:border-cyan-400/30 dark:shadow-none">
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.accent} flex items-center justify-center text-white shadow-sm shrink-0`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{a.title}</p>
                    {!!a.badge && a.badge > 0 && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">{a.badge}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-white/45 leading-snug mt-0.5">{a.desc}</p>
                </div>
                <ArrowRight size={15} className="text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Correções pendentes (atalho real) */}
      <div className="rounded-2xl border bg-white/70 border-slate-200 shadow-sm dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/10">
          <ClipboardCheck size={15} className="text-violet-600 dark:text-violet-300" />
          <span className="text-[12px] font-bold text-slate-800 dark:text-white">Entregas aguardando correção</span>
          <button onClick={() => go("/workstation/teacher/review")} className="ml-auto text-[11px] font-bold text-cyan-600 dark:text-cyan-300 hover:underline inline-flex items-center gap-1">
            Ver todas <ArrowRight size={12} />
          </button>
        </div>
        <div className="p-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400"><Loader2 size={16} className="animate-spin" /></div>
          ) : pendingList.length === 0 ? (
            <p className="text-[12px] text-slate-400 dark:text-white/35 py-6 text-center flex flex-col items-center gap-2">
              <Sparkles size={18} className="opacity-50" /> Nada para corrigir agora.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {pendingList.map((s: any) => (
                <button key={s.id} onClick={() => go("/workstation/teacher/review")}
                  className="text-left flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-cyan-500/[0.06] transition-colors border border-transparent hover:border-cyan-400/20">
                  <span className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-300 shrink-0">
                    <FileText size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-slate-800 dark:text-white truncate">{s.document?.title || "Atividade"}</p>
                    <p className="text-[10px] text-slate-400 dark:text-white/35 truncate">{s.student?.name || "Aluno"} · {s.document?.type || "tarefa"}</p>
                  </div>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">pendente</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
