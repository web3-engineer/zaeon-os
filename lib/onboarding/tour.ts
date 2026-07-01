"use client";

import { prewarmSpeech } from "@/lib/voice/ttsController";

/**
 * Tour guiado da Zaeon (onboarding). Roteiro DECLARATIVO: a Zaeon "puxa assunto" no
 * chat widget (autonomia), enquanto o overlay destaca o elemento da vez. Golden path:
 * Estudos → pesquisar → resultado → gerar pesquisa → Sala de Pesquisa → Lounge.
 *
 * Estado em memória + localStorage; ao concluir/pular, marca no servidor
 * (/api/onboard/tour → User.tourDone, visível no dashboard) — uma vez por usuário.
 */
export type TourStep = {
  id: string;
  say: string;               // fala da Zaeon (vai pro chat widget + VOZ)
  hint: string;              // textinho curto (com emoji) no card, descrevendo a função
  target?: string;           // seletor do elemento a destacar (coachmark)
  clickTarget?: boolean;     // avança ao CLICAR no próprio elemento destacado (sem botão)
  advanceEvent?: string;     // avança quando este window event dispara (ação concluída)
  advanceEvents?: string[];  // idem, porém aceita VÁRIOS eventos (qualquer um avança)
  prefill?: string;          // pré-preenche a barra de pesquisa ao entrar no passo
  tab?: string;              // garante a aba certa do research-lab (dispara zaeon:set-tab)
  subtab?: string;           // sub-aba da Sala de Estudos (dispara zaeon:set-subtab; ex.: "meus-estudos")
  info?: boolean;            // passo só explicativo → mostra um "Ok" leve pra seguir
  cta?: string;              // rótulo do botão (só quando info)
  onMenu?: boolean;          // passo que vive no MENU inicial (não no research-lab)
};

