# Handoff — Ajustes finos: Aulas, Onboarding, Sala de Estudos e Sala de Pesquisa

> Documento para o **Claude Code** executar. Tudo já foi investigado: cada item tem
> **causa-raiz (arquivo:linha)** e **rota de solução prescrita**. Os números de linha
> são de referência (junho/2026) — **confirme o trecho antes de editar**, pode ter
> deslocado um pouco.

## Contexto do projeto
Zaeon OS — Next.js 14 (App Router), `server.js` custom, Prisma + MongoDB (Atlas), Pusher,
Vertex Gemini, voz (Gemini-TTS / Piper), deploy VPS Hostinger via Docker Compose
(`beta.zaeon.space`), auto-deploy ao mergear `main`. Repo: `~/Documents/Projects.nosync/zaeon-os`.

## Regras DURAS (não violar)
- **Git:** trabalhe em **branch + PR**. Nunca `git add -A` (adicione arquivos explicitamente).
  Push direto na `main` é bloqueado pela rede do dono (proxy ISP come git smart-HTTP). Não
  faça commit/push com credenciais a partir de sandbox; deixe o push pro Martinez se travar.
- **Sem segredos** em git/chat. **Sem SSH na VPS.**
- **Escopo:** mexa só no necessário pra cada item. Não refatore código não relacionado.
- **macOS do Martinez não tem `python`** (só `python3`).
- **Verificação obrigatória ao fim:** `npx tsc --noEmit` e, se rápido, `npx vitest run`.
  Conserte só erros NOVOS que você introduzir. (Há 1 erro pré-existente em
  `app/research-lab/page.tsx` numa linha de `WorkType` — se já existia, só mencione.)
- **Voz:** o app já tem um controlador de voz **global** em `lib/voice/ttsController.ts`
  (`speakSequence`, `ttsStop`) e hooks `lib/voice/useTTS.ts`. Reuse — não crie engine nova.
  Reuse também `components/voice/VoicePlayButton.tsx` (botão Play liquid-glass característico)
  e `components/voice/VoiceWaveIndicator.tsx`.

---

# LOTE 1 — Aulas, backpack e Onboarding

## 1. Admin / super-admin precisa ter poderes de professor (criar aula)
**Problema:** logado como admin/fundador, não consigo criar aula.
**Causa-raiz:** o gate de professor exige `role === teacher/professor` ou `isAdmin`, e o
super admin **por e-mail** fica de fora.
- `lib/aulas/roles.ts` → `isTeacherSession()` só lê `{role, isAdmin}`.
- `app/workstation/teacher/layout.tsx:14` → mesmo problema.
- Client: `app/workstation/student/StudyRoomContent.tsx:~189` e
  `components/sub/LoungeChatWidget.tsx:~80` calculam `isTeacher` só por role/isAdmin.

Existe `lib/auth/roles.ts` com `isSuperAdmin({email, role})` e `isSuperAdminEmail(email)`
(allowlist inclui `donmartinezcaiudoceu@gmail.com` e `donmartinez@aluno.unilab.edu.br`).

**Rota de solução:**
1. `lib/aulas/roles.ts`: importar `isSuperAdmin` de `@/lib/auth/roles`; ler também `email` do
   user; retornar `true` se role teacher/professor **ou** `isAdmin` **ou**
   `isSuperAdmin({ email, role })`.
2. `app/workstation/teacher/layout.tsx`: incluir `|| isSuperAdminEmail(session?.user?.email)`.
3. Client (`StudyRoomContent.tsx` e `LoungeChatWidget.tsx`): importar `isSuperAdminEmail` e
   adicionar `|| isSuperAdminEmail((session?.user as any)?.email)` ao `isTeacher`.
   - Isso libera a aba **"Meus Alunos"** e o `AulaAuthoringPanel` (já existe em
     `StudyRoomContent.tsx`, render condicional `activeTab === "classes" && isTeacher`).

