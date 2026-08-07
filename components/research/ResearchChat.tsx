"use client";

/**
 * ResearchChat — a MESMA interface de chat do co-working, com roupagem ACADÊMICA,
 * dentro da Sala de Pesquisa. O output é a voz do ESCRITOR e do REVISOR científico
 * (alterna no topo). Vive num painel que a pill do WindowSwitcher liga/desliga —
 * o aluno alterna entre o chat e o próprio trabalho de forma responsiva.
 *
 * Reusa CoworkComposer + AuraThinking + a datilografia do co-working. Fase 0: texto
 * (sem tools); na camada agêntica, o Escritor/Revisor ganham skills e o crítico.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import CoworkComposer from "@/components/study/CoworkComposer";
import AuraThinking from "@/components/study/AuraThinking";
import StructuredAnswerView from "@/components/study/StructuredAnswerView";
import { researchWorkType } from "@/lib/agent/tools";
import type { StructuredAnswer } from "@/lib/agent/contracts";
import { appendTranscript, hydrateTranscript } from "@/lib/agent/transcriptClient";

type Msg = { id: string; role: "user" | "assistant"; text: string; answer?: StructuredAnswer };

// Deve bater com RESEARCH_SENTINEL de app/api/ai/chat/route.ts.
const RESEARCH_SENTINEL = "@@RESEARCH_ACTION@@";
// Resposta rica do harness (StructuredAnswer) → renderiza estruturado. Bate com chat/route.ts.
const STRUCTURED_SENTINEL = "@@STRUCTURED@@";
// L0 (docs/MEMORY_AND_PERSISTENCE.md): antes a conversa da Sala de Pesquisa ZERAVA
// (sem persistência + desmonta ao trocar de aba). Agora espelha o thread e o rascunho.
const THREAD_KEY_R = "zaeon.research.thread.v1";
const DRAFT_KEY_R = "zaeon.research.draft.v1";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const isQuick = (t: string) => t.trim().split(/\s+/).filter(Boolean).length <= 8;

// Sala de Pesquisa = MODO ACADÊMICO ESTRITO (única possibilidade, não é opção).
const ACADEMIC_STRICT =
  " MODO ACADÊMICO ESTRITO: aqui o rigor acadêmico é a ÚNICA possibilidade. Use apenas " +
  "fontes acadêmicas confiáveis (papers, periódicos revisados); NUNCA invente citações. Se não " +
  "houver base acadêmica sólida, diga isso e proponha caminhos — não preencha com achismo nem web casual.";

// Um assistente científico ÚNICO e completo: o PAPEL (escrever, revisar, pesquisar,
// explicar, estruturar) sai do CONTEXTO da conversa — não de um botão.
const SYS = (wt: string) =>
  `Você é o assistente científico da Zaeon na Sala de Pesquisa, dedicado ao ${wt} do aluno. ` +
  `É um parceiro acadêmico completo e inteligente, geral dentro do campo da ciência: conforme o que ` +
  `a pessoa pedir e o contexto do trabalho, você ESCREVE seções, REVISA e critica o texto, SUGERE e ` +
  `verifica referências, EXPLICA conceitos e ESTRUTURA o trabalho — sem escolher um papel fixo. ` +
  `Rigor acadêmico e linguagem formal em PT-BR; vá direto ao conteúdo. ` +
  `IMPORTANTE: quando a pessoa PEDIR pra GERAR/CRIAR/REDIGIR um trabalho (ex.: "gera um artigo sobre X", ` +
  `"faz um TCC sobre Y", "monta uma pesquisa disso"), CHAME a ferramenta research_generate (kind + topic) ` +
  `em vez de responder em texto — o trabalho é montado no documento. Para conversar, tirar dúvida ou ` +
  `revisar um trecho, responda em texto.` + ACADEMIC_STRICT;

const QUICK: { label: string; tpl: string }[] = [
  { label: "Escrever seção", tpl: "Escreva a seção sobre " },
  { label: "Revisar trecho", tpl: "Revise este trecho e aponte melhorias:\n" },
  { label: "Sugerir fontes", tpl: "Sugira referências acadêmicas sobre " },
  { label: "Resumir", tpl: "Resuma em 3 parágrafos: " },
];

export default function ResearchChat({
  workType,
}: {
  workType?: string | null;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [quick, setQuick] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const wt = workType || "trabalho";
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = messages;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  // Carga inicial: L0 (localStorage) primeiro; se vazio, L1 durável (DB). + rascunho.
  useEffect(() => {
    try { const d = localStorage.getItem(DRAFT_KEY_R); if (d) setInput(d); } catch { /* ignore */ }
    let hadLocal = false;
    try {
      const raw = localStorage.getItem(THREAD_KEY_R);
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) { setMessages(p); hadLocal = true; } }
    } catch { /* ignore */ }
    if (!hadLocal) {
      (async () => {
        const wire = await hydrateTranscript("pesquisa", null);
        if (wire.length) setMessages(wire.map((w) => ({ id: w.id, role: w.role, text: w.text })));
      })();
    }
  }, []);

  // Espelha thread (últimas 60) e rascunho no localStorage — não perde ao trocar de aba/reload.
  useEffect(() => {
    try { localStorage.setItem(THREAD_KEY_R, JSON.stringify(messages.filter((m) => m.text).slice(-60))); } catch { /* ignore */ }
  }, [messages]);
  useEffect(() => {
    try { input ? localStorage.setItem(DRAFT_KEY_R, input) : localStorage.removeItem(DRAFT_KEY_R); } catch { /* ignore */ }
  }, [input]);

  // Gera o trabalho e o ENCAIXA no documento (reusa /api/ai/research-draft + o
  // evento zaeon:research:newdoc que o page.tsx escuta → buildDocFromDraft).
  // Os tiers dos planos são respeitados no fluxo de geração/salvamento existente.
  const runResearchGenerate = useCallback(async (kind: string, topic: string) => {
    const wtype = researchWorkType(kind);
    try {
      const r = await fetch("/api/ai/research-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, references: [] }),
      });
      const d = await r.json().catch(() => null);
      const title = (d && (d.title || topic)) || topic;
      window.dispatchEvent(new CustomEvent("zaeon:research:newdoc", {
        detail: { title, fields: d?.fields, workType: wtype },
      }));
    } catch { /* ignore — a Fase 1 mostra erro no trace */ }
  }, []);

  const send = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || sending) return;
    setQuick(isQuick(prompt));

    const history = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text || m.answer?.nucleo || "" }],
    }));
    const asstId = uid();
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text: prompt },
      { id: asstId, role: "assistant", text: "" },
    ]);
    setInput("");
    setSending(true);
    const patch = (text: string) => setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, text } : m)));
    const patchAnswer = (answer: StructuredAnswer) => setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, answer } : m)));

    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, agent: "aura", surface: "pesquisa", history, systemContext: SYS(wt), stream: true }),
      });
      if (!r.ok || !r.body) { patch("Não consegui responder agora. Tente de novo."); return; }

      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "", target = "", shown = 0, ended = false;
      const typed = new Promise<void>((resolve) => {
        const id = setInterval(() => {
          if (shown < target.length) {
            shown = Math.min(target.length, shown + Math.max(1, Math.ceil((target.length - shown) / 8)));
            patch(target.slice(0, shown));
          } else if (ended) { clearInterval(id); resolve(); }
        }, 18);
      });
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        // datilografa só o visível — para na sentinela mais próxima (research OU estruturado).
        const res = acc.indexOf(RESEARCH_SENTINEL);
        const str = acc.indexOf(STRUCTURED_SENTINEL);
        const cut = [res, str].filter((x) => x >= 0).sort((a, b) => a - b)[0];
        target = cut !== undefined ? acc.slice(0, cut) : acc;
      }
      const stI = acc.indexOf(STRUCTURED_SENTINEL);
      const si = acc.indexOf(RESEARCH_SENTINEL);
      if (stI >= 0) {
        // Resposta rica do harness: renderiza StructuredAnswerView (sem datilografia).
        target = ""; ended = true;
        let ans: StructuredAnswer | null = null;
        try { ans = JSON.parse(acc.slice(stI + STRUCTURED_SENTINEL.length)); } catch { /* ignore */ }
        if (ans?.nucleo) {
          patchAnswer(ans);
          appendTranscript("pesquisa", null, [
            { role: "user", text: prompt },
            { role: "assistant", text: ans.nucleo },
          ]);
        } else {
          patch("Sem resposta agora.");
        }
      } else if (si >= 0) {
        // TOOL-LOOP: research_generate → gera o trabalho e encaixa no documento.
        target = ""; ended = true;
        let action: any = null;
        try { action = JSON.parse(acc.slice(si + RESEARCH_SENTINEL.length)); } catch { /* ignore */ }
        if (action?.kind) {
          patch(action.text || "Gerando o trabalho…");
          void runResearchGenerate(action.kind, action.topic || prompt);
        } else {
          patch("Sem resposta agora.");
        }
      } else {
        target = acc; ended = true;
        await typed;
        if (!acc.trim()) patch("Sem resposta agora.");
        else appendTranscript("pesquisa", null, [
          { role: "user", text: prompt },
          { role: "assistant", text: acc },
        ]);
      }
    } catch {
      patch("Falha de rede ao falar com o agente.");
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, wt, runResearchGenerate]);

  return (
    <div className="h-full flex flex-col bg-white/95 dark:bg-[#0a0f1c]/95 text-slate-900 dark:text-white">
      {/* Conversa — bolhas com cara de manuscrito (serif, texto justificado).
          Sem cabeçalho/X: a alternância chat ↔ trabalho é feita pela pill ⟁ Chat. */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6">
        <div className="ml-4 sm:ml-8 lg:ml-14 mr-0 sm:mr-2 py-5 flex flex-col gap-4">
          {messages.map((m) => {
            const isUser = m.role === "user";
            if (!isUser && m.answer) {
              // Resposta rica do harness: estruturada (núcleo + conceitos + fontes + próximos-passos).
              return (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[88%] w-full">
                    <StructuredAnswerView
                      answer={m.answer}
                      onConcept={(c) => setInput(c)}
                      onNext={(s) => setInput(s)}
                    />
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] px-4 py-3 font-serif text-[22px] leading-[1.65] whitespace-pre-wrap ${
                    isUser
                      ? "rounded-2xl bg-slate-100 text-slate-900 border border-slate-200 dark:bg-white/[0.08] dark:text-white/90 dark:border-white/10"
                      : "rounded-r-2xl rounded-bl-2xl bg-slate-50 text-slate-800 border-l-2 border-cyan-500/60 text-justify dark:bg-white/[0.03] dark:text-white/90 dark:border-cyan-400/50"
                  }`}
                >
                  {m.text ? m.text : (!isUser && <AuraThinking active phases={quick ? ["Pensando"] : ["Pensando", "Elaborando"]} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composer (mesmo do co-working); ⟁ abre atalhos acadêmicos */}
      <div className="px-4 sm:px-6 pb-4 pt-2">
        <div className="ml-4 sm:ml-8 lg:ml-14 mr-0 sm:mr-2">
          <CoworkComposer
            value={input}
            onChange={setInput}
            onSubmit={send}
            onToggleStudio={() => setPaletteOpen((v) => !v)}
            studioOpen={paletteOpen}
            busy={sending}
            idle={messages.length === 0 && !sending}
            placeholder=""
          >
            {paletteOpen && (
              <div className="flex flex-wrap items-center gap-1.5 px-1 pb-2">
                {QUICK.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => { setInput((v) => q.tpl + v.trim()); setPaletteOpen(false); }}
                    className="px-2.5 py-1.5 rounded-full text-[12px] font-serif text-slate-700 bg-slate-100 border border-slate-200 hover:border-cyan-400/50 hover:text-cyan-700 dark:text-white/80 dark:bg-white/[0.06] dark:border-white/10 dark:hover:text-cyan-200 transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </CoworkComposer>
        </div>
      </div>
    </div>
  );
}
