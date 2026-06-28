"use client";

/**
 * "Meus Alunos" (só professor) — Fase 1: gestão de TURMAS (criar, listar, convidar).
 * As métricas por aluno (nota, tempo de leitura, interesse) entram na Fase 5.
 */
import { useCallback, useEffect, useState } from "react";

interface Turma {
  id: string;
  name: string;
  memberCount?: number;
  createdAt?: string;
}

export default function MeusAlunosPanel() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<{ turmaId: string; url: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/turmas");
      if (r.ok) {
        const d = await r.json();
        setTurmas(Array.isArray(d?.turmas) ? d.turmas : []);
      }
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createTurma = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/turmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (r.ok) {
        setName("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const makeInvite = async (turmaId: string) => {
    try {
      const r = await fetch("/api/aulas/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turmaId }),
      });
      if (r.ok) {
        const d = await r.json();
        setInvite({ turmaId, url: d?.inviteUrl || "" });
      }
    } catch {
      /* silencioso */
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8">
      <h2 className="text-lg font-black text-black dark:text-white mb-1">Meus Alunos</h2>
      <p className="text-[12px] text-slate-500 dark:text-white/40 mb-5">
        Organize suas turmas e convide alunos. As notas e o tempo de leitura aparecem aqui conforme os alunos fazem as aulas.
      </p>

      {/* Criar turma */}
      <div className="flex gap-2 mb-6 max-w-md">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void createTurma(); }}
          placeholder="Nome da turma (ex.: Cálculo I)"
          className="flex-1 px-3 py-2 rounded-xl text-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-black dark:text-white outline-none focus:border-cyan-500"
        />
        <button
          onClick={() => void createTurma()}
          disabled={busy || !name.trim()}
          className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white"
        >
          {busy ? "Criando…" : "Criar turma"}
        </button>
      </div>

      {/* Lista de turmas */}
      {loading ? (
        <p className="text-[12px] text-slate-400 dark:text-white/30">Carregando…</p>
      ) : turmas.length === 0 ? (
        <p className="text-[12px] text-slate-400 dark:text-white/30 italic">Nenhuma turma ainda. Crie a primeira acima.</p>
      ) : (
        <ul className="flex flex-col gap-2 max-w-2xl">
          {turmas.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-black dark:text-white truncate">{t.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-white/40">{t.memberCount ?? 0} aluno(s)</p>
              </div>
              <button
                onClick={() => void makeInvite(t.id)}
                className="shrink-0 text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-cyan-500/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
              >
                Convidar
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Link de convite gerado */}
      {invite && (
        <div className="mt-4 max-w-2xl p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/30">
          <p className="text-[10px] font-black uppercase tracking-wide text-cyan-600 dark:text-cyan-300 mb-1">Convite gerado</p>
          <code className="text-[11px] text-slate-700 dark:text-white/70 break-all">{invite.url}</code>
        </div>
      )}
    </div>
  );
}