## 2. Remover "Collective Build Node" + renomear a backpack
**Arquivo:** `components/sub/ClassesView.tsx`.
- **Remover** o bloco do `ProFeaturePanel title="Collective Build Node"` (~linhas 1156–1163,
  comentário `{/* COLLECTIVE BUILD ZONE ... */}` + o `<div>` inteiro). Se o import de
  `ProFeaturePanel` ficar órfão, remova-o.
- **Renomear** `title: "Personal Backpack"` → `title: "Acesse outros modelos"` (3 ocorrências,
  ~linhas 391, 460, 481 — no estado `userModules` e nos fallbacks). O título é exibido via
  `{mod.title}`.

## 3. Onboarding — "modo onboarding" no chat (descompasso voz × tela)
**Problema central:** ao iniciar o onboarding, o `setVoiceModeState("active")` abre o
`VoiceOrbModal` **full-screen** (`fixed inset-0 z-[1000]`, `components/voice/VoiceOrbModal.tsx`)
que **cobre tudo**, inclusive os botões do header do chat → não dá pra virar o chat de lado.

**Mecânica atual (referência):**
- `lib/onboarding/tour.ts` — `TOUR_STEPS` declarativos + `sayCurrent()` dispara
  `zaeon:onboard:say` (fala) e `zaeon:tour:prefill`. Passo avança por: `info` (botão Ok),
  `clickTarget` (clicar no alvo) ou `advanceEvent` (window event real).
- `components/onboard/OnboardingGuide.tsx` — renderer do overlay; hoje registra **UM**
  `advanceEvent` por passo (`{ once: true }`).
- `components/sub/LoungeChatWidget.tsx` — handler de `zaeon:onboard:say` (~135–150) abre o
  widget, faz `setVoiceModeState("active")` e `tts.speak`. O `VoiceOrbModal` (~1013–1018) abre
  quando `isListening || (voiceMode==="active" && (isZaeonTyping||tts.loading||tts.speaking))`.
  `startCall()` (~260) liga a conversa mãos-livres (voz + mic contínuo).

**Ordem que o usuário quer:**
1. onboarding iniciado → **ligação automática** pra Zaeon;
2. o modo entra **sem cobrir os botões do chat** — o indicador de ondas só ocupa a **área de
   texto** (mensagens) entre user e IA;
3. a IA se apresenta, fala o que vem a seguir e **pede pra ser jogada pro lado direito**;
4. **virar o chat pra direita é passo OBRIGATÓRIO**.

**Rota de solução:**
1. **Sinal global de onboarding.** Em `lib/onboarding/tour.ts`: `startTour()` dispara
   `window.dispatchEvent(new CustomEvent("zaeon:onboard:start"))`; `finishTour()` dispara
   `zaeon:onboard:stop`.
2. **Chat reage ao onboarding.** Em `LoungeChatWidget.tsx`:
   - `const [onboarding, setOnboarding] = useState(false)`.
   - useEffect escutando `zaeon:onboard:start` → `setOnboarding(true)` + abrir widget +
     **iniciar a ligação automaticamente** (sem o gate premium `requireVoice`): faça direto
     `setCallOn(true); setVoiceModeState("active"); wantListenRef.current = true; startListening();`.
   - escutando `zaeon:onboard:stop` → `setOnboarding(false)` + encerrar call
     (`setCallOn(false); wantListenRef.current=false; stopListening(); tts.stop();`).
3. **Overlay leve (não cobre o chat).** No JSX do `VoiceOrbModal`, troque `open` para
   `open={!onboarding && (isListening || (voiceMode==="active" && (isZaeonTyping||tts.loading||tts.speaking)))}`.
   Em modo onboarding, renderize **dentro do container de mensagens** (logo acima de
   `<div ref={messagesEndRef} />`) um indicador compacto:
   `{onboarding && (isListening || tts.speaking || tts.loading) && (<div className="flex justify-center py-2"><VoiceWaveIndicator size={20} /></div>)}`.
   Assim o header (botões call + flip) continua clicável.
