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
import { avisarEscrevendo } from "@/lib/research/zaeonEventos";
import CoworkComposer from "@/components/study/CoworkComposer";
import AuraThinking from "@/components/study/AuraThinking";
import AgentePilula, { RECUO_ROSTO } from "@/components/agents/avatar/AgentePilula";
import BoasVindasAgente from "@/components/agents/avatar/BoasVindasAgente";
import { useFalaAoChegar, useManifesto, usePublicarPresenca } from "@/components/agents/avatar/hooks";
import { sinalDoChat } from "@/lib/avatars/presenca";
import LivrosCartao from "@/components/chat/LivrosCartao";
import { researchWorkType } from "@/lib/agent/tools";
import { hydrateTranscript, type TranscriptWire } from "@/lib/agent/transcriptClient";
import { useArmazemDaConta } from "@/lib/chat/contaNoNavegador";
import { apagarNoServidor, blocoDaMensagem, cortarNoServidor, gravarArtefato, gravarTurno, mensagensDoServidor, renomearNoServidor, sincronizarConversas } from "@/lib/chat/conversasServidor";
import type { Armazem } from "@/lib/chat/threads";
import StructuredAnswerView from "@/components/study/StructuredAnswerView";
import type { StructuredAnswer } from "@/lib/agent/contracts";
import { parseStructuredStream, STRUCTURED_SENTINEL } from "@/lib/agent/structured-client";
import { separarProgresso, faseCorrente } from "@/lib/agent/progresso";
import { TCC_CROSS_ON, avisarTccMudou, tccApi } from "@/lib/tcc/client";
import { empurrarPontos, pontosDaResposta } from "@/lib/lounge3d/pontos";
import { DIRETRIZ_PESQUISA } from "@/lib/ai/salaPersona";
import ConversasSidebar from "@/components/chat/ConversasSidebar";
import { useConversasSlot } from "@/components/chat/ConversasSlot";
import { consumirPedido, EVT_PEDIDO_CONVERSA, type PedidoConversa } from "@/lib/chat/conversasNav";
import DicaSubTema from "@/components/chat/DicaSubTema";
import ChatZoom, { useChatFontScale } from "@/components/chat/ChatZoom";
import { AcoesPergunta, AcoesResposta, EdicaoPergunta } from "@/components/chat/MensagemAcoes";
import { fonteChat } from "@/lib/ui/chatFontScale";
import StudioBlock, { type StudioBlockData } from "@/components/studio/StudioBlock";
import { criarEstudo, gerarArtefato } from "@/lib/studio/studioClient";
import Desenhando from "@/components/chat/Desenhando";
import CartaoArtefato from "@/components/chat/CartaoArtefato";
import { abrirDocumento, KINDS_EM_ABA } from "@/lib/chat/documentos";
import { assuntoDe, pedeAula } from "@/lib/agent/aprender";
import BolinhaCerebro from "@/components/cerebro/BolinhaCerebro";
import CerebroPanel from "@/components/cerebro/CerebroPanel";
import { useCerebro } from "@/components/cerebro/useCerebro";
import { AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { AvisoSoltar, ChipAnexo, ChipsLote, useAnexoChat } from "@/components/chat/useAnexoChat";
import { contextoDoLote, rotuloDoLote } from "@/lib/chat/loteAnexos";
import { BarraBase } from "@/components/chat/MinhaBase";
import {
  carregarThreads, salvarThreads, criarThread, criarSubThread, fecharThread, renomearThread, tocarThread,
  carregarMensagens, salvarMensagens, threadAtiva, marcarAtiva, tituloAPartirDe,
  ESCOPO_PESQUISA, TITULO_PADRAO, type Thread,
} from "@/lib/chat/threads";

// `answer` presente = resposta estruturada do harness (render rico); `text` = nucleo (histórico).
// `blocos` = artefatos inline da resposta (diagrama, aula, molécula…); `desenhando` = aviso enquanto um demorado sai.
type Msg = { id: string; role: "user" | "assistant"; text: string; at?: number; answer?: StructuredAnswer; fase?: string; anexo?: string; blocos?: StudioBlockData[]; desenhando?: string };

/** Kinds que o servidor gera SEM um estudo de origem (o resto do Studio precisa de um). */
const SEM_ESTUDO = new Set(["diagram", "mindmap", "molecule", "aula"]);
/** Artefatos que são só um id (o conteúdo mora no servidor): sobrevivem ao reload. */
const LEVES = new Set(["diagram", "aula"]);
const AVISO: Record<string, string> = {
  diagram: "Desenhando o diagrama interativo…",
  mindmap: "Desenhando o mapa…",
  aula: "Preparando a aula interativa — plano, roteiro e narração (1 a 3 min)…",
};

/** #663: a mensagem que veio do servidor, na forma da tela. Diagrama e aula voltam só com o número e abrem por ele. */
function msgDoServidor(w: TranscriptWire): Msg {
  const bloco = blocoDaMensagem(w);
  return { id: w.id, role: w.role, text: w.text, at: Date.parse(w.at) || undefined, ...(bloco ? { blocos: [{ ...bloco, data: null } as unknown as StudioBlockData] } : {}) };
}

/** O que vai pro localStorage: diagrama/aula são só um id; o resto fica na sessão. */
const enxugar = (m: Msg): Msg => {
  if (!m.blocos && !m.desenhando) return m;
  const leves = (m.blocos ?? []).filter((b) => LEVES.has(b.studioKind) && b.artifactId).map((b) => ({ ...b, data: null }));
  return { ...m, blocos: leves.length ? leves : undefined, desenhando: undefined };
};

/** A sala → o chat: abrir uma conversa nova (o ＋ da sala). */
export const EVT_NOVA_CONVERSA = "zaeon:research:nova-conversa";

// Deve bater com RESEARCH_SENTINEL de app/api/ai/chat/route.ts (a estruturada vem do structured-client).
const RESEARCH_SENTINEL = "@@RESEARCH_ACTION@@";
// L0 (docs/MEMORY_AND_PERSISTENCE.md): a conversa da Sala de Pesquisa persiste por TEMA
// (conversas/abas — lib/chat/threads, escopo da Pesquisa; a conversa única antiga vira a aba #1).
const DRAFT_KEY_R = "zaeon.research.draft.v1";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const isQuick = (t: string) => t.trim().split(/\s+/).filter(Boolean).length <= 8;

// Sala de Pesquisa = MODO ACADÊMICO ESTRITO (única possibilidade, não é opção).
const ACADEMIC_STRICT = " " + DIRETRIZ_PESQUISA;

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

/** #663: cada conta tem as suas conversas; trocar de conta remonta o chat com a área da outra. */
export default function ResearchChat(props: Omit<Parameters<typeof ChatDaConta>[0], "armazem">) {
  const area = useArmazemDaConta();
  if (!area) return null;
  return <ChatDaConta key={area.conta} armazem={area.armazem} {...props} />;
}

function ChatDaConta({
  armazem,
  workType,
  tccWorkId,
  active = true,
  comAbas = false,
  compacto = false,
  lateral,
  slotTopo,
  emCena = true,
  onAtivar,
  onGerando,
}: {
  armazem: Armazem;
  workType?: string | null;
  /** TCC cross-sala aberto na folha: o chat lapida ESTE documento — e tudo nasce como sugestão. */
  tccWorkId?: string | null;
  /** Em cena (sala/sub-aba visível): o composer recebe o cursor sem precisar clicar. */
  active?: boolean;
  /** Sala unificada: mostra as conversas (um tema cada, com sub-temas) na barra lateral esquerda. */
  comAbas?: boolean;
  /** Numa COLUNA estreita: sem o recuo grande à esquerda e com letra menor. */
  compacto?: boolean;
  /** Sala com ABAS: a barra de conversas vai pra coluna ESQUERDA da sala (portal) — fica à mostra
   *  mesmo com um documento aberto no topo; sem isto, ela fica à esquerda dentro do próprio chat. */
  lateral?: HTMLElement | null;
  /** O TOPO da sala (barra de documentos): a bolinha do cérebro (traçador de percurso) vai pra lá por
   *  portal, só o sinal, sem nome. Sem slot, ela fica aqui, no topo do chat. */
  slotTopo?: HTMLElement | null;
  /** A conversa está à mostra (e não um documento) — senão nenhuma conversa fica acesa na barra. */
  emCena?: boolean;
  /** Clicou numa conversa → a sala mostra o chat (o documento aberto no topo continua o mesmo). */
  onAtivar?: () => void;
  /** Avisa a sala quando a resposta começa/termina (o friso da pasta "Conversa" varre enquanto gera). */
  onGerando?: (gerando: boolean) => void;
}) {
  const recuo = compacto ? "ml-0 mr-0" : "ml-4 sm:ml-8 lg:ml-14 mr-0 sm:mr-2";
  // Com um TCC cross-sala aberto, o padrão é LAPIDAR (sugestões com fonte verificada); o aluno
  // pode desligar pra só conversar sobre o tema.
  const [lapidar, setLapidar] = useState(true);
  const modoTcc = TCC_CROSS_ON && !!tccWorkId && lapidar;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // a ZAEON do painel de documentos (components/research/ZaeonDocumentos) escreve no tablet enquanto a resposta sai
  useEffect(() => { avisarEscrevendo(sending); }, [sending]);
  // o friso da pasta "Conversa" (PastasEmpilhadas, na sala) varre enquanto gera; ao desmontar, apaga
  useEffect(() => { onGerando?.(sending); }, [sending, onGerando]);
  useEffect(() => () => onGerando?.(false), [onGerando]);
  const [quick, setQuick] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Editar a própria pergunta e reenviar (estilo ChatGPT): id da mensagem em edição.
  const [editando, setEditando] = useState<string | null>(null);
  const zoom = useChatFontScale();
  const listRef = useRef<HTMLDivElement>(null);
  const wt = workType || "trabalho";
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = messages;
  // Conversas (temas): cada aba tem histórico próprio. Sem `comAbas` há uma só (igual a antes).
  const [threads, setThreads] = useState<Thread[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<string | null>(null);
  const threadsRef = useRef<Thread[]>([]);
  const abaAtivaRef = useRef<string | null>(null);
  // Cérebro da conversa ativa (HANDOFF_CEREBRO_AURA §3): bolinha + painel, atrás de NEXT_PUBLIC_MAP_HARNESS.
  const [cerebroAberto, setCerebroAberto] = useState(false);
  const cerebro = useCerebro(comAbas ? abaAtiva : null, { aberto: cerebroAberto });
  // Clicar FORA do chat fecha o cérebro (o painel para a propagação do próprio mousedown).
  useEffect(() => {
    if (!cerebroAberto) return;
    // (o cartão do tour do laboratório, por cima do mapa, também não conta como "fora")
    const h = (e: MouseEvent) => { const root = rootRef.current; if (root && !root.contains(e.target as Node) && !(e.target as Element | null)?.closest?.("[data-tour-cartao]")) setCerebroAberto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cerebroAberto]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  // Carga inicial: L0 (armazem) primeiro; se vazio, L1 durável (DB). + rascunho.
  useEffect(() => {
    try { const d = armazem.getItem(DRAFT_KEY_R); if (d) setInput(d); } catch { /* ignore */ }
    let hadLocal = false;
    try {
      const lista = carregarThreads(armazem, ESCOPO_PESQUISA);
      const ativa = threadAtiva(armazem, lista, ESCOPO_PESQUISA);
      setThreads(lista); threadsRef.current = lista;
      setAbaAtiva(ativa); abaAtivaRef.current = ativa;
      if (ativa) {
        const guardadas = carregarMensagens<Msg>(armazem, ativa, ESCOPO_PESQUISA);
        if (guardadas.length) { setMessages(guardadas); hadLocal = true; }
      }
    } catch { /* ignore */ }
    // #663: a lista do servidor entra na do navegador; a conversa aberta sem cópia aqui vem de lá
    (async () => {
      const juntas = await sincronizarConversas("pesquisa", armazem, ESCOPO_PESQUISA, () => threadsRef.current);
      if (juntas) { threadsRef.current = juntas; setThreads(juntas); }
      if (hadLocal) return;
      const ativa = abaAtivaRef.current;
      const daConversa = ativa ? await mensagensDoServidor("pesquisa", ativa) : [];
      const wire = daConversa.length ? daConversa : await hydrateTranscript("pesquisa", null);
      if (wire.length && abaAtivaRef.current === ativa && !msgsRef.current.length) setMessages(wire.map(msgDoServidor));
    })();
  }, []);

  // Espelha a conversa ATIVA (últimas 60) e o rascunho no localStorage — não perde ao trocar de aba/reload.
  useEffect(() => {
    const aba = abaAtivaRef.current;
    if (aba) salvarMensagens(armazem, aba, messages.filter((m) => m.text).map(enxugar), ESCOPO_PESQUISA);
  }, [messages]);
  useEffect(() => {
    try { input ? armazem.setItem(DRAFT_KEY_R, input) : armazem.removeItem(DRAFT_KEY_R); } catch { /* ignore */ }
  }, [input]);

  // Trocar/criar/fechar conversa — bloqueado enquanto responde (a resposta em curso pertence
  // à conversa que a pediu; trocar no meio a perderia).
  const rootRef = useRef<HTMLDivElement>(null);
  const focarComposer = () => requestAnimationFrame(() => rootRef.current?.querySelector("textarea")?.focus({ preventScroll: true }));
  const sendRef = useRef<(t?: string) => void>(() => {});
  // 📎 / soltar arquivo na conversa: a IA lê o PDF (não abre o leitor). ▶ da biblioteca também chega aqui.
  const { anexo, anexoRef, tirar: tirarAnexo, anexarArquivos, soltar, arrastando, envios, versaoBase, lote, loteRef, tirarDoLote } = useAnexoChat("pesquisa", {
    focar: focarComposer,
    perguntar: (t) => { onAtivar?.(); sendRef.current(t); },
    // Minha base (RAG F3): a Aura confirma o lote guardado na conversa
    aoGuardar: (texto) => setMessages((prev) => [...prev, { id: uid(), role: "assistant", text: texto }]),
  });
  const trocarAba = (id: string) => {
    onAtivar?.();
    if (sending || id === abaAtivaRef.current) return;
    abaAtivaRef.current = id; setAbaAtiva(id);
    marcarAtiva(armazem, id, ESCOPO_PESQUISA);
    const guardadas = carregarMensagens<Msg>(armazem, id, ESCOPO_PESQUISA);
    setMessages(guardadas);
    // #663: conversa criada em outro aparelho: as mensagens vêm do servidor
    if (!guardadas.length) void mensagensDoServidor("pesquisa", id).then((wire) => { if (wire.length && abaAtivaRef.current === id && !msgsRef.current.length) setMessages(wire.map(msgDoServidor)); });
    focarComposer();
    const t = tocarThread(threadsRef.current, id);
    threadsRef.current = t; salvarThreads(armazem, t, ESCOPO_PESQUISA); setThreads(t);
  };
  const novaAba = () => {
    onAtivar?.();
    if (sending) return;
    if (anexoRef.current) tirarAnexo();   // conversa nova começa sem o arquivo da anterior
    tirarDoLote();
    const { threads: lista, nova } = criarThread(threadsRef.current);
    threadsRef.current = lista; salvarThreads(armazem, lista, ESCOPO_PESQUISA); setThreads(lista);
    abaAtivaRef.current = nova.id; setAbaAtiva(nova.id);
    marcarAtiva(armazem, nova.id, ESCOPO_PESQUISA);
    setMessages([]);
    focarComposer();
  };
  const novaAbaRef = useRef<() => void>(() => {});
  const trocarAbaRef = useRef<(id: string) => void>(() => {});
  // Pedido da SIDEBAR principal (clicou numa conversa/"Nova pesquisa" estando noutra sala):
  // atende o bilhete ao montar (as conversas já carregadas) e os eventos dali pra frente.
  useEffect(() => {
    if (!threads.length) return;
    const atender = (p: PedidoConversa | null) => {
      if (!p || p.sala !== "pesquisa") return;
      if (p.nova) novaAbaRef.current();
      else if (p.id && threadsRef.current.some((t) => t.id === p.id)) trocarAbaRef.current(p.id);
    };
    atender(consumirPedido("pesquisa"));
    const on = (e: Event) => { atender((e as CustomEvent<PedidoConversa>).detail); consumirPedido("pesquisa"); };
    window.addEventListener(EVT_PEDIDO_CONVERSA, on);
    return () => window.removeEventListener(EVT_PEDIDO_CONVERSA, on);
  }, [threads.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = () => novaAbaRef.current();
    window.addEventListener(EVT_NOVA_CONVERSA, on);
    return () => window.removeEventListener(EVT_NOVA_CONVERSA, on);
  }, []);
  const fecharAba = (id: string) => {
    if (sending) return;
    const { threads: lista, proxima } = fecharThread(armazem, threadsRef.current, id, ESCOPO_PESQUISA);
    void apagarNoServidor("pesquisa", id, armazem, ESCOPO_PESQUISA);
    threadsRef.current = lista; salvarThreads(armazem, lista, ESCOPO_PESQUISA); setThreads(lista);
    if (id === abaAtivaRef.current) {
      abaAtivaRef.current = proxima; setAbaAtiva(proxima);
      marcarAtiva(armazem, proxima, ESCOPO_PESQUISA);
      setMessages(carregarMensagens<Msg>(armazem, proxima, ESCOPO_PESQUISA));
    }
  };
  const renomearAba = (id: string, titulo: string) => {
    const lista = renomearThread(threadsRef.current, id, titulo);
    threadsRef.current = lista; salvarThreads(armazem, lista, ESCOPO_PESQUISA); setThreads(lista);
    renomearNoServidor("pesquisa", lista.find((t) => t.id === id));
  };
  // Sub-tema do mesmo nicho: sub-conversa ligada à mãe, herdando o contexto (vai junto em cada envio).
  // Começa vazia, com "Aprofunde: " no composer — a 1ª pergunta batiza a sub-conversa.
  const novaSub = (paiId: string, contexto?: string) => {
    onAtivar?.();
    if (sending) return;
    if (anexoRef.current) tirarAnexo();
    tirarDoLote();
    const pai = threadsRef.current.find((t) => t.id === paiId);
    let ctx = contexto;
    if (ctx === undefined && pai) {
      // Pelo "＋ sub-tema" da barra: o contexto é o fim da última resposta da mãe.
      const msgsPai = paiId === abaAtivaRef.current ? msgsRef.current : carregarMensagens<Msg>(armazem, paiId, ESCOPO_PESQUISA);
      ctx = [...msgsPai].reverse().find((m) => m.role === "assistant" && m.text)?.text.slice(-1500);
    }
    const { threads: lista, nova } = criarSubThread(threadsRef.current, paiId, TITULO_PADRAO, ctx);
    threadsRef.current = lista; salvarThreads(armazem, lista, ESCOPO_PESQUISA); setThreads(lista);
    abaAtivaRef.current = nova.id; setAbaAtiva(nova.id);
    marcarAtiva(armazem, nova.id, ESCOPO_PESQUISA);
    setMessages([]); setEditando(null);
    setInput((v) => v.trim() ? v : "Aprofunde: ");
    focarComposer();
  };
  /** "Aprofundar num sub-tema" a partir de UMA resposta: o contexto é ela. */
  const aprofundar = (m: Msg) => {
    const aba = abaAtivaRef.current;
    if (aba) novaSub(aba, m.text.slice(-1500));
  };
  /** Refaz a conversa a partir da pergunta `idx` (editar/regenerar): corta dali pra baixo e reenvia. */
  const reenviar = (idx: number, texto: string) => {
    if (sending) return;
    const corte = msgsRef.current.slice(0, idx);
    if (abaAtivaRef.current) cortarNoServidor("pesquisa", abaAtivaRef.current, msgsRef.current[idx]?.at);
    msgsRef.current = corte;   // o send lê o histórico daqui, já cortado
    setMessages(corte);
    setEditando(null);
    sendRef.current(texto);
  };
  // 1ª fala numa conversa sem nome → batiza pelo tema (como toda IA faz).
  const nomearPeloTema = (texto: string) => {
    const aba = abaAtivaRef.current;
    const atual = threadsRef.current.find((t) => t.id === aba);
    if (!aba || !atual || atual.titulo !== TITULO_PADRAO) return;
    const lista = renomearThread(threadsRef.current, aba, tituloAPartirDe(texto.replace(/^aprofunde:\s*/i, "")));
    threadsRef.current = lista; salvarThreads(armazem, lista, ESCOPO_PESQUISA); setThreads(lista);
  };
  // Numa sub-conversa, o modelo sabe de qual nicho ela saiu (título da mãe + o trecho herdado).
  const contextoDaSub = () => {
    const atual = threadsRef.current.find((t) => t.id === abaAtivaRef.current);
    if (!atual?.parentId) return "";
    const mae = threadsRef.current.find((t) => t.id === atual.parentId);
    return ` Esta conversa é um SUB-TEMA da conversa "${mae?.titulo ?? "anterior"}" (mesmo nicho): aprofunde o recorte pedido sem perder o fio dela.` +
      (atual.contexto ? ` Contexto herdado da conversa-mãe: """${atual.contexto}""".` : "");
  };

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

  // ARTEFATOS INLINE (o seam do harness: StructuredAnswer.artifacts[] → viewers do Studio). Antes a Sala
  // de Pesquisa os ignorava; agora cada um é gerado e entra NA MESMA bolha, com o rigor da sala.
  const materializarArtefatos = useCallback(async (msgId: string, a: StructuredAnswer, prompt: string, pdf?: { dataUrl: string; nome?: string }) => {
    const patchMsg = (f: (m: Msg) => Msg) => setMessages((prev) => prev.map((m) => (m.id === msgId ? f(m) : m)));
    for (const art of a.artifacts ?? []) {
      const kind = art.studioKind;
      if (!kind || kind.startsWith("research:")) continue;
      // "aula interativa: me dá uma aula sobre X" (rótulo da tool) → "X"
      const topic = kind === "aula" ? assuntoDe((art.title || prompt).replace(/^aula interativa:\s*/i, "")) : art.title?.trim() || prompt;
      const desenho = kind in AVISO;
      const contexto = desenho && (a.nucleo || a.desenvolvimento) ? [a.nucleo, a.desenvolvimento].filter(Boolean).join("\n\n") : undefined;
      let spaceId: string | undefined;
      if (!SEM_ESTUDO.has(kind)) {
        const s = await criarEstudo(topic);
        if (!s) continue;
        spaceId = s.id;
      }
      if (desenho) patchMsg((m) => ({ ...m, desenhando: AVISO[kind] }));
      void gerarArtefato(kind, { spaceId, topic, contexto, sala: "pesquisa", ...(kind === "aula" && pdf ? { pdf } : {}) }).then((r) => {
        // Documento (diagrama/aula): abre a aba em "Documentos"; pedido explícito já mostra ela.
        if (r.tipo === "pronto" && KINDS_EM_ABA.has(r.bloco.studioKind) && r.bloco.artifactId) {
          gravarArtefato("pesquisa", threadsRef.current.find((t) => t.id === abaAtivaRef.current), { studioKind: r.bloco.studioKind, artifactId: r.bloco.artifactId, title: r.bloco.title || topic });
          abrirDocumento({ sala: "pesquisa", studioKind: r.bloco.studioKind, artifactId: r.bloco.artifactId, titulo: r.bloco.title || topic, data: r.bloco.data, focar: !!art.explicito || !!pdf });
        }
        patchMsg((m) => {
          const fim = desenho ? { ...m, desenhando: undefined } : m;
          if (r.tipo !== "pronto") return fim;
          const b: StudioBlockData = { studioKind: r.bloco.studioKind, title: r.bloco.title || "", data: r.bloco.data ?? null, artifactId: r.bloco.artifactId, dataUrl: r.bloco.dataUrl };
          return { ...fim, blocos: [...(fim.blocos ?? []).filter((x) => x.studioKind !== b.studioKind), b] };
        });
      });
    }
  }, []);

  // `text` presente = envio DIRETO (sugestão/conceito clicado na resposta) sem passar pelo
  // input; ausente = o que está digitado no composer.
  const send = useCallback(async (text?: string) => {
    const prompt = (text ?? input).trim();
    if (!prompt || sending) return;
    setQuick(isQuick(prompt));
    nomearPeloTema(prompt);

    // msgsRef (e não `messages`): editar/regenerar cortam o histórico no mesmo tique do envio.
    const history = msgsRef.current.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }));
    const asstId = uid();
    const lendo = anexoRef.current;
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text: prompt, at: Date.now(), anexo: lendo?.nome ?? rotuloDoLote(loteRef.current) },
      { id: asstId, role: "assistant", text: "" },
    ]);
    if (text === undefined) setInput("");   // envio direto preserva o rascunho do composer
    setSending(true);
    // AULA a partir do PDF anexado: com arquivo, o turno vai pelo caminho multimodal (fora do harness),
    // então o pedido de aula é atendido aqui — o PDF segue junto pra virar a aula.
    if (lendo && pedeAula(prompt)) void materializarArtefatos(asstId, { nucleo: "", artifacts: [{ studioKind: "aula", title: lendo.nome }] }, prompt, { dataUrl: lendo.dataUrl, nome: lendo.nome });
    const patch = (text: string) => setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, text } : m)));

    // TCC cross-sala: o pedido vira SUGESTÕES no mesmo documento (busca fonte verificada →
    // propõe por seção → o crítico derruba o que não tem fonte). Nada é aplicado aqui.
    if (modoTcc && tccWorkId && !lendo) {
      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, fase: "Buscando fontes verificadas" } : m)));
      try {
        const d = await tccApi.revisar(tccWorkId, prompt);
        patch(d.texto);
        if (d.sugestoes.length) avisarTccMudou(tccWorkId);
        gravarTurno("pesquisa", threadsRef.current.find((t) => t.id === abaAtivaRef.current), prompt, d.texto);
      } catch (e: any) {
        patch(e?.status === 403 ? "Você só pode ler este TCC — sugestões ficam com quem edita." : (e?.body?.texto || "Não consegui revisar agora. Tente de novo."));
      } finally {
        setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, fase: undefined } : m)));
        setSending(false);
      }
      return;
    }

    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt, agent: "aura", surface: "pesquisa", history, stream: true,
          systemContext: SYS(wt) + contextoDaSub() + contextoDoLote(loteRef.current) + (lendo ? ` O aluno anexou o arquivo "${lendo.nome}" (vai junto nesta mensagem): leia o CONTEÚDO dele e responda com base nele, citando a página/seção quando der.` : ""),
          ...(lendo ? { fileData: lendo.dataUrl } : {}),
          // Memória por conversa: o grafo/cartolina é o da ABA ativa e o nó lembra de qual resposta veio.
          agentContext: { activeTab: "pesquisa", cartolinaScopeId: abaAtivaRef.current ?? undefined, cartolinaMsgId: asstId },
        }),
      });
      if (!r.ok || !r.body) { patch("Não consegui responder agora. Tente de novo."); return; }

      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "", limpo = "", faseVista = "", target = "", shown = 0, ended = false;
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
        // Mesmo contrato do co-working: o progresso sai do fio antes de qualquer conta.
        const { limpo: lp, eventos } = separarProgresso(acc);
        limpo = lp;
        const f = faseCorrente(eventos);
        if (f && f.rotulo !== faseVista) {
          faseVista = f.rotulo;
          setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, fase: f.rotulo } : m)));
        }
        const cut = [limpo.indexOf(RESEARCH_SENTINEL), limpo.indexOf(STRUCTURED_SENTINEL)].filter((i) => i >= 0);
        target = cut.length ? limpo.slice(0, Math.min(...cut)) : limpo;   // datilografa só o visível
      }
      const structured = parseStructuredStream(limpo);
      const si = limpo.indexOf(RESEARCH_SENTINEL);
      if (structured) {
        // HARNESS: resposta estruturada → cartão rico; payload malformado → TEXTO (nunca vazio).
        target = ""; ended = true;
        const text = structured.kind === "answer" ? structured.answer.nucleo : structured.text;
        setMessages((prev) => prev.map((m) => (m.id === asstId
          ? { ...m, text, answer: structured.kind === "answer" ? structured.answer : undefined }
          : m)));
        // Ponte chat → Lounge 3D: os pontos-chave desta resposta ficam disponíveis pra "Puxar ponto do chat"
        // (projeção opcional no canvas; a memória de verdade é o cérebro).
        if (structured.kind === "answer" && abaAtivaRef.current) try { empurrarPontos(pontosDaResposta(abaAtivaRef.current, asstId, structured.answer)); } catch { /* ignore */ }
        if (structured.kind === "answer" && structured.answer.artifacts?.length) void materializarArtefatos(asstId, structured.answer, prompt);
        gravarTurno("pesquisa", threadsRef.current.find((t) => t.id === abaAtivaRef.current), prompt, text);
      } else if (si >= 0) {
        // TOOL-LOOP: research_generate → gera o trabalho e encaixa no documento.
        target = ""; ended = true;
        let action: any = null;
        try { action = JSON.parse(limpo.slice(si + RESEARCH_SENTINEL.length)); } catch { /* ignore */ }
        if (action?.kind) {
          patch(action.text || "Gerando o trabalho…");
          void runResearchGenerate(action.kind, action.topic || prompt);
        } else {
          patch("Sem resposta agora.");
        }
      } else {
        target = limpo; ended = true;
        await typed;
        if (!limpo.trim()) patch("Sem resposta agora.");
        else gravarTurno("pesquisa", threadsRef.current.find((t) => t.id === abaAtivaRef.current), prompt, limpo);
      }
    } catch {
      patch("Falha de rede ao falar com o agente.");
    } finally {
      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, fase: undefined } : m)));
      setSending(false);
      if (cerebro.ligado) cerebro.conferirDepoisDoTurno(); // o gatekeeper/fixar são fire-and-forget no servidor
    }
  }, [input, sending, wt, runResearchGenerate, materializarArtefatos, modoTcc, tccWorkId, cerebro, anexoRef, onAtivar]);
  sendRef.current = (t?: string) => { void send(t); };
  novaAbaRef.current = novaAba;
  trocarAbaRef.current = trocarAba;

  // As conversas moram na SIDEBAR PRINCIPAL do app (slot por portal); sem ela, na coluna `lateral`
  // da sala; sem nenhuma das duas, ao lado do chat.
  const slotSidebar = useConversasSlot("pesquisa");
  const destinoConversas = slotSidebar ?? lateral ?? null;
  const barraConversas = comAbas && slotSidebar !== null ? (
    <ConversasSidebar
      sala="pesquisa"
      threads={threads}
      ativa={emCena ? abaAtiva : null}
      ocupada={sending ? abaAtiva : null}
      aoTrocar={trocarAba}
      aoCriar={novaAba}
      aoFechar={fecharAba}
      aoRenomear={renomearAba}
      aoCriarSub={(id) => novaSub(id)}
      className={!slotSidebar && lateral ? "h-full" : ""}
      embutida={!!slotSidebar}
      rotuloNova="Nova pesquisa"
    />
  ) : null;
  const ultimaResposta = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "assistant") return messages[i].id;
    return null;
  })();
  // O ROSTO É O CHAT: o que a conversa está fazendo vira o sinal de todos os rostos da Aura
  // (boas-vindas, pílula da resposta, bolinha da aba) — ouvindo enquanto digita, pensando, falando.
  const ultimaMsg = messages.find((m) => m.id === ultimaResposta);
  const sinalTurno = sinalDoChat({
    pensando: sending && !!ultimaMsg && !ultimaMsg.text && !ultimaMsg.answer,
    falando: sending && !!ultimaMsg && !!(ultimaMsg.text || ultimaMsg.answer),
    digitando: !sending && input.trim().length > 0,
  });
  // resposta que chega inteira (sem stream) também vem com ela FALANDO, pelo tamanho do texto
  const sinalAura = useFalaAoChegar(sinalTurno, ultimaMsg?.answer?.nucleo || ultimaMsg?.text || "");
  // modo voz: com a voz do app tocando ("ouvir resposta", leitura), o rosto fala com ela
  const rosto = usePublicarPresenca("aura", sinalAura);
  const recuoRosto = useManifesto("aura") ? RECUO_ROSTO : "";
  /** Índice da pergunta que originou a resposta `i` (pra regenerar). */
  const perguntaDe = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (messages[j].role === "user") return j;
    return -1;
  };

  return (
    <div ref={rootRef} className="relative h-full flex bg-white/95 dark:bg-[#0a0f1c]/95 text-slate-900 dark:text-white" style={zoom.style} {...soltar}>
      {arrastando && <AvisoSoltar />}
      {/* ESQUERDA = CONVERSAS. Com `lateral`, a barra vai pra coluna esquerda da SALA (fica à mostra com um
          documento aberto no topo); sem ela, fica aqui, à esquerda do chat. */}
      {barraConversas && (destinoConversas ? createPortal(barraConversas, destinoConversas) : barraConversas)}
      <div className="relative flex-1 min-w-0 flex flex-col">
      {/* Topo do chat: o A−/A+ do texto e a bolinha do cérebro, JUNTOS à direita (#633) — a bolinha DEPOIS das letras. */}
      <div className={`shrink-0 ${compacto ? "px-3" : "px-4 sm:px-6"} pt-2 flex items-center gap-2 min-h-[36px]`}>
        <div className="flex-1" />
        <ChatZoom escala={zoom.escala} menor={zoom.menor} maior={zoom.maior} />
        {comAbas && cerebro.ligado && (() => {
          const bolinha = (
            <BolinhaCerebro
              estado={cerebro.estado}
              completude={cerebro.mapa?.completudeAprendizado ?? 0}
              aberto={cerebroAberto}
              soSinal={!!slotTopo}
              onClick={() => {
                onAtivar?.();
                if (cerebro.estado === "sugerida" || cerebro.estado === "vazia") { void cerebro.gerar(); setCerebroAberto(true); }
                else setCerebroAberto((v) => !v);
              }}
            />
          );
          // no topo da sala (sem nome, só o sinal que gira quando um percurso está pronto pra nascer)
          return slotTopo ? createPortal(bolinha, slotTopo) : bolinha;
        })()}
      </div>
      {/* ÁREA do chat (mensagens + composer). O cérebro abre em OVERLAY `absolute inset-0 z-50` DENTRO
          dela — cobre mensagens e composer de propósito (visão focada) e nunca nasce atrás/abaixo do
          composer, que está em fluxo sem z-index. O topo (com a bolinha) fica de fora,
          pra bolinha continuar visível e alternar. Mobile: mesmo overlay. */}
      <div className="relative flex-1 min-h-0 flex flex-col">
      <AnimatePresence>
        {cerebro.ligado && cerebroAberto && (
          <CerebroPanel
            key="cerebro"
            st={cerebro}
            onFechar={() => setCerebroAberto(false)}
            onAbrirMensagem={(msgId) => {
              setCerebroAberto(false);
              // tap na gaveta → rola até a mensagem que a originou e devolve o foco ao composer
              requestAnimationFrame(() => { rootRef.current?.querySelector<HTMLElement>(`[data-msg-id="${CSS.escape(msgId)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }); focarComposer(); });
            }}
          />
        )}
      </AnimatePresence>
      {/* Conversa — bolhas com cara de manuscrito (serif, texto justificado). Cada mensagem tem a linha
          de mini-ações (copiar/regenerar/👍👎/sub-tema; na pergunta: copiar/editar) — no hover no desktop. */}
      <div ref={listRef} className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${compacto ? "px-3" : "px-4 sm:px-6"}`}>
        <div className={`${recuo} py-5 flex flex-col gap-4`}>
          {messages.length === 0 && <BoasVindasAgente agentId="aura" nome="Aura" sinal={rosto.sinal} boca={rosto.boca} />}
          {messages.length === 0 && comAbas && <DicaSubTema threads={threads} ativa={abaAtiva} />}
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const emCurso = sending && m.id === ultimaResposta;
            // rosto da Aura AO LADO de cada resposta; só a mais recente vive (pensa → fala → sorri)
            const pilula = !isUser
              ? <AgentePilula agentId="aura" nome="Aura" estado={rosto.sinal} boca={rosto.boca} ultima={m.id === ultimaResposta} className="absolute left-0 top-0" />
              : null;
            const acoesResposta = !isUser && !emCurso && m.text ? (
              <AcoesResposta
                msgId={m.id}
                texto={m.answer ? [m.answer.nucleo, m.answer.desenvolvimento].filter(Boolean).join("\n\n") : m.text}
                ocupado={sending}
                onRegenerar={m.id === ultimaResposta && perguntaDe(i) >= 0 ? () => { const j = perguntaDe(i); reenviar(j, messages[j].text); } : undefined}
                onAprofundar={comAbas ? () => aprofundar(m) : undefined}
              />
            ) : null;
            if (isUser && editando === m.id) {
              return (
                <div key={m.id} data-msg-id={m.id} className="flex justify-end">
                  <EdicaoPergunta inicial={m.text} onCancelar={() => setEditando(null)} onEnviar={(t) => reenviar(i, t)} />
                </div>
              );
            }
            if (isUser) {
              return (
                <div key={m.id} data-msg-id={m.id} className="group/msg flex flex-col items-end">
                  <div
                    className="max-w-[88%] px-4 py-3 font-serif leading-[1.65] whitespace-pre-wrap rounded-2xl bg-slate-100 text-slate-900 border border-slate-200 dark:bg-white/[0.08] dark:text-white/90 dark:border-white/10"
                    style={{ fontSize: fonteChat(compacto ? 17 : 22) }}
                  >
                    {m.anexo && (
                      <span className="block mb-1 font-sans text-[12px] font-semibold text-cyan-700 dark:text-cyan-300/90">📎 {m.anexo}</span>
                    )}
                    {m.text}
                  </div>
                  <AcoesPergunta texto={m.text} ocupado={sending} onEditar={() => setEditando(m.id)} />
                </div>
              );
            }
            // ASSISTENTE: o MESMO cartão desde o streaming. O texto que você vê "escrevendo" já nasce
            // DENTRO do cartão (no corpo); quando a resposta estruturada chega, o título e as seções
            // entram ao redor — o React NÃO remonta (mesma key), então nada some nem "reaparece toda".
            // Sem texto ainda (só pensando) = o indicador. Clicar num conceito/próximo passo já ENVIA.
            const temConteudo = !!m.answer || !!m.text;
            const respCartao: StructuredAnswer = m.answer ?? { nucleo: "", desenvolvimento: m.text };
            return (
              <div key={m.id} data-msg-id={m.id} className={`group/msg flex justify-start ${recuoRosto}`}>
                {pilula}
                <div className="max-w-[88%] w-full">
                  {temConteudo ? (
                    <StructuredAnswerView answer={respCartao} acoes={acoesResposta} onConcept={(c) => void send(`Explique: ${c}`)} onNext={(s) => void send(s)}>
                      {m.blocos?.length || m.desenhando ? (
                        <>
                          {m.blocos?.map((b) => <BlocoOuCartao key={b.studioKind} b={b} />)}
                          {m.desenhando && <Desenhando texto={m.desenhando} />}
                        </>
                      ) : null}
                    </StructuredAnswerView>
                  ) : (
                    <AuraThinking active fase={m.fase} phases={quick ? ["Pensando"] : ["Pensando", "Elaborando"]} />
                  )}
                  {m.answer?.livros?.length ? <LivrosCartao livros={m.answer.livros} sala="pesquisa" /> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composer (mesmo do co-working); ⟁ abre atalhos acadêmicos */}
      <div className={compacto ? "px-3 pb-3 pt-2" : "px-4 sm:px-6 pb-4 pt-2"}>
        <div className={recuo}>
          {TCC_CROSS_ON && tccWorkId && (
            <div className="flex items-center gap-2 pb-2">
              <button
                type="button" role="switch" aria-checked={lapidar} onClick={() => setLapidar((v) => !v)}
                className={`min-h-[36px] px-3 rounded-full text-[12px] border transition-colors ${lapidar
                  ? "bg-amber-500/15 border-amber-400/50 text-amber-800 dark:text-amber-200"
                  : "bg-transparent border-slate-300 dark:border-white/15 text-slate-600 dark:text-white/60"}`}
              >
                {lapidar ? "Lapidando o TCC · sugestões com fonte" : "Só conversa (não mexe no TCC)"}
              </button>
            </div>
          )}
          <CoworkComposer
            value={input}
            onChange={setInput}
            onSubmit={() => void send()}
            onToggleStudio={() => setPaletteOpen((v) => !v)}
            studioOpen={paletteOpen}
            busy={sending}
            idle={messages.length === 0 && !sending}
            active={active}
            placeholder={anexo ? `Pergunte sobre ${anexo.nome}…` : lote.length ? `Pergunte sobre os ${lote.length} arquivos…` : ""}
            onFiles={(f) => void anexarArquivos(f)}
          >
            <BarraBase envios={envios} versao={versaoBase} />
            {anexo && <ChipAnexo anexo={anexo} onTirar={tirarAnexo} />}
            <ChipsLote lote={lote} onTirar={tirarDoLote} />
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
      </div>
    </div>
  );
}

/** Diagrama/aula são DOCUMENTOS (abrem numa aba): no chat, só o cartão. O resto do Studio fica inline. */
function BlocoOuCartao({ b }: { b: StudioBlockData }) {
  if (KINDS_EM_ABA.has(b.studioKind) && b.artifactId) {
    return <CartaoArtefato doc={{ sala: "pesquisa", studioKind: b.studioKind, artifactId: b.artifactId, titulo: b.title, data: b.data }} />;
  }
  return <StudioBlock block={b} collapsed={false} />;
}
