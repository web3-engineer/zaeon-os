# Handoff LOTE 5 — Onboarding (reta final de verdade): beats, bug do chat, pesquisa livre, desvio Meus Estudos

> Para o **Claude Code**. Branch própria (`feat/onboarding-lote5`). Toca os MESMOS arquivos dos
> Lotes anteriores (`lib/onboarding/tour.ts`, `components/onboard/OnboardingGuide.tsx`,
> `components/sub/LoungeChatWidget.tsx`, fluxo de pesquisa). **Rebase com a main mais recente antes**
> e reaplique por cima do estado atual — não reverta o modo onboarding, flip-right, overlay leve,
> autofocus, call minimizável já entregues. Confirme cada trecho antes de editar.

## Regras DURAS
- Branch + PR. Nunca `git add -A`. Push trava (proxy ISP) → deixe commit pronto e avise o Martinez.
- Sem segredos, sem SSH na VPS. macOS sem `python` (use `python3`).
- Verificação ao fim: `npx tsc --noEmit` (+ `npx vitest run` se rápido). Só conserte erros novos.

Contexto base (já existe):
- `lib/onboarding/tour.ts` — `TOUR_STEPS` + `sayCurrent()` dispara `zaeon:onboard:say`.
- `components/onboard/OnboardingGuide.tsx` — overlay (anel + card).
- `components/sub/LoungeChatWidget.tsx` — chat; handler de `zaeon:onboard:say` (~135-150) hoje faz
  `setActiveChat(ZAEON_AGENT); setIsOpen(true); setVoiceModeState("active"); tts.speak(text)`.
- Fluxo de pesquisa: busca = `OmegaScholarContext.runQuery` (resiliente: context + `RUN_KEY` +
  eventos `zaeon:research:start`/`done`). "Gerar pesquisa" = `components/research/GenerateResearchPanel.tsx`
  (fetch local `/api/ai/research-draft`, resultado em **estado local** → frágil). "Iniciar pesquisa"
  dispara `zaeon:research:newdoc` + `zaeon:set-tab "pesquisa"`.

---

## 1. Onboarding em 3 BEATS: apresentar → jogar pro lado → minimizar
**Hoje:** o 1º passo já mistura apresentação + flip. **Queremos 3 beats distintos e sequenciais:**
1. **Apresentar:** foco no chat (`[data-tour="chat-widget"]`), a Zaeon **se apresenta** e diz o que
   vem a seguir. Avança com um "Vamos lá" leve (`info`/cta) OU automaticamente quando ela termina de
   falar — mas deixe um botão pra não travar.
2. **Jogar pro lado (flip-right):** passo de ação, `target: '[data-tour="chat-flip"]'`,
   `advanceEvent: "zaeon:chat:flipped-right"` (já existe do lote anterior). `say`: "Agora me joga pro
   lado direito no botãozinho de virar ↔".
3. **Minimizar:** passo de ação, `advanceEvent: "zaeon:chat:minimized"` (lote anterior). `say`:
   "Perfeito! Agora me **minimiza** no traço (–) pra gente ter a tela toda. 😊".
**Rota:** em `tour.ts`, separar o passo `"chat"` em **três** passos nessa ordem (apresentar / flip /
minimizar), cada um com seu `say`. Garantir que flip e minimizar continuam **obrigatórios** (só
avançam pela ação real). Confirmar que o `LoungeChatWidget` emite `zaeon:chat:flipped-right` (ao
virar pra direita) e `zaeon:chat:minimized` (ao minimizar) — se não emitir, adicionar.

## 2. BUG: o chat re-maximiza ao ir pra Sala de Estudos
**Causa-raiz:** o handler de `zaeon:onboard:say` (`LoungeChatWidget`, ~135-150) faz `setIsOpen(true)`
a **cada** fala. Depois que o usuário minimiza, o próximo passo dispara um `say` → reabre o chat.
Além disso, ao navegar de página, monta um widget novo e a fala reabre.
**Rota:**
1. Criar um "trava de minimizado" no onboarding: quando o usuário cumpre o beat **minimizar**
   (`zaeon:chat:minimized`), setar um flag (ex.: estado `onboardKeepMinimized = true`, e/ou
   `localStorage "zaeon.onboard.min"`).
2. No handler de `zaeon:onboard:say`: enquanto `onboardKeepMinimized` (ou tour ativo após o beat de
   minimizar), **NÃO** chamar `setIsOpen(true)`. A fala ainda toca (`tts.speak`) e a mensagem entra
   no histórico; o FAB pode dar um leve pulse/badge — mas o chat **permanece minimizado**.