4. **Flip obrigatório.** No botão `data-tour="chat-flip"` (~680), ao virar **para a direita**
   dispare `window.dispatchEvent(new CustomEvent("zaeon:chat:flipped-right"))`. No tour,
   transforme o passo `"chat"` em passo de ação: remova `info`/`cta`, use
   `target: '[data-tour="chat-flip"]'` + `advanceEvent: "zaeon:chat:flipped-right"`. Ajuste o
   `say` pra Zaeon se apresentar **e pedir** pra clicar no botão de virar e jogá-la pra direita.

## 4. Onboarding — card "abrir novo estudo" só some ao abrir um estudo de verdade
**Problema:** dá pra confirmar o card (botão Ok) **sem** abrir um estudo → buga o resto.
**Causa-raiz:** passo `"menu-estudos"` (`lib/onboarding/tour.ts`) é `info`/`cta: "Abrir Estudos"`
→ avança no clique do botão, não na ação real. E `newSpace()`
(`components/study/MeusEstudosFeed.tsx:~547-556`) cria o estudo mas **não dispara evento**.

**Rota de solução:**
1. `MeusEstudosFeed.tsx` → em `newSpace()`, após criar com sucesso, disparar
   `window.dispatchEvent(new CustomEvent("zaeon:study:new", { detail: { id: s.id } }))`.
2. `tour.ts` → passo `"menu-estudos"`: remover `info`/`cta`, adicionar
   `advanceEvent: "zaeon:study:new"` (manter `onMenu`/`target`/`say`). Card persiste até criar.

## 5. Onboarding — reconhecer save de referência + piada na espera
**Problema A (save não reconhecido):** o passo `"salvar"` (`tour.ts`) escuta
`zaeon:savedCitations`, mas o botão "Salvar na biblioteca" das referências/resultados usa
`useLibraryFiles` (`lib/useLibraryFiles.ts`), que dispara **`zaeon:libraryFiles`** — evento
diferente. Por isso o onboard nunca reconhece o save. (Confirme em
`app/workstation/student/omega/modules/ReferencesModule.tsx:~27-43` e `ResultadosModule.tsx`.)

**Rota de solução A:** suportar múltiplos eventos de avanço.
1. `tour.ts`: adicionar ao type `TourStep` o campo opcional `advanceEvents?: string[]`; no passo
   `"salvar"` trocar para `advanceEvents: ["zaeon:savedCitations", "zaeon:libraryFiles"]`.
2. `OnboardingGuide.tsx`: no `useEffect` do advance, registrar **todos** de
   `[...(step.advanceEvent ? [step.advanceEvent] : []), ...(step.advanceEvents ?? [])]`, cada um
   `{ once: true }`, removendo todos no cleanup. Qualquer um → `nextTour()`.

**Problema B (piada):** o usuário curtiu a IA amigável; quer uma **piada curta** enquanto espera.
**Rota de solução B:** no passo `"esperando"` (avança em `zaeon:research:done`), enriquecer o
texto `say` com uma piadinha leve/nerd em PT-BR pra passar o tempo. Só texto, sem lógica nova.

## 6. Chat mais responsivo — autofocus + call minimizável
**Arquivo:** `components/sub/LoungeChatWidget.tsx`.
- **Autofocus:** ao abrir (`isOpen` e `activeChat?.isAgent`), focar o input sem clique. Criar
  `const inputRef = useRef<HTMLInputElement>(null)`, ligar no `<input ref={inputRef}>` (~886),
  e `useEffect` que faz `setTimeout(() => inputRef.current?.focus(), 120)` quando abre (delay
  pra animação do framer-motion). Adicionar `autoFocus` no input como reforço.
