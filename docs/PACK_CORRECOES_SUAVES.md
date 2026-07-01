# Handoff — Pack de correções suaves (5 tasks)

> Para o **Claude Code**. Branch própria (`fix/pack-suave`). Tudo já foi investigado: cada task tem
> **causa-raiz (arquivo:linha)** + **rota de solução**. Confirme os trechos antes de editar (o código
> evolui; linhas podem ter deslocado). **Rebase com a main mais recente antes.**

## Regras DURAS
- Branch + PR. Nunca `git add -A`. Push trava (proxy ISP) → deixe commit pronto e avise o Martinez.
- Sem segredos, sem SSH. macOS sem `python` (use `python3`). `npx tsc --noEmit` no fim; só erros novos.

---

## TASK 1 — Remover o botão de microfone da TELA INICIAL
**Por quê:** o modo voz pode ser ligado a qualquer momento (chat widget global); um mic/modal de voz
na tela inicial é fora de contexto.
**Causa-raiz:** `components/sub/MenuNavigation.tsx` — botão de mic no input "Pergunte a Zaeon"
(~linhas 546–561, `onClick={toggleListening}`, `Mic`/`MicOff`), com toda a fiação de
`SpeechRecognition` (`recognitionRef` ~51, init ~219–249, `isListening`, `toggleListening`,
`startListening`/`stopListening`).
**Rota:**
1. Remover o `<button>` do mic (546–561) do input do menu. Manter o input de texto + o botão Enviar.
2. Limpar o que ficar **órfão**: `toggleListening`, `recognitionRef`, `isListening`, listeners de
   `SpeechRecognition`, e o placeholder condicional "Fale agora…" (volta a ser sempre
   "Pergunte a Zaeon…"). Se algum desses for usado em outro lugar do arquivo, manter.
3. **NÃO** remover: a "**Voz da Zaeon**" (VoicePicker em Opções) nem o toggle "**Voz do tutorial**"
   (`onbVoiceOn`) — são outra coisa (config/onboarding), ficam.
4. Se a remoção deixar de abrir algum overlay de voz na home (ex.: VoiceOrbModal disparado por
   `isListening`), garantir que não sobra nada de voz aparecendo na tela inicial.

## TASK 2 — Onboarding: virar uma "ligação" + copy acolhedora + destacar o minimizar
**Causa-raiz:** `lib/onboarding/tour.ts` BEAT 1 "apresentar" (~35–37) e BEAT 3 "chat-min" (~45–47);
UI no `components/sub/LoungeChatWidget.tsx`; card no `components/onboard/OnboardingGuide.tsx`.

**2a. Primeira interação = "Zaeon está te ligando…":** a Zaeon **liga** pro usuário; ele **atende**.
- No `LoungeChatWidget`, ao iniciar o onboarding (`zaeon:onboard:start`), em vez de já abrir falando,
  mostrar um estado de **chamada recebida**: "📞 Zaeon está te ligando…" com botão **Atender**
  (e talvez Recusar = pula o tour). Ao **Atender** → conecta a chamada (respeitando a pref de voz —
  se voz OFF, segue em texto) e dispara um evento (ex.: `zaeon:onboard:answered`).
- O BEAT 1 do tour avança quando atende (trocar `info/cta` por `advanceEvent: "zaeon:onboard:answered"`).
- **Card (OnboardingGuide / hint do BEAT 1):** trocar "👋 Que bom te ver — bora começar?" por
  **"Atenda a ligação da Zaeon para começar o tutorial"**.

**2b. Copy mais suave (sem nomes, sem "ABNT"):** trocar o `say` do BEAT 1
("Oi… já te liguei… gerar um trabalho em **ABNT**… Bora?") por algo acolhedor e sem jargão. Ex.:
> "Oi! Que alegria te ter aqui. 💜 Vou ficar do seu lado nos primeiros passos — em pouquinho você vai
> estar pesquisando, criando e dando vida às suas ideias. Vamos juntos, no seu ritmo?"
(Sem citar "Zaeon"/"ABNT"; foco em acolher e empolgar.)