3. Resetar o flag quando o tour terminar (`zaeon:onboard:stop`).
4. Conferir duplicidade de widget: o `LoungeChatWidget` é montado global (`app/layout.tsx`) **e** por
   página (study-rooms/*). Garantir que o estado de minimizado não "reseta" ao navegar (ler o
   `localStorage` no mount pra respeitar o minimizado durante o onboarding).

## 3. Pesquisa LIVRE (sem estudo obrigatório); gate = salvar um PDF
**Hoje:** o passo `"pesquisar"` força `prefill: "história do Brasil"` e trata como obrigatório.
**Queremos:** o usuário pesquisa **o que quiser**; o único requisito pra seguir é **salvar um PDF**
(referência) — pois é o que alimenta a geração.
**Rota (em `tour.ts`):**
1. Passo `"pesquisar"`: **remover** o `prefill` fixo. Manter o destaque na barra
   (`[data-academic-input="true"]`) e o `say` convidando a pesquisar **qualquer tema** ("Pesquisa o
   que você quiser — um tema da sua aula, um interesse…"). Avança em `zaeon:research:start` (já é).
2. Passo `"salvar"`: continua sendo o gate real — avança quando salva ≥1 PDF/referência
   (`advanceEvents: ["zaeon:libraryFiles", "zaeon:savedCitations"]`, do Lote 3). `say` deixa claro:
   "Salva pelo menos **um PDF** na biblioteca — é com ele que a gente vai gerar a pesquisa."
3. Remover qualquer texto/checagem que ainda diga "exemplo fixo/obrigatório".

## 4. Desvio "Meus Estudos" DURANTE a geração (sem interromper) + ensinar o Studio
**Objetivo:** ao clicar **Gerar pesquisa**, enquanto gera (assíncrono), a Zaeon leva o usuário pra
**Meus Estudos** pra ensinar a criar o próprio estudo; depois manda voltar pra ver a pesquisa pronta.

### 4a. PROBLEMA TÉCNICO: a geração é interrompida ao trocar de aba
**Causa-raiz:** `GenerateResearchPanel.generate()` guarda `result` em **estado local**. Trocar para
a aba "Meus Estudos" **desmonta** o `OmegaScholarWorkspace` (StudyRoomContent renderiza uma aba por
vez) → a Promise resolve no vazio e o resultado **se perde**. (A busca do scholar sobrevive porque
vive num **context** + `RUN_KEY`; a geração não.)
**Rota — tornar a geração resiliente (espelhar o padrão do scholar):**
- Extrair o estado da geração (`status: idle|loading|done|error`, `result`, `topic`) para um **store
  persistente que não desmonta**: um módulo singleton (`lib/research/draftRun.ts` com pub/sub) **ou**
  um context acima das abas (em `StudyRoomContent`). `GenerateResearchPanel` passa a **ler/escrever**
  nesse store em vez do `useState` local.
- A chamada `fetch("/api/ai/research-draft")` roda no store (fora do ciclo de vida do componente), e
  ao concluir guarda o `result` no store (+ opcional `localStorage` p/ sobreviver a reload). Dispara
  um evento `zaeon:research:draftdone` quando termina.
- Ao voltar pra aba de pesquisa, `GenerateResearchPanel` lê o store e já mostra "Iniciar pesquisa →"
  (ou abre sozinho, se preferirem). **Verificar**: navegar pra Meus Estudos e voltar mantém o
  resultado.

### 4b. Os passos novos do tutorial (em `tour.ts`), após "Gerar pesquisa" começar
Inserir, **disparados quando a geração começa** (ex.: ao clicar Gerar → evento
`zaeon:research:draftstart`), uma mini-sequência guiada por ação:
1. **Ir pra Meus Estudos:** `say` "Enquanto eu monto sua pesquisa (pode deixar rodando!), bora criar
   um estudo seu." → troca pra aba Meus Estudos (`zaeon:set-tab "meus-estudos"`); avança quando a aba
   abre OU ao clicar nela.
2. **Criar qualquer estudo:** destacar o "Novo estudo"; `advanceEvent: "zaeon:study:new"` (já
   disparado pelo `newSpace()` — Lote 1). `say`: "Cria um estudo de qualquer coisa — pode ser sobre o
   que você quiser aprender."
3. **Ver aparecendo:** passo `info` curtinho destacando o estudo recém-criado no feed ("Olha ele
   aqui ó, já apareceu! 🎉").
4. **Studio:** destacar o **dock do Studio** (`components/studio/StudioDock.tsx` — botão ⟁; precisa
   de um `data-tour="studio-dock"` no container do dock). `say`: "Esse é o **Studio**: gera podcast,
   mapa mental, vídeo, flashcards… de um clique."
5. **Barra rápida ("/"):** destacar a barra/menu de criação rápida (o bloco com menu "/" do
   `MeusEstudosFeed` — adicionar `data-tour="quick-bar"` no input/bloco principal). `say`: "E aqui,
   digitando **/** você cria qualquer coisa rapidinho — título, texto, ou um módulo do Studio."
6. **Voltar pra ver a pesquisa:** `say`: "Sua pesquisa já deve estar pronta — volta ali na aba de
   **Pesquisa** pra ver." → avança quando volta pra aba de pesquisa (`zaeon:set-tab "pesquisa"` por
   clique do usuário) e/ou quando `zaeon:research:draftdone` já ocorreu. Retoma o fluxo no passo do
   player/Iniciar pesquisa.

