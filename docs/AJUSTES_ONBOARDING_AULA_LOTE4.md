# Handoff LOTE 4 — Onboarding (reta final) + Sala de Aula do professor + relógio

> Para o **Claude Code**. Lote independente — **branch própria** (`feat/onboarding-aula-lote4`).
> Há outros lotes em andamento (`feat/ajustes-onboarding-salas`, `feat/pesquisa-lote3`): vários
> itens daqui tocam `lib/onboarding/tour.ts`, `components/onboard/OnboardingGuide.tsx`,
> `components/sub/LoungeChatWidget.tsx` e `components/sub/ClassesView.tsx`, que esses lotes também
> mexem. **Antes de editar, dê um diff/rebase com a `main` mais recente** e reaplique por cima do
> estado atual desses arquivos (não reverta o que os outros lotes já fizeram: modo onboarding,
> flip-right obrigatório, overlay leve, autofocus, call minimizável, remoção do Collective Build
> Node, rename backpack→"Acesse outros modelos"). Confirme cada trecho antes de mexer.

## Regras DURAS
- Branch + PR. Nunca `git add -A`. Push direto na `main` trava (proxy ISP) — se travar, deixe o
  commit pronto e avise o Martinez. Sem segredos. Sem SSH na VPS. macOS sem `python` (use `python3`).
- Verificação ao fim: `npx tsc --noEmit` (+ `npx vitest run` se rápido). Só conserte erros novos.

---

# PARTE A — Onboarding (estamos quase fechando)

Contexto base (já implementado/derivando dos lotes anteriores):
- `lib/onboarding/tour.ts` — `TOUR_STEPS` + `sayCurrent()` dispara `zaeon:onboard:say`. Tipos de
  avanço: `info` (botão), `clickTarget`, `advanceEvent`/`advanceEvents`.
- `components/onboard/OnboardingGuide.tsx` — overlay: anel no `target` + card (chip) com a função.
  Posição do chip calculada em `chip` (~linhas 65-67): hoje fica **abaixo** do alvo, e por isso
  **cobre os ícones** quando o alvo é a dock (canto inferior).
- `components/sub/LoungeChatWidget.tsx` — chat. Em modo onboarding (`zaeon:onboard:start`) ele
  liga a "ligação" automática. Botão flip `data-tour="chat-flip"` dispara `zaeon:chat:flipped-right`.

## A1. Após jogar o chat pra direita, pedir pra MINIMIZAR (o chat aberto fica no meio do painel)
**Problema:** depois do flip pra direita, o chat aberto fica no meio da Sala de Pesquisa, atrapalhando.
**Rota:**
1. No `LoungeChatWidget`, ao **minimizar** (fechar/colapsar para o FAB) dispare
   `window.dispatchEvent(new CustomEvent("zaeon:chat:minimized"))`. (O botão de minimizar é o
   `MinusIcon`/header — garanta que ele realmente fecha pro FAB e emite o evento.)
2. Em `tour.ts`, **depois** do passo do flip-right, inserir um passo novo guiado por ação:
   `target: '[data-tour="chat-widget"]'`, `advanceEvent: "zaeon:chat:minimized"`,
   `say` pedindo carinhosamente: "Agora me **minimiza** ali no cantinho pra gente ter a tela toda —
   é só tocar no traço (–) do meu topo. 😊". (Sem `info`/cta; só avança quando minimiza.)
3. Esse passo é **obrigatório** (igual o flip): não some até minimizar.

## A2. Na 1ª ligação (modo onboarding), a Zaeon NÃO pode escutar o usuário
**Problema:** o mic ligado no onboarding atrapalha (capta ruído, dispara turnos).
**Causa:** no handler de `zaeon:onboard:start` (lote anterior) a ligação chama `startListening()`.
**Rota:** em modo onboarding, a ligação é **só fala (TTS), sem escuta**. No `LoungeChatWidget`:
- ao entrar em onboarding, **não** chamar `startListening()` nem setar `wantListenRef.current = true`;
  apenas `setCallOn(true); setVoiceModeState("active")` pra ela falar.
