# Handoff LOTE 6 — Onboarding: aba da Sala de Estudos destacada + matar a latência da voz

> Para o **Claude Code**. Branch própria (`feat/onboarding-lote6`). Toca `lib/onboarding/tour.ts`,
> `components/onboard/OnboardingGuide.tsx`, `app/workstation/student/StudyRoomContent.tsx`,
> `lib/voice/ttsController.ts` — os mesmos dos lotes 4/5. **Rebase com a main mais recente antes** e
> reaplique por cima (não reverta o modo onboarding, beats, fila de fala `speakQueued`, etc.).

## Regras DURAS
- Branch + PR. Nunca `git add -A`. Push trava (proxy ISP) → deixe commit pronto e avise o Martinez.
- Sem segredos, sem SSH. macOS sem `python` (use `python3`). `npx tsc --noEmit` no fim; só erros novos.

---

## 1. A Sala de Estudos "aparece do nada" — destacar a ABA como no resto do tutorial
**Problema:** no tutorial, ao chegar na Sala de Estudos a tela troca sem destacar a aba — fica
abrupto e bugado, diferente dos outros passos (que têm coachmark no elemento).
**Causa-raiz:** os botões de aba em `app/workstation/student/StudyRoomContent.tsx` (~283-300,
`allTabs.map`) **não têm `data-tour`**, então o overlay não consegue ancorar/destacar a aba. O passo
`"pesquisar"` do tour já pula direto pra barra de busca (`tab: "sala-de-estudos"` + target
`[data-academic-input="true"]`), sem antes apontar a aba.
**Rota:**
1. Em `StudyRoomContent.tsx`, adicionar `data-tour={`tab-${tab.id}`}` em cada `<button>` de aba
   (~283). (Descobrir o id da aba onde mora a busca — provavelmente `"sala-de-estudos"` ou o
   `tabs[0]`; é o mesmo que o tour usa em `tab:`.)
2. Garantir que existe um listener de `zaeon:set-tab` que faz `setActiveTab(detail)` em
   `StudyRoomContent` (hoje só há `zaeon:set-subtab` p/ "meus-estudos" e o deep-link `?space=`). Se
   não houver, **adicionar** — senão o tour troca de aba só "visualmente" via evento que ninguém ouve.
3. Em `lib/onboarding/tour.ts`, inserir um passo **antes** do `"pesquisar"` que **destaca a aba da
   Sala de Estudos** (`target: '[data-tour="tab-<id>"]'`), avançando ao clicar nela (`clickTarget`)
   ou quando ela vira ativa. `say`: "Essa é a sua **Sala de Estudos** — clica aqui que é onde a
   pesquisa acontece." Só então segue pro passo da barra de busca.
4. Princípio geral: **todo** passo que muda de tela deve destacar seu anchor (aba/elemento) antes de
   agir — nada deve "aparecer do nada". Revисar os passos do tour por telas que trocam sem coachmark.

---

## 2. Matar a latência da voz: o roteiro é FIXO → pré-sintetizar tudo no início do tour
**Problema:** a voz da Zaeon tem latência horrível a cada passo (cold-start do Gemini-TTS).
**Insight:** o roteiro do onboarding é **estático** (os textos `say` de `TOUR_STEPS` são constantes).
Dá pra **pré-sintetizar todas as falas no começo do tour** e cachear → quando o passo toca, o áudio
já está pronto (latência ~zero). Isso é o "scriptado o suficiente".

**Como o TTS funciona hoje (`lib/voice/ttsController.ts`):** `speak`/`speakSequence` quebram o texto
em chunks (`buildSpeechChunks`, ~420 chars) e cada chunk vai num POST `/api/ai/voice`
(`synthChunk`). Não há cache de chunk: cada fala sintetiza do zero. Já existe fila de onboarding
(`speakQueued`/`clearSpeechQueue`) e pipeline de lookahead.

**Rota:**
1. **Cache de síntese** no `ttsController`: um `Map` em memória keyed por `${voiceId}|${chunkText}`
   guardando o `Prepared` (`{kind:"audio", url}`). Em `synthChunk`, **consultar o cache primeiro**;
   se houver, retorna na hora; senão sintetiza e **grava** no cache. (Mantém o resto igual.)