// Golden path NOVO: começa no MENU inicial (logado) → abre Estudos → pesquisa o
// exemplo fixo "história do Brasil" → vira o chat de lado → percorre Referências/
// Insights/Base → gera a pesquisa → Sala de Pesquisa (player do doc salvo + citações).
export const TOUR_STEPS: TourStep[] = [
  // — BEAT 1) APRESENTAR: foco só no chat; a Zaeon se apresenta e diz o que vem. Avança com
  //   um "Vamos lá" leve (a fala não é cortada — o TTS enfileira; ver item 5).
  { id: "apresentar", onMenu: true, target: '[data-tour="chat-widget"]', info: true, cta: "Vamos lá",
    hint: "👋 Que bom te ver — bora começar?",
    say: "Oi, que bom te ver por aqui! 💜 Já te liguei pra gente conversar **por voz** enquanto eu te mostro tudo. 🎙️ Em um minutinho você vai saber **pesquisar**, **gerar um trabalho em ABNT** e **criar seus estudos**. Bora?" },

  // — BEAT 2) JOGAR PRO LADO (flip-right): ação OBRIGATÓRIA.
  { id: "flip", onMenu: true, target: '[data-tour="chat-flip"]', advanceEvent: "zaeon:chat:flipped-right",
    hint: "↔ Me jogue pro lado direito",
    say: "Primeiro, **me joga pro lado direito** ali no **botãozinho de virar (↔)** do meu cabeçalho — fica bem melhor pra eu te mostrar as coisas." },

  // — BEAT 3) MINIMIZAR: ação OBRIGATÓRIA. Depois disto o chat fica minimizado (não reabre).
  { id: "chat-min", onMenu: true, target: '[data-tour="chat-widget"]', advanceEvent: "zaeon:chat:minimized",
    hint: "➖ Me minimize no cantinho",
    say: "Perfeito! Agora me **minimiza** no **traço (–)** do meu topo pra gente ter a tela toda. 😊" },

  // — 2) MENU inicial: por onde começar. Destaca Estudos. Avança quando abre a Sala de Estudos.
  { id: "menu-estudos", onMenu: true, advanceEvent: "zaeon:study:new", target: '[data-tour="menu-estudos"]',
    hint: "📚 Abra Estudos e crie um novo",
    say: "Agora abre os seus **Estudos** neste menu e clica em **Novo estudo** — é onde tudo começa. Só sigo quando você criar um de verdade. 😉" },

  // — 2b) DESTAQUE da aba Estudos antes de buscar (nada "aparece do nada"): coachmark na aba.
  { id: "sala-estudos", tab: "sala-de-estudos", target: '[data-tour="tab-community"]', clickTarget: true,
    hint: "🏛️ Essa é a sua Sala de Estudos",
    say: "Essa é a sua **Sala de Estudos** — clica aqui na aba **Estudos**, é onde a pesquisa acontece." },

  // — 3) Aba Estudos: pesquisa LIVRE (qualquer tema). O gate de verdade é salvar um PDF
  //   (passo "salvar"). A busca também dispara um ESTUDO SEU em paralelo (Meus Estudos).
  { id: "pesquisar", tab: "sala-de-estudos", target: '[data-academic-input="true"]', advanceEvent: "zaeon:research:start",
    hint: "🔎 Pesquise o que você quiser",
    say: "Agora pesquisa **o que você quiser** — um tema da sua aula, um interesse, qualquer coisa. Escreve na barra e aperta **Enter** que eu busco os estudos online **e** já começo a montar um **estudo seu** sobre o tema. 🎙️" },

  // — 4) Enquanto termina, te faço companhia por voz — avança quando a busca FICA PRONTA.
  { id: "esperando", advanceEvent: "zaeon:research:done",
    hint: "🎧 Eu te faço companhia por voz",
    say: "Enquanto eu trago os estudos online (e monto o seu em **Meus Estudos**), deixa eu te fazer companhia 😄: por que o livro de matemática estava triste? Porque tinha **problemas demais**! 📘 ...tá, eu sei, foi de doer. Já já fica pronto!" },

  // — 5a) Resultado: mostra as abas UMA vez (cta "Entendi") e depois solta — a página fica
  //    normal pra pessoa salvar com calma.
  { id: "subabas", info: true, target: '[data-tour="result-tabs"]', cta: "Entendi",
    hint: "📑 Resultados · Referências · Insights · Base",
    say: "Pronto! 🎉 Aqui ficam **Resultados** (tudo que eu achei), **Referências** (as que verifiquei), **Insights** e **Base**. Dá uma olhada nelas." },

  // — 5b) Salvar: SEM destaque (página normal). Avança sozinho quando salva ≥1 referência.
  { id: "salvar", advanceEvents: ["zaeon:savedCitations", "zaeon:libraryFiles"],
    hint: "💾 Salve ao menos 1 PDF",
    say: "Salva **pelo menos um PDF** na sua biblioteca — é com ele que a gente vai **gerar a pesquisa** daqui a pouco. Pode salvar com calma; eu te espero. 😉" },

  // — 6) Gerar pesquisa — avança quando a geração COMEÇA (draftstart). A geração roda em
  //   background (store resiliente, lib/research/draftRun) e sobrevive ao desvio abaixo.
  { id: "gerar", target: '[data-tour="gerar"]', advanceEvent: "zaeon:research:draftstart",
    hint: "✨ Gere a pesquisa (pode deixar rodando)",
    say: "Agora clica em **Gerar pesquisa ✦** — eu transformo isso num esboço real (intro, metodologia, a lacuna). Pode **deixar rodando**, que eu cuido. ✍️" },

  // — 6b) DESVIO p/ Meus Estudos: aqui está o ESTUDO SEU que nasceu da sua busca + o Studio.
  { id: "desvio-estudos", info: true, subtab: "meus-estudos", cta: "Bora ver",
    hint: "📚 O seu estudo já nasceu aqui",
    say: "Enquanto a pesquisa gera (deixa rodando!), bora ver os seus **Estudos** — lembra que eu comecei a montar um **estudo seu** sobre o tema da busca? Tá aqui." },

  { id: "estudo-apareceu", info: true, target: '[data-tour="quick-bar"]', cta: "Massa!",
    hint: "🎉 Seu estudo, montado do seu tema",
    say: "Olha ele aqui ó — montei do **tema que você pesquisou**! 🎉 Daqui você cria quantos estudos quiser, de qualquer assunto." },

  { id: "studio", info: true, target: '[data-tour="studio-dock"]', cta: "Entendi",
    hint: "🎛️ Studio: podcast, mapa, vídeo…",
    say: "Esse é o **Studio**: de um clique ele gera **podcast, mapa mental, vídeo, flashcards, linha do tempo…** a partir do seu estudo. 🎛️" },

  { id: "quickbar", info: true, target: '[data-tour="quick-bar"]', cta: "Show",
    hint: "⌨️ Digite / pra criar rapidinho",
    say: "E aqui, digitando **/** num bloco, você cria qualquer coisa rapidinho — título, texto, ou um módulo do Studio. ⌨️" },

  // — 6c) VOLTA pra ESTUDOS (não Pesquisa!): o esboço com o botão "Iniciar" vive na aba
  //   Estudos. Guia a volta clicando na aba (clickTarget) — antes ficava preso em Meus Estudos.
  { id: "voltar-estudos", target: '[data-tour="tab-community"]', clickTarget: true,
    hint: "↩️ Volta pra Estudos ver o esboço",
    say: "Beleza! Agora **volta pra Estudos** (clica na aba aqui) — o esboço da sua **pesquisa** tá lá esperando você apertar **Iniciar**. 💜" },

  // — 6d) Iniciar pesquisa — abre o esboço completo (newdoc) e te leva pra Sala de Pesquisa.
  { id: "iniciar", target: '[data-tour="gerar"]', advanceEvent: "zaeon:research:newdoc",
    hint: "🚀 Inicie a pesquisa",
    say: "Olha o esboço aqui esperando! Agora é só **Iniciar pesquisa →** — vou te levar pra **Sala de Pesquisa** 💜 pra abrir o trabalho completo e começar a escrever. 🚀" },

  // — 7) Sala de Pesquisa: PRIMEIRO o player do documento que você salvou na sala de estudos.
  { id: "play", info: true, target: '[data-tour="docs-panel"]', cta: "Entendi",
    hint: "▶️ Ouça/leia o documento salvo",
    say: "Chegamos na **Sala de Pesquisa** 💜. Olha aqui o **documento que você salvou** — dá um **play** nele pra ouvir ou ler com calma." },

  // — 7b) Arrastar PDF: ensina a soltar um PDF no painel pra abrir e ler (antes de citar).
  { id: "arrasta-pdf", info: true, target: '[data-tour="docs-panel"]', cta: "Mostro depois",
    hint: "📄 Arraste um PDF aqui pra ler",
    say: "Dica de ouro: **arrasta um PDF** aqui pra dentro que eu abro pra você **ler** — e dá pra **ouvir** também. 📄" },

  // — 8) Citações: mesma lógica — salvar pra usar. Arraste pro texto.
  { id: "citacoes", info: true, target: '[data-tour="dock"]', cta: "Perfeito",
    hint: "🔖 Citações ABNT — arraste pro texto",
    say: "Olha na **dock aqui do lado**: o **🔖 abre as Citações salvas** — é de lá que você **arrasta pro texto** e o trecho entra já em **ABNT**. Do lado também ficam **Minhas coisas** e a **Lixeira**." },

  // — 9) Tipo de trabalho.
  // — ÚLTIMO passo do tour principal: tipo de trabalho (o Lounge tem o seu próprio mini-tour).
  { id: "tipo", info: true, target: '[data-tour="tipo"]', cta: "Boa jornada! 🚀",
    hint: "🎓 TCC · Artigo · Relatório",
    say: "Por fim: aqui você troca entre **TCC, Artigo e Relatório** — cada um é uma sessão própria, salva e publica em ABNT. É isso! Estou aqui no chat sempre que precisar. Boa jornada! 🚀" },
];

