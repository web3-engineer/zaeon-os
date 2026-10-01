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
  PanelRightClose, PanelRightOpen, FileText, Plus, Loader2, Sparkles, X, ChevronDown, Trash2, GitBranch,
} from "lucide-react";
import CoworkComposer from "@/components/study/CoworkComposer";
import ChatMarkdown from "@/components/study/ChatMarkdown";
import AuraThinking from "@/components/study/AuraThinking";
import StudyArtifactCard from "@/components/study/StudyArtifactCard";
import StudioPalette from "@/components/study/StudioPalette";
import MentorPill from "@/components/study/MentorPill";
import StudioBlock, { type StudioBlockData } from "@/components/studio/StudioBlock";
import StructuredAnswerView from "@/components/study/StructuredAnswerView";
import MagazineAnswerView, { podeVirarRevista } from "@/components/study/MagazineAnswerView";
import MagazineBoundary from "@/components/study/MagazineBoundary";
import ThreadTabs from "@/components/study/ThreadTabs";
import {
  carregarThreads, salvarThreads, criarThread, fecharThread, renomearThread, tocarThread,
  carregarMensagens, salvarMensagens, threadAtiva, marcarAtiva, tituloAPartirDe,
  TITULO_PADRAO, type Thread,
} from "@/lib/chat/threads";
import type { StructuredAnswer } from "@/lib/agent/contracts";
import { parseStructuredStream, STRUCTURED_SENTINEL } from "@/lib/agent/structured-client";
import { separarProgresso, faseCorrente } from "@/lib/agent/progresso";
import { typeStep, safeCut } from "@/lib/ui/typewriter";
import { appendTranscript, hydrateTranscript } from "@/lib/agent/transcriptClient";
import type { SkillNodeState } from "@/lib/skilltree/types";
import type { SkillTreeData } from "@/components/study/SkillTreePanel";

const MeusEstudosFeed = dynamic(() => import("@/components/study/MeusEstudosFeed"), { ssr: false });
// Árvore de habilidades GENERATIVA (React Flow) — opt-in, drawer ao lado da conversa.
// A cartolina (memória visual da conversa) só carrega quando o aluno abre — e só com a flag.
const LoungeCartolina = dynamic(() => import("@/components/lounge/LoungeCartolina"), { ssr: false });
const CARTOLINA_ON = process.env.NEXT_PUBLIC_CARTOLINA_MEMORIA === "1";
const SkillTreePanel = dynamic(() => import("@/components/study/SkillTreePanel"), { ssr: false });

const DT = "application/x-zaeon-item";
const LAST_SPACE_KEY = "zaeon.study.lastSpace";
// Sentinela do tool-loop (Fase 0): o backend emite isto quando a Aura chama
// studio_generate; o cliente executa a geração. Deve bater com a de chat/route.ts.
const STUDIO_SENTINEL = "@@STUDIO_ACTION@@";
// Sentinela do harness (@@STRUCTURED@@): StructuredAnswer inteiro → StructuredAnswerView
// (+ artefato inline). Parser + fallback pra texto em lib/agent/structured-client.ts.

