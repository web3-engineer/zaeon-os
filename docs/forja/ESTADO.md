# ESTADO · loop RALPH da Forja (`ralph-cursos.md`)

Memória durável entre iterações. Cada volta: lê isto → escolhe a próxima `a-fazer` (Fase A inteira antes
de B/C) → faz UMA → portão → commit no branch da fase → PR draft → marca aqui `feita`.

Branch E0 / prompts: `claude/forja-repo-curso` · PR draft **#791**.

## Fase A — o motor Forja

| id | tarefa | estado | branch / PR | notas |
|----|--------|--------|-------------|-------|
| E0 | fundação (`lib/forja/`: tipos, provedor, temperatura, curso) | **feita** | #791 | 6 testes verdes |
| A1 | E1 infra dos engines (`infra/forja-engine/`, padrão REA): Dockerfile (graphifyy py+uv; understand-anything node+pnpm), `bridge.mjs` (HTTP→engine, deny-list), `config/vetting` (versões pinadas + LICENSE), runbook Contabo | **a-fazer** | — | build/roda na box; aqui é scaffold + teste do bridge (node:test) |
| A2 | E2 adaptadores (`lib/forja/adaptadores/`): graph.json / `.ua` → `tipos`, puros, testados contra fixtures de saída real | a-fazer | — | depende de ver saída real (A1 na box) ou fixture |
| A3 | E3 board n8n: `studioKind` `forja` na Sala de Estudos (cards conectados + 🌡️), reusa o padrão `caderno` | a-fazer | — | — |
| A4 | E4 lições: codebox sem-colar, review, perguntas, teste, entrevista, leetcode; Zaeon examinadora (reusa `lib/guia`) | a-fazer | — | — |
| A5 | E5 Octa = casa do entregável + voz (useTTS → /api/ai/voice) | a-fazer | — | — |

## Fase B — cursos dos cards de prod (só depois de A)
| id | tarefa | estado |
|----|--------|--------|
| B0 | listar os cards estudáveis (`lib/estudos/vitrine` + `.claude/skills/*`) e enfileirar um por linha | a-fazer |
| B* | um card por iteração → versão estudável (curso/entregável) pela Forja | a-fazer |

## Fase C — 10 projetos OSS iniciantes (só depois de A)
| id | tarefa | estado |
|----|--------|--------|
| C0 | achar+verificar 10 repos reais, pequenos, licença permissiva (arquétipos no prompt) | a-fazer |
| C1..C10 | um projeto por iteração → curso + entregável publicável no GitHub via Octa | a-fazer |

## Bloqueios do dono (relatar, não girar à toa)
- A1/A2 precisam do **build na Contabo** (como o REA) pra saída real dos engines.
- Prod: o dono mergeia as PRs draft (deploy automático).

## Log
- it.1 — inicializado o ESTADO (esta tabela). Próxima: **A1**.
