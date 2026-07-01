# Handoff LOTE 9 (capstone) — "Studio de Aulas": módulos interativos + fluxo LMS + pontuação

> Para o **Claude Code**. Branch própria (`feat/studio-aulas`). **Depende** do Lote 4 PARTE D
> (autoria de aula = canvas vivo do Meus Estudos) e conversa com o Lote 8 (lista de aulas). Se o
> Lote 4 D ainda não foi feito, faça-o primeiro (ou junto) — este lote ADICIONA módulos de aula ao
> canvas. **Rebase com a main antes.** Confirme cada trecho antes de editar.

## Regras DURAS
- Branch + PR. Nunca `git add -A`. Push trava (proxy ISP) → deixe commit pronto e avise o Martinez.
- Sem segredos, sem SSH. macOS sem `python` (use `python3`). `npx tsc --noEmit` no fim; só erros novos.
- **Reusar o motor existente** (não reinventar): canvas de blocos + menu "/" (`lib/study/slashMenu.ts`)
  + `components/studio/StudioDock.tsx`/`StudioBlock.tsx` + worker `/api/aulas/generate`
  (`lib/aulas/generateParse.ts`) + models `Aula/AulaQuiz/AulaQuestion` (já têm `type`, `options`,
  `accepted`, `marks`, `order`) + `components/aulas/useVoiceAnswer.ts` (grava+transcreve voz).

## Visão (a "vibe LMS")
A aula é um **fluxo contínuo de blocos** que o aluno percorre de cima a baixo e que poderia
**substituir uma aula**: **vídeo indexado → texto embaixo → seção de perguntas → mais texto → …**.
O professor **summona** cada bloco pelo "/" ou pelo dock do Studio, **a IA gera ou co-cria**, e o
**professor edita tudo**. Antes de enviar, define **quantos pontos** cada item avaliável vale.
Referência de tipos interativos: **H5P** (Speak the Words, Multiple Choice, Essay/Fill-in-the-Blanks,
Question Set, Interactive Video) — ver Fontes no fim.

---

## 1. Estrutura: blocos de aula no canvas (reusar StudyItem/blocos do Lote 4 D)
A aula = blocos ordenados (mesmo motor do Meus Estudos). Tipos de bloco:
- `text` / `heading` / `subheading` (já existem)
- `video` (vídeo indexado — item 3)
- módulos do Studio (podcast, guia, mapa, etc. — já existem)
- **NOVOS — blocos de PERGUNTA** (item 2): `q-voice`, `q-choice`, `q-written`, `q-roulette`.
Cada bloco de pergunta carrega: enunciado, config própria, **`points` (pontos)**, e flag de origem
(gerado pela IA / manual). Persistir como `AulaQuestion` (estender `type`) **ou** como bloco no
conteúdo da aula com referência — escolha a via que mantém o **fluxo inline** (pergunta no meio do
conteúdo, não só num quiz no fim). Recomendado: cada pergunta é um `AulaQuestion` com um campo
`order` que a posiciona no fluxo junto dos blocos de texto/vídeo (render unificado por `order`).

## 2. Os 4 módulos de pergunta (cada um: gerar por IA OU criar/editar manual; campo de PONTOS)
Adicionar ao menu "/" e ao dock do Studio (na autoria de aula) as opções abaixo. Em todas, o
professor pode **editar tudo** (enunciado, alternativas, resposta certa, pontos).

### 2a. Pergunta por VOZ (`q-voice`) — tempo real
- A IA **fala** o enunciado (TTS via `ttsController.speak`) e o aluno **responde por voz**
  (`useVoiceAnswer`: grava → `/api/aulas/audio` → transcript). Avaliação pela transcrição
  (comparar com `accepted`/rubrica; aberta = avaliação manual).
- Enunciado: digitado pelo professor **ou** gerado pela IA; botão "🔊 falar" pra pré-ouvir.
- (H5P: *Speak the Words*.) Já existe `type:"voice"` no modelo + `useVoiceAnswer` no aluno — só
  faltam o **enunciado falado** e a UI de autoria.

### 2b. Pergunta CLÁSSICA A/B/C/D (`q-choice`) — estilo ENEM
- Alternativas (3–5), **1 correta**, com **explicação** por alternativa. Professor co-cria ou IA
  gera. (Já existe `type:"choice"` + `options[{text,isCorrect,explanation}]`.)
- UI de autoria: adicionar/remover alternativas, marcar a correta, editar explicação, pontos.

### 2c. Pergunta ESCRITA (`q-written`) — proibido colar
- Aluno **digita** a resposta. O campo **bloqueia colar**: `onPaste`/`onDrop`/`onContextMenu`
  `preventDefault()` + interceptar `Ctrl/Cmd+V` no `onKeyDown`. (Honestidade: barra colar casual,
  **não** é à prova de devtools — deixar claro no código/comentário.)