**2c. Destacar o MINIMIZAR (BEAT 3):** hoje o passo "chat-min" aponta o widget inteiro
(`[data-tour="chat-widget"]`). Adicionar `data-tour="chat-min-btn"` no botão de **minimizar** (o
`MinusIcon`) do header do `LoungeChatWidget` e mudar o `target` do passo pra esse botão — assim o
coachmark destaca exatamente o "–".

## TASK 3 — Onboarding trava ao chegar na Sala de Estudos (card sobre a barra de busca)
**Causa-raiz:** passo `sala-estudos` em `lib/onboarding/tour.ts` (~54–57, "🏛️ Essa é a sua Sala de
Estudos", `target: '[data-tour="tab-community"]'`, `clickTarget: true`). O card cai **em cima da
barra de busca** e o `clickTarget` (na aba) provavelmente nunca dispara → **trava** o tour.
**Rota:** **remover o passo `sala-estudos`** do `TOUR_STEPS` (é redundante — o passo seguinte
`pesquisar` já aponta a barra `[data-academic-input="true"]` e avança em `zaeon:research:start`).
Garantir que o passo `menu-estudos` (avança em `zaeon:study:new`) leva direto ao `pesquisar` sem o
intermediário travado. (Se quiser manter um destaque da aba no futuro, fica pro posicionamento
space-aware do card — mas por ora **tirar** resolve o travamento.)

## TASK 4 — Sala de Plugins: sair volta pra HOME em vez da última sala
**Causa-raiz:** `app/plugin-store/page.tsx:127` — o botão voltar faz `router.push("/")`.
**Rota:** voltar pra **última sala** de onde veio.
1. Persistir a última sala: nas páginas de sala (shell do research-lab / study-rooms), gravar
   `sessionStorage.setItem("zaeon.lastRoom", <pathname atual>)` ao montar. (Ou, ao navegar PRA loja,
   passar `?from=<path>`.)
2. No `plugin-store/page.tsx`, o voltar lê `sessionStorage.getItem("zaeon.lastRoom")` →
   `router.push(lastRoom)`; fallback `router.back()` e, por último, `"/"`. (Evitar voltar pra própria
   loja; validar que `lastRoom` não é `/plugin-store`.)

## TASK 5 — "Acessar convite" no menu deve ser o convite POR LINK (convidar outros), não por dígitos
**Causa-raiz:** `components/sub/MenuNavigation.tsx:631` — a opção de convite faz
`router.push("/convite")`, e `/convite` (`app/convite/page.tsx` + `InviteCard`/`CodeInputStep`) é o
fluxo de **resgate** ("Digite o código que você recebeu"). Errado pra quem já está logado e quer
**convidar amigos**.
**Existe a peça certa:** `app/api/convite/meu-codigo/route.ts` (o **código do próprio usuário**).
**Rota:** a opção do menu abre um **"compartilhar meu convite"** (não o resgate):
1. Buscar `/api/convite/meu-codigo` → obter o código/uses do usuário.
2. Mostrar (modal ou página `/convite/compartilhar`) o **código** + um **link pronto** pra copiar:
   `${location.origin}/convite?code=<CÓDIGO>` + botão **Copiar** (+ contador usos restantes
   `usedCount/maxUses` se vier). Estética Zaeon.
3. Manter `/convite` (resgate) como **landing do convidado** — e fazer o `InviteCard` **pré-preencher**
   o código quando vier `?code=` na URL (conferir se já faz via `initialCode`; se não, ligar).
4. Ajustar o rótulo do item do menu pra refletir "Convidar amigos" (compartilhar), não "Acessar
   convite". (A label hoje é condicional a `inviteAccessed` — revisar pra sempre levar ao
   compartilhar quando logado.)

---

