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
  PanelRightClose, PanelRightOpen, FileText, X, ChevronDown, GitBranch, GraduationCap, FlaskConical,
} from "lucide-react";
import { DIRETRIZ_ESTUDOS, DIRETRIZ_PESQUISA } from "@/lib/ai/salaPersona";
import { useIsMobile } from "@/lib/ui/useIsMobile";
import { cliqueForaDoCerebro } from "@/components/cerebro/cliqueFora";
import CoworkComposer from "@/components/study/CoworkComposer";
import ChatMarkdown from "@/components/study/ChatMarkdown";
import LivrosCartao from "@/components/chat/LivrosCartao";
import { semListaDeLivros } from "@/lib/livros/busca";
import AuraThinking from "@/components/study/AuraThinking";
import AgentePilula, { RECUO_ROSTO } from "@/components/agents/avatar/AgentePilula";
import BoasVindasAgente from "@/components/agents/avatar/BoasVindasAgente";
import { useFalaAoChegar, useManifesto, usePublicarPresenca } from "@/components/agents/avatar/hooks";
import { sinalDoChat } from "@/lib/avatars/presenca";
import StudyArtifactCard from "@/components/study/StudyArtifactCard";
import StudioPalette from "@/components/study/StudioPalette";
import MentorPill from "@/components/study/MentorPill";
import StudioBlock, { type StudioBlockData } from "@/components/studio/StudioBlock";
import StructuredAnswerView from "@/components/study/StructuredAnswerView";
import ConversasSidebar from "@/components/chat/ConversasSidebar";
import PastasEmpilhadas, { CORPO_DA_PASTA, type Pasta } from "@/components/chat/PastasEmpilhadas";
import SugestoesConversa from "@/components/chat/SugestoesConversa";
import { EVT_TEMA, temaDoTexto, temaNoTutorial } from "@/lib/onboarding/tutorialLab";
import { EVT_PERGUNTA_CHAT, EVT_PREENCHER_CHAT, avisarDesenho, avisarEstadoPercurso, avisarTurnoFim } from "@/lib/onboarding/tourSala";
import { useAvisoTextoDoChat } from "@/components/onboard/useAvisoTextoDoChat";
import { useConversasSlot } from "@/components/chat/ConversasSlot";
import { consumirPedido, EVT_ESTUDOS_CHAT, EVT_PEDIDO_CONVERSA, type PedidoConversa } from "@/lib/chat/conversasNav";

const irProChat = () => window.dispatchEvent(new Event(EVT_ESTUDOS_CHAT));
import { createPortal } from "react-dom";
import DicaSubTema from "@/components/chat/DicaSubTema";
import Desenhando from "@/components/chat/Desenhando";
import CartaoArtefato from "@/components/chat/CartaoArtefato";
import DocumentoArtefato from "@/components/studio/DocumentoArtefato";
import { abrirDocumento, EVT_ABRIR_DOC, KINDS_EM_ABA, ROTULO_DOC, type DocArtefato } from "@/lib/chat/documentos";
import { assuntoDe, pedeAula } from "@/lib/agent/aprender";
import ChatZoom, { useChatFontScale } from "@/components/chat/ChatZoom";
import { AnimatePresence } from "framer-motion";
import BolinhaCerebro from "@/components/cerebro/BolinhaCerebro";
import CerebroPanel from "@/components/cerebro/CerebroPanel";
import { useCerebro } from "@/components/cerebro/useCerebro";
import { AcoesPergunta, AcoesResposta, EdicaoPergunta } from "@/components/chat/MensagemAcoes";
import { fonteChat } from "@/lib/ui/chatFontScale";
import { AvisoSoltar, ChipAnexo, ChipsLote, EVT_ANEXAR, pdfDaBiblioteca, useAnexoChat } from "@/components/chat/useAnexoChat";
import { contextoDoLote } from "@/lib/chat/loteAnexos";
import { BarraBase } from "@/components/chat/MinhaBase";
import DocumentDesktop from "@/app/research-lab/DocumentDesktop";
import { avisarEscrevendo } from "@/lib/research/zaeonEventos";
import { useSavedCitations } from "@/lib/useSavedCitations";
import type { LibraryFile } from "@/lib/useLibraryFiles";
import {
  carregarThreads, salvarThreads, criarThread, criarSubThread, fecharThread, renomearThread, tocarThread,
  carregarMensagens, salvarMensagens, threadAtiva, marcarAtiva, tituloAPartirDe,
  TITULO_PADRAO, CHAVE_INDICE, type Thread,
} from "@/lib/chat/threads";
import type { StructuredAnswer } from "@/lib/agent/contracts";
import { parseStructuredStream, STRUCTURED_SENTINEL } from "@/lib/agent/structured-client";
import { separarProgresso, faseCorrente } from "@/lib/agent/progresso";
import { revelarPorTempo, safeCut } from "@/lib/ui/typewriter";
import { cronometrarResposta, EVT_TEMPOS, fmtTempos, verTempos, type TemposResposta } from "@/lib/chat/temposResposta";
import { hydrateTranscript } from "@/lib/agent/transcriptClient";
import { useArmazemDaConta } from "@/lib/chat/contaNoNavegador";
import { apagarNoServidor, blocoDaMensagem, cortarNoServidor, gravarArtefato, gravarTurno, mensagensDoServidor, renomearNoServidor, sincronizarConversas } from "@/lib/chat/conversasServidor";
import type { TranscriptWire } from "@/lib/agent/transcriptClient";
import { ESCOPO_COWORK, type Armazem } from "@/lib/chat/threads";
import { esperarTurno } from "@/lib/chat/turnoRetomavel";
import { pedirAura } from "@/lib/chat/auraClient";
import { EVT_FEEDBACK } from "@/lib/chat/feedback";
import { SeletorModelo, SeloModelo, useModeloEscolhido } from "@/components/chat/SeletorModelo";
import { criarEstudo, gerarArtefato } from "@/lib/studio/studioClient";
import type { SkillNodeState } from "@/lib/skilltree/types";
import type { SkillTreeData } from "@/components/study/SkillTreePanel";
import { TCC_CROSS_ON, tccApi, type TrabalhoResumo } from "@/lib/tcc/client";
import { chatUnicoOn, consumirPedidoChat, EVT_PEDIDO_CHAT, gravarModoPesquisa, modoPesquisaDa, type PedidoChat } from "@/lib/chat/chatUnico";

const MeusEstudosFeed = dynamic(() => import("@/components/study/MeusEstudosFeed"), { ssr: false });
// Árvore de habilidades GENERATIVA (React Flow) — opt-in, drawer ao lado da conversa.
// A cartolina (memória visual da conversa) só carrega quando o aluno abre — e só com a flag.
const LoungeCartolina = dynamic(() => import("@/components/lounge/LoungeCartolina"), { ssr: false });
const CARTOLINA_ON = process.env.NEXT_PUBLIC_CARTOLINA_MEMORIA === "1";
const REA_BP_ON = process.env.NEXT_PUBLIC_REA_BLUEPRINT === "1";
// TCC cross-sala: a aba do TCC da conversa (Estudos cria/edita · Pesquisa lapida). Só com a flag.
const TccPanel = dynamic(() => import("@/components/tcc/TccPanel"), { ssr: false });
const ReaBlueprintView = dynamic(() => import("@/components/rea/ReaBlueprintView"), { ssr: false });
// CHAT ÚNICO: a Sala de Pesquisa vira o MODO PESQUISA desta conversa, e a conversa pode ter vários trabalhos.
const CHAT_UNICO = chatUnicoOn();
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
  blocosExtra?: StudioBlockData[]; // 2º artefato da mesma resposta (ex.: molécula + diagrama interativo)
  desenhando?: string;             // aviso enquanto um artefato demorado sai (diagrama ~20 s, aula 1–3 min)
  answer?: StructuredAnswer;
  fase?: string;             // fase que o harness está narrando agora (só enquanto chega)
  modelo?: string;           // quem respondeu DE VERDADE (nome vindo do servidor) — o selo debaixo da resposta
  streaming?: boolean;       // B2: resposta ainda chegando → cursor piscando
  fresh?: boolean;           // B2: resposta estruturada recém-chegada → datilografa o núcleo
  // Fase 3 (CHAT_BG): turno rodando no worker. Persistido de propósito — é o que deixa sair
  // da sala no meio e, ao voltar, reengatar no MESMO turno (polling de /turns/:id).
  turnId?: string;
  pendente?: boolean;
  at: number;
};

/** Kinds que nascem do assunto/conversa, sem um estudo de origem (não criam estudo vazio). */
const SEM_ESTUDO = new Set(["diagram", "mindmap", "molecule", "aula"]);
const AVISO_ARTEFATO: Record<string, string> = {
  diagram: "Desenhando o diagrama interativo…",
  mindmap: "Desenhando o mapa…",
  aula: "Preparando a aula interativa — plano, roteiro e narração (1 a 3 min)…",
};

/**
 * O que de um artefato inline vai pro localStorage: o diagrama é só um id (o HTML mora no servidor)
 * e sobrevive ao reload; os outros (mapa, podcast, molécula com SDF…) são pesados e ficam na sessão.
 */