- Resposta avaliada por `accepted` (lista) ou aberta (manual). (H5P: *Essay / Fill in the Blanks*.)
- Reusar `type:"input"`/`"open"` + uma flag `noPaste: true`.

### 2d. ROLETA de perguntas (`q-roulette`) — gamificada (mais trabalhosa)
- Um **pool** de perguntas (mistura dos tipos acima); na hora, **gira** e cai numa → o aluno
  responde a que parou; pode rodar N vezes/somar pontos. (Inspiração: *Question Set* + roleta.)
- Autoria: montar o pool (reusa os editores 2a–2c), definir nº de rodadas e pontos por acerto.
- Render no aluno: animação de roleta (estética Zaeon) → revela a pergunta → responde → próxima.

## 3. Fluxo LMS contínuo (o diferencial)
- **Vídeo corretamente indexado:** bloco de vídeo (YouTube/upload) com **texto logo abaixo**; ideal
  permitir **perguntas ancoradas em timestamp** (vídeo interativo — começar simples: vídeo + texto +
  pergunta no fluxo; timestamp como evolução). (H5P: *Interactive Video*.)
- **Seções de Perguntas & Respostas** intercaladas com o conteúdo (não só um quiz no fim).
- O **aluno** (`components/aulas/StudentAulasModule.tsx`) renderiza os blocos **em ordem** (texto,
  vídeo, perguntas) como um fluxo único, respondendo conforme desce. Hoje ele já mostra vídeo +
  markdown + quiz no fim → evoluir pra **render por `order`** intercalando perguntas no meio.

## 4. PONTUAÇÃO antes de enviar (essencial pra correção)
- Antes do **Enviar**, um passo/painel **"Pontuação da aula"**: lista cada item avaliável (cada
  pergunta) com seu **valor em pontos** (editável), mostra o **total** e permite ajustar. O professor
  **tem que** definir os pontos (default sugerido = `marks` atual, ex.: 1). 
- A correção do aluno usa esses pontos: a rota de submit (`/api/aulas/[id]/submit`) já calcula
  `percentage`/`graded` por `marks` — garantir que usa os **pontos definidos** e some certo
  (incluindo voz/escrita com avaliação manual → status "a corrigir" em vez de 0 automático).
- **Professor edita tudo**: enunciados, alternativas, corretas, pontos, ordem dos blocos, antes e
  (idealmente) depois de enviar (ou ao menos antes; editar pós-envio é decisão do Martinez).

## 5. Onde plugar no Studio/“/”
- `components/studio/StudioDock.tsx`: no contexto de **aula** (modo teach do Lote 4 D), adicionar
  uma fileira de ações de aula: **🎤 Voz · 🔘 A/B/C/D · ✍️ Escrita · 🎯 Roleta · 🧩 Lacunas ·
  🃏 Cards · ✋ Arrastar palavras · 🧠 Memória · 🌿 Cenário ramificado**. Cada ação insere o bloco no
  cursor (mesmo padrão `zaeon:studio:generate` → `zaeon:study:embed`), podendo chamar a IA pra gerar
  o conteúdo inicial. (Listar a partir do **registro de tipos** — item 6 — pra não hardcodar.)
- `lib/study/slashMenu.ts`: adicionar as mesmas opções no menu "/".
- Worker IA: estender `/api/aulas/generate` (ou criar `/api/aulas/generate-block`) pra gerar **um
  bloco específico** (ex.: "gera 1 pergunta ABCD sobre X") além da aula inteira. Reusar
  `lib/aulas/generateParse.ts` (parse tolerante + retry + validação).

## 6. Módulos interativos — TAMBÉM AGORA (não é roadmap, entram neste lote)
Mais 5 blocos de aula, todos: **summonáveis pelo "/" e pelo dock**, **geráveis por IA OU
criados/editados à mão**, **professor edita tudo**, e com **pontos** quando avaliáveis (entram na
pontuação do item 4). (Inspiração H5P — ver Fontes.)

> **Mecânica de arrastar (drag) — reusar o que já existe:** o app já usa **framer-motion `drag`**
> (ex.: `ClassesView`, blocos do caderno) e **HTML5 drag-and-drop** (drop de citação/arquivo no
> editor). Padronize um helper de DnD acessível (mouse **e** toque; teclado como fallback — setas +
> Enter) e reuse nos módulos abaixo. Estética Zaeon (peças "liquid glass", snap suave, feedback de
> acerto/erro).

### 6a. Completar lacunas (`q-cloze`) — fill-in-the-blanks
- Texto com lacunas; o autor marca as palavras a esconder (sintaxe simples, ex.: `*palavra*`); o
  aluno **digita** OU **arrasta** a palavra certa pro vão. IA gera o texto+lacunas a partir de um
  tema; professor edita. Avaliação por palavra (lista de aceitas, case/acentos tolerantes). Pontos
  por lacuna ou pelo bloco. (H5P: *Fill in the Blanks*.)

