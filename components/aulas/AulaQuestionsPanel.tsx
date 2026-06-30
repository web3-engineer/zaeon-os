"use client";

/**
 * Lote 9 fatia 2 — autoria de PERGUNTAS + PONTUAÇÃO (modo professor / canvas teach).
 *
 * O professor monta a lista de perguntas interativas (os 4 tipos ready do registro
 * lib/aulas/blockTypes): gera por IA (/api/aulas/generate-block) OU cria manual, edita
 * tudo (enunciado/alternativas/corretas/aceitas/PONTOS/anti-cola) e vê o total de pontos.
 * O componente é "controlado": o pai (MeusEstudosFeed teach) guarda a lista e a manda
 * junto no "Enviar para turma".
 */
import { useState } from "react";
import { Sparkles, Loader2, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { READY_BLOCKS, aulaBlock } from "@/lib/aulas/blockTypes";
import QuestionEditor from "@/components/aulas/QuestionEditor";

export type AuthOption = { text: string; isCorrect: boolean; explanation?: string };
export type AuthPoolQ = { text: string; type: "choice" | "input"; options?: AuthOption[]; accepted?: string[] };
export type AuthQ = {
  id: string;
  kind: string;
  type: string; // choice | input | open | voice | roulette
  text: string;
  options?: AuthOption[];
  accepted?: string[];
  marks: number;
  noPaste?: boolean;
  config?: { pool?: AuthPoolQ[]; rounds?: number; text?: string; sentence?: string; words?: string[]; cards?: { front: string; back: string }[]; pairs?: { a: string; b: string }[]; nodes?: { id: string; content: string; choices: { label: string; nextId: string }[] }[] };
};

const newId = () => `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function blank(kind: string): AuthQ {
  const def = aulaBlock(kind);
  const base: AuthQ = { id: newId(), kind, type: def?.baseType || "open", text: "", marks: 1 };
  if (kind === "q-choice") base.options = [{ text: "", isCorrect: true }, { text: "", isCorrect: false }];
  if (kind === "q-written") { base.type = "input"; base.accepted = []; base.noPaste = true; }
  if (kind === "q-voice") base.accepted = [];
  if (kind === "q-roulette") { base.type = "roulette"; base.config = { pool: [{ text: "", type: "input", accepted: [] }], rounds: 1 }; }
  if (kind === "q-cloze") { base.type = "cloze"; base.config = { text: "" }; }
  if (kind === "q-dragwords") { base.type = "dragwords"; base.config = { sentence: "", words: [] }; }
  if (kind === "flashcards") { base.type = "flashcards"; base.config = { cards: [{ front: "", back: "" }] }; }
  if (kind === "game-memory") { base.type = "memory"; base.config = { pairs: [{ a: "", b: "" }, { a: "", b: "" }] }; }
  if (kind === "branching") { base.type = "branching"; base.config = { nodes: [{ id: "n1", content: "", choices: [] }] }; }
  return base;
}

export default function AulaQuestionsPanel({ value, onChange }: { value: AuthQ[]; onChange: (q: AuthQ[]) => void }) {
  const [genKind, setGenKind] = useState<string | null>(null);
  const [genTopic, setGenTopic] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [genMsg, setGenMsg] = useState("");

  const totalPoints = value.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const set = (id: string, patch: Partial<AuthQ>) => onChange(value.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const del = (id: string) => onChange(value.filter((q) => q.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    const i = value.findIndex((q) => q.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= value.length) return;
    const copy = [...value]; [copy[i], copy[j]] = [copy[j], copy[i]]; onChange(copy);
  };
  const addManual = (kind: string) => onChange([...value, blank(kind)]);

  const generate = async () => {
    if (!genKind || !genTopic.trim() || genBusy) return;
    setGenBusy(true); setGenMsg("");
    try {
      const r = await fetch("/api/aulas/generate-block", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: genKind, topic: genTopic.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.block) {
        onChange([...value, { id: newId(), kind: genKind, ...d.block }]);
        setGenTopic(""); setGenKind(null);
      } else setGenMsg(d.message || "Não consegui gerar. Tente reformular.");
    } catch { setGenMsg("Falha de rede."); } finally { setGenBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-white/12 bg-[#0a0f1c]/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={15} className="text-cyan-300" />
        <h4 className="text-sm font-black uppercase tracking-[0.14em] text-white/70">Perguntas & Pontuação</h4>
        <span className="ml-auto text-[11px] font-black text-cyan-300 bg-cyan-500/10 rounded-full px-2.5 py-0.5">{totalPoints} pt{totalPoints !== 1 ? "s" : ""} no total</span>
      </div>

      {/* adicionar: gerar por IA OU manual, por tipo */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {READY_BLOCKS.map((b) => (
          <button key={b.kind} onClick={() => { setGenKind(genKind === b.kind ? null : b.kind); setGenMsg(""); }}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-bold border ${genKind === b.kind ? "border-cyan-400/60 bg-cyan-500/15 text-white" : "border-white/10 bg-white/[0.04] text-white/80 hover:border-cyan-400/40"}`}>
            {b.emoji} {b.label}
          </button>
        ))}
      </div>
      {genKind && (
        <div className="mb-3 flex flex-col gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-500/[0.05] p-2.5">
          <div className="flex gap-1.5">
            <input value={genTopic} onChange={(e) => setGenTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
              placeholder={`Tema da pergunta (${aulaBlock(genKind)?.label})…`} className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50" />
            <button onClick={generate} disabled={genBusy || !genTopic.trim()} className="inline-flex items-center gap-1 px-3 rounded-lg text-white text-sm font-bold disabled:opacity-40" style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }}>
              {genBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Gerar
            </button>
            <button onClick={() => { addManual(genKind); setGenKind(null); }} title="Criar em branco (manual)" className="px-2.5 rounded-lg text-white/80 text-sm font-bold border border-white/15 hover:bg-white/10"><Plus size={14} /></button>
          </div>
          {genMsg && <p className="text-[12px] text-rose-300">{genMsg}</p>}
        </div>
      )}

      {value.length === 0 ? (
        <p className="text-[12.5px] text-white/35 italic py-2">Sem perguntas ainda. Gere ou crie acima — o aluno responde no fim da aula.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {value.map((q, i) => (
            <QuestionEditor key={q.id} q={q} idx={i} onSet={(p) => set(q.id, p)} onDel={() => del(q.id)}
              controls={<>
                <button onClick={() => move(q.id, -1)} disabled={i === 0} className="text-white/30 hover:text-white/70 disabled:opacity-20"><ChevronUp size={14} /></button>
                <button onClick={() => move(q.id, 1)} disabled={i === value.length - 1} className="text-white/30 hover:text-white/70 disabled:opacity-20"><ChevronDown size={14} /></button>
              </>} />
          ))}
        </div>
      )}
    </div>
  );
}

// (QEditor extraído para components/aulas/QuestionEditor.tsx — reutilizado pelo canvas teach)