- **Call minimizável:** a ligação deve rodar com o widget **fechado/minimizado** (FAB já mostra
  `VoiceWaveIndicator` quando `agentState` é speaking/listening). Adicionar
  `const [orbMinimized, setOrbMinimized] = useState(false)`; na prop `open` do `VoiceOrbModal`
  incluir `!orbMinimized`; no `onClose` do orb, **se `callOn` estiver ativo** → apenas
  `setOrbMinimized(true)` (mantém a call rodando, só esconde o overlay) em vez de parar tudo;
  resetar `orbMinimized=false` quando a call terminar. Resultado: ligação ativa + tela livre.

---

# LOTE 2 — Sala de Estudos (chat com PDF) e Sala de Pesquisa

> Obs.: o "chat com PDF" e o editor de escrita vivem em `app/research-lab/page.tsx`
> (a Sala de Pesquisa). O `PdfViewer` é compartilhado.

## 7. Chat com PDF deve mostrar sempre o FINAL da conversa
**Problema:** o chat com o PDF (Aura) abre mostrando o **início**, não o fim.
**Causa-raiz:** já existe auto-scroll (`page.tsx:1079-1085`, container `pdfChatRef`,
deps `[pdfChatHistory, isPdfTyping, activePdfTab]`). Mas no **primeiro render / ao abrir o
painel** o scroll não é forçado pro fim (mensagens pré-carregadas não disparam o efeito, ou o
`scrollTo({behavior:"smooth"})` roda antes do conteúdo medir altura).
**Rota de solução:**
- Garantir scroll pro fim quando o painel **monta/fica visível**: no efeito, use
  `behavior: "auto"` no primeiro ajuste (instantâneo) e rode também quando o painel/aba do doc
  passa a ser exibido. Opção robusta: `requestAnimationFrame` após render →
  `pdfChatRef.current.scrollTop = pdfChatRef.current.scrollHeight`. Inclua a dependência da
  visibilidade do painel (a flag que controla mostrar a janela de documento/chat).

## 8. Tirar o "ouvir" de baixo, e por um Play global em cima (no lugar de "voz automática")
**Problema:** há um `🔊 ouvir` **por mensagem** embaixo de cada resposta da Aura, e em cima um
toggle `🔊 Voz automática: ON/OFF`. O usuário quer: **remover o "ouvir" por mensagem**; **em
cima**, no lugar do toggle "voz automática", um **botão Play característico** (o que já usamos),
**global** — pra não gerar uma voz por cima da outra ao trocar de sala.
**Causa-raiz (arquivos):**
- Toggle "voz automática": `page.tsx:2540-2548` (`setVoiceOn`) + efeito `page.tsx:1094-1099`.
- "🔊 ouvir" por mensagem: `page.tsx:2593-2601` (`playVoice(parsed.clean||msg.text, i)`).
**Rota de solução:**
1. **Remover** o bloco do botão "🔊 ouvir" por mensagem (2593-2601). (Manter a citação sugerida.)
2. **Substituir** o toggle "voz automática" (2540-2548) por um **`VoicePlayButton`** que toca a
   **última resposta da Aura** (ou a conversa) via o controlador **global** `ttsController`
   (`speakSequence` / `ttsStop`), reusando o padrão do karaokê (`ResearchReadingView`/`speakSequence`
   já usados no resumo). Estado de playing/parar no mesmo botão.
3. **Global de verdade (sem voz sobreposta):** ao **trocar de aba/sala** ou desmontar o painel,
   chamar `ttsStop()` para cortar qualquer fala em andamento. Como o `ttsController` é único
   (`lib/voice/ttsController.ts`), isso evita duas vozes simultâneas. Avalie remover o toggle
   `voiceOn` e o efeito 1094-1099 (auto-fala) ou desligá-lo por padrão, já que o Play manual
   substitui o comportamento automático que causava sobreposição.

## 9. Ao arrastar um PDF pro painel, remover o texto de instrução
**Problema:** aparece "✦ Selecione um trecho — a Aura salva a citação em ABNT." e o usuário quer
fora.
**Causa-raiz:** `app/research-lab/PdfViewer.tsx:258` — `<span>✦ Selecione um trecho — a Aura
salva a citação em ABNT.</span>` na barra superior.
**Rota de solução:** remover esse `<span>` (manter a barra com os controles de zoom e o botão de
voz — ver item 8 sobre voz). Se a barra ficar visualmente vazia à esquerda, deixe o lado dos
controles alinhado à direita (já usa `ml-auto`).