> Garantir que esses passos só entram no fluxo do **onboarding** (não afetam o uso normal). E que a
> geração resiliente (4a) está pronta ANTES de habilitar o desvio — senão volta e não tem pesquisa.

### 4c. Anchors a adicionar (data-tour)
- `data-tour="studio-dock"` no container do `StudioDock` (`components/studio/StudioDock.tsx` ou onde
  ele é montado em `MeusEstudosFeed`).
- `data-tour="quick-bar"` no bloco/input de criação rápida do `MeusEstudosFeed` (o que aceita "/").
- (Já existem: `chat-widget`, `chat-flip`, `result-tabs`, `docs-panel`, `dock`, `gerar`,
  `menu-estudos`.)

---

## 5. NÃO interromper a voz ao avançar os cards do tutorial
**Critério:** clicar pra avançar um card (botão "Ok"/cta) **não pode cortar** a voz que está sendo
gerada/falada. A Zaeon termina a fala atual; o avanço não aborta o TTS.
**Causa provável:** ao avançar (`nextTour()` → `sayCurrent()`), cada passo dispara `zaeon:onboard:say`
e o handler chama `tts.speak(text)`. Se o `tts`/`ttsController` **para a fala anterior** ao iniciar a
nova (ou se algum `tts.stop()` é chamado no avanço/cleanup), a voz é cortada. Além disso, a chamada de
síntese (fetch do `/api/ai/voice`) pode ser abortada quando o passo troca.
**Rota:**
1. No avanço de passo do onboarding, **não** chamar `tts.stop()`/abortar a síntese em curso.
2. No handler `zaeon:onboard:say`: se já há fala tocando/gerando, **enfileirar** a próxima fala em vez
   de cortar (falar a nova só quando a atual terminar) — usar a fila do `ttsController`
   (`speakSequence`/fila) em vez de um `speak` que sobrescreve. Se o controller não tiver fila,
   guardar um buffer e só disparar a próxima no `onend`/quando `tts.speaking` vai a false.
3. Garantir que o `OnboardingGuide`/cleanup de passo (ex.: `useEffect` de `advanceEvent`) **não**
   tenha um `tts.stop()` escondido.
4. Exceção: encerrar/pular o tour inteiro (Pular tour / `zaeon:onboard:stop`) **pode** parar a voz —
   aí sim é intencional.
**Verificar:** avançar rápido por 2-3 cards seguidos não corta a fala no meio; cada fala completa (ou
enfileira) sem "engasgar".

---

# Verificação final
1. `npx tsc --noEmit` — zero erros novos.
2. Smoke (descreva no PR):
   - Onboarding: 3 beats na ordem (apresentar → flip → minimizar); após minimizar, navegar pra Sala
     de Estudos **não** reabre o chat.
   - Pesquisa: dá pra pesquisar **qualquer** tema; só exige salvar um PDF pra seguir.
   - Geração: clicar Gerar pesquisa, ir pra Meus Estudos (criar estudo → ver aparecer → Studio →
     barra "/"), voltar pra aba Pesquisa e a **pesquisa está pronta** (não foi interrompida).
   - Voz: avançar rápido pelos cards do tutorial **não corta** a fala (termina ou enfileira).
3. Git: branch `feat/onboarding-lote5` + PR. Nunca `git add -A`.

# Arquivos prováveis
- `lib/onboarding/tour.ts` (1, 3, 4b), `components/onboard/OnboardingGuide.tsx` (se precisar de
  posicionamento), `components/sub/LoungeChatWidget.tsx` (1, 2).
- `components/research/GenerateResearchPanel.tsx` + novo `lib/research/draftRun.ts` (ou context em
  `app/workstation/student/StudyRoomContent.tsx`) (4a).
- `components/study/MeusEstudosFeed.tsx` + `components/studio/StudioDock.tsx` (anchors 4c).
