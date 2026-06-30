# Spec — Aula rica FATIA 3: pontuação + feedback por-lacuna (polish final)

**Data:** 2026-06-29 · **Branch:** `feat/criacao-aula-rica-3` (empilha em `feat/criacao-aula-rica-2c`)
**Status:** autorizado a prosseguir. Fecha [[aula-rica]].

## 1. Objetivo
Dois polimentos de valor real, fechando a tarefa:
- **3a — Painel "Pontuação da aula"** no envio: lista cada bloco de pergunta AVALIÁVEL do canvas com seus pontos (editável), mostra o **total**. (Phase E do handoff, na arquitetura nova de blocos.)
- **3b — Feedback por-lacuna**: cloze/dragwords mostram **verde/vermelho por lacuna** após enviar (não só a questão inteira).

**Diferido (YAGNI/risco):** fusão dos registros Studio+aula num só (o `AULA_BLOCKS` já é registro único dos blocos de aula; juntar com o registro de estudo é refactor sem feature). Render de bloco `studio` no aluno.

## 2. Estado atual
- Cada bloco de pergunta no canvas tem `marks` editável inline (`QuestionEditor`), mas **não há total consolidado** no envio. O `EVALUABLE_KINDS` (`lib/aulas/blockTypes`) distingue avaliáveis.
- Correção de cloze/dragwords (`grade.ts`) calcula só a questão inteira (`isCorrect`); `gradeBlanks` retorna `{correct,total}` sem o array por-lacuna. `WordDrag` **já aceita** `correct?: boolean[]` (pinta verde/vermelho), mas `FillBlanksView` não o passa (não recebe `graded`).
- `GradedAnswer` (grade.ts e types.ts) não tem campo por-lacuna.

## 3. Design

### 3a — Pontuação da aula (envio)
No `MeusEstudosFeed` (modal de envio), nova seção que lê o `feed`:
`evalBlocks = feed.filter(it => it.type === "aula-question" && EVALUABLE_KINDS.has(it.payload?.kind))`.
Renderiza, para cada um: rótulo (`aulaBlock(kind).label`) + input numérico de **pontos** (bind em `payload.marks`; onChange → `setItems` + `persist(it.id)`); e o **total** (soma dos `marks`). Editar ali reflete no bloco do canvas. (O `AulaQuestionsPanel` legado segue abaixo; jogos não avaliáveis não entram no total.)

### 3b — Feedback por-lacuna
- `gradeBlanks(answers, submitted)` passa a retornar `{ correct, total, perBlank: boolean[] }` (compat: campos extra).
- `grade.ts` (ramo cloze/dragwords): grava `blanksCorrect = perBlank` no `GradedAnswer`.
- `GradedAnswer` (grade.ts + `types.ts`) += `blanksCorrect?: boolean[]`.
- `QuestionView` passa `graded` ao `FillBlanksView`; este passa `correct={graded?.blanksCorrect}` ao `WordDrag` (que já pinta verde/vermelho quando `locked`).

## 4. Unidades
1. `lib/aulas/fillBlanks.ts` — `gradeBlanks` retorna `perBlank` (TDD: ajustar teste existente).
2. `lib/aulas/grade.ts` — grava `blanksCorrect` no graded (cloze/dragwords); `GradedAnswer += blanksCorrect`.
3. `components/aulas/types.ts` — `GradedAnswer += blanksCorrect?: boolean[]`.
4. `components/aulas/StudentAulasModule.tsx` — `FillBlanksView` recebe `graded` e passa `correct` ao `WordDrag`.
5. `components/study/MeusEstudosFeed.tsx` — seção "Pontuação da aula" no modal de envio (lista avaliáveis + total, editável).

## 5. Testes / verificação
- `vitest`: `gradeBlanks` agora retorna `perBlank` (atualizar asserts); `gradeSubmission` cloze grava `blanksCorrect` correto.
- `tsc`: zero novos (baseline 5).
- Smoke: montar aula com 2 perguntas avaliáveis + 1 jogo; no envio ver a lista de pontos + total (editar reflete); como aluno responder cloze parcialmente e ver **verde/vermelho por lacuna**.

## 6. Compatibilidade / riscos
- `gradeBlanks` retorno estendido (campo a mais) — só o teste do próprio muda. `blanksCorrect` opcional.
- Não quebrar o envio atual nem os outros tipos. Jogos não avaliáveis não entram no total.
