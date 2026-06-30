# Spec — Aula rica FATIA 2c: cenário ramificado (branching)

**Data:** 2026-06-29 · **Branch:** `feat/criacao-aula-rica-2c` (empilha em `feat/criacao-aula-rica-2b`)
**Status:** autorizado a prosseguir (sem gate). Continua [[aula-rica]] — fecha os 5 jogos.

## 1. Objetivo
🌿 **cenário ramificado** como bloco do canvas teach, ponta-a-ponta. Não avaliável (interativo). O aluno lê um nó, escolhe um caminho, navega até um nó terminal ("escolha sua aventura"). Editor de nós simples (lista + select de destino), não canvas visual.

## 2. Estado atual
- `AULA_BLOCKS`: `branching` (baseType `branching`, evaluable false) é o **único scaffold `ready:false`** restante. genHint: `config.nodes=[{id,content,choices:[{label,nextId}]}]`.
- `grade.ts`: tipos desconhecidos → `marksOutOf=0`. Sem mudança de correção. O render do aluno (fatia 2b) já **suprime** a faixa de nota p/ `flashcards`/`memory` — adicionar `branching`.
- POST `QT` (2b) inclui flashcards/memory; `stripConfig` repassa cards/pairs; precisa repassar `nodes`.

## 3. Metas / não-metas
**Metas:** branching completo (editor + IA + navegação do aluno); `ready:true`; persistência do tipo `branching`; sem nota. **Não-metas:** canvas visual de grafo (lista basta); ramificação avaliada/pontuada; fatia 3.

## 4. Dados (config Json)
`config = { nodes: { id: string; content: string; choices: { label: string; nextId: string }[] }[] }`.
- **Nó inicial** = `nodes[0]`. **Terminal** = nó sem `choices` (ou cujos destinos não existem). `nextId` referencia o `id` de outro nó.
- Sem gabarito escondido (navegação) → `stripConfig` repassa `nodes` direto.

## 5. Lógica pura — `lib/aulas/branching.ts`
- `startNodeId(nodes) → string | null` (= `nodes[0]?.id`).
- `findNode(nodes, id) → node | null`.
- `nextNodeId(nodes, currentId, choiceIdx) → string | null`: o `nextId` da escolha SE existir um nó com esse id; senão null (terminal). Robusto a id inválido.

## 6. Correção / submissão
Sem mudança em `grade.ts`. branching não envia resposta e não pontua. `QuestionView` suprime a faixa de nota (condição inclui `branching`).

## 7. Unidades
1. `lib/aulas/branching.ts` — `startNodeId`/`findNode`/`nextNodeId` (PURO, TDD).
2. `lib/aulas/generateParse.ts` — `buildQuestionBlock("branching")` normaliza `nodes` (filtra nós sem content; choices com nextId válido); null se 0 nós (TDD).
3. `app/api/aulas/route.ts` — `QT` += `branching`.
4. `app/api/aulas/[id]/route.ts` — `stripConfig` repassa `nodes`.
5. `components/aulas/AulaQuestionsPanel.tsx` — `blank("branching")` (1 nó inicial); `AuthQ.config` += `nodes`.
6. `components/aulas/types.ts` — `Question.type` += `branching`; `config` += `nodes`.
7. `components/aulas/QuestionEditor.tsx` — editor: lista de nós (content + choices {label, select de nextId}); add/remove nó e escolha; id de nó gerado.
8. `components/aulas/StudentAulasModule.tsx` — `BranchingPlay` (navega; botão recomeçar; suprime nota).
9. `lib/aulas/blockTypes.ts` — `ready:true` p/ branching (registro: 9 ready, 0 scaffold).

## 8. Testes / verificação
- `vitest`: `startNodeId`/`nextNodeId` (destino válido, inválido→null, terminal); `buildQuestionBlock` branching (normaliza/filtra; 0 nós→null); registro (9 ready, scaffold vazio).
- `tsc`: zero novos (baseline 5).
- Smoke: inserir 🌿 pelo "/" e dock; montar 2-3 nós com escolhas; gerar por IA; como aluno navegar pelas escolhas até o fim e recomeçar; não mostra nota.

## 9. Riscos
- Referências quebradas (nextId p/ nó apagado) → tratar como terminal (nav retorna null). Editor mostra os ids disponíveis no select.
- Loop infinito de nós é possível por design (o aluno escolhe) — ok; botão recomeçar sempre disponível.