// ── MINI-TOUR DO LOUNGE (separado, SILENCIOSO — sem voz/chat) ──────────────
// Roda 1x ao entrar no Lounge (independente do tour principal). Só cards, guiado por ação.
export const LOUNGE_TOUR_STEPS: TourStep[] = [
  { id: "lounge-tray", target: '[data-tour="lounge-tray"]', clickTarget: true,
    hint: "📂 Abra uma bandeja de Estudos ou Pesquisas", say: "" },
  { id: "lounge-play", target: '[data-tour="lounge-play"]', clickTarget: true,
    hint: "▶️ Dê play num item pra criar uma sala em grupo", say: "" },
  { id: "lounge-invite", info: true, target: '[data-tour="lounge-invite"]', cta: "Entendi",
    hint: "🤝 Clica em Convidar e manda o link pro seu amigo", say: "" },
];

type TourState = { active: boolean; index: number };
let state: TourState = { active: false, index: 0 };
let activeSteps: TourStep[] = TOUR_STEPS;   // qual roteiro está rodando
let silent = false;                          // mini-tour do Lounge não fala
const subs = new Set<(s: TourState) => void>();
const emit = () => subs.forEach((f) => f(state));

export function getTour(): TourState { return state; }
export function getActiveSteps(): TourStep[] { return activeSteps; }
export function subscribeTour(cb: (s: TourState) => void) { subs.add(cb); cb(state); return () => { subs.delete(cb); }; }

function persist() { try { localStorage.setItem("zaeon.tour", JSON.stringify(state)); } catch { /* */ } }