## 10. Editor de escrita "inteligente" — preservar página/linha (scroll + caret)
**Problema:** se estou escrevendo na "página 10" (posição de rolagem + linha) e saio pro chat pra
falar de um estudo, ao **voltar** o input deve estar **exatamente onde eu estava** (scroll e
caret), não no topo.
**Causa-raiz:** o editor é um único `<textarea ref={textareaRef} value={docContent}>`
(`page.tsx:2451-2470`) dentro de `editorRef` (2426-2429). Ao trocar a janela de documento (ir pro
chat/PDF e voltar), o textarea perde `scrollTop` e `selectionStart` (remonta ou é reexibido sem
restaurar a posição).
**Rota de solução:**
- Persistir **por trabalho/sessão** (use o id da sessão de pesquisa atual como chave) dois valores:
  `scrollTop` do textarea e `selectionStart/selectionEnd` (caret).
- **Salvar** em `onScroll`, `onSelect`/`onKeyUp`/`onClick` e `onBlur` do textarea (debounce leve).
  Pode guardar em um `useRef` (`{ [sessionId]: { scroll, caret } }`) e/ou `localStorage`
  (`zaeon.research.caret.<sessionId>`) pra sobreviver a reload.
- **Restaurar** quando o editor volta a ficar visível / monta: num `useEffect` (deps: visibilidade
  do editor + `sessionId`), após `requestAnimationFrame`, setar
  `textareaRef.current.scrollTop = saved.scroll` e
  `textareaRef.current.setSelectionRange(saved.caret.start, saved.caret.end)` e dar `focus()`.
- Cuidado: não restaurar por cima de uma troca de documento/sessão real (só restaura pra **mesma**
  sessão). Se a sessão muda, começa do topo.

---

# Verificação final (obrigatória)
1. `npx tsc --noEmit` — zero erros novos.
2. Se rápido: `npx vitest run`.
3. **Smoke manual sugerido (descreva o que mexeu):**
   - Aulas: logado como fundador, vejo "Meus Alunos" e consigo abrir o `AulaAuthoringPanel`.
   - ClassesView: sem "Collective Build Node"; card antes "Personal Backpack" agora "Acesse outros modelos".
   - Onboarding: inicia em ligação; ondas só na área de texto; header clicável; flip pra direita
     avança o passo; card de "novo estudo" só some ao criar estudo; salvar referência avança;
     piada aparece na espera.
   - Chat: abre já com foco no input; call funciona minimizada (FAB com ondas, tela livre).
   - Sala de Pesquisa: chat com PDF abre no fim; Play global em cima (sem "ouvir" por mensagem);
     sem texto "✦ Selecione um trecho…"; voltar pro editor mantém scroll + linha.
4. **Git:** branch + PR (ex.: `feat/ajustes-onboarding-salas`). Nunca `git add -A`. Se o push
   travar, deixe o commit pronto e avise o Martinez.

# Arquivos que você vai tocar (resumo)
- `lib/aulas/roles.ts`, `app/workstation/teacher/layout.tsx`,
  `app/workstation/student/StudyRoomContent.tsx`, `components/sub/LoungeChatWidget.tsx`
- `components/sub/ClassesView.tsx`
- `lib/onboarding/tour.ts`, `components/onboard/OnboardingGuide.tsx`,
  `components/study/MeusEstudosFeed.tsx`
- `app/research-lab/page.tsx`, `app/research-lab/PdfViewer.tsx`
- (reuso, sem editar a fundo) `lib/voice/ttsController.ts`, `components/voice/VoicePlayButton.tsx`,
  `components/voice/VoiceWaveIndicator.tsx`, `lib/useLibraryFiles.ts`, `lib/useSavedCitations.ts`