- garantir que o loop de "reabrir o mic quando ela termina de falar" (o `useEffect` que checa
  `wantListenRef.current`) **não** rode enquanto `onboarding === true` (early-return se onboarding).
- o `VoiceOrbModal`/indicador continua mostrando só o estado "falando", nunca "ouvindo".
Quando o tour terminar (`zaeon:onboard:stop`), a voz volta ao comportamento normal (com escuta).

## A3. Sala de Estudos: o passo das sub-abas deve mostrar também a aba "Resultados"
**Causa:** o passo `"subabas"` (`tour.ts`) cita só "Referências, Insights e Base". A aba
**Resultados** (ResultadosModule) já existe e ficou de fora.
**Rota:** atualizar o `say` do passo `"subabas"` para incluir **Resultados** (ex.: "Aqui ficam
**Resultados** (tudo que achei), **Referências** (as verificadas), **Insights** e **Base**.").
Garanta que o alvo `[data-tour="result-tabs"]` cobre a fileira com a aba Resultados inclusa.

## A4. Pesquisa: mais ênfase em ONDE ficam as citações (card do coachmark cobrindo os ícones)
**Problema:** no passo das citações, o **card do onboarding** fica **em cima dos ícones** da dock
(`data-tour="dock"`, canto inferior) — só dá pra ver o card, não o que ele aponta. Deveria ficar
**ao lado (esquerda)**, não por cima.
**Causa:** em `OnboardingGuide.tsx`, o `chip` é sempre posicionado **abaixo** do alvo
(`ring.top + ring.height + 10`). Para alvos colados na base/direita, isso sobrepõe o elemento.
**Rota:** tornar o posicionamento do chip **consciente do espaço**:
- se o alvo está na metade inferior da tela → posicionar o card **acima** do alvo
  (`ring.top - cardHeight - 10`);
- se o alvo está colado à direita (como a dock) → posicionar o card **à esquerda** do alvo
  (`ring.left - cardWidth - 12`), centralizado verticalmente no anel.
- nunca deixar o card sobrepor o `ring` (calcular e escolher o lado com mais espaço).
Além disso, no passo das citações, reforçar o `say` apontando **onde** elas aparecem ("Olha na
**dock** aqui do lado: o 🔖 abre as **Citações salvas** — é de lá que você arrasta pro texto.").

## A5. Novo passo: arrastar e soltar um PDF no painel para ler
**Objetivo:** ensinar que dá pra **arrastar e soltar um PDF** no painel de documentos pra abrir e ler.
**Rota:**
1. Verificar/!garantir a capacidade: o painel de documentos `DocumentDesktop`
   (`data-tour="docs-panel"`) deve aceitar **drop de arquivo PDF** → abrir no leitor (`onView`/
   `onPlayFile`/`PdfViewer`). Se o `onDrop` de arquivo não existir nesse painel, **implementar**
   (ler o `File` PDF, criar a entrada e abrir no viewer). (Hoje o drop de arquivo aparece no
   `ClassesView` "Livraria" e no editor pra citações; confirmar que na Sala de Pesquisa o
   `docs-panel` abre PDF solto.)
2. Em `tour.ts`, adicionar um passo `info` (ou guiado por evento de drop) apontando
   `target: '[data-tour="docs-panel"]`, `say`: "Dica de ouro: **arrasta um PDF** aqui pra dentro
   que eu abro pra você ler — e dá pra ouvir também. 📄". Posicionar **antes** do passo das citações
   (ler o PDF → depois citar faz sentido na ordem).

---

# PARTE B — Sala de Aula do professor (vital)

## B1. "Cadê o chat?" — restaurar o chat e a ESTRUTURA pro professor
**Contexto:** o "chat da Sala de Aula" é o **chat da Zaeon** dentro do `ClassesView.tsx`
(painel ~linha 912, `liquidChatHistory`/`zaeonChatScrollRef`). A estrutura do `ClassesView` é:
**chat (912) → Livraria (934) → relógio/agenda (960) → backpack "Acesse outros modelos" (1032) →
módulo de aula abaixo** (`StudentAulasModule`/painel de aula, renderizado mais abaixo).
**Problema:** no perfil do **professor**, a Sala de Aula perdeu o chat. Provável causa: o caminho
do professor **substitui** o `ClassesView` por um painel de autoria de aula só
(`StudyRoomContent.tsx` faz `activeTab === "classes" && isTeacher ? <AulaAuthoringPanel/> : ...`),
em vez de **manter** o `ClassesView` e **acrescentar** a autoria abaixo.
> ⚠️ A feature de aulas está espalhada por branches (`feat/aulas-fase1`, `feat/aulas-fases-2-6`) e
> `components/aulas/` pode não existir no working tree atual — **localize** o caminho real do
> professor depois do rebase com a `main` antes de editar.
**Rota (end-state desejado pelo Martinez):**
- O professor vê a **MESMA Sala de Aula** do aluno: `ClassesView` com **chat → Livraria → relógio**
  preservados, **e o módulo de criação de aula renderizado ABAIXO** (não no lugar do chat).
- Ou seja, no ponto onde hoje o professor recebe só o painel de autoria, renderizar
  `<ClassesView .../>` normalmente **+** o painel de aula do professor **abaixo** (como o
  `StudentAulasModule` já fica abaixo no fluxo do aluno).
- Não tocar na navbar; mudanças contidas à área de Aulas (regra dos lotes anteriores).

## B2. Chat minimizável (mantendo a estrutura)
**Problema:** pediram pra poder minimizar o chat, mas sem quebrar a ordem chat → livraria → relógio.
**Rota:** no `ClassesView`, o painel de chat (912) ganha um botão de **minimizar** (–) no topo que
colapsa para uma bolha/ícone fininho **no mesmo lugar** (a coluna do chat encolhe, as outras não se
desorganizam — use largura animada como no `LoungeChatWidget`, mantendo o slot na linha). Reabrir
expande de volta. Persistir o estado (localStorage `zaeon.aula.chatMin`).

## B3. Rascunhos minimizável (igual a biblioteca de "Meus Estudos")
**Contexto:** em "Meus Estudos" a **Biblioteca** é uma seção colapsável; replicar o mesmo padrão no
painel de **Rascunhos** da autoria de aula. **Atenção:** isto é um detalhe — o problema MAIOR da
criação de aula está na **PARTE D** (a autoria inteira precisa ser refeita). Faça a PARTE D e o
"minimizar rascunhos" cai naturalmente nela.
**Rota:** no novo ambiente de autoria (PARTE D), o painel/coluna de **Rascunhos de aula** ganha o
mesmo cabeçalho colapsável da Biblioteca de `components/study/MeusEstudosFeed.tsx`. Persistir estado.

---

# PARTE C — Relógio radial realmente funcional

**Contexto:** `ClassesView.tsx`, agenda radial (~960-1018). Já existe: fatias de aulas por dia,
roleta de dias (setas), e um **ponteiro de hora atual** (linha ~978) que só aparece quando
`DAY_NOW === selectedDay+1` e a hora está em `AG_MIN..AG_MAX`. `HOUR_NOW`/`DAY_NOW` vêm de um
relógio que atualiza a cada minuto (~linha 326).
**O que o Martinez quer:** um relógio **de verdade**, vivo e útil.
**Rota:**
1. **Ponteiro vivo:** desenhar ponteiros de **hora e minuto** que se movem em tempo real (atualizar
   o estado de tempo a cada ~1s para o minuto andar suave; pode manter 1/min se preferir leveza,
   mas o minuto tem que andar). Hoje só há uma linha única condicional.
2. **Hora digital no centro:** mostrar a hora atual (HH:MM) no miolo do relógio (hoje o centro
   mostra o nome do dia). Combinar: dia + hora atual, legível em claro/escuro.
3. **Hoje em destaque:** ao montar, `selectedDay = hoje` (já faz) e marcar visualmente que é "hoje"
   quando `selectedDay === DAY_NOW`; o ponteiro de tempo só faz sentido no dia de hoje (manter).
4. **Tarefas do dia atreladas ao relógio:** a lista "EVENTOS DO DIA" (1000-1017) já existe; ligar
   a "aula agora" (`currentClass`, 1020) destacando a fatia correspondente no relógio (glow) quando
   está acontecendo. Opcional: destacar a próxima aula.
5. Manter toda a estética liquid-glass e a interação de pintar fatia / roleta de dias.

---

# PARTE D — PONTO DE INFLEXÃO: a criação de aula tem que ser VIVA (clone do Meus Estudos, focado em ENSINAR)

## D0. Mea-culpa honesto (o que deu errado até aqui)
A criação de aula hoje está **morta**: virou um form com input de vídeo + um campo "markdown". Isso
**não** é o que queríamos. Na fase de pesquisa eu analisei a estrutura do **frappe/lms** (não o
OpenLMS/Moodle em si) e o que ficou no código foi só o **esqueleto de dados** (models de
Turma/Aula/Quiz/Progresso) — o que tem valor de LMS (curso → aula → quiz → progresso do aluno) foi
aproveitado **no modelo de dados**, mas a **experiência de autoria** não foi: viramos um editor
pobre em vez de trazer a riqueza do **Meus Estudos**. Esta parte corrige isso. Trate D como o item
mais importante do Lote 4 — **B3 é só um detalhe dentro de D**.

## D1. O alvo: o mesmo ambiente do Meus Estudos, com chapéu de professor
A autoria de aula deve ser um **canvas generativo amplo e aberto**, idêntico em mecânica ao
**`components/study/MeusEstudosFeed.tsx`**, só que com **intenção de ENSINAR** (não estudar). Tudo
que o Meus Estudos tem, a aula tem:
- **Blocos** livres (título/subtítulo/texto) — `addBlock("h1"|"h2"|"text")`, `addBlockAfter`,
  reordenar arrastando, markdown ("# ", "## ") no início vira título/subtítulo.
- **Menu "/"** (o coração) — `lib/study/slashMenu.ts` (`filterSlash`, `SlashOption`): digitar "/"
  num bloco abre o menu; setas navegam, Enter escolhe, Esc fecha. Duas famílias de opção:
  **ESTRUTURA** (transforma o bloco) e **STUDIO** (gera um módulo e encaixa no cursor via
  `zaeon:studio:generate` → `zaeon:study:embed`).
- **Studio dock** (`components/studio/StudioDock.tsx`) — ⟁ com **Podcast · Guia · Mapa mental ·
  Linha do tempo · Flashcards · FAQ · Imagem · Vídeo**, cada um chamando `/api/studio/<kind>` e
  encaixando o resultado como bloco colapsável (`StudioBlock`).
- **Drop de arquivos** (PDF/imagem) virando bloco; **ouvir** blocos por voz (ttsController).

**NÃO** é "input de vídeo + markdown". É o caderno generativo inteiro, com "/" e Studio.

## D2. Como construir (reusar, não reinventar)
A rota mais limpa e rápida — e a que mantém paridade pra sempre — é **reaproveitar o próprio
`MeusEstudosFeed`** em vez de manter um `AulaAuthoringPanel` paralelo e pobre:
1. **Parametrizar `MeusEstudosFeed`** com um modo, ex.: `mode?: "study" | "teach"` (default
   "study"). No modo "teach":
   - as cópias/labels mudam pra linguagem de professor ("Nova aula" em vez de "Novo estudo",
     "Aula sem título", placeholders "Comece a montar sua aula…", etc.);
   - o canvas, o menu "/", o `StudioDock`, markdown, drop e reordenar **continuam idênticos**
     (você herda tudo de graça);
   - o espaço é uma **aula** (ver D3) em vez de um StudySpace de estudo.
2. Se misturar os dois modos no mesmo componente ficar arriscado, **extraia o motor** (canvas +
   "/" + Studio) para um componente base reutilizável e monte `MeusEstudosFeed` (estudo) e
   `AulaCanvas` (ensino) sobre ele — sem duplicar a lógica do "/" nem do Studio.
3. O componente atual `components/aulas/AulaAuthoringPanel.*` (form pobre) é **substituído** por esse
   canvas. Onde o professor abre "Aulas" (ver PARTE B), renderiza o `AulaCanvas`.

## D3. Espaço de aula (dados) — reusar a engine de blocos
O Meus Estudos persiste blocos via `/api/study/spaces` + `/api/study/items` (StudySpace/StudyItem,
`placement`/`order`). Para a aula, **reutilize a mesma engine de blocos** (é o que dá o canvas vivo):
- Opção recomendada: um **espaço de aula** que usa StudyItem como conteúdo (mesma API de blocos),
  amarrado ao registro de **Aula** do LMS (models Fase 1: `Aula`/`AulaQuiz`/`AulaQuestion`). Isto é:
  o corpo da aula = blocos (reusa `/api/study/items`); os metadados/quiz/entrega = models de Aula.
- Não crie uma engine de blocos nova. Se precisar isolar por papel, adicione um campo de tipo no
  space (`kind: "study" | "aula"`) e filtre as listagens (Meus Estudos não mostra aulas e vice-versa).

## D4. Blocos específicos de ENSINO (o diferencial sobre o Meus Estudos)
Além de tudo do Studio, adicionar ao menu "/" (e/ou ao dock) opções próprias de aula:
- **🎬 Vídeo-aula** — bloco de vídeo de 1ª classe: colar link do YouTube **ou** subir arquivo →
  player embutido no bloco (não um "input de vídeo" solto). (Hoje o Studio tem "Vídeo" gerado por
  IA; aqui é também **vídeo do professor**.)
- **🧪 Quiz / Avaliação** — bloco que cria perguntas (liga aos models `AulaQuiz`/`AulaQuestion`),
  com correção; é o que o aluno responde depois (texto+voz, conforme plano de Aulas Fase 3).
- **🎯 Objetivo de aprendizagem** — um callout no topo (o "valor de LMS" do frappe/lms: aula tem
  objetivo + resultado esperado).
- (Reuso direto do Studio para o resto: Guia, Mapa, Linha do tempo, Flashcards, FAQ, Imagem,
  Podcast — tudo serve pra ensinar.)

## D5. Fluxo de ensino por cima do canvas (não perder o que já foi planejado)
- **Gerar vs Enviar:** o professor monta a aula no canvas e, num botão **destacado**, **envia** para
  a turma (entrega individual por aluno; vira card no chat do aluno) — distinto de só salvar rascunho
  (ver `docs/AULAS_TEACHER_AGENT.md` / `AULAS_TEACHER_HANDOFF_CONT.md`).
- **Rascunhos** (o B3): coluna/aba de rascunhos de aula colapsável, igual à Biblioteca do Meus
  Estudos.
- O agente do chat da aula (ClassesView) pode **gerar a aula** no canvas e/ou **enviar** (tools de
  aula do plano), reusando os mesmos eventos do Studio/"/".

## D6. Resultado esperado
Abrir "criar aula" deve dar a MESMA sensação de amplitude do Meus Estudos: tela aberta, cursor num
bloco, "/" abrindo um leque de módulos generativos, Studio à mão, vídeo e quiz nativos — só que a
missão é **ensinar**. Se ao terminar ainda parecer um formulário, está errado.

**Arquivos-chave de referência (estudar antes):** `components/study/MeusEstudosFeed.tsx`,
`lib/study/slashMenu.ts`, `components/studio/StudioDock.tsx`, `components/studio/StudioBlock.tsx`,
`app/api/study/spaces/route.ts`, `app/api/study/items/route.ts`, `app/api/studio/<kind>/route.ts`,
e os models de Aula no `prisma/schema.prisma`.

---

# PARTE E — Meus Estudos: leitura por voz INLINE (não overlay por cima)

**Problema:** no Meus Estudos, ao "Ouvir o estudo inteiro", o karaokê abre como uma **página por
cima do painel** (overlay flutuante) — fica estranho. Deve se comportar **dentro do próprio painel**,
como na Sala de Pesquisa.
**Causa-raiz:** `components/study/MeusEstudosFeed.tsx` (~linhas 845-851) renderiza o
`ResearchReadingView` num container **`fixed`**:
```
{tts.speaking && readingParts.length > 0 && (
  <div className="fixed top-[96px] left-[84px] right-4 bottom-4 z-[400] ...">
    <ResearchReadingView text={readingParts.join("\n")} onStop={...} />
  </div>
)}
```
Na Sala de Pesquisa (`app/research-lab/page.tsx`, ~2534-2538) o MESMO componente é renderizado
**`absolute inset-0`** dentro do painel `relative` — por isso fica contido.
**Rota de solução (mínima, mantém o funcionamento):**
1. Garantir que o **container do painel/feed do estudo** (onde os blocos são listados) seja
   `position: relative` (`className="relative ..."`).
2. Trocar o overlay `fixed top-[96px] left-[84px] right-4 bottom-4 z-[400]` por **`absolute inset-0
   z-[40]`** (rounded mantido), renderizado **dentro** desse container relativo — assim o karaokê
   cobre só o painel do estudo, igual à Sala de Pesquisa.
3. Não mudar a lógica de voz (`readWholeStudy`, `readingParts`, `tts.speakSequence`, `onStop`) — só
   o posicionamento/escopo do overlay.
**Verificar:** ler o estudo inteiro destaca o trecho dentro do painel (sem tampar navbar/sidebar/
dock), e "Parar" fecha normal.

---

# Verificação final
1. `npx tsc --noEmit` — zero erros novos.
2. Smoke (descreva no PR):
   - Onboarding: flip→pede minimizar (obrigatório); na ligação inicial a Zaeon **só fala** (não
     escuta); passo cita **Resultados**; card do coachmark **não** cobre a dock (fica ao lado);
     passo novo de **arrastar PDF** funciona (o PDF abre pra leitura).
   - Professor: Sala de Aula com **chat + Livraria + relógio** e o **módulo de aula abaixo**; chat
     minimizável sem bagunçar a ordem; Rascunhos minimizável.
   - Relógio: ponteiro andando, hora no centro, hoje destacado, "aula agora" realçada.
   - **Aula (PARTE D):** abrir "criar aula" mostra o **canvas vivo** (blocos + "/" + Studio), não um
     form; "/" gera Guia/Mapa/Podcast/etc.; existem blocos de **Vídeo-aula** e **Quiz**; botão de
     **enviar** pra turma; rascunhos colapsáveis. Não pode parecer formulário.
   - **Meus Estudos (PARTE E):** "Ouvir o estudo inteiro" mostra o karaokê **dentro do painel**
     (não como página/overlay por cima), igual à Sala de Pesquisa.
3. Git: branch `feat/onboarding-aula-lote4` + PR. Nunca `git add -A`.

# Arquivos prováveis
- `lib/onboarding/tour.ts`, `components/onboard/OnboardingGuide.tsx`,
  `components/sub/LoungeChatWidget.tsx` (A1–A5).
- `app/research-lab/DocumentDesktop.tsx` (drop de PDF, A5) + possivelmente `app/research-lab/page.tsx`.
- `components/sub/ClassesView.tsx` (B1, B2, C) + `app/workstation/student/StudyRoomContent.tsx`
  (render do professor, B1).
- **PARTE D (autoria de aula viva):** `components/study/MeusEstudosFeed.tsx` (parametrizar `mode`),
  `lib/study/slashMenu.ts`, `components/studio/StudioDock.tsx`/`StudioBlock.tsx`,
  `app/api/study/{spaces,items}/route.ts`, `app/api/studio/*`, models de Aula no
  `prisma/schema.prisma`; substitui o `components/aulas/AulaAuthoringPanel.*` (form pobre).
