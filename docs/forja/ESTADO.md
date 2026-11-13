# ESTADO · loop RALPH da Forja (`ralph-cursos.md`)

Memória durável entre iterações. Cada volta: lê isto → escolhe a próxima `a-fazer` (Fase A inteira antes
de B/C) → faz UMA → portão → commit no branch da fase → PR draft → marca aqui `feita`.

Branch E0 / prompts: `claude/forja-repo-curso` · PR draft **#791**.

## Fase A — o motor Forja

| id | tarefa | estado | branch / PR | notas |
|----|--------|--------|-------------|-------|
| E0 | fundação (`lib/forja/`: tipos, provedor, temperatura, curso) | **feita** | #791 | 6 testes verdes |
| A1 | E1 infra dos engines (`infra/forja-engine/`, padrão REA): Dockerfile (graphifyy py+uv; understand-anything node+pnpm), `bridge.mjs` (HTTP→engine, allowlist), `config/vetting` (versões pinadas + LICENSE), runbook Contabo | **feita** | #791 | scaffold + 9 testes node:test (vetting puro) no CI; build real na Contabo (bloqueio do dono) |
| A2 | E2 adaptadores (`lib/forja/adaptadores/`): graph.json / `.ua` → `tipos`, puros, testados contra fixtures de saída real | **a-fazer (próxima)** | — | depende de ver saída real (A1 na box) ou fixture; posso começar com fixture mínima do shape documentado |
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
- it.2 — **A1 feita**: `infra/forja-engine/` (padrão REA). Achado real via web: Graphify = `uv tool install graphifyy`,
  branch `v8`, `graphify extract --no-viz` → `graphify-out/graph.json`, licença Apache-2.0/MIT. Understand-Anything =
  **plugin do Claude Code** (sem CLI próprio), `/understand` → `.ua/knowledge-graph.json`, MIT. Ponte com allowlist
  fechada de 2 engines, clone só de host permitido, filtro de args; lógica pura em `vetting.mjs` + 9 testes node:test
  (no CI, passo próprio). Dockerfile/compose (só Tailscale, porta 8800) + `RUNBOOK-FORJA-ENGINE.md`. Build real e sha
  pinado ficam pro dono na Contabo. Injeção de prompt no README do upstream (marcador em PR) detectada e ignorada.
  Próxima: **A2** (adaptadores; posso abrir com fixture do shape documentado enquanto a saída real não vem da box).
