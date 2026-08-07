"use client";

/**
 * StudyCoworkChat — a aba "Meus Estudos" como um CO-WORKING estilo chat do Claude.
 *
 * FASE 1 (só UI, pronta pra receber a lógica agêntica depois):
 *  - Conversa natural com a Aura sobre qualquer assunto (via /api/ai/chat, agent=aura),
 *    com memória padrão de LLM (histórico reenviado a cada turno + persistência local).
 *  - Os ESTUDOS continuam tendo seu espaço na BIBLIOTECA (direita, retrátil). Arrastar
 *    um estudo pra conversa passa a FOCAR a Aura naquele(s) estudo(s) (chips de foco).
 *  - O ESTUDO aparece como ARTEFATO (StudyArtifactCard) dentro da conversa — classe
 *    própria — em vez de ocupar a página inteira. O editor completo abre num modal
 *    (reusa o MeusEstudosFeed existente, sem alterar nada dele).
 *  - O ⟁ permanece no composer e abre a seção STUDIO (StudioPalette) sob demanda; o que
 *    o Studio gera cai como artefato na conversa.
 *
 * A "camada de memória inteligente" e o disparo agêntico das capacidades do Studio
 * (function-calling) entram na Fase 2 — aqui deixamos as superfícies prontas.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  PanelRightClose, PanelRightOpen, FileText, Plus, Loader2, Sparkles, X, ChevronDown, Trash2,
} from "lucide-react";
import CoworkComposer from "@/components/study/CoworkComposer";
import AuraThinking from "@/components/study/AuraThinking";
import StudyArtifactCard from "@/components/study/StudyArtifactCard";
import StudioPalette from "@/components/study/StudioPalette";
import StudioBlock, { type StudioBlockData } from "@/components/studio/StudioBlock";
import StructuredAnswerView from "@/components/study/StructuredAnswerView";
import type { StructuredAnswer } from "@/lib/agent/contracts";
import { appendTranscript, hydrateTranscript } from "@/lib/agent/transcriptClient";

const MeusEstudosFeed = dynamic(() => import("@/components/study/MeusEstudosFeed"), { ssr: false });

const DT = "application/x-zaeon-item";
const THREAD_KEY = "zaeon.cowork.thread.v1";
const LAST_SPACE_KEY = "zaeon.study.lastSpace";
// Sentinela do tool-loop (Fase 0): o backend emite isto quando a Aura chama
// studio_generate; o cliente executa a geração. Deve bater com a de chat/route.ts.
const STUDIO_SENTINEL = "@@STUDIO_ACTION@@";
// Resposta rica do harness: o backend emite isto + o StructuredAnswer JSON quando há
// conceitos/evidência/próximos-passos → renderiza estruturado em vez de datilografar texto.
const STRUCTURED_SENTINEL = "@@STRUCTURED@@";

type Space = { id: string; title: string };
type Msg = {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "study" | "studio";
  text?: string;
  answer?: StructuredAnswer;   // resposta estruturada rica (renderiza StructuredAnswerView)
  studyId?: string;
  studyTitle?: string;
  studioBlock?: StudioBlockData;
  at: number;
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Frase curta = pensamento rápido (não fica "Planejando" à toa). Enquanto o harness
// real não classifica a intenção, isto mantém o loading honesto.
const isQuickPrompt = (t: string) => t.trim().split(/\s+/).filter(Boolean).length <= 8;

export default function StudyCoworkChat({ active = true }: { active?: boolean }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [libOpen, setLibOpen] = useState(true);
  const [studioOpen, setStudioOpen] = useState(false);
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const [openStudyId, setOpenStudyId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [quickThinking, setQuickThinking] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const scrollToEnd = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);
  const onListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 48);
  }, []);
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = messages;

  // ── carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/study/spaces");
        if (r.ok) setSpaces(await r.json());
      } catch { /* ignore */ }
    })();
    // memória de conversa: L0 (localStorage, rápido) primeiro; se vazio (device novo /
    // cache limpo), cai no L1 durável (DB) via /api/ai/transcript. docs/MEMORY_AND_PERSISTENCE.md.
    let hadLocal = false;
    try {
      const raw = localStorage.getItem(THREAD_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) { setMessages(parsed); hadLocal = true; }
      }
    } catch { /* ignore */ }
    if (!hadLocal) {
      (async () => {
        const wire = await hydrateTranscript("estudos", null);
        if (wire.length) {
          setMessages(wire.map((w) => ({
            id: w.id, role: w.role, kind: "text" as const, text: w.text, at: Date.parse(w.at) || Date.now(),
          })));
        }
      })();
    }
  }, []);

  // Persiste o thread (só texto + estudos; artefatos pesados do Studio ficam na sessão).
  useEffect(() => {
    try {
      const slim = messages.filter((m) => m.kind !== "studio" && !(m.kind === "text" && !m.text));
      localStorage.setItem(THREAD_KEY, JSON.stringify(slim.slice(-60)));
    } catch { /* ignore */ }
  }, [messages]);

  // Autoscroll pro fim a cada mensagem.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const spaceTitle = useCallback(
    (id: string) => spaces.find((s) => s.id === id)?.title || "Estudo",
    [spaces],
  );

  // ── Studio → artefato na conversa ───────────────────────────────────────────
  useEffect(() => {
    const onEmbed = (e: any) => {
      const d = e?.detail;
      if (!d?.studioKind) return;
      const block: StudioBlockData = {
        studioKind: d.studioKind, title: d.title, data: d.data ?? null,
        artifactId: d.artifactId, dataUrl: d.dataUrl,
      };
      setMessages((prev) => [...prev, { id: uid(), role: "assistant", kind: "studio", studioBlock: block, at: Date.now() }]);
      setStudioOpen(false);
    };
    window.addEventListener("zaeon:study:embed", onEmbed);
    return () => window.removeEventListener("zaeon:study:embed", onEmbed);
  }, []);

  // ── foco de estudo(s) ───────────────────────────────────────────────────────
  const addFocus = useCallback((id: string) => {
    setFocusIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);
  const removeFocus = useCallback((id: string) => {
    setFocusIds((prev) => prev.filter((x) => x !== id));
  }, []);

  // Arrastar um estudo pra conversa → foca + mostra como artefato.
  const onDropConversation = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData(DT);
    if (!id) return;
    addFocus(id);
    const title = spaceTitle(id);
    setMessages((prev) => {
      // evita duplicar o mesmo artefato em sequência
      if (prev.some((m) => m.kind === "study" && m.studyId === id)) return prev;
      return [...prev, { id: uid(), role: "assistant", kind: "study", studyId: id, studyTitle: title, at: Date.now() }];
    });
  };

  const openStudy = useCallback((id: string) => {
    try { localStorage.setItem(LAST_SPACE_KEY, id); } catch { /* ignore */ }
    setOpenStudyId(id);
  }, []);

  // Apagar um estudo da biblioteca (com confirmação — é destrutivo).
  const deleteStudy = useCallback(async (id: string, title?: string) => {
    if (!window.confirm(`Apagar o estudo “${title || "sem título"}” e tudo dentro dele? Não dá pra desfazer.`)) return;
    try {
      const r = await fetch(`/api/study/spaces?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (r.ok) {
        setSpaces((p) => p.filter((s) => s.id !== id));
        setFocusIds((p) => p.filter((x) => x !== id));
        setOpenStudyId((cur) => (cur === id ? null : cur));
      }
    } catch { /* ignore */ }
  }, []);

  // ── TOOL-LOOP (Fase 0): executa studio_generate reusando o Studio existente ──
  // Resolve o estudo-alvo (foco → 1º → cria um), gera o artefato e dispara o
  // evento "zaeon:study:embed" — o mesmo que o feed usa — e o cartão cai na conversa.
  const runStudioAction = useCallback(async (kind: string, topic: string) => {
    const H = { "Content-Type": "application/json" };
    // Fonte da geração: o estudo EM FOCO (se a pessoa está trabalhando nele) OU um
    // estudo NOVO criado pelo tópico. Nunca pega um estudo arbitrário da biblioteca
    // (senão "gere um podcast sobre X" sairia sobre o conteúdo errado).
    let spaceId = focusIds[0];
    if (!spaceId) {
      try {
        const r = await fetch("/api/study/spaces", { method: "POST", headers: H, body: JSON.stringify({ title: topic || "Estudo" }) });
        if (r.ok) { const s = await r.json(); setSpaces((p) => [...p, s]); spaceId = s.id; }
      } catch { /* ignore */ }
    }
    if (!spaceId) return;
    const fire = (detail: any) => window.dispatchEvent(new CustomEvent("zaeon:study:embed", { detail }));
    try {
      if (kind === "podcast" || kind === "video") {
        const res = await fetch(`/api/studio/${kind}`, { method: "POST", headers: H, body: JSON.stringify({ spaceId }) });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.id) return;
        if (data.status === "done") { fire({ studioKind: kind, title: data.title, data: data.meta, artifactId: data.id }); return; }
        const started = Date.now();
        const maxMs = kind === "video" ? 12 * 60_000 : 10 * 60_000;
        while (Date.now() - started < maxMs) {
          await new Promise((r) => setTimeout(r, kind === "video" ? 3000 : 2500));
          const rr = await fetch(`/api/studio/${data.id}`);
          const d = await rr.json().catch(() => null);
          if (!d) continue;
          if (d.status === "done") { fire({ studioKind: kind, title: d.title, data: d.meta, artifactId: d.id }); return; }
          if (d.status === "error") return;
        }
      } else if (kind === "image") {
        const res = await fetch("/api/studio/image", { method: "POST", headers: H, body: JSON.stringify({ spaceId }) });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.dataUrl) fire({ studioKind: "image", title: data.title || "Imagem", data: data.meta, dataUrl: data.dataUrl });
      } else {
        const res = await fetch(`/api/studio/${kind}`, { method: "POST", headers: H, body: JSON.stringify({ spaceId, force: true }) });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.meta) fire({ studioKind: kind, title: data.title, data: data.meta });
      }
    } catch { /* silencioso — a Fase 1 mostra erro no trace */ }
  }, [focusIds, spaces]);

  // ── envio pro chat da Aura ──────────────────────────────────────────────────
  const send = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || sending) return;
    setQuickThinking(isQuickPrompt(prompt));

    const history = msgsRef.current
      .filter((m) => m.kind === "text" && (m.text || m.answer))
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: (m.text ?? m.answer?.nucleo ?? "") as string }] }));

    // mensagem da assistente entra vazia e vai sendo preenchida aos poucos (streaming)
    const asstId = uid();
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", kind: "text", text: prompt, at: Date.now() },
      { id: asstId, role: "assistant", kind: "text", text: "", at: Date.now() },
    ]);
    setInput("");
    setSending(true);

    const patchAsst = (text: string) =>
      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, text } : m)));
    const patchAsstAnswer = (answer: StructuredAnswer) =>
      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, answer } : m)));

    const focusTitles = focusIds.map(spaceTitle);
    // MODO ACADÊMICO = FLEXÍVEL na Sala de Estudos (o rigor pleno é da Sala de Pesquisa).
    const flexClause =
      " MODO FLEXÍVEL: responda com conhecimento geral quando o tema não exigir academia " +
      "(como uma LLM comum faria). Ao buscar/citar, amplie o escopo além do acadêmico — " +
      "reportagens, artigos, web, enciclopédia valem. NUNCA recuse por falta de fonte acadêmica; " +
      "se não houver paper, responda com o que há e sinalize a natureza da fonte. O rigor acadêmico " +
      "pleno só é obrigatório quando o pedido for criar/revisar um trabalho.";
    const systemContext = (focusIds.length
      ? `O usuário está no co-working da Sala de Estudos e FOCOU ${focusIds.length} estudo(s): ${focusTitles.join("; ")}. Concentre-se nesse(s) estudo(s) ao responder.`
      : `O usuário está no co-working da Sala de Estudos. Converse com naturalidade e, quando ajudar, ofereça transformar o assunto em artefatos do Studio (Guia, Mapa mental, Linha do tempo, Flashcards, FAQ, Imagem, Podcast, Vídeo) ou gerar um estudo.`) + flexClause;

    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          agent: "aura",
          history,
          systemContext,
          stream: true,
          agentContext: {
            activeTab: "sala-de-estudos",
            currentStudyId: focusIds[0],
            focusedStudyIds: focusIds,
          },
        }),
      });

      if (!r.ok || !r.body) {
        patchAsst("Não consegui responder agora. Tente de novo.");
      } else {
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let acc = "";          // texto cru recebido
        let target = "";       // parte VISÍVEL alvo (sem a sentinela)
        let shown = 0;         // quantas letras já reveladas
        let ended = false;

        // Datilografia: revela letra a letra em ordem, suavizando os chunks do
        // stream (chunky → digitação fluida, estilo Claude). Cadência com easing:
        // vai mais rápido quando está longe do alvo e desacelera perto do fim.
        const typed = new Promise<void>((resolve) => {
          const id = setInterval(() => {
            if (shown < target.length) {
              const rem = target.length - shown;
              shown = Math.min(target.length, shown + Math.max(1, Math.ceil(rem / 8)));
              patchAsst(target.slice(0, shown));
            } else if (ended) {
              clearInterval(id);
              resolve();
            }
          }, 18);
        });

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          // datilografa só o visível — para na sentinela mais próxima (studio OU estruturado).
          const stu = acc.indexOf(STUDIO_SENTINEL);
          const str = acc.indexOf(STRUCTURED_SENTINEL);
          const cut = [stu, str].filter((x) => x >= 0).sort((a, b) => a - b)[0];
          target = cut !== undefined ? acc.slice(0, cut) : acc;
        }

        const stI = acc.indexOf(STRUCTURED_SENTINEL);
        const si = acc.indexOf(STUDIO_SENTINEL);
        if (stI >= 0) {
          // Resposta rica do harness: não datilografa; renderiza StructuredAnswerView.
          target = ""; ended = true;
          let ans: StructuredAnswer | null = null;
          try { ans = JSON.parse(acc.slice(stI + STRUCTURED_SENTINEL.length)); } catch { /* ignore */ }
          if (ans?.nucleo) {
            patchAsstAnswer(ans);
            appendTranscript("estudos", focusIds[0] ?? null, [
              { role: "user", text: prompt },
              { role: "assistant", text: ans.nucleo },
            ]);
          } else {
            patchAsst("Sem resposta agora.");
          }
        } else if (si >= 0) {
          // TOOL-LOOP (Fase 0): ação — não datilografa; encerra e trata.
          target = ""; ended = true;
          let action: any = null;
          try { action = JSON.parse(acc.slice(si + STUDIO_SENTINEL.length)); } catch { /* ignore */ }
          if (action?.kind) {
            patchAsst(action.text || "Gerando o artefato…");
            void runStudioAction(action.kind, action.topic || prompt);
          } else {
            patchAsst("Sem resposta agora.");
          }
        } else {
          target = acc; ended = true;
          await typed;                       // deixa a digitação alcançar o fim
          if (!acc.trim()) patchAsst("Sem resposta agora.");
          // L1: grava o turno durável (fire-and-forget). scopeId = estudo focado, se houver.
          else appendTranscript("estudos", focusIds[0] ?? null, [
            { role: "user", text: prompt },
            { role: "assistant", text: acc },
          ]);
        }
      }
    } catch {
      patchAsst("Falha de rede ao falar com a Aura.");
    } finally {
      setSending(false);
    }
  }, [input, sending, focusIds, spaceTitle, runStudioAction]);

  const newStudy = useCallback(async () => {
    try {
      const r = await fetch("/api/study/spaces", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Novo estudo" }),
      });
      if (r.ok) { const s = await r.json(); setSpaces((p) => [...p, s]); openStudy(s.id); }
    } catch { /* ignore */ }
  }, [openStudy]);

  const focusChips = useMemo(() => (
    focusIds.length ? (
      <div className="flex flex-wrap items-center gap-1.5 px-1 pb-2">
        {focusIds.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-[11.5px] font-tech
            bg-cyan-500/10 text-cyan-700 dark:text-cyan-200 border border-cyan-400/30">
            <FileText size={11} /> {spaceTitle(id)}
            <button type="button" onClick={() => removeFocus(id)} title="Tirar do foco" className="ml-0.5 rounded-full hover:bg-cyan-500/20 p-0.5">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
    ) : null
  ), [focusIds, spaceTitle, removeFocus]);

  return (
    <div className="relative h-full flex lg:flex-row flex-col">
      {/* Borda-degradê navy na aresta esquerda (par visual com a sidebar da esquerda) — só no claro. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[1.5px] z-10 dark:hidden"
        style={{ background: "linear-gradient(180deg,#0f172a,rgba(15,23,42,0.25) 50%,transparent)" }}
      />
      {/* ── COLUNA CENTRAL: conversa + composer ── */}
      <div className="relative flex-1 min-w-0 flex flex-col">

        {/* Seta "ir para o final" — só aparece quando há conversa e não está no fim */}
        {messages.length > 0 && !atBottom && (
          <button
            type="button"
            onClick={scrollToEnd}
            title="Ir para o final da conversa"
            aria-label="Ir para o final da conversa"
            className="absolute z-20 left-1/2 -translate-x-1/2 bottom-24 w-9 h-9 rounded-full flex items-center justify-center
              bg-white/90 dark:bg-white/10 border border-slate-200 dark:border-white/15 shadow-lg backdrop-blur-xl
              text-slate-600 dark:text-white/80 hover:text-cyan-600 dark:hover:text-cyan-300 hover:border-cyan-400/50
              transition-colors"
          >
            <ChevronDown size={18} />
          </button>
        )}

        {/* conversa (drop target de foco) */}
        <div
          ref={listRef}
          onScroll={onListScroll}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDropConversation}
          className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 transition-colors ${dragOver ? "bg-cyan-500/[0.04]" : ""}`}
        >
          <div className="ml-4 sm:ml-8 lg:ml-14 mr-0 sm:mr-2 py-4 flex flex-col gap-4">
            {messages.length === 0 ? null : (
              messages.map((m) => {
                if (m.kind === "text") {
                  const isUser = m.role === "user";
                  if (!isUser && m.answer) {
                    // Resposta rica do harness: núcleo + conceitos (chips) + evidências +
                    // próximos-passos clicáveis. Clicar num conceito/passo injeta novo prompt.
                    return (
                      <div key={m.id} className="flex justify-start">
                        <div className="max-w-[85%] w-full">
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
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 font-tech text-[22px] leading-[1.65] whitespace-pre-wrap
                        ${isUser
                          ? "bg-slate-100 text-slate-900 border border-slate-200/80 dark:bg-white/[0.09] dark:text-white/90 dark:border-white/10"
                          : "bg-white/80 dark:bg-white/[0.05] text-slate-800 dark:text-white/90 border border-slate-200/70 dark:border-white/10 backdrop-blur-xl"}`}>
                        {m.text
                          ? m.text
                          : (!isUser && <AuraThinking active phases={quickThinking ? ["Pensando"] : ["Pensando", "Elaborando"]} />)}
                      </div>
                    </div>
                  );
                }
                if (m.kind === "study" && m.studyId) {
                  return (
                    <div key={m.id} className="flex justify-start">
                      <div className="max-w-[85%] w-full">
                        <StudyArtifactCard
                          studyId={m.studyId}
                          title={m.studyTitle || spaceTitle(m.studyId)}
                          focused={focusIds.includes(m.studyId)}
                          onOpen={openStudy}
                          onFocus={addFocus}
                          onUnfocus={removeFocus}
                        />
                      </div>
                    </div>
                  );
                }
                if (m.kind === "studio" && m.studioBlock) {
                  return (
                    <div key={m.id} className="flex justify-start">
                      <div className="max-w-[85%] w-full">
                        <StudioBlock block={m.studioBlock} collapsed={false} />
                      </div>
                    </div>
                  );
                }
                return null;
              })
            )}
          </div>
        </div>

        {/* ⟁ Studio como paletador de prompt: clicar injeta o prompt no composer. */}
        {studioOpen && (
          <div className="px-4 sm:px-6 pt-2">
            <div className="ml-4 sm:ml-8 lg:ml-14 mr-0 sm:mr-2">
              <StudioPalette
                onPick={(tpl) => {
                  // O template vem PRIMEIRO ("Gere um podcast sobre ") e o que a
                  // pessoa já tinha digitado vira o tópico, logo em seguida.
                  setInput((v) => tpl + v.trim());
                  setStudioOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* composer estilo Claude — mais largo, esticando até perto da biblioteca
            (mantém o recuo à esquerda; sem teto de largura à direita). */}
        <div className="px-4 sm:px-6 pb-4 pt-2">
          <div className="ml-4 sm:ml-8 lg:ml-14 mr-0 sm:mr-2">
            <CoworkComposer
              value={input}
              onChange={setInput}
              onSubmit={send}
              onToggleStudio={() => setStudioOpen((v) => !v)}
              studioOpen={studioOpen}
              busy={sending}
              idle={messages.length === 0 && !sending}
              active={active && !openStudyId}
            >
              {focusChips}
            </CoworkComposer>
          </div>
        </div>
      </div>

      {/* ── BIBLIOTECA (direita, retrátil) — moldura degradê navy (par da sidebar) ── */}
      {libOpen ? (
        <div className="relative lg:w-64 shrink-0 flex flex-col min-h-0 lg:m-3 lg:rounded-2xl border-t lg:border border-transparent dark:border-white/12 bg-slate-100/80 dark:bg-[#0a0f1c] overflow-hidden">
          {/* borda em degradê preto/navy — só no modo claro (o escuro já está ok) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 lg:rounded-2xl z-10 dark:hidden"
            style={{
              padding: "1.5px",
              background: "linear-gradient(180deg,#0f172a,rgba(15,23,42,0.35) 45%,rgba(15,23,42,0.10))",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude" as any,
            }}
          />
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]">
            <span className="text-[12px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/50 font-tech">Biblioteca</span>
            <span className="text-[11px] font-mono text-slate-400">{spaces.length}</span>
            <button onClick={newStudy} className="ml-auto p-1 rounded-lg text-slate-400 hover:text-cyan-500" title="Novo estudo"><Plus size={15} /></button>
            <button onClick={() => setLibOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-cyan-500" title="Recolher biblioteca"><PanelRightClose size={15} /></button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 flex flex-col gap-2 min-h-[120px]">
            <p className="px-1 pt-0.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/30 font-tech">Estudos</p>
            {spaces.length === 0 ? (
              <p className="text-[12.5px] text-slate-400 dark:text-white/30 p-2 leading-relaxed font-tech">Nenhum estudo ainda. Crie um no “+” ou peça um à Aura.</p>
            ) : (
              spaces.map((sp) => (
                <div
                  key={sp.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData(DT, sp.id); e.dataTransfer.effectAllowed = "copy"; }}
                  className={`group flex items-center gap-2 rounded-xl border p-2 cursor-grab active:cursor-grabbing transition-colors
                    ${focusIds.includes(sp.id)
                      ? "border-cyan-400/60 bg-cyan-500/5 dark:bg-cyan-500/10"
                      : "bg-white border-slate-200 shadow-sm hover:border-cyan-400/50 dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none"}`}
                  title="Arraste pra conversa para focar — ou clique para abrir"
                >
                  <button onClick={() => openStudy(sp.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <FileText size={14} className="text-violet-500 dark:text-violet-300 shrink-0" />
                    <span className="flex-1 min-w-0 text-[13px] font-medium text-slate-700 dark:text-white/90 truncate font-tech">{sp.title || "Estudo"}</span>
                  </button>
                  <button onClick={() => deleteStudy(sp.id, sp.title)}
                    title="Apagar estudo"
                    className="opacity-0 group-hover:opacity-100 shrink-0 text-slate-400 hover:text-rose-500">
                    <Trash2 size={13} />
                  </button>
                  <button onClick={() => (focusIds.includes(sp.id) ? removeFocus(sp.id) : addFocus(sp.id))}
                    title={focusIds.includes(sp.id) ? "Tirar do foco" : "Focar"}
                    className="opacity-0 group-hover:opacity-100 shrink-0 text-slate-400 hover:text-cyan-500">
                    <Sparkles size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <button onClick={() => setLibOpen(true)} title="Mostrar biblioteca"
          className="shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10 flex lg:flex-col items-center justify-center gap-2 px-3 py-2 lg:py-3 text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/5">
          <PanelRightOpen size={16} />
          <span className="text-[12px] font-black uppercase tracking-[0.16em] lg:[writing-mode:vertical-rl] lg:rotate-180 font-tech">Biblioteca</span>
        </button>
      )}

      {/* ── MODAL: editor completo do estudo (reusa MeusEstudosFeed intacto) ── */}
      {openStudyId && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-stretch justify-center p-2 sm:p-4" onClick={() => setOpenStudyId(null)}>
          <div className="w-full max-w-6xl bg-white dark:bg-[#070b14] rounded-3xl overflow-hidden shadow-2xl border border-white/40 dark:border-white/10 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-white/10">
              {/* Pill destacada com o TÍTULO do estudo + X (conector de volta ao chat) */}
              <div className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full
                bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-cyan-500/10
                border border-violet-300/50 dark:border-white/10
                shadow-[0_8px_24px_-14px_rgba(124,58,237,0.5)]">
                <span className="text-cyan-600 dark:text-cyan-300 text-[13px] leading-none" style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.5))" }}>⟁</span>
                <span className="text-[13.5px] font-semibold text-slate-800 dark:text-white/90 truncate max-w-[60vw] font-tech">
                  {spaceTitle(openStudyId)}
                </span>
                <button
                  onClick={() => setOpenStudyId(null)}
                  title="Voltar ao chat"
                  aria-label="Voltar ao chat"
                  className="ml-0.5 w-6 h-6 rounded-full flex items-center justify-center
                    text-slate-500 dark:text-white/60 hover:text-white hover:bg-rose-500/90
                    transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
              <div className="flex-1" />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <MeusEstudosFeed key={openStudyId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
