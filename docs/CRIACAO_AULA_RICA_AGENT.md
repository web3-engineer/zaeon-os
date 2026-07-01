# Handoff CONSOLIDADO — Criação de aula RICA (motor do Studio aplicado a ENSINO)

> Para o **Claude Code**, em **um agente dedicado**. Este doc **funde e substitui** o que estava em
> `docs/AJUSTES_ONBOARDING_AULA_LOTE4.md` (PARTE D) e `docs/AJUSTES_STUDIO_AULAS_LOTE9.md` — leia só
> ESTE. Objetivo: a criação de aula do professor deixa de ser um form e vira um **ambiente
> generativo amplo** (o motor do Studio do "Meus Estudos") **adaptado pra ensinar**, com módulos
> interativos próprios. Branch própria (`feat/criacao-aula-rica`).

## Regras DURAS
- Branch + PR. **Nunca `git add -A`** (adicione só os arquivos que tocar). **Sem SSH no VPS.** Push
  direto na `main` trava (proxy ISP) → se travar, deixe o commit pronto e avise o Martinez.
- Sem segredos. macOS sem `python` (use `python3`). Ao fim: `npx tsc --noEmit` (só erros novos) e,
  se mexer no schema, `prisma generate` (monte objetos `data` em `const` separada — excess-property).
- **Incremental e por fase** (commits por fase, não big-bang). Faça as fases na ordem A→E.
- **Reusar, não reinventar.** Confirme cada trecho antes de editar (a base de código mudou).

## Por que / estado atual
Hoje a autoria de aula é `components/aulas/AulaAuthoringPanel.tsx`: um **form** (barra que manda um
comando → IA gera título+markdown+vídeo+quiz; editor de markdown; enviar/turma). Funciona, mas é
pobre. Queremos a riqueza do **Meus Estudos** (`components/study/MeusEstudosFeed.tsx`): canvas de
blocos + menu **"/"** (`lib/study/slashMenu.ts`) + **StudioDock** (`components/studio/StudioDock.tsx`
→ Podcast/Guia/Mapa/Linha do tempo/Flashcards/FAQ/Imagem/Vídeo, encaixando via `zaeon:study:embed`)
+ markdown + arrastar pra reordenar + drop de arquivo + ouvir por voz — **mas com chapéu de professor
e blocos de ensino**. Models já existem: `Aula/AulaQuiz/AulaQuestion` (com `type`, `options`,
`accepted`, `marks`, `order`); voz do aluno em `components/aulas/useVoiceAnswer.ts`; worker IA em
`/api/aulas/generate` + `lib/aulas/generateParse.ts`. Render do aluno: `StudentAulasModule.tsx`.

---

## FASE A — Canvas de aula = motor do Meus Estudos (modo "teach")
1. **Parametrizar `MeusEstudosFeed`** com `mode?: "study" | "teach"` (default "study"). No modo
   "teach": labels de professor ("Nova aula", "Aula sem título", "Comece a montar sua aula…"); o
   canvas, "/", StudioDock, markdown, drop e reordenar **idênticos** (herda tudo). Se misturar ficar
   arriscado, **extraia o motor** (canvas + "/" + Studio) num componente base e monte
   `MeusEstudosFeed` (estudo) e `AulaCanvas` (ensino) sobre ele — sem duplicar a lógica.
2. **Substituir** o `AulaAuthoringPanel` (form pobre) por esse canvas no ponto onde o professor abre
   "Aulas" (`app/workstation/student/StudyRoomContent.tsx` — render do prof; ver `ClassesView`/Lote
   da aba de aula). Manter o painel lateral de **rascunhos** (colapsável como a Biblioteca do Meus
   Estudos) + botão **ENVIAR** destacado.

## FASE B — Espaço de aula (dados) reusando a engine de blocos
- Reusar a engine de blocos do estudo (`/api/study/spaces` + `/api/study/items`, `placement`/`order`)
  para o **corpo da aula** (é o que dá o canvas vivo), amarrado ao registro **Aula** do LMS
  (`Aula/AulaQuiz/AulaQuestion`). Corpo = blocos (reusa StudyItem); metadados/quiz/entrega = models de
  Aula. **Não** criar engine de blocos nova. Se precisar separar por papel, um campo `kind:
  "study"|"aula"` no space + filtrar listagens (Meus Estudos não mostra aulas e vice-versa).

## FASE C — Os módulos summonáveis de AULA (o diferencial; via "/" e dock)
Registrar **TODOS** os tipos de bloco num **registro único** (`{ kind, label, icon, generate(),
render(), edit(), grade?() }`) pra o dock/"/" listarem dinâmico e dar pra somar novos sem refatorar.
Cada módulo: **gerável por IA OU criado/editado à mão**, **professor edita tudo**, **campo de PONTOS**
quando avaliável (entra na pontuação da Fase E). Estender `/api/aulas/generate` (ou criar
`/api/aulas/generate-block`) p/ gerar **um bloco** (reusa `lib/aulas/generateParse.ts`).

**Perguntas (4):**
- **🎤 Voz** (`q-voice`): IA **fala** o enunciado (`ttsController.speak`) e o aluno responde por voz
  em tempo real (`useVoiceAnswer` → transcrição). Enunciado do professor ou IA. (Já há `type:"voice"`.)
- **🔘 A/B/C/D** (`q-choice`, estilo ENEM): 3–5 alternativas, 1 correta + explicação. (Já há
  `type:"choice"` + `options[{text,isCorrect,explanation}]`.)