function enxugarArtefatos(m: Msg): Msg {
  if (m.role !== "assistant" || (!m.studioBlock && !m.blocosExtra && !m.desenhando)) return m;
  // diagrama e aula são só um id (o conteúdo mora no servidor) — sobrevivem ao reload, sem o `data`
  const leve = (b?: StudioBlockData) => (b && (b.studioKind === "diagram" || b.studioKind === "aula") && b.artifactId ? { ...b, data: null } : undefined);
  const extras = (m.blocosExtra ?? []).map(leve).filter(Boolean) as StudioBlockData[];
  return { ...m, studioBlock: leve(m.studioBlock), blocosExtra: extras.length ? extras : undefined, desenhando: undefined };
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/** #663: a mensagem que veio do servidor, na forma da tela. Diagrama e aula voltam só com o número e abrem por ele. */
function msgDoServidor(w: TranscriptWire): Msg {
  const bloco = blocoDaMensagem(w);
  return { id: w.id, role: w.role, kind: "text", text: w.text, at: Date.parse(w.at) || Date.now(), ...(bloco ? { studioBlock: { ...bloco, data: null } as unknown as StudioBlockData } : {}) };
}

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

/** #663: cada conta tem as suas conversas; trocar de conta remonta o chat com a área da outra. */
export default function StudyCoworkChat({ active = true }: { active?: boolean }) {
  const area = useArmazemDaConta();
  if (!area) return null;
  return <ChatDaConta key={area.conta} armazem={area.armazem} active={active} />;
}

function ChatDaConta({ active, armazem }: { active: boolean; armazem: Armazem }) {
  // Abas de conversa. Antes havia UMA thread global (zaeon.cowork.thread.v1); agora cada
  // aba tem histórico próprio, e a antiga vira a aba #1 na primeira carga (ver threads.ts).
  const [threads, setThreads] = useState<Thread[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<string | null>(null);
  const [cartolinaAberta, setCartolinaAberta] = useState(false);
  // TRABALHOS da conversa (TCC/artigo/relatório): os da aba (scopeId), na ordem em que nasceram, e o que
  // está ABERTO no editor por cima do chat (null = nenhum). No chat único são vários; fora dele, no máximo um.
  const [trabalhosPorAba, setTrabalhosPorAba] = useState<Record<string, TrabalhoResumo[]>>({});
  const [trabalhoAberto, setTrabalhoAberto] = useState<string | null>(null);
  const [reaAberto, setReaAberto] = useState<string | null>(null);   // o módulo do Blueprint REA aberto
  // o trabalho em FOCO por conversa: o último aberto no editor — voltar pra conversa e pedir "continue a
  // metodologia" mexe nele (o editor não precisa estar à mostra)
  const focoPorAbaRef = useRef<Record<string, string>>({});
  const abaAtivaRef = useRef<string | null>(null);
  abaAtivaRef.current = abaAtiva;
  /** Põe (ou atualiza no lugar) um trabalho na lista da conversa `aba`. */
  const guardarTrabalho = useCallback((aba: string, t: TrabalhoResumo) => {
    setTrabalhosPorAba((p) => {
      const lista = p[aba] ?? [];
      const ja = lista.some((x) => x.id === t.id);
      return { ...p, [aba]: ja ? lista.map((x) => (x.id === t.id ? { ...x, ...t } : x)) : [...lista, t] };
    });
  }, []);
  // MODO PESQUISA (chat único): por conversa, lembrado no aparelho. Ligado, o turno vai como a Sala de Pesquisa ia
  // (superfície "pesquisa" → academicMode enforced: fonte acadêmica, citação, rigor).
  const [modoPesquisa, setModoPesquisa] = useState(false);
  // MODELO escolhido no composer (lib/chat/modelos): Google = harness inteiro; Zaeon = local, enxuto, em streaming
  const [modeloEscolhido, escolherModelo] = useModeloEscolhido();
  const modeloRef = useRef(modeloEscolhido.id);
  modeloRef.current = modeloEscolhido.id;
  const modoPesquisaRef = useRef(false);
  modoPesquisaRef.current = modoPesquisa;
  useEffect(() => {
    if (!CHAT_UNICO) return;
    try { setModoPesquisa(modoPesquisaDa(armazem, abaAtiva)); } catch { setModoPesquisa(false); }
  }, [abaAtiva]);
  const ligarModoPesquisa = useCallback((v: boolean) => {
    setModoPesquisa(v);
    const aba = abaAtivaRef.current;
    if (aba) try { gravarModoPesquisa(armazem, aba, v); } catch { /* ignore */ }
  }, []);
  // o CÉREBRO da conversa ativa (o mesmo da Sala de Pesquisa — HANDOFF_CEREBRO_AURA §3): o turno já marca a conversa
  // como estudável (lib/map/gatekeeper, pelo `cartolinaScopeId`); aqui entram a bolinha ("Gerar mapa") e o painel
  const [cerebroAberto, setCerebroAberto] = useState(false);
  // #640: a altura medida da barra das abas (as telas por cima começam nela)
  const [topoPastas, setTopoPastas] = useState(46);
  const cerebro = useCerebro(abaAtiva, { aberto: cerebroAberto });
  // #613: o tour do laboratório acompanha o botão do percurso (gerando → pronto)
  useEffect(() => { avisarEstadoPercurso(cerebro.estado); }, [cerebro.estado]);
  const conferirCerebro = useRef(cerebro.conferirDepoisDoTurno); conferirCerebro.current = cerebro.conferirDepoisDoTurno;
  // o mapa é um MODAL sem "x": sai clicando fora dele (o painel segura o próprio mousedown) ou trocando de conversa
  useEffect(() => { setCerebroAberto(false); }, [abaAtiva]);
  useEffect(() => {
    if (!cerebroAberto) return;
    // Pelo CAMINHO do evento, não pelo stopPropagation do painel: no app router o React escuta no próprio `document`,
    // então o "segura o mousedown" do painel não impedia ESTE listener — clicar/arrastar dentro do cérebro fechava o
    // mapa. composedPath também cobre o rótulo do canvas que é recriado no meio do clique.
    const fora = (e: MouseEvent) => { if (cliqueForaDoCerebro(e)) setCerebroAberto(false); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [cerebroAberto]);
  useEffect(() => { setCerebroAberto(false); }, [abaAtiva]);
  useEffect(() => { if (trabalhoAberto && abaAtiva) focoPorAbaRef.current[abaAtiva] = trabalhoAberto; }, [trabalhoAberto, abaAtiva]);
  const trabalhosDaAba = TCC_CROSS_ON && abaAtiva ? trabalhosPorAba[abaAtiva] ?? [] : [];
  // Trocar de aba fecha o trabalho aberto (ele é DAQUELA conversa) e descobre os trabalhos da nova aba.
  useEffect(() => {
    setTrabalhoAberto(null);
    if (!TCC_CROSS_ON || !abaAtiva || trabalhosPorAba[abaAtiva]) return;
    let vivo = true;
    const aba = abaAtiva;
    (CHAT_UNICO
      ? tccApi.daConversa(aba).then((d) => d.trabalhos)
      : tccApi.doEscopo(aba).then((d) => (d.tcc ? [{ id: d.tcc.id, titulo: d.tcc.titulo, status: d.tcc.status, tipo: "TCC" }] : [])))
      .then((lista) => { if (vivo && lista.length) setTrabalhosPorAba((p) => ({ ...p, [aba]: [...lista, ...(p[aba] ?? []).filter((x) => !lista.some((y) => y.id === x.id))] })); })
      .catch(() => { /* sem trabalho / flag off no servidor: a pasta só não aparece */ });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva]);
  // Pedidos de fora (deep-link antigo da Sala de Pesquisa, sidebar): ligar o modo pesquisa / abrir um trabalho.
  useEffect(() => {
    if (!CHAT_UNICO || !abaAtiva) return;
    const atender = (p: PedidoChat | null) => {
      const aba = abaAtivaRef.current;
      if (!p || !aba) return;
      if (p.modoPesquisa) ligarModoPesquisa(true);
      if (p.trabalhoId) { guardarTrabalho(aba, { id: p.trabalhoId, titulo: "Trabalho", status: "pronto", tipo: "Trabalho" }); setTrabalhoAberto(p.trabalhoId); }
    };
    atender(consumirPedidoChat());
    const on = (e: Event) => { atender((e as CustomEvent<PedidoChat>).detail); consumirPedidoChat(); };
    window.addEventListener(EVT_PEDIDO_CHAT, on);
    return () => window.removeEventListener(EVT_PEDIDO_CHAT, on);
  }, [abaAtiva !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  // Espelho das abas pra ler o valor atual dentro de callbacks sem recriá-los.
  const threadsRef = useRef<Thread[]>([]);
  threadsRef.current = threads;

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  // #618: o tour do laboratório leva o contorno pro ➤ quando o campo tem texto
  useAvisoTextoDoChat(input);
  const [sending, setSending] = useState(false);
  // a avatar do painel dos documentos escreve no tablet enquanto a resposta sai (components/research/ZaeonDocumentos)
  useEffect(() => { avisarEscrevendo(sending); }, [sending]);
  const [libOpen, setLibOpen] = useState(true);
  // celular: a biblioteca começa RECOLHIDA (empilhada embaixo, ela roubava metade da tela da conversa)
  const celular = useIsMobile();
  useEffect(() => { if (celular) setLibOpen(false); }, [celular]);
  // Editar a própria pergunta e reenviar (estilo ChatGPT) + o A−/A+ do texto.
  const [editando, setEditando] = useState<string | null>(null);
  const zoom = useChatFontScale();
  const slotSidebar = useConversasSlot("estudos");
  // DOCUMENTOS em aba (diagrama interativo, aula — lib/chat/documentos): abertos aqui; `docAtivo`
  // = o que ocupa a sala agora (null = a conversa).
  // POR CONVERSA (como os trabalhos): um diagrama gerado numa conversa não aparece nas abas de outra.
  const [docsPorAba, setDocsPorAba] = useState<Record<string, DocArtefato[]>>({});
  const [docAtivoPorAba, setDocAtivoPorAba] = useState<Record<string, string | null>>({});
  const docs = abaAtiva ? docsPorAba[abaAtiva] ?? [] : [];
  const docAtivo = abaAtiva ? docAtivoPorAba[abaAtiva] ?? null : null;
  const setDocAtivo = useCallback((id: string | null) => {
    const aba = abaAtivaRef.current;
    if (aba) setDocAtivoPorAba((p) => ({ ...p, [aba]: id }));
  }, []);
  const setDocs = useCallback((f: (xs: DocArtefato[]) => DocArtefato[]) => {
    const aba = abaAtivaRef.current;
    if (aba) setDocsPorAba((p) => ({ ...p, [aba]: f(p[aba] ?? []) }));
  }, []);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<DocArtefato>).detail;
      if (!d || d.sala !== "estudos") return;
      // a conversa DE ONDE o documento saiu (a geração leva segundos — a pessoa pode ter trocado de conversa)
      const aba = d.scopeId ?? abaAtivaRef.current;
      if (!aba) return;
      setDocsPorAba((p) => {
        const xs = p[aba] ?? [];
        return xs.some((x) => x.artifactId === d.artifactId) ? p : { ...p, [aba]: [...xs, d] };
      });
      if (d.focar && aba === abaAtivaRef.current) setDocAtivoPorAba((p) => ({ ...p, [aba]: d.artifactId }));
    };
    window.addEventListener(EVT_ABRIR_DOC, on);
    return () => window.removeEventListener(EVT_ABRIR_DOC, on);
  }, []);
  const [studioOpen, setStudioOpen] = useState(false);
  // estudos em FOCO — por conversa: o foco de uma não pode mandar o artefato de outra pro estudo errado
  const [focoPorAba, setFocoPorAba] = useState<Record<string, string[]>>({});
  const focusIds = useMemo(() => (abaAtiva ? focoPorAba[abaAtiva] ?? [] : []), [focoPorAba, abaAtiva]);
  const setFocusIds = useCallback((f: (prev: string[]) => string[]) => {
    const aba = abaAtivaRef.current;
    if (aba) setFocoPorAba((p) => ({ ...p, [aba]: f(p[aba] ?? []) }));
  }, []);
  // ANEXAR (📎 / soltar arquivo / soltar um documento da biblioteca na conversa): a IA lê o PDF e responde
  // sobre ele — o mesmo comportamento da Sala de Pesquisa (components/chat/useAnexoChat).
  const colunaRef = useRef<HTMLDivElement>(null);
  const sendRefA = useRef<(t: string) => void>(() => {});
  const focarComposer = () => requestAnimationFrame(() => colunaRef.current?.querySelector("textarea")?.focus({ preventScroll: true }));
  const { anexo, anexoRef, tirar: tirarAnexo, anexarArquivos, anexarDaBiblioteca, soltar, arrastando, envios, versaoBase, lote, loteRef, tirarDoLote } = useAnexoChat("estudos", {
    focar: focarComposer,
    perguntar: (t) => sendRefA.current(t),
    aceitaBiblioteca: true,
    // Minha base (RAG F3): a Aura confirma o lote guardado na conversa
    aoGuardar: (texto) => setMessages((prev) => [...prev, { id: uid(), role: "assistant", kind: "text", text: texto, at: Date.now() }]),
  });
  // A BIBLIOTECA (o mesmo painel da Sala de Pesquisa): citações / pasta / ▶ conversar sobre um PDF
  const { citations: citacoesSalvas } = useSavedCitations();
  const [libPopover, setLibPopover] = useState<"citations" | "quiz" | null>(null);
  const [libPasta, setLibPasta] = useState(false);
  // o SELO da medição (lib/chat/temposResposta): só com a flag zaeon.tempos.ver / ?tempos=1
  const [tempoUlt, setTempoUlt] = useState<TemposResposta | null>(null);
  useEffect(() => {
    if (!verTempos()) return;
    const on = (e: Event) => setTempoUlt((e as CustomEvent<TemposResposta>).detail);
    window.addEventListener(EVT_TEMPOS, on); return () => window.removeEventListener(EVT_TEMPOS, on);
  }, []);
  const libInputRef = useRef<HTMLInputElement>(null);
  const conversarSobre = useCallback(async (f: LibraryFile) => {
    const dataUrl = await pdfDaBiblioteca(f);
    if (dataUrl) window.dispatchEvent(new CustomEvent(EVT_ANEXAR, { detail: { sala: "estudos", id: f.id, nome: f.title, dataUrl, perguntar: "Resuma este documento: ideia central, pontos principais e o que vale estudar a partir dele." } }));
  }, []);
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
  const [treeExpandida, setTreeExpandida] = useState(false);
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
  // 👍/👎 → servidor (lib/chat/feedbackDataset): pergunta + resposta + quem respondeu, anonimizados lá; vira o
  // dataset de qualidade no Hugging Face. Best-effort: o voto continua no aparelho como antes.
  useEffect(() => {
    const on = (e: Event) => {
      const { msgId, voto } = (e as CustomEvent<{ msgId: string; voto: "up" | "down" | null }>).detail ?? ({} as any);
      const msgs = msgsRef.current;
      const i = msgs.findIndex((m) => m.id === msgId);
      if (i < 0 || msgs[i].role !== "assistant") return;
      let pergunta = "";
      for (let j = i - 1; j >= 0; j--) if (msgs[j].role === "user") { pergunta = msgs[j].text ?? ""; break; }
      void fetch("/api/chat/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msgId, voto, pergunta, resposta: textoParaHistorico(msgs[i]), modelo: msgs[i].modelo, sala: modoPesquisaRef.current ? "pesquisa" : "estudos" }),
      }).catch(() => {});
    };
    window.addEventListener(EVT_FEEDBACK, on);
    return () => window.removeEventListener(EVT_FEEDBACK, on);
  }, []);

  // ── carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/study/spaces");
        if (r.ok) setSpaces(await r.json());
      } catch { /* ignore */ }
    })();
    // memória de conversa: L0 (armazem, rápido) primeiro; se vazio (device novo /
    // cache limpo), cai no L1 durável (DB) via /api/ai/transcript. docs/MEMORY_AND_PERSISTENCE.md.
    let hadLocal = false;
    // Device REALMENTE novo? (o índice de conversas nunca existiu). Apagar a última conversa deixa um índice
    // com uma aba nova vazia — NÃO é device novo, então o L1 durável não deve ressuscitar a conversa apagada.
    let deviceNovo = false;
    try { deviceNovo = armazem.getItem(CHAVE_INDICE) == null; } catch { /* ignore */ }
    try {
      const lista = carregarThreads(armazem);
      const ativa = threadAtiva(armazem, lista);
      setThreads(lista);
      threadsRef.current = lista;
      setAbaAtiva(ativa);
      abaAtivaRef.current = ativa;
      if (ativa) {
        const guardadas = carregarMensagens<Msg>(armazem, ativa);
        if (guardadas.length) { setMessages(guardadas); hadLocal = true; }
      }
    } catch { /* ignore */ }
    // #663: a lista do servidor entra na do navegador; a conversa aberta sem cópia aqui vem de lá
    (async () => {
      const juntas = await sincronizarConversas("estudos", armazem, ESCOPO_COWORK, () => threadsRef.current);
      if (juntas) { threadsRef.current = juntas; setThreads(juntas); }
      if (hadLocal) return;
      const ativa = abaAtivaRef.current;
      const daConversa = ativa ? await mensagensDoServidor("estudos", ativa) : [];
      // aparelho novo sem nenhuma conversa separada ainda: mostra o histórico antigo, como antes
      const wire = daConversa.length || !deviceNovo || juntas?.length !== 1 ? daConversa : await hydrateTranscript("estudos", null);
      if (wire.length && abaAtivaRef.current === ativa && !msgsRef.current.length) setMessages(wire.map(msgDoServidor));
    })();
  }, []);

  // Persiste o thread (só texto + estudos; artefatos pesados do Studio ficam na sessão).
  useEffect(() => {
    try {
      const slim = messages
        // vazia só sobrevive se for um turno pendente no worker (senão o reengate some no reload)
        .filter((m) => m.kind !== "studio" && !(m.kind === "text" && !m.text && !(m.pendente && m.turnId)))
        .map(enxugarArtefatos) // artefato pesado fica na sessão; o diagrama (só um id) persiste
        .map(({ streaming, fresh, ...m }) => m); // B2: flags de animação não persistem (reload não re-digita)
      const aba = abaAtivaRef.current;
      if (aba) salvarMensagens(armazem, aba, slim);
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
      // Gerado numa conversa que não está mais na tela: volta pra ELA (a bolha guardada), nunca cai nesta.
      if (d.scopeId && d.scopeId !== abaAtivaRef.current) {
        if (d.attachMsgId) {
          try {
            const guardadas = carregarMensagens<Msg>(armazem, d.scopeId);
            const novas = guardadas.map((m) => (m.id === d.attachMsgId ? (!m.studioBlock || m.studioBlock.studioKind === block.studioKind ? { ...m, studioBlock: block } : { ...m, blocosExtra: [...(m.blocosExtra ?? []).filter((b) => b.studioKind !== block.studioKind), block] }) : m));
            salvarMensagens(armazem, d.scopeId, novas.map(enxugarArtefatos));
          } catch { /* ignore */ }
        }
        return;
      }
      if (d.attachMsgId) {
        // artefato INLINE (harness): anexa à bolha estruturada existente, sem msg nova. Se ela já tem
        // um artefato (molécula), o segundo (diagrama) entra ao lado em vez de substituir.
        setMessages((prev) => prev.map((m) => {
          if (m.id !== d.attachMsgId) return m;
          if (!m.studioBlock || m.studioBlock.studioKind === block.studioKind) return { ...m, studioBlock: block };
          return { ...m, blocosExtra: [...(m.blocosExtra ?? []).filter((b) => b.studioKind !== block.studioKind), block] };
        }));
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
    // arquivo do computador ou documento da biblioteca → a IA lê
    e.stopPropagation();   // a coluna também escuta o drop (fora da lista) — não anexar duas vezes
    if (e.dataTransfer.files?.length || e.dataTransfer.getData("text/zaeon-file")) { soltar.onDrop(e); return; }
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
      .map(enxugarArtefatos)
      .map(({ streaming, fresh, ...m }) => m);
    salvarMensagens(armazem, aba, slim);
  }, [messages]);

  const trocarAba = useCallback((id: string) => {
    if (id === abaAtivaRef.current) return;
    guardarAtual();
    abaAtivaRef.current = id;
    setAbaAtiva(id);
    marcarAtiva(armazem, id);
    const guardadas = carregarMensagens<Msg>(armazem, id);
    setMessages(guardadas);
    // #663: conversa criada em outro aparelho: as mensagens vêm do servidor
    if (!guardadas.length) void mensagensDoServidor("estudos", id).then((wire) => { if (wire.length && abaAtivaRef.current === id && !msgsRef.current.length) setMessages(wire.map(msgDoServidor)); });
    const t = tocarThread(threadsRef.current, id);
    threadsRef.current = t;
    salvarThreads(armazem, t);
    setThreads(t);
  }, [guardarAtual]);

  // Nada de setState dentro do updater de outro setState: no StrictMode o updater roda
  // DUAS vezes em dev, e "criar aba" viraria duas abas. Calcula fora, aplica uma vez.
  const novaAba = useCallback(() => {
    guardarAtual();
    const { threads: lista, nova } = criarThread(threadsRef.current);
    salvarThreads(armazem, lista);
    threadsRef.current = lista;
    abaAtivaRef.current = nova.id;
    setThreads(lista);
    setAbaAtiva(nova.id);
    marcarAtiva(armazem, nova.id);
    setMessages([]);
  }, [guardarAtual]);

  const fecharAba = useCallback((id: string) => {
    const { threads: lista, proxima } = fecharThread(armazem, threadsRef.current, id);
    void apagarNoServidor("estudos", id, armazem, ESCOPO_COWORK);
    salvarThreads(armazem, lista);
    threadsRef.current = lista;
    setThreads(lista);
    if (id === abaAtivaRef.current) {
      abaAtivaRef.current = proxima;
      setAbaAtiva(proxima);
      marcarAtiva(armazem, proxima);
      setMessages(carregarMensagens<Msg>(armazem, proxima));
    }
  }, []);

  // Pedido da SIDEBAR principal (conversa/"Nova conversa" clicada estando noutra sala ou sub-aba):
  // atende o bilhete ao montar (com as conversas carregadas) e os eventos dali pra frente.
  const trocarRef = useRef(trocarAba); trocarRef.current = trocarAba;
  const novaRef = useRef(novaAba); novaRef.current = novaAba;
  useEffect(() => {
    if (!threads.length) return;
    const atender = (p: PedidoConversa | null) => {
      if (!p || p.sala !== "estudos") return;
      if (p.nova) novaRef.current();
      else if (p.id && threadsRef.current.some((t) => t.id === p.id)) trocarRef.current(p.id);
    };
    atender(consumirPedido("estudos"));
    const on = (e: Event) => { atender((e as CustomEvent<PedidoConversa>).detail); consumirPedido("estudos"); };
    window.addEventListener(EVT_PEDIDO_CONVERSA, on);
    return () => window.removeEventListener(EVT_PEDIDO_CONVERSA, on);
  }, [threads.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const renomearAba = useCallback((id: string, titulo: string) => {
    const lista = renomearThread(threadsRef.current, id, titulo);
    threadsRef.current = lista;
    salvarThreads(armazem, lista);
    setThreads(lista);
    renomearNoServidor("estudos", lista.find((t) => t.id === id));
  }, []);

  // Sub-tema do mesmo nicho: sub-conversa ligada à mãe, herdando o contexto (vai junto em cada envio).
  // Começa vazia, com "Aprofunde: " no composer — a 1ª pergunta batiza a sub-conversa.
  const novaSub = useCallback((paiId: string, contexto?: string) => {
    if (sending) return;
    guardarAtual();
    let ctx = contexto;
    if (ctx === undefined) {
      const msgsPai = paiId === abaAtivaRef.current ? msgsRef.current : carregarMensagens<Msg>(armazem, paiId);
      const ultima = [...msgsPai].reverse().find((m) => m.role === "assistant" && textoParaHistorico(m));
      ctx = ultima ? textoParaHistorico(ultima).slice(-1500) : undefined;
    }
    const { threads: lista, nova } = criarSubThread(threadsRef.current, paiId, TITULO_PADRAO, ctx);
    salvarThreads(armazem, lista);
    threadsRef.current = lista;
    abaAtivaRef.current = nova.id;
    setThreads(lista);
    setAbaAtiva(nova.id);
    marcarAtiva(armazem, nova.id);
    setMessages([]);
    setEditando(null);
    setInput((v) => (v.trim() ? v : "Aprofunde: "));
    focarComposer();
  }, [sending, guardarAtual]);

  // Numa sub-conversa, a Aura sabe de qual nicho ela saiu (título da mãe + o trecho herdado).
  const contextoDaSub = () => {
    const atual = threadsRef.current.find((t) => t.id === abaAtivaRef.current);
    if (!atual?.parentId) return "";
    const mae = threadsRef.current.find((t) => t.id === atual.parentId);
    return ` Esta conversa é um SUB-TEMA da conversa "${mae?.titulo ?? "anterior"}" (mesmo nicho): aprofunde o recorte pedido sem perder o fio dela.` +
      (atual.contexto ? ` Contexto herdado da conversa-mãe: \"${atual.contexto}\".` : "");
  };

  /** A aba ganha nome da primeira coisa que a pessoa perguntou. */
  const batizarSePreciso = useCallback((texto: string) => {
    const aba = abaAtivaRef.current;
    if (!aba) return;
    const atual = threadsRef.current.find((t) => t.id === aba);
    if (!atual || atual.titulo !== TITULO_PADRAO) return;
    const lista = renomearThread(threadsRef.current, aba, tituloAPartirDe(texto.replace(/^aprofunde:\s*/i, "")));
    threadsRef.current = lista;
    salvarThreads(armazem, lista);
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
  const runStudioAction = useCallback(async (kind: string, topic: string, attachMsgId?: string, silencioso = false, contexto?: string, pdf?: { dataUrl: string; nome?: string }) => {
    // a conversa que pediu: o artefato volta pra ela mesmo se a pessoa trocar de conversa durante a geração
    const scopeId = abaAtivaRef.current ?? undefined;
    // Fonte da geração: o estudo EM FOCO (se a pessoa está trabalhando nele) OU um
    // estudo NOVO criado pelo tópico. Nunca pega um estudo arbitrário da biblioteca
    // (senão "gere um podcast sobre X" sairia sobre o conteúdo errado). Diagrama, mapa,
    // molécula e aula nascem do assunto e da conversa — não criam estudo vazio em "Meus estudos".
    let spaceId: string | undefined = focusIds[0];
    if (!spaceId && !SEM_ESTUDO.has(kind)) {
      const s = await criarEstudo(topic || "Estudo");
      if (s) { setSpaces((p) => [...p, s as any]); spaceId = s.id; }
      if (!spaceId) return;
    }
    if (kind === "aula") topic = assuntoDe(topic.replace(/^aula interativa:\s*/i, ""));
    const aviso = attachMsgId ? AVISO_ARTEFATO[kind] : undefined;
    const marcar = (v?: string) => setMessages((prev) => prev.map((m) => (m.id === attachMsgId ? { ...m, desenhando: v } : m)));
    if (aviso) marcar(aviso);
    // Rede (por tipo: podcast/vídeo, molécula, imagem, texto) em lib/studio/studioClient.ts —
    // o MESMO núcleo do mobile. Aqui fica só o que é desta tela: o evento e o aviso.
    avisarDesenho("comecou", kind);   // #626: o tour do laboratório mostra "desenhando…"
    const r = await gerarArtefato(kind, { spaceId, topic, contexto, sala: "estudos", ...(pdf ? { pdf } : {}) });
    if (aviso) marcar(undefined);
    avisarDesenho(r.tipo === "pronto" ? "pronto" : "falhou", kind);
    if (r.tipo === "pronto") {
      window.dispatchEvent(new CustomEvent("zaeon:study:embed", { detail: { ...r.bloco, attachMsgId, scopeId } }));
      // Documento (diagrama/aula): abre a aba em "Documentos"; pedido explícito já mostra ela.
      if (KINDS_EM_ABA.has(r.bloco.studioKind) && r.bloco.artifactId) {
        gravarArtefato("estudos", threadsRef.current.find((t) => t.id === scopeId), { studioKind: r.bloco.studioKind, artifactId: r.bloco.artifactId, title: r.bloco.title || topic });
        abrirDocumento({ sala: "estudos", studioKind: r.bloco.studioKind, artifactId: r.bloco.artifactId, titulo: r.bloco.title || topic, data: r.bloco.data, focar: !silencioso, scopeId });
      }
    } else if (r.tipo === "erro" && !r.silencioso && !silencioso) {
      avisarFalha(r.mensagem);
    }
  }, [focusIds, avisarFalha]);

  // ── envio pro chat da Aura ──────────────────────────────────────────────────
  // `override` = envio direto (clique numa opção/conceito da resposta do harness),
  // sem passar pelo campo de texto — B3 do backlog v2.
  /**
   * O FIM de um turno — estruturado, ação do Studio ou texto — aplicado na bolha `asstId`.
   * Uma função só para o stream ao vivo E para o turno retomado do worker (Fase 3): se cada
   * um tivesse a sua, a resposta retomada renderizaria diferente da ao vivo.
   */
  const aplicarFinal = useCallback((asstId: string, limpo: string, prompt: string, abaDoTurno: string | null = abaAtivaRef.current) => {
    const patchAsst = (text: string) =>
      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, text } : m)));
    const threadDoTurno = () => threadsRef.current.find((t) => t.id === abaDoTurno);
    const structured = parseStructuredStream(limpo);
    const si = limpo.indexOf(STUDIO_SENTINEL);
    if (structured) {
      // HARNESS: resposta estruturada — converte a bolha placeholder em cartão rico.
      // Payload malformado (stream cortado etc.) → degrada pra TEXTO, nunca pra vazio.
      if (structured.kind === "answer") {
        const a = structured.answer;
        setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, kind: "structured", answer: a, text: a.nucleo, streaming: false, fresh: true, pendente: false } : m)));
        // TCC cross-sala: o turno criou/editou o TCC desta conversa → guarda o id e abre a aba
        // do TCC na hora (sem sair da sala) — o aluno vê o documento crescer. `abaDoTurno` é a
        // conversa de ORIGEM do turno (no retomado, a aba atual).
        if (TCC_CROSS_ON && a.tcc?.workId && abaDoTurno) {
          const workId = a.tcc.workId;
          guardarTrabalho(abaDoTurno, { id: workId, titulo: a.tcc.titulo, status: a.tcc.gerando ? "gerando" : "pronto", tipo: a.tcc.tipo ?? "TCC" });
          if (abaAtivaRef.current === abaDoTurno) { setTrabalhoAberto(workId); setDocAtivo(null); setCartolinaAberta(false); }
        }
        // Artefatos inline: reusa runStudioAction, anexando NA MESMA bolha (asstId).
        // O tópico é o `title` do ref, NÃO a pergunta inteira: "por que o café me
        // deixa acordado" não resolve no PubChem; "cafeína" resolve.
        for (const art of a.artifacts ?? []) {
          if (art.studioKind && !art.studioKind.startsWith("research:")) {
            // Pedido explícito falha em voz alta; artefato que a Aura trouxe de
            // brinde falha calado — ninguém pediu, ninguém precisa saber.
            // Diagrama/mapa recebem a explicação que o aluno acabou de ler (o desenho reflete ELA).
            const ctx = art.studioKind === "diagram" || art.studioKind === "mindmap" ? textoParaHistorico({ kind: "structured", answer: a }) : undefined;
            void runStudioAction(art.studioKind, art.title?.trim() || prompt, asstId, !art.explicito, ctx);
          }
        }
        // L1 grava o corpo, não a manchete: é esta transcrição que vira memória
        // durável, e memória de manchete não serve pra nada depois.
        gravarTurno("estudos", threadDoTurno(), prompt, textoParaHistorico({ kind: "structured", answer: a }) || a.nucleo);
      } else {
        patchAsst(structured.text);
        gravarTurno("estudos", threadDoTurno(), prompt, structured.text);
      }
    } else if (si >= 0) {
      // TOOL-LOOP (Fase 0): ação — não datilografa; encerra e trata.
      let action: any = null;
      try { action = JSON.parse(limpo.slice(si + STUDIO_SENTINEL.length)); } catch { /* ignore */ }
      if (action?.kind) {
        patchAsst(action.text || "Gerando o artefato…");
        void runStudioAction(action.kind, action.topic || prompt);
      } else {
        patchAsst("Sem resposta agora.");
      }
    } else if (!limpo.trim()) {
      patchAsst("Sem resposta agora.");
    } else {
      patchAsst(limpo);
      // L1: grava o turno durável (fire-and-forget), na conversa que pediu.
      gravarTurno("estudos", threadDoTurno(), prompt, limpo);
    }
    setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, pendente: false } : m)));
  }, [runStudioAction, focusIds]);

  // REENGATE (Fase 3): ao abrir a conversa, todo turno que ficou PENDENTE no worker — o aluno
  // saiu da sala no meio — volta a ser acompanhado e, quando termina, entra na MESMA bolha
  // pelo mesmo `aplicarFinal`. Uma vez por turno (o ref segura); para se trocar de conversa.
  const retomando = useRef<Set<string>>(new Set());
  // Turnos cuja resposta JÁ foi aplicada (por qualquer caminho): nunca aplica de novo — era a origem da
  // "resposta gerada duas vezes" (appendTranscript + runStudioAction em dobro) quando o reengate corria com
  // o `pendente` ainda não commitado mas o `retomando` já limpo. Ref = síncrono, fecha a janela.
  const aplicados = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!abaAtiva) return;
    const aba = abaAtiva;
    let vivo = true;
    const lista = msgsRef.current;
    lista.forEach((m, i) => {
      if (!m.pendente || !m.turnId || m.role !== "assistant" || retomando.current.has(m.turnId) || aplicados.current.has(m.turnId)) return;
      const turnId = m.turnId;
      retomando.current.add(turnId);
      const prompt = [...lista.slice(0, i)].reverse().find((x) => x.role === "user")?.text ?? "";
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, streaming: true } : x)));
      void esperarTurno(turnId, {
        cancelado: () => !vivo || abaAtivaRef.current !== aba,
        onParcial: (p) => {
          const f = faseCorrente(separarProgresso(p).eventos);
          if (f) setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, fase: f.rotulo } : x)));
        },
      }).then((res) => {
        retomando.current.delete(turnId);
        if (res.tipo === "cancelado") return; // volta a ser retomado na próxima abertura
        aplicados.current.add(turnId);
        const fim = (patch: Partial<Msg>) => setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, fase: undefined, streaming: false, ...patch } : x)));
        if (res.tipo === "pronto") { aplicarFinal(m.id, separarProgresso(res.acumulado).limpo, prompt); fim({}); }
        else if (res.tipo === "erro") fim({ text: res.mensagem, pendente: false });
        else fim({ text: "Não consegui recuperar esta resposta. Tenta perguntar de novo.", pendente: false }); // sumiu / teto
      });
    });
    return () => { vivo = false; };
  }, [abaAtiva, aplicarFinal]);

  const send = useCallback(async (override?: string) => {
    const prompt = (typeof override === "string" ? override : input).trim();
    if (!prompt || sending) return;
    // o TUTORIAL do tablet (lib/onboarding/tutorialLab): o tema escolhido não vai pro chat — vira a pesquisa na tela roxa
    if (temaNoTutorial()) { const tema = temaDoTexto(prompt); if (!tema) return; setInput(""); window.dispatchEvent(new CustomEvent(EVT_TEMA, { detail: { tema } })); return; }
    // o tour do laboratório (lib/onboarding/tourSala) anda quando a pessoa pede o 1º estudo
    window.dispatchEvent(new CustomEvent(EVT_PERGUNTA_CHAT, { detail: { prompt } }));
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
    const abaDoTurno = abaAtivaRef.current; // o TCC criado neste turno é DESTA conversa, mesmo se o aluno trocar de aba no meio
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", kind: "text", text: prompt, at: Date.now() },
      { id: asstId, role: "assistant", kind: "text", text: "", streaming: true, at: Date.now() },
    ]);
    if (typeof override !== "string") setInput("");   // envio direto (sugestão/editar/regenerar) preserva o rascunho
    batizarSePreciso(prompt);
    avisarEscritorio(activeMentor, "trabalhando");
    setSending(true);

    const patchAsst = (text: string) =>
      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, text } : m)));
    // a MEDIÇÃO desta resposta (lib/chat/temposResposta): servidor × tela
    const crono = cronometrarResposta();
    let turnoVivo: string | null = null;
    let pararDatilografia = () => {}; // o `finally` garante que o laço de rAF nunca fica girando

    const focusTitles = focusIds.map(spaceTitle);
    // MODO ACADÊMICO = FLEXÍVEL na Sala de Estudos; o MODO PESQUISA (chat único) liga o rigor pleno — o que a
    // Sala de Pesquisa fazia: só fonte acadêmica, citação, linguagem formal.
    const pesquisa = CHAT_UNICO && modoPesquisaRef.current;
    const flexClause = pesquisa
      ? " MODO PESQUISA LIGADO: você é a parceira científica do aluno — escreve e revisa trabalhos acadêmicos (artigo, TCC, relatório), sugere e verifica referências, explica com rigor e linguagem formal em PT-BR. " + DIRETRIZ_PESQUISA
      : " " + DIRETRIZ_ESTUDOS;
    // AQUI MORAVA O CARDÁPIO. A linha sem foco terminava com "ofereça transformar o
    // assunto em artefatos do Studio (Guia, Mapa mental, Linha do tempo, Flashcards,
    // FAQ, Imagem, Podcast, Vídeo)" — em TODO turno. O modelo obedecia, e a conversa
    // virava um vendedor simpático: resposta rasa + menu. Artefato agora é decisão do
    // código, a partir do assunto; o modelo só conversa.
    const lendo = anexoRef.current;
    // AULA a partir do PDF anexado: com arquivo o turno vai pelo caminho multimodal (fora do harness),
    // então o pedido de aula é atendido aqui — o PDF segue junto pra virar a aula.
    if (lendo && pedeAula(prompt)) void runStudioAction("aula", lendo.nome, asstId, false, undefined, { dataUrl: lendo.dataUrl, nome: lendo.nome });
    const systemContext = (lendo ? `O aluno anexou o arquivo "${lendo.nome}" (vai junto nesta mensagem): leia o CONTEÚDO dele e responda com base nele. ` : "") + (focusIds.length
      ? `O usuário está no co-working da Sala de Estudos e FOCOU ${focusIds.length} estudo(s): ${focusTitles.join("; ")}. Concentre-se nesse(s) estudo(s) ao responder.`
      : `O usuário está no co-working da Sala de Estudos. Converse com naturalidade, mantendo o fio do assunto entre as mensagens.`)
      + " Nunca ofereça recursos, ferramentas ou botões da plataforma, e nunca comente o que você 'pode gerar' — fale do tema."
      + flexClause
      + contextoDaSub()
      + contextoDoLote(loteRef.current);

    try {
      let target = "";       // parte VISÍVEL alvo (sem a sentinela)
      let previa = "";       // a prévia do rascunho (lib/agent/previa) — o texto enquanto o turno ainda roda
      let shown = 0;         // quantas letras já reveladas
      let ended = false;
      pararDatilografia = () => { ended = true; };
      // Datilografia (B2): revela em ordem, POR TEMPO (lib/ui/typewriter revelarPorTempo): o atraso entre o recebido
      // e o visível se fecha em ~0,5 s em qualquer fps — antes era um teto POR QUADRO (6 letras), que deixava o texto
      // segundos atrás do que já tinha chegado. A tela é refeita no máximo ~30×/s (cada patch re-renderiza a conversa).
      // ATENÇÃO: todo caminho de saída marca `ended`, senão este laço gira pra sempre.
      let antes = performance.now(), ultimoPatch = 0;
      const typed = new Promise<void>((resolve) => {
        const tick = () => {
          const agora = performance.now(), dt = Math.min(0.25, (agora - antes) / 1000); antes = agora;
          if (shown < target.length) {
            shown = safeCut(target, shown + revelarPorTempo(target.length - shown, dt));
            if (shown >= target.length || agora - ultimoPatch >= 32) { patchAsst(target.slice(0, shown)); ultimoPatch = agora; crono.texto(); }
          } else if (ended) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

      // Rede (fetch → stream → espera do worker em modo BG) mora em lib/chat/auraClient.ts,
      // o MESMO núcleo do chat mobile (useAuraChat). Aqui fica só o que é desta tela.
      const res = await pedirAura({
        prompt,
        history,
        systemContext,
        // modo pesquisa = a superfície da antiga Sala de Pesquisa (academicMode enforced no harness)
        ...(pesquisa ? { surface: "pesquisa" } : {}),
        agentContext: {
          activeTab: pesquisa ? "pesquisa" : "sala-de-estudos",
          // chat único: a conversa tem VÁRIOS trabalhos; o aberto no editor é o que "continue a metodologia" edita
          ...(CHAT_UNICO ? { chatUnico: true, trabalhoAbertoId: (abaAtivaRef.current && focoPorAbaRef.current[abaAtivaRef.current]) || undefined } : {}),
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
        modelo: modeloRef.current,           // o servidor só aceita ids do catálogo (lib/chat/modelos)
        ...(lendo ? { fileData: lendo.dataUrl } : {}),
      }, {
        onModelo: (nome) => { crono.sinal(); setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, modelo: nome } : m))); },
        // CHAT_BG: o turno roda no worker; o id fica na mensagem pra reengatar se o aluno sair.
        // Este send() É o dono do turno enquanto estiver vivo: o reengate não pega o mesmo
        // turno em paralelo (aplicaria o fim duas vezes — transcrição/artefato duplicados).
        onTurnId: (turnId) => {
          retomando.current.add(turnId);
          turnoVivo = turnId;
          setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, turnId, pendente: true } : m)));
        },
        onFase: (rotulo) => { crono.sinal(); setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, fase: rotulo } : m))); },
        onLimpo: (limpo) => {
          crono.sinal();
          const cut = [limpo.indexOf(STUDIO_SENTINEL), limpo.indexOf(STRUCTURED_SENTINEL)].filter((i) => i >= 0);
          target = cut.length ? limpo.slice(0, Math.min(...cut)) : limpo;   // datilografa só o visível
          if (!target && previa) target = previa;   // (o turno do harness não manda texto solto: a prévia segue na tela)
        },
        // a PRÉVIA da resposta (o rascunho enquanto nasce): datilografa na bolha; a resposta estruturada do fim a substitui
        onPrevia: (texto) => { crono.sinal(); previa = texto; target = texto; },
      });

      crono.recebido(res.ok ? res.limpo.length : 0);
      if (!res.ok) {
        target = ""; ended = true;
        patchAsst(res.motivo === "rede" ? "Falha de rede ao falar com a Aura." : "Não consegui responder agora. Tente de novo.");
      } else {
        const limpo = res.limpo;
        // Ação/estrutura não datilografa; texto simples deixa a digitação alcançar o fim.
        if (parseStructuredStream(limpo) || limpo.includes(STUDIO_SENTINEL)) { target = ""; ended = true; }
        else { target = limpo; ended = true; await typed; }
        if (turnoVivo) aplicados.current.add(turnoVivo);   // trava: o reengate nunca reaplica este turno
        aplicarFinal(asstId, limpo, prompt, abaDoTurno);
      }
    } catch {
      patchAsst("Falha de rede ao falar com a Aura.");
    } finally {
      pararDatilografia();
      crono.fechar();
      if (turnoVivo) retomando.current.delete(turnoVivo);
      avisarEscritorio(activeMentor, "ocioso");
      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, fase: undefined, ...(m.streaming ? { streaming: false } : null) } : m)));
      setSending(false);
      avisarTurnoFim();   // #626: o tour sabe que a resposta acabou (e se veio desenho junto)
      // o mentor pode ter subido a maestria neste turno → o painel refaz o progresso
      if (tree) setTreeRefresh((n) => n + 1);
      // a conversa pode ter virado ESTUDO (o servidor decide depois da resposta) → a bolinha "Gerar mapa" aparece
      conferirCerebro.current();
    }
  }, [input, sending, focusIds, spaceTitle, runStudioAction, activeMentor, skillNode, tree, avisarEscritorio, batizarSePreciso, aplicarFinal, anexoRef]);
  sendRefA.current = (t: string) => { void send(t); };

  /** Refaz a conversa a partir da pergunta `idx` (editar/regenerar): corta dali pra baixo e reenvia. */
  const reenviar = (idx: number, texto: string) => {
    if (sending) return;
    const corte = msgsRef.current.slice(0, idx);
    if (abaAtivaRef.current) cortarNoServidor("estudos", abaAtivaRef.current, msgsRef.current[idx]?.at);
    msgsRef.current = corte;   // o send lê o histórico daqui, já cortado
    setMessages(corte);
    setEditando(null);
    void send(texto);
  };
  const ultimaResposta = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "assistant") return messages[i].id;
    return null;
  })();
  // O ROSTO É O CHAT: o que a conversa está fazendo vira o sinal de todos os rostos da Aura
  // (boas-vindas, pílula da resposta, bolinha da aba) — ouvindo enquanto digita, pensando, falando.
  const ultimaMsg = messages.find((m) => m.id === ultimaResposta);
  const temTexto = !!(ultimaMsg?.text || ultimaMsg?.answer);
  // resposta estruturada chega inteira e é DATILOGRAFADA: enquanto o núcleo digita, ela fala
  const [digitandoResposta, setDigitandoResposta] = useState<string | null>(null);
  const sinalTurno = sinalDoChat({
    pensando: !!ultimaMsg && !temTexto && (sending || !!ultimaMsg.pendente || !!ultimaMsg.streaming),
    falando: !!ultimaMsg && temTexto && (!!ultimaMsg.streaming || !!ultimaMsg.pendente || (sending && !ultimaMsg.answer) || digitandoResposta === ultimaMsg.id),
    digitando: !sending && input.trim().length > 0,
  });
  // e se mesmo assim pulou direto de "pensando" pro fim, ela fala a resposta por um tempo do tamanho dela
  const sinalAura = useFalaAoChegar(sinalTurno, ultimaMsg?.answer?.nucleo || ultimaMsg?.text || "");
  // modo voz: com a voz do app tocando ("ouvir resposta", leitura), o rosto fala com ela
  const rosto = usePublicarPresenca("aura", sinalAura);
  const recuo = useManifesto("aura") ? RECUO_ROSTO : "";
  /** Mini-ações de uma resposta da Aura (copiar/regenerar/👍👎/sub-tema). */
  const acoesDa = (m: Msg, i: number) => {
    if (m.role !== "assistant" || m.streaming || m.pendente || (sending && m.id === ultimaResposta)) return null;
    const texto = textoParaHistorico(m);
    if (!texto) return null;
    let pergunta = -1;
    for (let j = i - 1; j >= 0; j--) if (messages[j].role === "user") { pergunta = j; break; }
    return (
      <>
      {m.modelo && <div className="mt-1 -mb-0.5"><SeloModelo nome={m.modelo} /></div>}
      <AcoesResposta
        msgId={m.id}
        texto={texto}
        ocupado={sending}
        onRegenerar={m.id === ultimaResposta && pergunta >= 0 ? () => reenviar(pergunta, messages[pergunta].text ?? "") : undefined}
        onAprofundar={abaAtiva ? () => novaSub(abaAtiva, texto.slice(-1500)) : undefined}
      />
      </>
    );
  };

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

  // as 3 sugestões da conversa nova: o começo vai pro campo e o cursor fica no fim (a pessoa completa com o tema)
  const escolherSugestao = (comeco: string) => {
    setInput(comeco);
    requestAnimationFrame(() => { const t = colunaRef.current?.querySelector<HTMLTextAreaElement>("textarea"); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } });
  };
  // #613: o exemplo do "Sua vez" do tour escreve aqui (a pessoa revisa e manda)
  const escolherRef = useRef(escolherSugestao);
  escolherRef.current = escolherSugestao;
  useEffect(() => {
    const preencher = (e: Event) => { const t = (e as CustomEvent<{ texto?: string }>).detail?.texto; if (t) escolherRef.current(t); };
    window.addEventListener(EVT_PREENCHER_CHAT, preencher);
    return () => window.removeEventListener(EVT_PREENCHER_CHAT, preencher);
  }, []);
  // o MAPA da conversa: aparece quando ela vira estudo ("Gerar mapa"); depois, "Ver mapa"
  const bolinhaMapa = cerebro.ligado && abaAtiva ? (
    <BolinhaCerebro
      estado={cerebro.estado}
      completude={cerebro.mapa?.completudeAprendizado ?? 0}
      aberto={cerebroAberto}
      onClick={() => {
        // gerar NÃO abre a tela: a barra corre no botão; o mapa abre quando a pessoa clicar nele pronto
        if (cerebro.estado === "sugerida" || cerebro.estado === "vazia") void cerebro.gerar();
        else if (cerebro.estado === "ativa") setCerebroAberto((v) => !v);
      }}
    />
  ) : null;
  return (
    <div className="relative h-full flex lg:flex-row flex-col" style={zoom.style}>
      {/* Borda-degradê navy na aresta esquerda (par visual com a sidebar da esquerda) — só no claro. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[1.5px] z-10 dark:hidden"
        style={{ background: "linear-gradient(180deg,#0f172a,rgba(15,23,42,0.25) 50%,transparent)" }}
      />
      {/* ESQUERDA = CONVERSAS (estilo ChatGPT/Claude): a lista vertical desta sala, com sub-temas. */}
      <div className="relative flex-1 min-w-0 min-h-0 flex">
      {/* As conversas moram na SIDEBAR PRINCIPAL do app (portal no slot); sem ela, aqui ao lado. */}
      {(() => {
        const lista = (
          <ConversasSidebar
            sala="estudos"
            threads={threads}
            ativa={abaAtiva}
            ocupada={sending ? abaAtiva : null}
            aoTrocar={(id) => { irProChat(); trocarAba(id); }}
            aoCriar={() => { irProChat(); novaAba(); }}
            aoFechar={fecharAba}
            aoRenomear={renomearAba}
            aoCriarSub={(id) => novaSub(id)}
            embutida={!!slotSidebar}
          />
        );
        if (slotSidebar === null) return null;           // a sidebar é de outra sala agora
        return slotSidebar ? createPortal(lista, slotSidebar) : lista;
      })()}
      {/* ── COLUNA CENTRAL: conversa + composer ── */}
      <div ref={colunaRef} style={{ "--topo-pastas": `${topoPastas}px` } as React.CSSProperties} className={`relative flex-1 min-w-0 flex flex-col ${CORPO_DA_PASTA}`} onDragOver={soltar.onDragOver} onDragLeave={soltar.onDragLeave} onDrop={(e) => { if (e.dataTransfer.files?.length || e.dataTransfer.getData("text/zaeon-file")) soltar.onDrop(e); }}>
        {arrastando && <AvisoSoltar />}

        {/* ⟁ Árvore de habilidades — drawer opt-in por cima da conversa (não troca a tela) */}
        {treeOpen && (
          // acima dos documentos/editor (z-30/35) — antes ela abria por baixo de um documento aberto; expandida = o chat inteiro
          <div className={`absolute top-[var(--topo-pastas,46px)] bottom-0 right-0 z-[38] w-full ${treeExpandida ? "" : "sm:w-[460px]"} shadow-[-24px_0_60px_-30px_rgba(15,23,42,0.5)]`}>
            <SkillTreePanel
              expandida={treeExpandida}
              onExpandir={setTreeExpandida}
              topic={focusIds[0] ? spaceTitle(focusIds[0]) : null}
              focusNodeId={skillNode?.nodeId ?? null}
              refreshKey={treeRefresh}
              onTree={setTree}
              onNodeChat={onNodeChat}
              onClose={() => setTreeOpen(false)}
            />
          </div>
        )}

        {CARTOLINA_ON && cartolinaAberta && abaAtiva && (
          <div className="absolute inset-0 z-40">
            <LoungeCartolina
              embedded surface="estudos" scopeId={abaAtiva} abrirDeInicio
              onFechar={() => setCartolinaAberta(false)}
              onAbrirConversa={(msgId) => { setCartolinaAberta(false); requestAnimationFrame(() => ancorar(msgId)); }}
              onAbrirTcc={TCC_CROSS_ON ? (workId) => {
                setCartolinaAberta(false);
                if (!(trabalhosPorAba[abaAtiva] ?? []).some((x) => x.id === workId)) guardarTrabalho(abaAtiva, { id: workId, titulo: "TCC", status: "pronto", tipo: "TCC" });
                setTrabalhoAberto(workId);
              } : undefined}
            />
          </div>
        )}

        {/* O TRABALHO aberto: no chat único ocupa a sala como um documento (o editor estilo Word, abaixo das pastas);
            fora dele, a gaveta à direita de antes. */}
        {trabalhoAberto && TCC_CROSS_ON && (
          <div className={CHAT_UNICO
            ? "absolute inset-x-0 bottom-0 top-[var(--topo-pastas,46px)] z-[35]"
            : "absolute inset-y-0 right-0 z-40 w-full sm:w-[min(620px,100%)] shadow-[-24px_0_60px_-30px_rgba(15,23,42,0.5)]"}>
            <TccPanel
              key={trabalhoAberto}
              workId={trabalhoAberto}
              onFechar={() => setTrabalhoAberto(null)}
              onTitulo={abaAtiva ? (t) => guardarTrabalho(abaAtiva, { id: trabalhoAberto, titulo: t.titulo, status: t.status, tipo: t.tipo }) : undefined}
            />
          </div>
        )}

        {reaAberto && REA_BP_ON && (
          <div className={CHAT_UNICO
            ? "absolute inset-x-0 bottom-0 top-[var(--topo-pastas,46px)] z-[36]"
            : "absolute inset-y-0 right-0 z-40 w-full sm:w-[min(640px,100%)] shadow-[-24px_0_60px_-30px_rgba(15,23,42,0.5)]"}>
            <ReaBlueprintView key={reaAberto} id={reaAberto} onFechar={() => setReaAberto(null)} />
          </div>
        )}

        {tempoUlt && (
          <div className="pointer-events-none absolute left-3 bottom-24 z-20 rounded-lg bg-black/70 px-2 py-1 font-mono text-[10px] text-cyan-200">⏱ {fmtTempos(tempoUlt)}</div>
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

        {/* TOPO = PASTAS: a CONVERSA na frente e os documentos dela (aulas/diagramas, TCC, cartolina) empilhados atrás —
            puxar a aba traz a pasta pra frente (components/chat/PastasEmpilhadas). As conversas ficam na barra da esquerda:
            trocar de conversa lá não abre/fecha documento aqui, e vice-versa. */}
        <PastasEmpilhadas
          // #640: o documento, o mapa, o trabalho, o REA e a árvore começam onde a barra TERMINA (era 46 px fixo —
          // com o "Ver mapa" a barra ficou mais alta e eles cortavam a parte de baixo das abas)
          aoMedirAltura={setTopoPastas}
          pastas={[
            { id: "conversa", rotulo: "Conversa", titulo: "A conversa", icone: <span className="text-cyan-600 dark:text-cyan-300">⟁</span> },
            ...docs.map((d): Pasta => {
              const r = ROTULO_DOC[d.studioKind] ?? { emoji: "⟁", nome: "Documento" };
              return {
                id: d.artifactId, rotulo: d.titulo || r.nome, titulo: d.titulo, icone: r.emoji,
                onFechar: () => { setDocs((xs) => xs.filter((x) => x.artifactId !== d.artifactId)); if (docAtivo === d.artifactId) setDocAtivo(null); },
              };
            }),
            // os TRABALHOS da conversa (abrem no editor; nascem do "escreva um artigo/TCC sobre…" ou do card na cartolina)
            ...trabalhosDaAba.map((w): Pasta => ({
              id: `trab:${w.id}`, rotulo: CHAT_UNICO ? w.titulo : "TCC", titulo: `${w.tipo}: ${w.titulo}`, icone: <GraduationCap size={13} />,
              ...(CHAT_UNICO ? { onFechar: () => { setTrabalhosPorAba((p) => ({ ...p, [abaAtiva!]: (p[abaAtiva!] ?? []).filter((x) => x.id !== w.id) })); if (trabalhoAberto === w.id) setTrabalhoAberto(null); if (focoPorAbaRef.current[abaAtiva!] === w.id) delete focoPorAbaRef.current[abaAtiva!]; } } : {}),
            })),
            // a cartolina da conversa (o board abre por cima; tap num card → volta à resposta)
            ...(CARTOLINA_ON && abaAtiva ? [{ id: "cartolina", rotulo: "Cartolina", titulo: "Cartolina desta conversa", icone: <FileText size={13} /> }] : []),
          ]}
          ativa={cartolinaAberta && CARTOLINA_ON ? "cartolina" : trabalhoAberto && TCC_CROSS_ON ? `trab:${trabalhoAberto}` : docAtivo ?? "conversa"}
          // enquanto a Aura responde, o friso da pasta "Conversa" varre (o mesmo sinal do ponto pulsando na barra)
          gerando={sending ? "conversa" : null}
          onAbrir={(id) => {
            if (id.startsWith("trab:")) { setTrabalhoAberto(id.slice(5)); setCartolinaAberta(false); return; }
            if (id === "cartolina") { setCartolinaAberta(true); return; }
            setTrabalhoAberto(null); setCartolinaAberta(false);
            setDocAtivo(id === "conversa" ? null : id);
          }}
          // #633: o botão do MAPA (o cérebro) mora à DIREITA, do lado do A−/A+ — os controles da conversa juntos;
          // e vem DEPOIS das letras: A− A+ [Ver mapa]
          depois={<>
            <ChatZoom escala={zoom.escala} menor={zoom.menor} maior={zoom.maior} />
            {bolinhaMapa}
          </>}
        />

        {/* o painel do MAPA: por cima da conversa (abaixo da linha de cima, que segue mostrando a bolinha) */}
        <AnimatePresence>
          {cerebro.ligado && cerebroAberto && (
            <div key="cerebro" className="absolute inset-x-0 bottom-0 top-[var(--topo-pastas,46px)] z-40">
              <CerebroPanel
                st={cerebro}
                onFechar={() => setCerebroAberto(false)}
                onAbrirMensagem={(msgId) => {
                  setCerebroAberto(false);
                  requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-msg="${CSS.escape(msgId)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
                }}
              />
            </div>
          )}
        </AnimatePresence>

        {/* O documento aberto ocupa a sala (abaixo da linha de Documentos); a conversa fica montada embaixo. */}
        {docs.map((d) => (
          <div key={d.artifactId} className="absolute inset-x-0 bottom-0 top-[var(--topo-pastas,46px)] z-30 bg-white dark:bg-[#070b14]" style={{ display: docAtivo === d.artifactId ? undefined : "none" }}>
            <DocumentoArtefato doc={d} />
          </div>
        ))}

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
            {messages.length === 0 ? <><BoasVindasAgente agentId="aura" nome="Aura" sinal={rosto.sinal} boca={rosto.boca} /><SugestoesConversa onEscolher={escolherSugestao} /><DicaSubTema threads={threads} ativa={abaAtiva} /></> : (
              messages.map((m, i) => {
                // rosto da Aura AO LADO de cada resposta; só a mais recente vive (pensa → fala → sorri)
                const pilula = m.role === "assistant" && (m.kind === "text" || m.kind === "structured")
                  ? <AgentePilula agentId="aura" nome="Aura" estado={rosto.sinal} boca={rosto.boca} ultima={m.id === ultimaResposta} className="absolute left-0 top-0" />
                  : null;
                if (m.kind === "text") {
                  const isUser = m.role === "user";
                  if (isUser && editando === m.id) {
                    return (
                      <div key={m.id} className="flex justify-end">
                        <EdicaoPergunta inicial={m.text ?? ""} onCancelar={() => setEditando(null)} onEnviar={(t) => reenviar(i, t)} />
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} data-msg={m.id} className={`group/msg flex flex-col ${isUser ? "items-end" : `items-start ${recuo}`}`}>
                      {pilula}
                      <div style={{ fontSize: fonteChat(22) }} className={`max-w-[85%] rounded-2xl px-4 py-2.5 font-tech leading-[1.65] whitespace-pre-wrap
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
                              // livros achados: o cartão (com "Abrir no leitor") substitui a lista em markdown do texto
                              : <><ChatMarkdown text={m.answer?.livros?.length ? semListaDeLivros(m.text) : m.text} />{m.streaming && <span aria-hidden className="z-caret" />}</>)
                          : (!isUser && <AuraThinking active fase={m.fase} phases={quickThinking ? ["Pensando"] : ["Pensando", "Elaborando"]} />)}
                      </div>
                      {isUser
                        ? (m.text ? <AcoesPergunta texto={m.text} ocupado={sending} onEditar={() => setEditando(m.id)} /> : null)
                        : acoesDa(m, i)}
                      {!isUser && m.answer?.livros?.length ? <LivrosCartao livros={m.answer.livros} sala="estudos" /> : null}
                      {!isUser && (m.studioBlock || m.desenhando) ? (
                        <div className="w-full max-w-[85%]">
                          {m.studioBlock ? <BlocoOuCartao b={m.studioBlock} /> : null}
                          {m.blocosExtra?.map((b) => <BlocoOuCartao key={b.studioKind} b={b} />)}
                          {m.desenhando ? <Desenhando texto={m.desenhando} /> : null}
                        </div>
                      ) : null}
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
                      onDigitando={m.id === ultimaResposta ? (on) => setDigitandoResposta((cur) => (on ? m.id : cur === m.id ? null : cur)) : undefined}
                      acoes={acoesDa(m, i)}
                      onConcept={(c) => void send(`Me explica melhor: ${c}`)}
                      onNext={(s) => void send(s)}
                      onAbrirRea={REA_BP_ON ? (id) => setReaAberto(id) : undefined}
                    >
                      {m.studioBlock || m.blocosExtra?.length || m.desenhando ? (
                        <>
                          {m.studioBlock ? <BlocoOuCartao b={m.studioBlock} /> : null}
                          {m.blocosExtra?.map((b) => <BlocoOuCartao key={b.studioKind} b={b} />)}
                          {m.desenhando ? <Desenhando texto={m.desenhando} /> : null}
                        </>
                      ) : null}
                    </StructuredAnswerView>
                  );
                  // SEM a "revista" (o layout editorial com artefato embutido bugava a geração): toda resposta sai no
                  // formato normal do chat — o artefato vem dentro dela (StructuredAnswerView), como nas outras.
                  return (
                    <div key={m.id} data-msg={m.id} className={`group/msg flex justify-start ${recuo}`}>
                      {pilula}
                      <div className="max-w-[85%] w-full">{padrao}</div>
                    </div>
                  );
                }
                if (m.kind === "studio" && m.studioBlock) {
                  return (
                    <div key={m.id} className="flex justify-start">
                      <div className="max-w-[85%] w-full">
                        <BlocoOuCartao b={m.studioBlock} />
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
          <div data-tour="composer-estudos" className="ml-4 sm:ml-8 lg:ml-14 mr-0 sm:mr-2">
            <CoworkComposer
              value={input}
              onChange={setInput}
              onSubmit={() => void send()}
              onToggleStudio={() => setStudioOpen((v) => !v)}
              studioOpen={studioOpen}
              busy={sending}
              idle={messages.length === 0 && !sending}
              active={active && !openStudyId}
              onFiles={(f) => void anexarArquivos(f)}
              placeholder={anexo ? `Pergunte sobre ${anexo.nome}…` : lote.length ? `Pergunte sobre os ${lote.length} arquivos…` : ""}
            >
              <BarraBase envios={envios} versao={versaoBase} />
              {anexo && <ChipAnexo anexo={anexo} onTirar={tirarAnexo} />}
              <ChipsLote lote={lote} onTirar={tirarDoLote} />
              {/* ⟁ Aura ▾ — seletor: Aura base ou um mentor plugado (quebra linha no celular em vez de vazar pra fora) */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <MentorPill value={activeMentor} onChange={(slug) => setActiveMentor(slug)} />
                {/* MODELO: com quem o aluno fala de verdade (Google ou o servidor da Zaeon) */}
                <SeletorModelo valor={modeloEscolhido} onChange={escolherModelo} desabilitado={sending} />
                {/* MODO PESQUISA (chat único): o harness de pesquisa da antiga Sala de Pesquisa, ligado nesta conversa */}
                {CHAT_UNICO && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={modoPesquisa}
                    onClick={() => ligarModoPesquisa(!modoPesquisa)}
                    title={modoPesquisa ? "Modo pesquisa ligado: fontes acadêmicas, citações e rigor científico. Clique para desligar." : "Ligar o modo pesquisa: fontes acadêmicas, citações, artigos/TCC no editor"}
                    className={`inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full text-[11.5px] font-bold font-tech border transition-colors
                      ${modoPesquisa
                        ? "bg-gradient-to-r from-violet-600/20 to-fuchsia-500/15 text-violet-800 dark:text-violet-200 border-violet-500/50"
                        : "text-slate-500 dark:text-white/50 border-slate-200 dark:border-white/10 hover:text-violet-600 hover:border-violet-300"}`}
                  >
                    <span aria-hidden className={`relative inline-flex h-3.5 w-6 rounded-full transition-colors ${modoPesquisa ? "bg-violet-600" : "bg-slate-300 dark:bg-white/20"}`}>
                      <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-[left] ${modoPesquisa ? "left-[12px]" : "left-0.5"}`} />
                    </span>
                    <FlaskConical size={12} /> Modo pesquisa
                  </button>
                )}
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

      </div>

      {/* ── BIBLIOTECA (direita, retrátil) — o MESMO painel da Sala de Pesquisa (documentos, pasta com os
          estudos, citações, lixeira). ▶ ou arrastar um documento pra conversa = a IA lê; ＋ = enviar PDF. ── */}
      <input ref={libInputRef} type="file" accept="application/pdf" multiple className="hidden"
        onChange={(e) => { const l = e.target.files; if (l?.length) void anexarArquivos(Array.from(l)); e.target.value = ""; }} />
      {libOpen ? (
        <div className="relative lg:w-64 shrink-0 flex flex-col min-h-0 lg:m-3 max-h-[45vh] lg:max-h-none [&>*]:flex-1">
          <DocumentDesktop
            processingFileId={null}
            onPlayFile={(f) => void conversarSobre(f)}
            onAdd={() => libInputRef.current?.click()}
            openPopover={libPopover}
            onTogglePopover={setLibPopover}
            citationCount={citacoesSalvas.length}
            showFolder={libPasta}
            onToggleFolder={() => setLibPasta((v) => !v)}
            sessions={spaces.map((sp) => ({ id: sp.id, title: sp.title || "Estudo" }))}
            onOpenSession={openStudy}
            onNewWork={newStudy}
            onDeleteWork={(id) => deleteStudy(id, spaces.find((sp) => sp.id === id)?.title)}
            onView={(f) => void anexarDaBiblioteca(f.id)}
            onDropFiles={(f) => void anexarArquivos(f)}
            sessionDragMime={DT}
            rotuloPasta="📁 Meus estudos"
          />
          <button onClick={() => setLibOpen(false)} title="Recolher biblioteca"
            className="absolute top-2 right-2 z-20 w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white/85 hover:bg-white/10 transition-colors">
            <PanelRightClose size={13} />
          </button>
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

/** Diagrama/aula são DOCUMENTOS (abrem numa aba): no chat, só o cartão. O resto do Studio fica inline. */
function BlocoOuCartao({ b }: { b: StudioBlockData }) {
  if (KINDS_EM_ABA.has(b.studioKind) && b.artifactId) {
    return <CartaoArtefato doc={{ sala: "estudos", studioKind: b.studioKind, artifactId: b.artifactId, titulo: b.title, data: b.data }} />;
  }
  return <StudioBlock block={b} collapsed={false} />;
}
