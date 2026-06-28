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
  advanceEvents?: string[];  // idem, porém aceita VÁRIOS eventos (qualquer um avança)
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
  // — 1) FOCO NO CHAT: 1º destaque é só o chat (o resto fica obscurecido pelo overlay).
  //    A Zaeon se apresenta e mostra que dá pra jogar o chat pro outro lado.
  { id: "chat", onMenu: true, target: '[data-tour="chat-flip"]', advanceEvent: "zaeon:chat:flipped-right",
    hint: "💬 Me jogue pro lado direito",
    say: "Oi! Sou eu, a Zaeon — e já te liguei pra gente conversar **por voz** enquanto eu te mostro tudo. 🎙️ Pra eu não te atrapalhar, **clica no botãozinho de virar** ali no meu cabeçalho e **me joga pro lado direito**. Esse passinho é obrigatório, vai por mim que fica bem melhor. 💜" },

  // — 2) MENU inicial: por onde começar. Destaca Estudos. Avança quando abre a Sala de Estudos.
  { id: "menu-estudos", onMenu: true, advanceEvent: "zaeon:study:new", target: '[data-tour="menu-estudos"]',
    hint: "📚 Abra Estudos e crie um novo",
    say: "Agora abre os seus **Estudos** neste menu e clica em **Novo estudo** — é onde tudo começa. Só sigo quando você criar um de verdade. 😉" },

  // — 3) Sala de Estudos / aba Estudos: exemplo FIXO e obrigatório na barra.
  { id: "pesquisar", tab: "sala-de-estudos", target: '[data-academic-input="true"]', advanceEvent: "zaeon:research:start", prefill: "história do Brasil",
    hint: "🔎 Pesquise o exemplo (passo obrigatório)",
    say: "Já deixei um exemplo fixo na barra: **história do Brasil**. Esse passo é obrigatório — aperta **Enter** que eu pesquiso e monto o estudo. 🎙️" },

  // — 4) Enquanto termina, te faço companhia por voz — avança quando o estudo FICA PRONTO.
  { id: "esperando", advanceEvent: "zaeon:research:done",
    hint: "🎧 Eu te faço companhia por voz",
    say: "Enquanto eu monto seu estudo, deixa eu te fazer companhia com uma piadinha pra passar o tempo 😄: por que o livro de matemática estava triste? Porque tinha **problemas demais**! 📘 ...tá, eu sei, foi de doer. Já já fica pronto, viu?" },

  // — 5a) Resultado: mostra as abas UMA vez (cta "Entendi") e depois solta — a página fica
  //    normal pra pessoa salvar com calma.
  { id: "subabas", info: true, target: '[data-tour="result-tabs"]', cta: "Entendi",
    hint: "📑 Referências · Insights · Base",
    say: "Pronto! 🎉 Aqui ficam **Referências**, **Insights** e **Base**. Dá uma olhada nelas." },

  // — 5b) Salvar: SEM destaque (página normal). Avança sozinho quando salva ≥1 referência.
  { id: "salvar", advanceEvents: ["zaeon:savedCitations", "zaeon:libraryFiles"],
    hint: "💾 Salve ao menos 1 referência",
    say: "Agora salva **pelo menos 1 referência** na sua biblioteca — é ela que vai te servir na pesquisa daqui a pouco. Pode salvar com calma; eu te espero. 😉" },

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
  // PREFILL: a barra de pesquisa (OmegaScholarBar) monta DEPOIS da navegação menu→lab,
  // então um único evento se perde. Re-dispara algumas vezes até a barra existir e pegar.
  if (s.prefill) {
    const fire = () => { try { window.dispatchEvent(new CustomEvent("zaeon:tour:prefill", { detail: s.prefill })); } catch { /* */ } };
    fire();
    [250, 700, 1400, 2400].forEach((ms) => setTimeout(() => { if (TOUR_STEPS[state.index]?.id === s.id) fire(); }, ms));
  }
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
  try { window.dispatchEvent(new CustomEvent("zaeon:onboard:start")); } catch { /* */ }
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
  try { window.dispatchEvent(new CustomEvent("zaeon:onboard:stop")); } catch { /* */ }
  // Em replay, NÃO marca como feito → reaparece na próxima visita (até dar o Ok).
  if (isTourReplay()) return;
  try { localStorage.setItem("zaeon.tourDone", "1"); } catch { /* */ }
  try { fetch("/api/onboard/tour", { method: "POST" }); } catch { /* */ }
}