2. **Prewarm** exportar `prewarmSpeech(texts: string[], opts?)`: para cada texto, roda
   `buildSpeechChunks` e dispara `synthChunk` de cada chunk **em background** (sem tocar),
   populando o cache. Throttle leve (ex.: 2-3 em paralelo) pra não estourar o engine/rate-limit.
   Respeitar `voiceId`/`gender` atuais do usuário (mesmas prefs do playback) pra a key bater.
3. **Disparar no início do tour:** em `lib/onboarding/tour.ts` `startTour()` (ou quando o
   `OnboardingGuide` monta com tour ativo), chamar
   `prewarmSpeech(TOUR_STEPS.map(s => s.say))`. Fire-and-forget. Assim, enquanto o usuário lê o
   primeiro card / interage, as falas seguintes já vão sendo sintetizadas.
4. **Bônus (servidor):** `/api/ai/voice` já cacheia por texto (Redis, ver helpers de cache nas rotas
   de IA). O prewarm também **aquece o cache do servidor**, então mesmo num device novo a 2ª vez é
   rápida. Não precisa mexer no servidor; só garanta que o texto enviado no prewarm é **idêntico** ao
   do playback (mesmo `cleanForSpeech`/chunking) pra a chave do cache coincidir.
5. **Limpeza:** ao encerrar/pular o tour, pode manter o cache (é leve e ajuda no replay), mas
   `clearSpeechQueue()` no fim continua valendo. Não pré-sintetizar fora do onboarding (uso normal
   não tem roteiro fixo).

> Opção mais radical (NÃO obrigatória agora): pré-renderizar os áudios do onboarding como arquivos
> estáticos em `/public/onboarding/*.mp3` (voz fixa) e tocar direto, latência zero garantida. Fica
> pra depois se o prewarm não bastar — o prewarm já deve resolver 95%.

---

## 3. A Sala de PESQUISA também aparece do nada — mesmo tratamento
**Problema:** ao chegar na Sala de Pesquisa (research-lab), a tela troca abruptamente, sem coachmark.
**Rota (mesmo princípio do item 1):**
1. Adicionar um **beat de transição** no tour ANTES de cair na Sala de Pesquisa: um passo `info`
   curtinho ("Agora vou te levar pra **Sala de Pesquisa** 💜") e/ou destacar o gatilho que leva pra
   lá (o botão **"Iniciar pesquisa"** já tem `data-tour="gerar"` no painel; o `start()` em
   `components/research/GenerateResearchPanel.tsx` dispara `zaeon:research:newdoc` + `zaeon:set-tab
   "pesquisa"`).
2. Ao **chegar** na Sala de Pesquisa, o primeiro passo deve **destacar um anchor de destino** (ex.:
   `[data-tour="docs-panel"]` — o player do documento salvo) em vez de não destacar nada. Garantir
   que o OnboardingGuide (global, persiste na navegação) re-mede o anchor depois que a research-lab
   monta (o `requestAnimationFrame` do measure já existe; só confirmar que o passo aponta um anchor
   que existe lá).
3. Princípio (reforço do item 1): **nenhuma** sala/tela entra sem (a) um beat de transição falado e
   (b) um coachmark no destino. Revisar a sequência inteira do tour por trocas "seco".

---

## 4. FEATURE — pesquisar em "Estudos" gera um estudo PARALELO em "Meus Estudos"
**Ideia (casa com o onboarding):** quando o usuário pesquisa qualquer tema na aba **Estudos**
(busca scholar = "estudos disponíveis online"), a Zaeon **gera em paralelo um estudo dele sobre o
mesmo tema** na aba **Meus Estudos**. No tour, enquanto isso gera, destaca-se a aba Meus Estudos; o
usuário vai lá e **vê o mesmo estudo** nascendo.

**O mecanismo já existe e é resiliente:** `components/study/MeusEstudosFeed.tsx` escuta
`zaeon:study:run` (detail `{ topic }`) → fila `pendingTopicRef`/`flushPending` → `typeIntoBarAndRun`
→ `zaeonStudy(topic)` cria o space e escreve os blocos ("escrevendo ao vivo"), emitindo
`zaeon:study:done`. A busca scholar dispara `zaeon:research:start` (detail = prompt) em
`app/workstation/student/omega/OmegaScholarContext.tsx:80`.

