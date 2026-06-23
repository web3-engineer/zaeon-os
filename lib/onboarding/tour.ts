"use client";

/**
 * Tour guiado de onboarding. Roteiro DECLARATIVO: o Bento "puxa assunto" no chat
 * widget (autonomia), enquanto o overlay destaca o elemento da vez. Golden path:
 * Estudos → pesquisar → resultado → gerar pesquisa → Sala de Pesquisa → Lounge.
 *
 * Estado em memória + localStorage; ao concluir/pular, marca no servidor
 * (/api/onboard/tour → User.tourDone, visível no dashboard) — UMA VEZ por usuário.
 */
export type TourStep = {
  id: string;
  say: string;               // fala do Bento (vai pro chat widget + VOZ)
  hint: string;              // textinho curto (com emoji) no card, descrevendo a função
  target?: string;           // seletor do elemento a destacar (coachmark)
  clickTarget?: boolean;     // avança ao CLICAR no próprio elemento destacado (sem botão)
  advanceEvent?: string;     // avança quando este window event dispara (ação concluída)
  prefill?: string;          // pré-preenche a barra de pesquisa ao entrar no passo
  tab?: string;              // garante a aba certa (dispara zaeon:set-tab)
  info?: boolean;            // passo só explicativo → mostra um "Ok" leve pra seguir
  cta?: string;              // rótulo do botão (só quando info)
};