type Space = { id: string; title: string };
type Msg = {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "study" | "studio" | "structured";
  text?: string;             // em "structured" = nucleo (histórico/persistência)
  studyId?: string;
  studyTitle?: string;
  studioBlock?: StudioBlockData;   // em "structured" = artefato embutido na MESMA bolha
  answer?: StructuredAnswer;
  fase?: string;             // fase que o harness está narrando agora (só enquanto chega)
  streaming?: boolean;       // B2: resposta ainda chegando → cursor piscando
  fresh?: boolean;           // B2: resposta estruturada recém-chegada → datilografa o núcleo
  at: number;
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * O que desta mensagem a Aura precisa reler no próximo turno.
 *
 * `m.text` de uma resposta estruturada é só o núcleo — a manchete. Mandar só isso de
 * volta era condenar o modelo a uma conversa onde ele lembra do que PERGUNTARAM e
 * esquece do que RESPONDEU. Aqui vai o corpo: núcleo + desenvolvimento, e os conceitos
 * como âncora barata (é a lista de termos que a resposta cravou, meia dúzia de palavras
 * que valem por parágrafos na hora de manter o vocabulário da conversa).
 *
 * O artefato NÃO entra: ele não é fala, e descrever o cartão no histórico é justamente
 * o que fazia o modelo achar que o Studio era assunto.
 */
export function textoParaHistorico(m: {
  kind?: string;
  text?: string;
  answer?: StructuredAnswer;
  studyTitle?: string;
}): string {
  if (m.kind === "structured" && m.answer) {
    const a = m.answer;
    const partes = [a.nucleo?.trim(), a.desenvolvimento?.trim()].filter(Boolean) as string[];
    if (a.conceitos?.length) partes.push("Conceitos: " + a.conceitos.join(" · "));
    const corpo = partes.join("\n\n").trim();
    if (corpo) return corpo;
  }
  if (m.kind === "study" && m.studyTitle) return `(estudo criado: ${m.studyTitle})`;
  return (m.text ?? "").trim();
}

// Frase curta = pensamento rápido (não fica "Planejando" à toa). Enquanto o harness
// real não classifica a intenção, isto mantém o loading honesto.
const isQuickPrompt = (t: string) => t.trim().split(/\s+/).filter(Boolean).length <= 8;

export default function StudyCoworkChat({ active = true }: { active?: boolean }) {
  // Abas de conversa. Antes havia UMA thread global (zaeon.cowork.thread.v1); agora cada
  // aba tem histórico próprio, e a antiga vira a aba #1 na primeira carga (ver threads.ts).
  const [threads, setThreads] = useState<Thread[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<string | null>(null);
  const [cartolinaAberta, setCartolinaAberta] = useState(false);
  const abaAtivaRef = useRef<string | null>(null);
  abaAtivaRef.current = abaAtiva;
  // Espelho das abas pra ler o valor atual dentro de callbacks sem recriá-los.
  const threadsRef = useRef<Thread[]>([]);
  threadsRef.current = threads;

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
  // Mentor ativo (SLUG, ex.: "farmacia") — null = Aura base. Vai como `mentor` a cada envio.
  const [activeMentor, setActiveMentor] = useState<string | null>(null);

  /**
   * Avisa o Escritório (components/office) qual agente está ocupado. É o único estado
   * REAL de trabalho que dá pra saber hoje: as fases do harness (route/plan/gather/…)
   * são emitidas no servidor e não chegam ao navegador. Ver EscritorioRoom.
   */
  const avisarEscritorio = useCallback((slug: string | null, estado: "ocioso" | "trabalhando" | "falando") => {
    if (!slug) return;
    window.dispatchEvent(new CustomEvent("zaeon:agente", { detail: { slug, estado } }));
  }, []);

  // O Escritório pede "falar com o Kekulé" → o chat troca de mentor.
  useEffect(() => {
    const ouvir = (e: Event) => {
      const slug = (e as CustomEvent<{ slug?: string }>).detail?.slug;
      if (typeof slug === "string" && slug) setActiveMentor(slug);
    };
    window.addEventListener("zaeon:mentor", ouvir);
    return () => window.removeEventListener("zaeon:mentor", ouvir);
  }, []);
  // Árvore de habilidades: drawer opt-in; o tópico nasce do estudo focado (ou digitado no painel).
  const [treeOpen, setTreeOpen] = useState(false);
  const [tree, setTree] = useState<SkillTreeData | null>(null);
  const [skillNode, setSkillNode] = useState<{ topicSlug: string; nodeId: string; title: string } | null>(null);
  const [treeRefresh, setTreeRefresh] = useState(0);

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
      const lista = carregarThreads(localStorage);
      const ativa = threadAtiva(localStorage, lista);
      setThreads(lista);
      threadsRef.current = lista;
      setAbaAtiva(ativa);
      abaAtivaRef.current = ativa;
      if (ativa) {
        const guardadas = carregarMensagens<Msg>(localStorage, ativa);
        if (guardadas.length) { setMessages(guardadas); hadLocal = true; }
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
      const slim = messages
        .filter((m) => m.kind !== "studio" && !(m.kind === "text" && !m.text))
        .map((m) => (m.kind === "structured" && m.studioBlock ? { ...m, studioBlock: undefined } : m)) // artefato inline fica na sessão
        .map(({ streaming, fresh, ...m }) => m); // B2: flags de animação não persistem (reload não re-digita)
      const aba = abaAtivaRef.current;
      if (aba) salvarMensagens(localStorage, aba, slim);
    } catch { /* ignore */ }
  }, [messages]);

  /**
   * ROLAGEM: chat vai pro fim, PÁGINA vai pro começo.
   *
   * Isto aqui era `scrollTop = scrollHeight` sem condição. Para um balão de chat está
   * certo — o mais novo está embaixo. Para uma página de revista está exatamente errado:
   * uma página se lê do topo, e o topo é a linha fina. Quando a resposta é mais alta que
   * a janela — ou seja, justamente quando ela vira uma página de verdade — a cabeça
   * saía por cima e o aluno caía no meio do texto.
   *
   * O "às vezes" que se via era isso: resposta curta cabe inteira, e aí fim e começo
   * aparecem juntos.
   */
  const ancorar = useCallback((idDaMensagem?: string) => {
    const el = listRef.current;
    if (!el) return;
    if (!idDaMensagem) { el.scrollTop = el.scrollHeight; return; }
    const alvo = el.querySelector<HTMLElement>(`[data-msg="${idDaMensagem}"]`);
    if (!alvo) { el.scrollTop = el.scrollHeight; return; }
    // Topo da página logo abaixo do topo da lista, com um respiro.
    //
    // Por rect e não por `offsetTop`: `offsetTop` é medido contra o offsetParent, que só
    // por acaso é o mesmo da lista — basta uma bolha nascer dentro de um wrapper
    // posicionado pra conta dar em outro lugar, e era daí que vinha o "às vezes a
    // primeira head fica fora de tela". A diferença de rects não depende de quem é pai
    // de quem.
    const topo = el.scrollTop + (alvo.getBoundingClientRect().top - el.getBoundingClientRect().top) - 12;
    el.scrollTo({ top: Math.max(0, topo), behavior: "smooth" });
  }, []);

  // Qual mensagem já foi ancorada no topo (pra ancorar UMA vez e não brigar com a
  // leitura do aluno enquanto ela cresce).
  const ancoradaRef = useRef<string | null>(null);
  useEffect(() => {
    const ultima = msgsRef.current[msgsRef.current.length - 1];
    // Resposta da Aura (texto OU revista): ancora no TOPO dela assim que aparece e NÃO
    // fica perseguindo o fim enquanto o texto é escrito. Antes, durante o streaming
    // `paginaNova()` devolvia undefined e `ancorar(undefined)` fazia
    // `scrollTop = scrollHeight` a cada token — era isso que "jogava pro final" e não
    // deixava acompanhar a abertura de um texto longo.
    if (ultima && ultima.role === "assistant" && (ultima.kind === "structured" || ultima.kind === "text")) {
      if (ancoradaRef.current !== ultima.id) {
        ancoradaRef.current = ultima.id;
        ancorar(ultima.id); // topo da resposta, uma vez
      }
      return; // enquanto a Aura escreve, o aluno controla a rolagem
    }
    // Chat curto / mensagem do usuário: só gruda no fim se ele já estava no fim.
    if (atBottom) scrollToEnd();
  }, [messages, sending, atBottom, ancorar, scrollToEnd]);

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
      if (d.attachMsgId) {
        // artefato INLINE (harness): anexa à bolha estruturada existente, sem msg nova.
        setMessages((prev) => prev.map((m) => (m.id === d.attachMsgId ? { ...m, studioBlock: block } : m)));
      } else {
        // palette manual / texto livre: comportamento de sempre (msg nova).
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", kind: "studio", studioBlock: block, at: Date.now() }]);
      }
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

  /** Guarda o que está na tela na aba atual antes de sair dela. */
  const guardarAtual = useCallback(() => {
    const aba = abaAtivaRef.current;
    if (!aba) return;
    const slim = messages
      .filter((m) => m.kind !== "studio" && !(m.kind === "text" && !m.text))
      .map((m) => (m.kind === "structured" && m.studioBlock ? { ...m, studioBlock: undefined } : m))
      .map(({ streaming, fresh, ...m }) => m);
    salvarMensagens(localStorage, aba, slim);
  }, [messages]);

  const trocarAba = useCallback((id: string) => {
    if (id === abaAtivaRef.current) return;
    guardarAtual();
    abaAtivaRef.current = id;
    setAbaAtiva(id);
    marcarAtiva(localStorage, id);
    setMessages(carregarMensagens<Msg>(localStorage, id));
    const t = tocarThread(threadsRef.current, id);
    threadsRef.current = t;
    salvarThreads(localStorage, t);
    setThreads(t);
  }, [guardarAtual]);

  // Nada de setState dentro do updater de outro setState: no StrictMode o updater roda
  // DUAS vezes em dev, e "criar aba" viraria duas abas. Calcula fora, aplica uma vez.
  const novaAba = useCallback(() => {
    guardarAtual();
    const { threads: lista, nova } = criarThread(threadsRef.current);
    salvarThreads(localStorage, lista);
    threadsRef.current = lista;
    abaAtivaRef.current = nova.id;
    setThreads(lista);
    setAbaAtiva(nova.id);
    marcarAtiva(localStorage, nova.id);
    setMessages([]);
  }, [guardarAtual]);

  const fecharAba = useCallback((id: string) => {
    const { threads: lista, proxima } = fecharThread(localStorage, threadsRef.current, id);
    salvarThreads(localStorage, lista);
    threadsRef.current = lista;
    setThreads(lista);
    if (id === abaAtivaRef.current) {
      abaAtivaRef.current = proxima;
      setAbaAtiva(proxima);
      marcarAtiva(localStorage, proxima);
      setMessages(carregarMensagens<Msg>(localStorage, proxima));
    }
  }, []);

  /** A aba ganha nome da primeira coisa que a pessoa perguntou. */
  const batizarSePreciso = useCallback((texto: string) => {
    const aba = abaAtivaRef.current;
    if (!aba) return;
    const atual = threadsRef.current.find((t) => t.id === aba);
    if (!atual || atual.titulo !== TITULO_PADRAO) return;
    const lista = renomearThread(threadsRef.current, aba, tituloAPartirDe(texto));
    threadsRef.current = lista;
    salvarThreads(localStorage, lista);
    setThreads(lista);
  }, []);

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
  // `attachMsgId` (opcional): o artefato entra NA bolha indicada (resposta estruturada) em vez
  // de virar msg nova — é assim que "texto + artefato" convivem na mesma resposta.
  /**
   * Artefato que não veio NÃO pode sumir calado: quem pediu uma imagem fica olhando pro
   * "Gerando…" achando que trava. Uma bolha curta com o motivo real da API é mais honesta
   * do que silêncio — e é o que permite diagnosticar sem abrir o log do servidor.
   */
  const avisarFalha = useCallback((motivo?: string) => {
    const texto = motivo?.trim()
      ? `Não consegui gerar esse artefato: ${motivo.trim()}`
      : "Não consegui gerar esse artefato agora. Tenta de novo em instantes.";
    setMessages((prev) => [...prev, { id: uid(), role: "assistant", kind: "text", text: texto, at: Date.now() }]);
  }, []);

  /**
   * `silencioso`: artefato que a Aura decidiu mostrar sozinha (molécula que nasceu da
   * explicação). Se falhar, cala — ninguém pediu, então avisar seria ruído. Pedido
   * explícito continua reclamando alto: aí a pessoa está esperando.
   */
  const runStudioAction = useCallback(async (kind: string, topic: string, attachMsgId?: string, silencioso = false) => {
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
    const fire = (detail: any) => window.dispatchEvent(new CustomEvent("zaeon:study:embed", { detail: { ...detail, attachMsgId } }));
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
      } else if (kind === "molecule") {
        // Não passa pelo pipeline de texto: a estrutura vem do PubChem, não de LLM.
        const res = await fetch("/api/studio/molecule", { method: "POST", headers: H, body: JSON.stringify({ spaceId, topic }) });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.meta?.sdf) fire({ studioKind: "molecule", title: data.title, data: data.meta, artifactId: data.id });
        else if (!silencioso) avisarFalha(data?.error);
      } else if (kind === "image") {
        const res = await fetch("/api/studio/image", { method: "POST", headers: H, body: JSON.stringify({ spaceId, topic }) });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.dataUrl) fire({ studioKind: "image", title: data.title || "Imagem", data: data.meta, dataUrl: data.dataUrl });
        else if (!silencioso) avisarFalha(data?.error);
      } else {
        // text kinds (mindmap/guide/faq/flashcards): agora rodam em BACKGROUND no servidor
        // (fire-and-forget) → o POST volta "queued" e a gente faz polling até "done", igual
        // a podcast/vídeo. Assim, sair da sala não interrompe a geração. Cache hit já volta
        // "done" com meta na hora.
        const res = await fetch(`/api/studio/${kind}`, { method: "POST", headers: H, body: JSON.stringify({ spaceId, topic, force: true }) });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.id) { if (!silencioso) avisarFalha(data?.error); return; }
        if (data.status === "done" && data.meta) { fire({ studioKind: kind, title: data.title, data: data.meta }); return; }
        const started = Date.now();
        while (Date.now() - started < 5 * 60_000) {
          await new Promise((r) => setTimeout(r, 2000));
          const rr = await fetch(`/api/studio/${data.id}`);
          const d = await rr.json().catch(() => null);
          if (!d) continue;
          if (d.status === "done") { fire({ studioKind: kind, title: d.title, data: d.meta }); return; }
          if (d.status === "error") { if (!silencioso) avisarFalha(d?.error); return; }
        }
      }
    } catch {
      if (!silencioso) avisarFalha();
    }
  }, [focusIds, spaces, avisarFalha]);

  // ── envio pro chat da Aura ──────────────────────────────────────────────────
  // `override` = envio direto (clique numa opção/conceito da resposta do harness),
  // sem passar pelo campo de texto — B3 do backlog v2.
  const send = useCallback(async (override?: string) => {
    const prompt = (typeof override === "string" ? override : input).trim();
    if (!prompt || sending) return;
    setQuickThinking(isQuickPrompt(prompt));

    // O histórico levava só `m.text`, que numa resposta estruturada é o NÚCLEO — uma
    // frase. Ou seja: a Aura relia as próprias respostas como manchetes sem matéria, e
    // por isso "esquecia" o que tinha explicado dois turnos antes. Vai o corpo inteiro.
    const history = msgsRef.current
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", texto: textoParaHistorico(m) }))
      .filter((h) => h.texto)
      .map((h) => ({ role: h.role, parts: [{ text: h.texto }] }));

    // mensagem da assistente entra vazia e vai sendo preenchida aos poucos (streaming)
    const asstId = uid();
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", kind: "text", text: prompt, at: Date.now() },
      { id: asstId, role: "assistant", kind: "text", text: "", streaming: true, at: Date.now() },
    ]);
    setInput("");
    batizarSePreciso(prompt);
    avisarEscritorio(activeMentor, "trabalhando");
    setSending(true);

    const patchAsst = (text: string) =>
      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, text } : m)));

    const focusTitles = focusIds.map(spaceTitle);
    // MODO ACADÊMICO = FLEXÍVEL na Sala de Estudos (o rigor pleno é da Sala de Pesquisa).
    const flexClause =
      " MODO FLEXÍVEL: responda com conhecimento geral quando o tema não exigir academia " +
      "(como uma LLM comum faria). Ao buscar/citar, amplie o escopo além do acadêmico — " +
      "reportagens, artigos, web, enciclopédia valem. NUNCA recuse por falta de fonte acadêmica; " +
      "se não houver paper, responda com o que há e sinalize a natureza da fonte. O rigor acadêmico " +
      "pleno só é obrigatório quando o pedido for criar/revisar um trabalho.";
    // AQUI MORAVA O CARDÁPIO. A linha sem foco terminava com "ofereça transformar o
    // assunto em artefatos do Studio (Guia, Mapa mental, Linha do tempo, Flashcards,
    // FAQ, Imagem, Podcast, Vídeo)" — em TODO turno. O modelo obedecia, e a conversa
    // virava um vendedor simpático: resposta rasa + menu. Artefato agora é decisão do
    // código, a partir do assunto; o modelo só conversa.
    const systemContext = (focusIds.length
      ? `O usuário está no co-working da Sala de Estudos e FOCOU ${focusIds.length} estudo(s): ${focusTitles.join("; ")}. Concentre-se nesse(s) estudo(s) ao responder.`
      : `O usuário está no co-working da Sala de Estudos. Converse com naturalidade, mantendo o fio do assunto entre as mensagens.`)
      + " Nunca ofereça recursos, ferramentas ou botões da plataforma, e nunca comente o que você 'pode gerar' — fale do tema."
      + flexClause;

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
            // posição do aluno na árvore de habilidades → o mentor sabe onde você está (harness)
            skillTopic: skillNode?.topicSlug ?? tree?.topicSlug,
            skillNodeId: skillNode?.nodeId,
            // Cartolina = memória da conversa: o board é o da ABA (conversa) ativa, e o card
            // lembra de qual resposta veio (tap no card → volta pra essa mensagem).
            cartolinaScopeId: abaAtivaRef.current ?? undefined,
            cartolinaMsgId: asstId,
          },
          mentor: activeMentor ?? undefined,   // slug do mentor ativo → Aura com a voz da área
        }),
      });

      if (!r.ok || !r.body) {
        patchAsst("Não consegui responder agora. Tente de novo.");
      } else {
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let acc = "";          // texto cru recebido (protocolo + conteúdo)
        let limpo = "";        // o mesmo, sem os eventos de progresso
        let faseVista = "";    // última fase já pintada — evita setState a cada chunk
        let target = "";       // parte VISÍVEL alvo (sem a sentinela)
        let shown = 0;         // quantas letras já reveladas
        let ended = false;

        // Datilografia (B2): revela em ordem, por frame (rAF), com TETO de letras por
        // frame — os chunks do stream viram digitação contínua, sem "despejar" blocos.
        const typed = new Promise<void>((resolve) => {
          const tick = () => {
            if (shown < target.length) {
              shown = safeCut(target, shown + typeStep(target.length - shown));
              patchAsst(target.slice(0, shown));
            } else if (ended) {
              resolve();
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          // O progresso sai do fio ANTES de qualquer outra conta: se ficasse no acumulado,
          // a sentinela viraria texto datilografado na tela e contaminaria o fallback.
          const { limpo: lp, eventos } = separarProgresso(acc);
          limpo = lp;
          const f = faseCorrente(eventos);
          if (f && f.rotulo !== faseVista) {
            faseVista = f.rotulo;
            setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, fase: f.rotulo } : m)));
          }
          const cut = [limpo.indexOf(STUDIO_SENTINEL), limpo.indexOf(STRUCTURED_SENTINEL)].filter((i) => i >= 0);
          target = cut.length ? limpo.slice(0, Math.min(...cut)) : limpo;   // datilografa só o visível
        }

        const structured = parseStructuredStream(limpo);
        const si = limpo.indexOf(STUDIO_SENTINEL);
        if (structured) {
          // HARNESS: resposta estruturada — converte a bolha placeholder em cartão rico.
          // Payload malformado (stream cortado etc.) → degrada pra TEXTO, nunca pra vazio.
          target = ""; ended = true;
          if (structured.kind === "answer") {
            const a = structured.answer;
            setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, kind: "structured", answer: a, text: a.nucleo, streaming: false, fresh: true } : m)));
            // Artefatos inline: reusa runStudioAction, anexando NA MESMA bolha (asstId).
            // O tópico é o `title` do ref, NÃO a pergunta inteira: "por que o café me
            // deixa acordado" não resolve no PubChem; "cafeína" resolve.
            for (const art of a.artifacts ?? []) {
              if (art.studioKind && !art.studioKind.startsWith("research:")) {
                // Pedido explícito falha em voz alta; artefato que a Aura trouxe de
                // brinde falha calado — ninguém pediu, ninguém precisa saber.
                void runStudioAction(art.studioKind, art.title?.trim() || prompt, asstId, !art.explicito);
              }
            }
            // L1 grava o corpo, não a manchete: é esta transcrição que vira memória
            // durável, e memória de manchete não serve pra nada depois.
            appendTranscript("estudos", focusIds[0] ?? null, [
              { role: "user", text: prompt },
              { role: "assistant", text: textoParaHistorico({ kind: "structured", answer: a }) || a.nucleo },
            ]);
          } else {
            patchAsst(structured.text);
            appendTranscript("estudos", focusIds[0] ?? null, [
              { role: "user", text: prompt },
              { role: "assistant", text: structured.text },
            ]);
          }
        } else if (si >= 0) {
          // TOOL-LOOP (Fase 0): ação — não datilografa; encerra e trata.
          target = ""; ended = true;
          let action: any = null;
          try { action = JSON.parse(limpo.slice(si + STUDIO_SENTINEL.length)); } catch { /* ignore */ }
          if (action?.kind) {
            patchAsst(action.text || "Gerando o artefato…");
            void runStudioAction(action.kind, action.topic || prompt);
          } else {
            patchAsst("Sem resposta agora.");
          }
        } else {
          target = limpo; ended = true;
          await typed;                       // deixa a digitação alcançar o fim
          if (!limpo.trim()) patchAsst("Sem resposta agora.");
          // L1: grava o turno durável (fire-and-forget). scopeId = estudo focado, se houver.
          else appendTranscript("estudos", focusIds[0] ?? null, [
            { role: "user", text: prompt },
            { role: "assistant", text: limpo },
          ]);
        }
      }
    } catch {
      patchAsst("Falha de rede ao falar com a Aura.");
    } finally {
      avisarEscritorio(activeMentor, "ocioso");
      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, fase: undefined, ...(m.streaming ? { streaming: false } : null) } : m)));
      setSending(false);
      // o mentor pode ter subido a maestria neste turno → o painel refaz o progresso
      if (tree) setTreeRefresh((n) => n + 1);
    }
  }, [input, sending, focusIds, spaceTitle, runStudioAction, activeMentor, skillNode, tree, avisarEscritorio, batizarSePreciso]);

  // Clicar num nó da árvore: conversa scopada naquele nó (vai pro composer + chip de foco).
  const onNodeChat = useCallback((node: SkillNodeState, t: SkillTreeData) => {
    setSkillNode({ topicSlug: t.topicSlug, nodeId: node.id, title: node.title });
    setInput(`Quero dominar "${node.title}" (${t.topicLabel}). Me conduz com pistas e perguntas, sem entregar a resposta pronta.`);
  }, []);

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
    (focusIds.length || skillNode) ? (
      <div className="flex flex-wrap items-center gap-1.5 px-1 pb-2">
        {skillNode && (
          <span className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-[11.5px] font-tech
            bg-gradient-to-r from-violet-500/15 to-cyan-400/15 text-violet-700 dark:text-cyan-200 border border-violet-400/40">
            <GitBranch size={11} /> {skillNode.title}
            <button type="button" onClick={() => setSkillNode(null)} title="Sair do nó" className="ml-0.5 rounded-full hover:bg-violet-500/20 p-0.5">
              <X size={10} />
            </button>
          </span>
        )}
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
  ), [focusIds, spaceTitle, removeFocus, skillNode]);

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

        {/* ⟁ Árvore de habilidades — drawer opt-in por cima da conversa (não troca a tela) */}
        {treeOpen && (
          <div className="absolute inset-y-0 right-0 z-30 w-full sm:w-[460px] shadow-[-24px_0_60px_-30px_rgba(15,23,42,0.5)]">
            <SkillTreePanel
              topic={focusIds[0] ? spaceTitle(focusIds[0]) : null}
              focusNodeId={skillNode?.nodeId ?? null}
              refreshKey={treeRefresh}
              onTree={setTree}
              onNodeChat={onNodeChat}
              onClose={() => setTreeOpen(false)}
            />
          </div>
        )}

        {/* Cartolina da conversa: botão + board por cima do chat. Tap num card → volta à resposta. */}
        {CARTOLINA_ON && abaAtiva && (
          <button
            type="button"
            onClick={() => setCartolinaAberta(true)}
            aria-label="Abrir a cartolina desta conversa"
            title="Cartolina desta conversa"
            className="absolute z-20 right-4 top-3 min-h-[44px] min-w-[44px] px-3 rounded-full flex items-center gap-1.5 text-sm
              bg-white/90 dark:bg-white/10 border border-slate-200 dark:border-white/15 shadow-lg backdrop-blur-xl
              text-slate-700 dark:text-white/85 hover:text-cyan-600 dark:hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            <FileText size={16} /> Cartolina
          </button>
        )}
        {CARTOLINA_ON && cartolinaAberta && abaAtiva && (
          <div className="absolute inset-0 z-40">
            <LoungeCartolina
              embedded surface="estudos" scopeId={abaAtiva} abrirDeInicio
              onFechar={() => setCartolinaAberta(false)}
              onAbrirConversa={(msgId) => { setCartolinaAberta(false); requestAnimationFrame(() => ancorar(msgId)); }}
            />
          </div>
        )}

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

        {/* Abas de conversa. Ficam ACIMA da conversa e dentro da sala: abrir conversa
            nova nunca mexe na posição das salas (Estudos, Aulas, Pesquisa). */}
        <div className="px-3 pt-2">
          <ThreadTabs
            threads={threads}
            ativa={abaAtiva}
            aoTrocar={trocarAba}
            aoCriar={novaAba}
            aoFechar={fecharAba}
            ocupada={sending ? abaAtiva : null}
          />
        </div>

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
            {/* B2: cursor piscando da resposta em streaming */}
            <style>{`@keyframes zCaret { 0%,45% { opacity:1 } 50%,100% { opacity:0 } } .z-caret { display:inline-block; width:2px; height:1em; margin-left:2px; vertical-align:-0.15em; background:currentColor; opacity:.7; animation: zCaret 1s steps(1) infinite; } @media (prefers-reduced-motion: reduce) { .z-caret { animation: none; } }`}</style>
            {messages.length === 0 ? null : (
              messages.map((m) => {
                if (m.kind === "text") {
                  const isUser = m.role === "user";
                  return (
                    <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 font-tech text-[22px] leading-[1.65] whitespace-pre-wrap
                        ${isUser
                          ? "bg-slate-100 text-slate-900 border border-slate-200/80 dark:bg-white/[0.09] dark:text-white/90 dark:border-white/10"
                          : "bg-white/80 dark:bg-white/[0.05] text-slate-800 dark:text-white/90 border border-slate-200/70 dark:border-white/10 backdrop-blur-xl"}`}>
                        {m.text
                          ? (isUser
                              // Mensagem do usuário fica literal (ele digitou, não é markdown).
                              ? <>{m.text}</>
                              // Resposta da Aura: formata markdown (## títulos, **negrito**, *itálico*,
                              // `código`, bullets) em vez de mostrar os asteriscos/hashes crus. Seguro
                              // em streaming: pares não-fechados ficam como texto até fecharem.
                              : <><ChatMarkdown text={m.text} />{m.streaming && <span aria-hidden className="z-caret" />}</>)
                          : (!isUser && <AuraThinking active fase={m.fase} phases={quickThinking ? ["Pensando"] : ["Pensando", "Elaborando"]} />)}
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
                if (m.kind === "structured" && m.answer) {
                  // resposta rica do harness; o artefato (se houver) entra no slot do cartão
                  const padrao = (
                    <StructuredAnswerView
                      answer={m.answer}
                      typing={!!m.fresh}
                      onConcept={(c) => void send(`Me explica melhor: ${c}`)}
                      onNext={(s) => void send(s)}
                    >
                      {m.studioBlock ? <StudioBlock block={m.studioBlock} collapsed={false} /> : null}
                    </StructuredAnswerView>
                  );
                  // MODO REVISTA: só em resposta longa ou com artefato (§10 do plano).
                  // Resposta curta continua no balão — revista com 3 linhas é exagero.
                  const revista = podeVirarRevista(m.answer, !!m.studioBlock);
                  return (
                    <div key={m.id} data-msg={m.id} className="flex justify-start">
                      <div className={revista ? "w-full" : "max-w-[85%] w-full"}>
                        {revista ? (
                          <MagazineBoundary fallback={padrao}>
                            <MagazineAnswerView
                              answer={m.answer}
                              streaming={!!m.streaming}
                              recemChegada={!!m.fresh}
                              aoAssentar={() => ancorar(m.id)}
                              artefato={m.studioBlock ?? null}
                              onNext={(s) => void send(s)}
                              agente="Aura"
                            />
                          </MagazineBoundary>
                        ) : padrao}
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
              onSubmit={() => void send()}
              onToggleStudio={() => setStudioOpen((v) => !v)}
              studioOpen={studioOpen}
              busy={sending}
              idle={messages.length === 0 && !sending}
              active={active && !openStudyId}
            >
              {/* ⟁ Aura ▾ — seletor: Aura base ou um mentor plugado */}
              <div className="flex items-center gap-2">
                <MentorPill value={activeMentor} onChange={(slug) => setActiveMentor(slug)} />
                <button
                  type="button"
                  onClick={() => setTreeOpen((v) => !v)}
                  title="Árvore de habilidades do tópico"
                  aria-pressed={treeOpen}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold font-tech border transition-colors
                    ${treeOpen
                      ? "bg-gradient-to-r from-violet-500/15 to-cyan-400/15 text-violet-700 dark:text-cyan-200 border-violet-400/40"
                      : "text-slate-500 dark:text-white/50 border-slate-200 dark:border-white/10 hover:text-violet-600 hover:border-violet-300"}`}
                >
                  <GitBranch size={12} /> Árvore{tree ? ` ${tree.nodes.filter((n) => n.status === "mastered").length}/${tree.nodes.length}` : ""}
                </button>
              </div>
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