- **✍️ Escrita** (`q-written`): aluno **digita**; campo **bloqueia colar** (`onPaste`/`onDrop`/
  `onContextMenu` `preventDefault` + interceptar Ctrl/Cmd+V no `onKeyDown`). Honesto: barra colar
  casual, **não** é à prova de devtools (comentar isso). Flag `noPaste:true` sobre `type:"input"/"open"`.
- **🎯 Roleta** (`q-roulette`): pool de perguntas (mistura), **gira** e cai numa → aluno responde;
  N rodadas/pontos. Animação estética Zaeon.

**Interativos (5) — TAMBÉM agora:**
- **🧩 Lacunas** (`q-cloze`): texto com vãos; digita **ou arrasta** a palavra; IA gera, prof edita.
- **🃏 Cards de revisão** (`flashcards`): frente/verso; reusa o gerador de Flashcards do Studio;
  geralmente sem nota.
- **✋ Arrastar palavras** (`q-dragwords`): banco de palavras → vãos; **mecânica de arrastar é o
  destaque**.
- **🧠 Jogo da memória** (`game-memory`): pares (termo↔definição / imagem↔texto); gamificado.
- **🌿 Cenário ramificado** (`branching`): nós com escolhas que levam a caminhos
  (`{id,content,choices:[{label,nextId}]}` em JSON); editor de nós simples (lista + select de
  destino) antes de canvas visual; o mais trabalhoso.

**Mecânica de arrastar (drag):** reusar o que já existe (framer-motion `drag` no app + HTML5 DnD do
editor); padronizar um helper acessível (mouse **e** toque; teclado fallback: setas+Enter); snap
suave, feedback de acerto/erro, estética liquid-glass.

**Dock/“/”:** no modo teach, o `StudioDock` e `lib/study/slashMenu.ts` listam (a partir do registro):
**🎤 Voz · 🔘 A/B/C/D · ✍️ Escrita · 🎯 Roleta · 🧩 Lacunas · 🃏 Cards · ✋ Arrastar palavras ·
🧠 Memória · 🌿 Cenário** (além dos do Studio: Podcast/Guia/Mapa/Timeline/FAQ/Imagem/Vídeo). Cada um
insere o bloco no cursor (padrão `zaeon:studio:generate` → `zaeon:study:embed`), podendo chamar a IA.

## FASE D — Fluxo LMS contínuo (a "vibe" que substitui uma aula)
- A aula é uma sequência de blocos que o aluno percorre de cima a baixo: **vídeo indexado → texto
  abaixo → seção de perguntas/interativos → mais texto → …** (não um quiz só no fim).
- **Vídeo corretamente indexado:** bloco de vídeo (YouTube/upload) com texto logo abaixo; evolução =
  perguntas ancoradas em timestamp (começar simples: vídeo+texto+pergunta no fluxo).
- **Aluno** (`components/aulas/StudentAulasModule.tsx`): renderizar os blocos **em ordem (`order`)**
  intercalando perguntas/interativos no meio (hoje mostra vídeo+markdown+quiz no fim → evoluir).

## FASE E — Pontos antes de enviar + professor edita tudo
- Antes do **Enviar**, painel **"Pontuação da aula"**: lista cada item avaliável com seu **valor em
  pontos** (editável; default = `marks`), mostra **total**, exige definir. Alimenta a correção.
- **Correção:** `/api/aulas/[id]/submit` já calcula por `marks` — garantir que usa os pontos
  definidos e soma certo; voz/escrita/aberta sem gabarito automático → status **"a corrigir"**
  (manual), nunca 0 automático.
- **Editar tudo:** título, blocos, alternativas, corretas, ordem, pontos — antes de enviar (e,
  decisão do Martinez, opcionalmente depois). **Apagar** aula: `DELETE /api/aulas/[id]` já existe.

---

# Roadmap (NÃO neste PR — só mapear)
Vídeo interativo com perguntas em timestamp, Ordenar parágrafos, Marcar palavras, Hotspots na imagem,
Cruzadinha, Verdadeiro/Falso, Resumo automático.

# Verificação final
1. `npx tsc --noEmit` zero erros novos; `prisma generate` se mexer no schema.
2. Smoke (PR): abrir "criar aula" mostra o **canvas vivo** (não um form); "/" e dock geram
   Guia/Mapa/Podcast etc. **e** os 9 módulos de aula; cada avaliável tem **pontos**; passo de
   **pontuação** com total antes de enviar; no aluno o fluxo renderiza **vídeo→texto→perguntas** em
   ordem; escrita **não cola**; voz fala e grava; arrastar funciona no mouse e no toque;
   memória/roleta jogáveis; cenário ramificado navega; nota soma pelos pontos. **Se parecer
   formulário, está errado.**
3. Git: branch `feat/criacao-aula-rica` + PR. Nunca `git add -A`.

# Arquivos-chave
- `components/study/MeusEstudosFeed.tsx` (parametrizar `mode`) ou novo `AulaCanvas` + motor base.
- `lib/study/slashMenu.ts`, `components/studio/StudioDock.tsx`, `components/studio/StudioBlock.tsx`.
- `components/aulas/AulaAuthoringPanel.tsx` (substituir pelo canvas), `StudentAulasModule.tsx`
  (render do fluxo + módulos), `components/aulas/types.ts`, `components/aulas/useVoiceAnswer.ts`.
- `app/api/study/{spaces,items}/route.ts` (reuso), `app/api/aulas/generate/route.ts` +
  `lib/aulas/generateParse.ts` (geração por bloco), `app/api/aulas/[id]/submit/route.ts` (pontos),
  `app/workstation/student/StudyRoomContent.tsx` / `components/sub/ClassesView.tsx` (onde monta).
- `prisma/schema.prisma` (`AulaQuestion`: `noPaste`, roleta/pool, cenário JSON; `marks`/pontos).
