# Spec — Aula rica FATIA 2b: flashcards + memória (jogos não avaliáveis)

**Data:** 2026-06-29
**Branch:** `feat/criacao-aula-rica-2b` (empilha sobre `feat/criacao-aula-rica-2a`)
**Status:** desenho aprovado. Aguardando revisão do spec.
**Contexto:** continua [[aula-rica]] — fatia 1 (blocos intercalados), 2a (cloze/dragwords + drag). 2b entrega os 2 jogos **não avaliáveis**.

## 1. Objetivo

Adicionar 🃏 **flashcards** (cards de revisão) e 🧠 **memória** (jogo da memória) como blocos do canvas teach, ponta-a-ponta (editor → IA → render do aluno). Ambos `evaluable:false`: puramente interativos, **não somam pontos** e **não mostram feedback de correção**.

## 2. Estado atual (verificado)

- `AULA_BLOCKS`: `flashcards` (baseType `flashcards`, evaluable false) e `game-memory` (baseType `memory`, evaluable false) são scaffold `ready:false`; genHints definidos (`config.cards=[{front,back}]`, `config.pairs=[{a,b}]`).
- `grade.ts`: tipos desconhecidos/sem gabarito caem no `else` → `marksOutOf=0` (não pontuam). Logo **nenhuma mudança de correção** é necessária.
- `components/studio/StudioArtifactViews.tsx`: já existe `FlipCard({front,back})` (animação de virar) — local (não exportado). `FlashcardsView` (exportado) o usa.
- `app/api/aulas/route.ts` POST: `QT` (fatia 2a) = choice/input/open/voice/roulette/cloze/dragwords → tipo fora disso vira `open`.
- `stripConfig` (GET detalhe): hoje devolve só `{pool,...}` (roleta) ou `{parts,bank}` (fill). Para outros configs, devolve `{}` → **dropa cards/pairs** (precisa repassar).
- `QuestionView` (aluno): a mensagem de "graded" (correta/incorreta/manual) renderiza para TODO tipo — precisa ser **suprimida** p/ flashcards/memória.

## 3. Metas e não-metas

**Metas:** flashcards e memória completos (editor + geração IA + render do aluno); `ready:true`; persistência dos tipos `flashcards`/`memory`; sem nota e sem feedback de correção.
**Não-metas:** cenário ramificado (2c); contar "completou o jogo" na nota; painel de pontuação (fatia 3).

## 4. Arquitetura

Ambos persistem como `AulaQuestion` (type `flashcards`/`memory`, dados em `config`); o bloco no canvas continua sendo `aula-question` (payload `AuthQ` com `kind` flashcards/game-memory). Sem gabarito escondido (o conteúdo É o material) → **sem sanitização** além de repassar `cards`/`pairs`.

**Dados** (`config` Json, sem migração):
- **flashcards** → `config = { cards: { front: string; back: string }[] }`.
- **memória** → `config = { pairs: { a: string; b: string }[] }`.

**Lógica pura (memória)** — `lib/aulas/memoryDeck.ts`:
- `type MemoryCard = { id: string; pairId: number; text: string }`.
- `buildMemoryDeck(pairs, seed) → MemoryCard[]`: cada par `i` vira 2 cartas (`pairId:i`, textos `a` e `b`), tudo embaralhado com `shuffleSeeded` (de fillBlanks). `id` estável = `${pairId}-${lado}`.
- `isMatch(a, b) → boolean`: `a.pairId === b.pairId && a.id !== b.id`.
- (flashcards não tem lógica pura — só virar.)

## 5. Correção / submissão

- **Sem alteração em `grade.ts`.** flashcards/memória não enviam resposta e não pontuam (`marksOutOf=0`).
- `QuestionView`: a faixa de feedback de correção (`graded`) é **suprimida** quando `q.type` é `flashcards`/`memory` (são interativos, não "respostas").
- Memória/flashcards **não** acrescentam nada ao payload de submit.

## 6. Sanitização (GET detalhe)

`stripConfig` ganha um repasse: se `config.cards` ou `config.pairs` existir, devolve `{ cards }` / `{ pairs }` direto (sem esconder — não há gabarito). Mantém o comportamento de roleta/fill.

## 7. Unidades (isoladas, testáveis)

1. `lib/aulas/memoryDeck.ts` — `buildMemoryDeck`, `isMatch` (PURO, TDD).
2. `lib/aulas/generateParse.ts` — `buildQuestionBlock` p/ `flashcards` (normaliza `cards`) e `game-memory` (normaliza `pairs`); null se vazio (TDD).
3. `app/api/aulas/route.ts` — `QT` aceita `flashcards`/`memory`.
4. `app/api/aulas/[id]/route.ts` — `stripConfig` repassa `cards`/`pairs`.
5. `components/aulas/AulaQuestionsPanel.tsx` — `blank()` p/ kinds `flashcards`/`game-memory`; alarga `AuthQ.config` (`cards`/`pairs`).
6. `components/aulas/types.ts` — `Question.type` += `flashcards`/`memory`; `config` += `cards`/`pairs`.
7. `components/studio/StudioArtifactViews.tsx` — **exportar** `FlipCard` (reuso).
8. `components/aulas/QuestionEditor.tsx` — editor de cards (lista front/back) e de pares (lista a/b).
9. `components/aulas/StudentAulasModule.tsx` — `FlashcardsPlay` (reusa `FlipCard`) + `MemoryGame` (grid flip-match sobre `buildMemoryDeck`); suprimir feedback de nota.
10. `lib/aulas/blockTypes.ts` — `ready:true` p/ `flashcards` e `game-memory`; atualizar testes de registro (8 ready, 1 scaffold).

## 8. Compatibilidade

- Aditivo: novos tipos não afetam os existentes nem aulas antigas. `config` Json já existe.
- A serialização/persistência da fatia 1 já carrega tudo via `config` do bloco `aula-question`.

## 9. Testes / verificação

- `vitest`: `buildMemoryDeck` (2 cartas por par, pairId correto, determinístico por seed, preserva textos), `isMatch`; `buildQuestionBlock` flashcards/memória (incl. vazio→null); testes de registro atualizados (8 ready).
- `tsc --noEmit`: zero novos (baseline 5).
- Smoke manual: inserir 🃏/🧠 pelo "/" e dock; editar; gerar por IA; como aluno virar os flashcards e jogar a memória (parear); enviar a aula — flashcards/memória **não** mostram nota nem alteram a %.

## 10. Riscos

- `MemoryGame` tem estado de flip (2 viradas → comparar → casar/desvirar) — manter o DECK puro/testado e o estado mínimo no componente.
- Não quebrar a faixa de feedback dos tipos avaliáveis ao suprimi-la p/ flashcards/memória (condição por `q.type`).
- Base/entrega: worktree sobre 2a; entrega via Git Trees API sobre `feat/criacao-aula-rica-2b` (proxy ISP) — ver [[aula-rica]].
