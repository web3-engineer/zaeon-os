"use client";

/**
 * Editor de UMA pergunta (extraído de AulaQuestionsPanel) — reutilizado pelo painel
 * (modal de envio) E pelo bloco "aula-question" do canvas teach. Controlado: o pai
 * guarda o AuthQ e recebe os patches via onSet. `controls` injeta botões extras no
 * cabeçalho (ex.: setas de mover, no painel). `idx` mostra a numeração (opcional).
 */
import React from "react";
import { Trash2, Plus } from "lucide-react";
import { aulaBlock } from "@/lib/aulas/blockTypes";
import type { AuthQ } from "@/components/aulas/AulaQuestionsPanel";

export default function QuestionEditor({ q, onSet, onDel, controls, idx }: {
  q: AuthQ;
  onSet: (p: Partial<AuthQ>) => void;
  onDel?: () => void;
  controls?: React.ReactNode;
  idx?: number;
}) {
  const def = aulaBlock(q.kind);
  const acceptedStr = (q.accepted || []).join(", ");
  const setAccepted = (s: string) => onSet({ accepted: s.split(",").map((x) => x.trim()).filter(Boolean) });

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 mb-2">
        {typeof idx === "number" && <span className="text-[11px] font-black text-white/40">{idx + 1}.</span>}
        <span className="text-[11px] font-bold text-cyan-300/80">{def?.emoji} {def?.label}</span>
        <div className="ml-auto flex items-center gap-1">
          <label className="text-[10px] text-white/40 uppercase tracking-wide">pontos</label>
          <input type="number" min={0} max={20} value={q.marks} onChange={(e) => onSet({ marks: Math.max(0, Math.min(20, parseInt(e.target.value) || 0)) })}
            className="w-12 rounded-md bg-white/5 border border-white/10 px-1.5 py-0.5 text-[12px] text-white text-center focus:outline-none focus:border-cyan-400/50" />
          {controls}
          {onDel && <button onClick={onDel} className="text-white/30 hover:text-rose-400"><Trash2 size={13} /></button>}
        </div>
      </div>

      <textarea value={q.text} onChange={(e) => onSet({ text: e.target.value })} rows={2}
        placeholder="Enunciado da pergunta…" className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 resize-none mb-2" />

      {q.type === "choice" && (
        <div className="flex flex-col gap-1.5">
          {(q.options || []).map((o, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input type="radio" name={q.id} checked={!!o.isCorrect} onChange={() => onSet({ options: (q.options || []).map((x, j) => ({ ...x, isCorrect: j === i })) })} title="Correta" />
              <input value={o.text} onChange={(e) => onSet({ options: (q.options || []).map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                placeholder={`Alternativa ${i + 1}`} className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12.5px] text-white focus:outline-none focus:border-cyan-400/50" />
              {(q.options || []).length > 2 && <button onClick={() => onSet({ options: (q.options || []).filter((_, j) => j !== i) })} className="text-white/30 hover:text-rose-400"><Trash2 size={12} /></button>}
            </div>
          ))}
          {(q.options || []).length < 6 && <button onClick={() => onSet({ options: [...(q.options || []), { text: "", isCorrect: false }] })} className="self-start text-[11px] text-cyan-300/80 hover:text-cyan-200 inline-flex items-center gap-1"><Plus size={11} /> alternativa</button>}
        </div>
      )}

      {(q.type === "input" || q.type === "voice") && (
        <input value={acceptedStr} onChange={(e) => setAccepted(e.target.value)}
          placeholder={q.type === "voice" ? "Respostas aceitas (vírgula) — vazio = correção manual" : "Respostas aceitas (separe por vírgula)"}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50" />
      )}
      {q.type === "open" && <p className="text-[11.5px] text-white/35 italic">Dissertativa — correção manual (sem gabarito).</p>}
      {q.type === "input" && (
        <label className="mt-2 flex items-center gap-1.5 text-[11.5px] text-white/55">
          <input type="checkbox" checked={!!q.noPaste} onChange={(e) => onSet({ noPaste: e.target.checked })} /> bloquear colar (anti-cola)
        </label>
      )}

      {q.type === "roulette" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[12px] text-white/60">
            <span>Rodadas:</span>
            <input type="number" min={1} max={(q.config?.pool || []).length || 1} value={q.config?.rounds || 1}
              onChange={(e) => onSet({ config: { pool: q.config?.pool || [], rounds: Math.max(1, Math.min((q.config?.pool || []).length || 1, parseInt(e.target.value) || 1)) } })}
              className="w-12 rounded-md bg-white/5 border border-white/10 px-1.5 py-0.5 text-[12px] text-white text-center focus:outline-none" />
            <span className="text-white/40">de {(q.config?.pool || []).length} perguntas no pool</span>
          </div>
          {(q.config?.pool || []).map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={p.text} onChange={(e) => onSet({ config: { pool: (q.config?.pool || []).map((x, j) => (j === i ? { ...x, text: e.target.value } : x)), rounds: q.config?.rounds || 1 } })}
                placeholder={`Pergunta ${i + 1} (resposta curta)`} className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12px] text-white focus:outline-none focus:border-cyan-400/50" />
              <input value={(p.accepted || []).join(", ")} onChange={(e) => onSet({ config: { pool: (q.config?.pool || []).map((x, j) => (j === i ? { ...x, type: "input", accepted: e.target.value.split(",").map((y) => y.trim()).filter(Boolean) } : x)), rounds: q.config?.rounds || 1 } })}
                placeholder="aceitas" className="w-28 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12px] text-white focus:outline-none focus:border-cyan-400/50" />
              {(q.config?.pool || []).length > 1 && <button onClick={() => onSet({ config: { pool: (q.config?.pool || []).filter((_, j) => j !== i), rounds: Math.min(q.config?.rounds || 1, (q.config?.pool || []).length - 1) || 1 } })} className="text-white/30 hover:text-rose-400"><Trash2 size={12} /></button>}
            </div>
          ))}
          <button onClick={() => onSet({ config: { pool: [...(q.config?.pool || []), { text: "", type: "input", accepted: [] }], rounds: q.config?.rounds || 1 } })} className="self-start text-[11px] text-cyan-300/80 hover:text-cyan-200 inline-flex items-center gap-1"><Plus size={11} /> pergunta no pool</button>
        </div>
      )}

      {q.type === "cloze" && (
        <div className="flex flex-col gap-1.5">
          <textarea value={q.config?.text || ""} onChange={(e) => onSet({ config: { ...(q.config || {}), text: e.target.value } })} rows={3}
            placeholder="Texto com lacunas: marque a resposta entre *asteriscos*. Ex.: A capital é *Brasília*."
            className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 resize-none" />
          <p className="text-[11px] text-white/40">Lacunas detectadas: {((q.config?.text || "").match(/\*[^*]+\*/g) || []).length} — o aluno digita ou arrasta.</p>
        </div>
      )}

      {q.type === "dragwords" && (
        <div className="flex flex-col gap-1.5">
          <textarea value={q.config?.sentence || ""} onChange={(e) => onSet({ config: { ...(q.config || {}), sentence: e.target.value } })} rows={2}
            placeholder="Frase com lacunas marcadas: O *gato* subiu no *telhado*."
            className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 resize-none" />
          <input value={(q.config?.words || []).join(", ")} onChange={(e) => onSet({ config: { ...(q.config || {}), words: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } })}
            placeholder="Palavras distratoras (vírgula) — entram no banco junto das respostas"
            className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12.5px] text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50" />
          <p className="text-[11px] text-white/40">Lacunas detectadas: {((q.config?.sentence || "").match(/\*[^*]+\*/g) || []).length} — o aluno arrasta as palavras.</p>
        </div>
      )}

      {q.type === "flashcards" && (
        <div className="flex flex-col gap-1.5">
          {(q.config?.cards || []).map((c, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={c.front} onChange={(e) => onSet({ config: { ...(q.config || {}), cards: (q.config?.cards || []).map((x, j) => j === i ? { ...x, front: e.target.value } : x) } })}
                placeholder="Frente" className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12.5px] text-white focus:outline-none focus:border-cyan-400/50" />
              <input value={c.back} onChange={(e) => onSet({ config: { ...(q.config || {}), cards: (q.config?.cards || []).map((x, j) => j === i ? { ...x, back: e.target.value } : x) } })}
                placeholder="Verso" className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12.5px] text-white focus:outline-none focus:border-cyan-400/50" />
              {(q.config?.cards || []).length > 1 && <button onClick={() => onSet({ config: { ...(q.config || {}), cards: (q.config?.cards || []).filter((_, j) => j !== i) } })} className="text-white/30 hover:text-rose-400"><Trash2 size={12} /></button>}
            </div>
          ))}
          <button onClick={() => onSet({ config: { ...(q.config || {}), cards: [...(q.config?.cards || []), { front: "", back: "" }] } })} className="self-start text-[11px] text-cyan-300/80 hover:text-cyan-200 inline-flex items-center gap-1"><Plus size={11} /> card</button>
        </div>
      )}

      {q.type === "memory" && (
        <div className="flex flex-col gap-1.5">
          {(q.config?.pairs || []).map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={p.a} onChange={(e) => onSet({ config: { ...(q.config || {}), pairs: (q.config?.pairs || []).map((x, j) => j === i ? { ...x, a: e.target.value } : x) } })}
                placeholder="Termo" className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12.5px] text-white focus:outline-none focus:border-cyan-400/50" />
              <span className="text-white/30 text-[12px]">↔</span>
              <input value={p.b} onChange={(e) => onSet({ config: { ...(q.config || {}), pairs: (q.config?.pairs || []).map((x, j) => j === i ? { ...x, b: e.target.value } : x) } })}
                placeholder="Par" className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[12.5px] text-white focus:outline-none focus:border-cyan-400/50" />
              {(q.config?.pairs || []).length > 2 && <button onClick={() => onSet({ config: { ...(q.config || {}), pairs: (q.config?.pairs || []).filter((_, j) => j !== i) } })} className="text-white/30 hover:text-rose-400"><Trash2 size={12} /></button>}
            </div>
          ))}
          <button onClick={() => onSet({ config: { ...(q.config || {}), pairs: [...(q.config?.pairs || []), { a: "", b: "" }] } })} className="self-start text-[11px] text-cyan-300/80 hover:text-cyan-200 inline-flex items-center gap-1"><Plus size={11} /> par</button>
        </div>
      )}
    </div>
  );
}
