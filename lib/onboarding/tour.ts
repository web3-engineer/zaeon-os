"use client";

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
  prefill?: string;          // pré-preenche a barra de pesquisa ao entrar no passo
  tab?: string;              // garante a aba certa (dispara zaeon:set-tab)
  info?: boolean;            // passo só explicativo → mostra um "Ok" leve pra seguir
  cta?: string;              // rótulo do botão (só quando info)
  onMenu?: boolean;          // passo que vive no MENU inicial (não no research-lab)
};

// Golden path NOVO: começa no MENU inicial (logado) → abre Estudos → pesquisa o
// exemplo fixo "história do Brasil" → vira o chat de lado → percorre Referências/
// Insights/Base → gera a pesquisa → Sala de Pesquisa (player do doc salvo + citações).
export const TOUR_STEPS: TourStep[] = [
  // — 1) MENU inicial: NÃO é "eu sou a Zaeon" — é "por onde começar". Destaca Estudos.
  //    Avança quando a pessoa abre a Sala de Estudos (research-lab detecta no mount).
  { id: "menu-estudos", onMenu: true, info: true, cta: "Bora aprender ✦", target: '[data-tour="menu-estudos"]',
    hint: "📚 Comece pelos seus Estudos",
    say: "Vamos começar aprendendo a estudar por aqui 😊. Abre os seus **Estudos** neste menu e clica em **Novo estudo** — é onde tudo começa." },

  // — 2) Sala de Estudos / aba Estudos: exemplo FIXO e obrigatório na barra.
  { id: "pesquisar", tab: "sala-de-estudos", target: '[data-academic-input="true"]', advanceEvent: "zaeon:research:start", prefill: "história do Brasil",
    hint: "🔎 Pesquise o exemplo (passo obrigatório)",
    say: "Já deixei um exemplo fixo na barra: **história do Brasil**. Esse passo é obrigatório — aperta **Enter** que eu pesquiso e monto o estudo. 🎙️" },

  // — 3) O chat começa do lado ESQUERDO, cobrindo a visão. Destaca o botão de virar de lado.
  { id: "chat-flip", target: '[data-tour="layout-toggle"]', clickTarget: true,
    hint: "↔️ Jogue o chat pro outro lado",
    say: "Repara: meu chat começou do lado **esquerdo**, meio na frente da tela. Clica aqui 👇 pra me jogar pro **outro lado** e liberar sua visão. É seu espaço, do seu jeito." },

  // — 4) Enquanto termina, te faço companhia por voz — avança quando o estudo FICA PRONTO.
  { id: "esperando", advanceEvent: "zaeon:research:done",
    hint: "🎧 Eu te faço companhia por voz",
    say: "Enquanto eu trabalho, te faço companhia 😄 — e sim, converso por voz de verdade! Me conta: história, exatas, ou tá começando agora?" },

  // — 5) Resultado: percorre Referências/Insights/Base. Salvar é obrigatório (vira o doc
  //    que você vai abrir na Sala de Pesquisa). Termina apontando pro Gerar pesquisa.
  { id: "subabas", info: true, target: '[data-tour="result-tabs"]', cta: "Salvei 👍",
    hint: "📑 Referências · Insights · Base",
    say: "Pronto! 🎉 Passa pelas abas **Referências**, **Insights** e **Base**. Salva pelo menos **1 referência** e o **documento** — é obrigatório, porque é ele que vai aparecer pra você na Sala de Pesquisa daqui a pouco. Depois clica em **Gerar pesquisa**." },

  // — 6) Gerar pesquisa — avança quando o esboço é criado (Iniciar pesquisa → newdoc).
  { id: "gerar", target: '[data-tour="gerar"]', advanceEvent: "zaeon:research:newdoc",
    hint: "✨ Gere a pesquisa a partir do estudo",
    say: "Agora **Gerar pesquisa** → **Iniciar pesquisa** — eu transformo seu estudo num esboço real: introdução, metodologia e a lacuna. ✍️" },

  // — 7) Sala de Pesquisa: PRIMEIRO o player do documento que você salvou na sala de estudos.
  { id: "play", info: true, target: '[data-tour="docs-panel"]', cta: "Entendi",
    hint: "▶️ Ouça/leia o documento salvo",
    say: "Chegamos na **Sala de Pesquisa** 💜. Olha aqui o **documento que você salvou** — dá um **play** nele pra ouvir ou ler com calma." },

  // — 8) Citações: mesma lógica — salvar pra usar. Arraste pro texto.
  { id: "citacoes", info: true, target: '[data-tour="dock"]', cta: "Perfeito",
    hint: "🔖 Citações ABNT — arraste pro texto",
    say: "E aqui as **Citações**: cada trecho que você salvou já vira **ABNT**. Você **arrasta a citação pro documento** (ou clica) e ela entra formatada. Do lado também ficam **Minhas coisas** e a **Lixeira**." },

  // — 9) Tipo de trabalho.
  { id: "tipo", info: true, target: '[data-tour="tipo"]', cta: "Entendi",
    hint: "🎓 TCC · Artigo · Relatório",
    say: "Aqui você troca entre **TCC, Artigo e Relatório** — cada um é uma sessão própria, salva e publica em ABNT. 😉" },

  // — 10) Lounge: missão final — avança ao CLICAR.
  { id: "lounge", target: '[data-tour="lounge"]', clickTarget: true, tab: "lounge",
    hint: "🤝 Crie em grupo no Lounge",
    say: "Última missão ✦: vai no **Lounge** e crie um estudo ou pesquisa **em conjunto** pra compartilhar com um amigo. É só me chamar quando precisar. Boa jornada! 🚀" },
];

type TourState = { active: boolean; index: number };
let state: TourState = { active: false, index: 0 };
const subs = new Set<(s: TourState) => void>();
const emit = () => subs.forEach((f) => f(state));

export function getTour(): TourState { return state; }
export function subscribeTour(cb: (s: TourState) => void) { subs.add(cb); cb(state); return () => { subs.delete(cb); }; }

function persist() { try { localStorage.setItem("zaeon.tour", JSON.stringify(state)); } catch { /* */ } }

function sayCurrent() {
  const s = TOUR_STEPS[state.index];
  if (!s) return;
  if (s.tab) { try { window.dispatchEvent(new CustomEvent("zaeon:set-tab", { detail: s.tab })); } catch { /* */ } }
  if (s.prefill) { try { window.dispatchEvent(new CustomEvent("zaeon:tour:prefill", { detail: s.prefill })); } catch { /* */ } }
  try { window.dispatchEvent(new CustomEvent("zaeon:onboard:say", { detail: s.say })); } catch { /* */ }
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
  state = { active: true, index: 0 };
  persist(); emit();
  setTimeout(sayCurrent, 400); // deixa o chat widget montar
}

export function nextTour() {
  if (state.index + 1 >= TOUR_STEPS.length) { finishTour(); return; }
  state = { active: true, index: state.index + 1 };
  persist(); emit(); sayCurrent();
}

export function skipTour() { finishTour(); }

export function finishTour() {
  state = { active: false, index: 0 };
  persist(); emit();
  // Em replay, NÃO marca como feito → reaparece na próxima visita (até dar o Ok).
  if (isTourReplay()) return;
  try { localStorage.setItem("zaeon.tourDone", "1"); } catch { /* */ }
  try { fetch("/api/onboard/tour", { method: "POST" }); } catch { /* */ }
}