export const TOUR_STEPS: TourStep[] = [
  // — Abertura (voz): o Bento "liga" e recebe a pessoa
  { id: "hello", info: true, hint: "👋 Bem-vindo! Vamos começar?", cta: "Bora! 🚀",
    say: "Oi! 🎙️ Que bom te receber. Vou te dar uma volta rapidinha, conversando, e a gente desbloqueia uma fase nova nos seus estudos. Pode me chamar aqui no cantinho quando quiser. Bora?" },

  // — Sala de Estudos (= onde a pesquisa de estudo acontece) — avança ao CLICAR no ícone
  { id: "estudos", hint: "📚 Comece pela sua Sala de Estudos", target: '[data-tour="estudos"]', clickTarget: true, tab: "sala-de-estudos",
    say: "Clica em **Estudos** aqui na lateral 👇 — sua sala de estudos. Antes de pesquisar, deixa eu te mostrar rapidinho o **caderno** e o **Studio**." },

  // — Mover o chat de lado: libera a visão do Meus Estudos (o dock do chat tapava a aba)
  { id: "chat-side", info: true, tab: "sala-de-estudos", hint: "↔️ Mova o chat pro outro lado", target: '[data-tour="layout-toggle"]', cta: "Entendi",
    say: "Detalhe importante: se o chat estiver tapando o seu **Meus Estudos**, clica aqui no **Layout** ↔️ que eu pulo pro outro lado da tela — aí você enxerga o caderno inteiro. 👌" },

  // — Meus Estudos: o caderno editável (escrita livre estilo Notion)
  { id: "meus-estudos", info: true, tab: "sala-de-estudos", hint: "📓 Meus Estudos — seu caderno", cta: "Mostra mais",
    say: "No **Meus Estudos** você escreve livre, como num Notion. **Enter** cria um bloco novo; comece com **#** que vira título. E dá pra **arrastar os blocos** pela alça do lado pra reordenar. ✍️" },

  // — Studio da Zaeon: transforma o estudo em várias formas
  { id: "studio-dock", info: true, tab: "sala-de-estudos", hint: "⟁ Studio — vira podcast, mapa, vídeo…", cta: "Que demais",
    say: "Esse é o **Studio da Zaeon** ⟁: com um clique eu viro seu estudo em **podcast com 2 vozes**, **mapa mental**, **guia**, **flashcards**, **linha do tempo**, **imagem** ou **vídeo** — e tudo **encaixa no caderno**, pra abrir e fechar quando quiser." },

  // — Menu "/" + chat multimodal
  { id: "slash", info: true, tab: "sala-de-estudos", hint: '⌨️ Digite "/" pra inserir no ponto', cta: "Entendi",
    say: "Dica de ouro: digite **\"/\"** em qualquer ponto do texto pra inserir ali mesmo — um título ou um módulo do Studio (tipo **/mapa mental**) bem no meio do estudo. E no meu chat você pode **mandar uma foto** que eu analiso, ou pedir **\"gere uma imagem\"**. 🪄" },

  // — Pesquisar um estudo (tema sugerido) — avança quando a pesquisa COMEÇA
  { id: "pesquisar", hint: "↵ Aperte Enter pra estudar o tema", target: '[data-academic-input="true"]', advanceEvent: "zaeon:research:start", prefill: "história do Brasil",
    say: "Pra começar fácil, já deixei um tema na barra: **história do Brasil**. É só apertar **Enter** que eu pesquiso e monto o estudo desse tema. 🎙️" },

  // — Enquanto pesquisa: voz puxando papo — avança quando o estudo FICA PRONTO
  { id: "esperando", hint: "🎧 Eu te faço companhia por voz", advanceEvent: "zaeon:research:done",
    say: "Enquanto eu trabalho, te faço companhia 😄 — e sim, eu converso por voz de verdade! Me conta: você curte mais história, exatas, ou tá começando agora?" },

  // — Resultado: destaca as abas Referências/Insights/Base; foco em salvar referências
  { id: "resultado", info: true, hint: "Role as referências para baixo até encontrar algumas que você queira salvar.", target: '[data-tour="result-tabs"]', cta: "Salvei 👍",
    say: "Pronto! 🎉 Aqui ficam as **Referências**, os **Insights** e a **Base**. Role as referências para baixo até encontrar algumas que você queira salvar — elas vão te servir na pesquisa." },

  // — Gerar pesquisa — avança quando o esboço é criado (Iniciar pesquisa → newdoc)
  { id: "gerar", hint: "✨ Gere a pesquisa a partir do estudo", target: '[data-tour="gerar"]', advanceEvent: "zaeon:research:newdoc",
    say: "Agora clica em **Gerar pesquisa** e depois em **Iniciar pesquisa** — eu transformo seu estudo num esboço real, com introdução, metodologia e a lacuna. ✍️" },

  // — Sala de Pesquisa: ferramentas (com destaque no elemento, igual ao foco da sidebar)
  { id: "play", info: true, hint: "▶️ Ouça/leia um documento", target: '[data-tour="docs-panel"]', cta: "Entendi",
    say: "Chegamos na **Sala de Pesquisa** 💜. Neste painel ficam **seus documentos** — dá um **play** num deles pra ouvir ou ler com calma." },
  { id: "citacoes", info: true, hint: "🔖 Citações ABNT · 🗑️ lixeira", target: '[data-tour="dock"]', cta: "Perfeito",
    say: "Aqui embaixo: **Citações** (cada trecho salvo vira ABNT, clica pra inserir no texto), **Minhas coisas** (pastas/biblioteca) e a **Lixeira** — o que você apaga dá pra restaurar." },
  { id: "tipo", info: true, hint: "🎓 TCC · Artigo · Relatório", target: '[data-tour="tipo"]', cta: "Entendi",
    say: "Aqui você troca entre **TCC, Artigo e Relatório** — cada um é uma sessão própria. Te ensino salvar/publicar em ABNT quando você chegar lá. 😉" },

  // — Lounge: missão final — avança ao CLICAR
  { id: "lounge", hint: "🤝 Crie em grupo no Lounge", target: '[data-tour="lounge"]', clickTarget: true, tab: "lounge",
    say: "Última missão ✦: vai no **Lounge** e crie um estudo ou pesquisa **em conjunto** pra compartilhar com um amigo. Aprender junto é mais leve. É só me chamar quando precisar. Boa jornada! 🚀" },
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

export function startTour() {
  if (typeof window === "undefined") return;
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
  // Onboarding é UMA VEZ por usuário: ao concluir/pular, marca como feito (local + servidor).
  try { localStorage.setItem("zaeon.tourDone", "1"); } catch { /* */ }
  try { fetch("/api/onboard/tour", { method: "POST" }); } catch { /* */ }
}