function sayCurrent() {
  const s = activeSteps[state.index];
  if (!s) return;
  if (s.tab) { try { window.dispatchEvent(new CustomEvent("zaeon:set-tab", { detail: s.tab })); } catch { /* */ } }
  if (s.subtab) { try { window.dispatchEvent(new CustomEvent("zaeon:set-subtab", { detail: s.subtab })); } catch { /* */ } }
  // PREFILL: a barra de pesquisa (OmegaScholarBar) monta DEPOIS da navegação menu→lab,
  // então um único evento se perde. Re-dispara algumas vezes até a barra existir e pegar.
  if (s.prefill) {
    const fire = () => { try { window.dispatchEvent(new CustomEvent("zaeon:tour:prefill", { detail: s.prefill })); } catch { /* */ } };
    fire();
    [250, 700, 1400, 2400].forEach((ms) => setTimeout(() => { if (activeSteps[state.index]?.id === s.id) fire(); }, ms));
  }
  // Mini-tour silencioso: NÃO fala (só os cards). O tour principal manda a fala (gated por pref no chat).
  if (!silent && s.say) { try { window.dispatchEvent(new CustomEvent("zaeon:onboard:say", { detail: s.say })); } catch { /* */ } }
}

// ── MODO REPLAY (pra mim, testando): o tour reaparece a cada visita até eu dar o "Ok".
//    Concluir/pular NÃO marca como feito enquanto o replay estiver ligado.
export function isTourReplay(): boolean {
  try { return localStorage.getItem("zaeon.tourReplay") === "1"; } catch { return false; }
}
export function setTourReplay(on: boolean) {
  try {
    if (on) { localStorage.setItem("zaeon.tourReplay", "1"); localStorage.removeItem("zaeon.tourDone"); }
    else localStorage.removeItem("zaeon.tourReplay");
  } catch { /* */ }
}
/** "Dei o Ok" — para o replay, marca como feito e encerra. */
export function stopTourReplay() {
  setTourReplay(false);
  finishTour();
}

export function startTour(opts?: { replay?: boolean }) {
  if (typeof window === "undefined") return;
  if (opts?.replay) setTourReplay(true);
  activeSteps = TOUR_STEPS; silent = false;
  state = { active: true, index: 0 };
  persist(); emit();
  try { window.dispatchEvent(new CustomEvent("zaeon:onboard:start")); } catch { /* */ }
  // Roteiro é FIXO → pré-sintetiza TODAS as falas em background (mata o cold-start da voz).
  // SÓ se a voz do onboarding estiver ligada (pref OFF por padrão — item 4 do Lote 7).
  try {
    const voiceOn = (() => { try { return localStorage.getItem("zaeon.onboard.voice") === "on"; } catch { return false; } })();
    if (voiceOn) prewarmSpeech(TOUR_STEPS.map((s) => s.say));
  } catch { /* */ }
  setTimeout(sayCurrent, 400); // deixa o chat widget montar
}

/** Mini-tour do Lounge: silencioso, roda 1x (localStorage zaeon.tourLounge). */
export function startLoungeTour() {
  if (typeof window === "undefined") return;
  if (state.active) return; // não atropela um tour em andamento (ex.: o principal)
  try { if (localStorage.getItem("zaeon.tourLounge") === "1") return; } catch { /* */ }
  activeSteps = LOUNGE_TOUR_STEPS; silent = true;
  state = { active: true, index: 0 };
  emit();
  // SEM onboard:start (nada de chat/ligação) — só os cards do overlay.
  setTimeout(sayCurrent, 300);
}

export function nextTour() {
  if (state.index + 1 >= activeSteps.length) { finishTour(); return; }
  state = { active: true, index: state.index + 1 };
  persist(); emit(); sayCurrent();
}

export function skipTour() { finishTour(); }

export function finishTour() {
  const wasLounge = activeSteps === LOUNGE_TOUR_STEPS;
  state = { active: false, index: 0 };
  emit();
  if (wasLounge) {
    // Mini-tour do Lounge: marca o SEU done (não o principal), não dispara onboard:stop.
    activeSteps = TOUR_STEPS; silent = false;
    try { localStorage.setItem("zaeon.tourLounge", "1"); } catch { /* */ }
    return;
  }
  persist();
  try { window.dispatchEvent(new CustomEvent("zaeon:onboard:stop")); } catch { /* */ }
  // Em replay, NÃO marca como feito → reaparece na próxima visita (até dar o Ok).
  if (isTourReplay()) return;
  try { localStorage.setItem("zaeon.tourDone", "1"); } catch { /* */ }
  try { fetch("/api/onboard/tour", { method: "POST" }); } catch { /* */ }
}