**Rota:**
1. **Disparo paralelo:** quando a busca começa (`zaeon:research:start` com o prompt), **também**
   disparar `window.dispatchEvent(new CustomEvent("zaeon:study:run", { detail: { topic: prompt } }))`.
   Pode ser no próprio `OmegaScholarContext.runQuery` (logo após o dispatch de `research:start`) ou
   num listener dedicado. Assim: aba Estudos mostra os papers online; Meus Estudos gera o estudo do
   usuário sobre o tema, em paralelo.
2. **Garantir que a geração roda mesmo com a aba Meus Estudos INATIVA:** o `MeusEstudosFeed` precisa
   estar **montado** (mesmo escondido) pra seus listeners/fila viverem — o código já foi desenhado
   pra isso ("o feed fica sempre montado, só escondido"). **Verificar** em
   `app/workstation/student/StudyRoomContent.tsx` se a aba inativa **desmonta** (render condicional
   `activeTab === ... ? <X/> : ...`). Se desmontar, mudar para **manter `MeusEstudosFeed` sempre
   montado e só escondê-lo com CSS** (`hidden`/display none) quando não for a aba ativa — senão o
   `zaeon:study:run` se perde. (Alternativa: uma fila persistente em store que o feed drena ao
   montar; mas manter montado é mais simples e já é a intenção do código.)
3. **Evitar duplicar:** se já houver um estudo do mesmo tema em geração/recém-criado, não criar dois
   (a fila `pendingTopicRef` já serializa; só garanta que repetir a busca não empilhe vários).
4. **Onboarding:** após a busca (geração em paralelo rodando), inserir um passo que **destaca a aba
   Meus Estudos** (`[data-tour="tab-meus-estudos"]` — anchor do item 1), `say`: "Enquanto eu trago os
   estudos online, montei um **estudo seu** sobre o tema aqui em **Meus Estudos** — dá uma olhada!".
   Avança ao clicar na aba (ou quando `zaeon:study:done`/`zaeon:study:new` dispara). O usuário entra
   e vê o estudo escrevendo ao vivo. Depois segue o fluxo (Studio, barra "/", voltar etc., conforme
   Lote 5).
5. **Não-onboarding:** o disparo paralelo vale pra todo mundo (não só no tour) — é a feature. O tour
   só adiciona o destaque. Garantir que fora do onboarding isso não atrapalhe (geração silenciosa em
   Meus Estudos é desejável; sem coachmark).

---

# Verificação final
1. `npx tsc --noEmit` — zero erros novos.
2. Smoke (descreva no PR):
   - Onboarding: a aba da Sala de Estudos é **destacada** (coachmark) antes de entrar; nada aparece
     "do nada".
   - Voz: ao avançar pelos passos, a fala começa **quase instantânea** (sem o cold-start a cada card);
     avançar rápido não corta (fila `speakQueued` mantida).
   - Sala de Pesquisa: entra com beat de transição + coachmark no destino (não "do nada").
   - Estudo paralelo: pesquisar um tema em Estudos faz nascer um estudo do usuário em **Meus
     Estudos** (visível ao trocar de aba), enquanto Estudos mostra os papers online.
3. Git: branch `feat/onboarding-lote6` + PR. Nunca `git add -A`.

# Arquivos prováveis
- `app/workstation/student/StudyRoomContent.tsx` (data-tour nas abas + listener `zaeon:set-tab` +
  manter `MeusEstudosFeed` sempre montado/escondido).
- `lib/onboarding/tour.ts` (passos da aba Estudos/Pesquisa + destaque Meus Estudos + `prewarmSpeech`).
- `lib/voice/ttsController.ts` (cache de síntese + `prewarmSpeech`).
- `app/workstation/student/omega/OmegaScholarContext.tsx` (disparar `zaeon:study:run` no
  `research:start`).
- `components/study/MeusEstudosFeed.tsx` (já tem a fila; só confirmar o disparo paralelo).
- `components/onboard/OnboardingGuide.tsx` (re-medir anchor pós-navegação / prewarm no mount).