## TASK 6 — Meus Estudos: a barra do TÍTULO vira a única barra (título + novo estudo); Studio só no ⟁
**Por quê:** unificar o input. Hoje há (a) a **barra do título** (pílula com ⟁ + textarea do título +
Play), (b) o **StudioDock** (sempre visível, recolhível), e (c) a **barrinha-agente** (`zaeonCmd`,
abre ao clicar no ⟁ → cria estudo). Confuso. Queremos **uma barra visível** (título), que **também
cria estudo**, e o Studio aparecendo **só ao clicar no ⟁**.
**Causa-raiz:** `components/study/MeusEstudosFeed.tsx`:
- Cabeçalho/título: ~927–972 (⟁ `setBarOpen`, `titleDraft`/`saveTitle`, Play).
- `<StudioDock spaceId={spaceId} />`: ~983 (renderizado sempre).
- Barrinha-agente (`zaeonCmd` → `zaeonStudy()`): ~986–1006 (só quando `barOpen`).
**Rota:**
1. **Título = barra de novo estudo:** no `<textarea>` do título (~950), o **Enter** passa a
   **gerar um novo estudo** com o texto digitado como tema — chamar `zaeonStudy(titleDraft)` (em vez
   de só `blur()`). Manter **renomear o estudo atual** no `onBlur` (`saveTitle`). Ajustar o
   `placeholder` pra deixar intuitivo que dá pra digitar um tema e apertar Enter ("Dê um título… ou
   digite um tema e Enter pra criar um novo estudo"). Assim **toda entrada fica nessa barra**.
2. **Remover/fundir a barrinha-agente separada** (986–1006): a função de "novo estudo" agora é a
   barra do título; tirar a barra de comando como elemento separado (ou transformá-la só no input do
   título). Não deixar duas barras de criar estudo.
3. **Studio só no ⟁:** o `StudioDock` (983) fica **oculto por padrão** e só **aparece (com as
   funcionalidades) ao clicar no ⟁** da Zaeon (o botão `setBarOpen`/`barOpen` do cabeçalho). Manter
   o **espaçamento** reservado (um wrapper com `min-height` onde o dock ficaria) pra não dar pulo de
   layout — a barra some, o espaço fica. (Se hoje o StudioDock já tem um colapso interno, alinhar:
   ele só renderiza o conteúdo quando `barOpen`, e some quando fechado.)
4. **Resultado:** desse lado, só a **barra do título** visível (título + criar estudo) + o **painel
   do estudo / frame da página**; Studio e comando aparecem ao tocar no ⟁.
> Cuidado: não quebrar o tour (anchors `data-tour="quick-bar"` no cabeçalho e `data-tour="studio-dock"`
> no dock) — manter os anchors existindo (mesmo que o dock só apareça no ⟁).

## TASK 7 — Fazer o PODCAST funcionar (mesma sala)
**Estado:** `app/api/studio/podcast/route.ts` cria o artefato (`queued`) e roda
`runPodcastGeneration` em background (`lib/studio/podcast-pipeline.ts`); cliente faz polling em
`/api/studio/[id]` e toca `/api/studio/[id]/file`. O pipeline gera roteiro (Gemini) → sintetiza
**turno a turno** com `synthGeminiTTS` (vozes `VOICE_F=Leda`, `VOICE_M=Charon`) → `concatWav` →
`writeStudioFile` (.studio/<id>.wav) → `done`. Se a síntese não der WAV, **lança erro** (linha ~72:
"...verifique GEMINI_TTS_MODEL") e o artefato vira `error`.
**Suspeitos prováveis (investigar nesta ordem):**
1. **Voz/modelo do TTS:** confirmar que `synthGeminiTTS` funciona pras DUAS vozes (Leda **e**
   Charon) com o `GEMINI_TTS_MODEL` configurado em prod. Se "Charon" (ou o modelo) for inválido,
   todos os turnos falham → `wavs.length===0` → erro. (A narração de 1 voz funciona com Leda; testar
   Charon isolado.) Conferir envs `GEMINI_TTS_MODEL`/`ZAEON_TTS_VOICE_M`/`_F` + credenciais Vertex.
2. **Armazenamento:** `writeStudioFile` grava em `.studio/` (volume `studio_data:/app/.studio` no
   compose). Conferir se o diretório existe/é gravável em prod e se `/api/studio/[id]/file` serve o
   WAV de lá.
3. **Roteiro:** `geminiJson` do outline/transcript pode voltar vazio/malformado → "Esboço/Transcrição
   do podcast vazia". Logar a resposta crua.
4. **Status/polling:** confirmar que `/api/studio/[id]` reflete `error`/`done` e que o StudioDock
   mostra o erro (hoje some em silêncio?). 
**Entrega:** reproduzir uma geração (ou ler logs/`StudioArtifact.error` no banco), achar o ponto de
falha e aplicar o fix (provável: corrigir nome de voz/modelo do TTS, ou a gravação/serviço do .studio,
ou tratamento de erro visível). Se o multi-speaker for o caminho desejado, há
`lib/studio/podcast-tts.ts` (synthGeminiTTSMulti) — mas o turno-a-turno é o caminho "que funciona";
priorizar fazê-lo funcionar.

## TASK 8 — Tela inicial: também remover o mic ON/OFF "Voz do tutorial"
**Contexto:** além do mic antigo (Task 1), há um **mic on/off novo** na tela inicial: o toggle
**"Voz do tutorial"** (`onbVoiceOn`) em **Opções** — `components/sub/MenuNavigation.tsx` ~642–661
(estado ~85–91). Mesma lógica da Task 1: controle de voz na tela inicial é fora de contexto, já que
a voz é ligável a qualquer momento.
**Rota:** **remover** o card "Voz do tutorial" da tela inicial/Opções. A voz do onboarding continua
**opt-in e controlável no chat** (conforme Lote 7: dá pra ligar/desligar no widget antes do tutorial)
— então tirar o toggle da home é seguro; o default segue **OFF** (`localStorage "zaeon.onboard.voice"`
permanece a fonte de verdade; o chat continua podendo setá-lo). Limpar `onbVoiceOn`/`toggleOnbVoice`
se ficarem órfãos no MenuNavigation. (Se preferir manter em algum lugar, deixar SÓ no chat widget, não
na tela inicial.)

---

# Verificação final
1. `npx tsc --noEmit` — zero erros novos.
2. Smoke (PR):
   - Tela inicial **sem** botão de mic; nada de voz aparece sozinho ali.
   - Onboarding: começa com **"Zaeon está te ligando…"** + Atender; card diz "Atenda a ligação…";
     copy do 1º passo suave (sem "ABNT"/nome); o passo de **minimizar** destaca o botão "–".
   - Onboarding **não trava** ao chegar na Sala de Estudos (passo redundante removido) → segue pra
     pesquisa.
   - Sair da Sala de Plugins volta pra **última sala**, não pra home.
   - Item de convite no menu abre o **compartilhar (link/código do usuário)**, com copiar; o link
     `/convite?code=…` pré-preenche o resgate do convidado.
   - Meus Estudos: **uma barra só** (título) que também cria estudo (Enter); o **Studio aparece só ao
     clicar no ⟁** (espaço reservado, sem pulo); resto do lado é só o painel do estudo.
   - Podcast: gera e toca (ou erro visível com causa identificada); achar e aplicar o fix.
   - Tela inicial **sem** o mic on/off "Voz do tutorial" (voz fica no chat).
3. Git: branch `fix/pack-suave` + PR. Nunca `git add -A`.

# Arquivos
- `components/sub/MenuNavigation.tsx` (T1 mic; T5 convite; T8 toggle "Voz do tutorial").
- `components/study/MeusEstudosFeed.tsx` (T6 barra única + Studio só no ⟁) + `components/studio/StudioDock.tsx` (T6/T7).
- `app/api/studio/podcast/route.ts` + `lib/studio/podcast-pipeline.ts` + `lib/voice/gemini-tts.ts`
  + `lib/studio/storage.ts` + `app/api/studio/[id]/route.ts` + `app/api/studio/[id]/file` (T7 podcast).
- `lib/onboarding/tour.ts` (T2 beats/copy; T3 remover passo) + `components/onboard/OnboardingGuide.tsx`
  (T2 card) + `components/sub/LoungeChatWidget.tsx` (T2 ligação + `data-tour="chat-min-btn"`).
- `app/plugin-store/page.tsx` (T4 voltar) + shell das salas (gravar `zaeon.lastRoom`).
- `app/convite/page.tsx` / `components/convite/InviteCard.tsx` (T5 landing `?code=`) +
  `app/api/convite/meu-codigo/route.ts` (T5 fonte do código) + UI nova de compartilhar.