### 6b. Cards de revisão (`flashcards`) — flashcards / dialog cards
- Conjunto de cartões frente/verso (pergunta↔resposta); o aluno vira/percorre. IA gera os cartões de
  um tema; professor edita/adiciona. Reusar o que já existe de flashcards no **Studio do Meus
  Estudos** (o dock já gera "Flashcards") — aqui é a versão **de aula** (no fluxo). Em geral **não
  pontua** (revisão); se quiser, modo "auto-avaliação" sem nota. 

### 6c. Arrastar palavras (`q-dragwords`) — drag the words
- Banco de palavras + frases com vãos; o aluno **arrasta** cada palavra pro lugar certo. IA gera;
  professor edita. Avaliação por posição correta; pontos por acerto. **Mecânica de arrastar é o
  destaque** — caprichar no DnD (snap, devolver ao banco, multi-toque). (H5P: *Drag the Words*.)

### 6d. Jogo da memória (`game-memory`) — memory game
- Grade de pares (texto↔texto, ou termo↔definição, ou imagem↔texto); o aluno vira e acha os pares.
  IA gera os pares de um tema; professor edita. Pontua por pares/tempo (opcional). Gamificado,
  estética Zaeon. (H5P: *Memory Game*.)

### 6e. Cenário ramificado (`branching`) — branching scenario (avançado)
- Conteúdo + **escolhas** que levam a caminhos diferentes (nós ligados): "se escolher A → nó X; B →
  nó Y". O aluno navega decisões; ótimo pra casos/simulações. IA propõe um esqueleto de ramos de um
  tema; professor edita o grafo (nós + opções + destinos). Modelo: uma árvore/grafo de nós
  (`{id, content, choices:[{label, nextId}]}`); guardar como JSON no bloco. Pontuação opcional por
  caminho/decisão. **É o mais trabalhoso** — fazer um editor de nós simples (lista de nós + ligação
  por select de destino) antes de qualquer canvas visual fancy. (H5P: *Branching Scenario*.)

> **Arquitetura:** registre TODOS os tipos de bloco (perguntas 2a–2d + interativos 6a–6e) num
> **registro único de tipos** (`{ kind, label, icon, generate(), render(), edit(), grade?() }`) pra
> o dock/"/" listarem dinamicamente e dar pra somar novos sem refatorar.

### Roadmap (ficam pra depois — só mapear no PR)
Vídeo interativo com perguntas em timestamp, Ordenar parágrafos, Marcar palavras, Hotspots na
imagem, Cruzadinha, Verdadeiro/Falso, Resumo automático.

---

# Verificação final
1. `npx tsc --noEmit` — zero erros novos. `prisma generate` se mexer no schema (monte `data` em
   `const` separada — excess-property check).
2. Smoke (PR): na autoria de aula, summonar pelo "/" e pelo dock os **9 módulos** (4 perguntas +
   lacunas, cards, arrastar palavras, memória, cenário ramificado); gerar por IA e editar manual;
   campo de **pontos** nos avaliáveis; passo de **pontuação** antes de enviar com total; no aluno, o
   fluxo renderiza **vídeo → texto → perguntas/interativos** em ordem; pergunta escrita **não cola**
   (Ctrl+V/menu/drop bloqueados); pergunta por voz fala e grava; **arrastar** funciona no mouse e no
   toque; memória/roleta jogáveis; cenário ramificado navega os nós; a nota soma pelos pontos.
3. Git: branch `feat/studio-aulas` + PR. Nunca `git add -A`.

# Arquivos prováveis
- `components/studio/StudioDock.tsx` + `lib/study/slashMenu.ts` (ações de aula no dock e no "/").
- `components/aulas/AulaAuthoringPanel.tsx` (ou o canvas do Lote 4 D) — editores dos 4 módulos +
  passo de pontuação + editar tudo.
- `components/aulas/StudentAulasModule.tsx` — render do fluxo contínuo por `order`; campo escrito
  anti-paste; player de pergunta por voz; roleta.
- `app/api/aulas/generate/route.ts` (+ `lib/aulas/generateParse.ts`) — geração por bloco.
- `app/api/aulas/[id]/submit/route.ts` — correção por pontos (voz/escrita → manual).
- `prisma/schema.prisma` (`AulaQuestion`: flag `noPaste`, roleta/pool se preciso; `points`/`marks`).
- `components/aulas/types.ts`.

# Fontes (referência de tipos interativos)
- [Examples and Downloads | H5P](https://h5p.org/content-types-and-applications)
- [H5P Content Types & Examples — Fanshawe OER](https://ecampusontario.pressbooks.pub/oerdevelopmentguide/chapter/h5p-content-types-examples/)
- [Branching Scenario | H5P](https://h5p.org/branching-scenario)
- [Interactive Video | H5P (City, University of London)](https://city-uk-ett.libguides.com/staff/moodle/h5p/ungraded/interactive-video)
