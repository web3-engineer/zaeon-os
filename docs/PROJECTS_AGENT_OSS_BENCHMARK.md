# Agente de Código (sala Projetos) — Benchmark OSS e features adotadas

Data: 2026-06-14 · Escopo: comparar o agente da sala **Projetos** com dois agentes
open source e adotar o que cabe no limite serverless da Vercel (funções ~10s, sem
daemon, estado no cliente).

## Repositórios comparados

| Repo | O que é | Stack |
|---|---|---|
| [bitloops/bitloops](https://github.com/bitloops/bitloops) | Camada de **memória e contexto** para agentes de código: memória do repo, retrieval direcionado, **raciocínio ligado a commits**, observabilidade local. Não é um agente — é a camada de inteligência embaixo. | Rust (CLI/daemon) |
| [AvivK5498/Golem](https://github.com/AvivK5498/Golem) | Plataforma **multi-agente** self-hosted. Para nós, o valor está nos **guardrails**: working memory, rate-limit de tool calls, stale-response detection, tool-error gate, task tracking no contexto, approval para ops destrutivas. | TypeScript (Mastra + Vercel AI SDK) |

## Por que não dá para "instalar" nenhum dos dois

Ambos exigem processo vivo: Bitloops é um daemon/CLI Rust local; Golem roda um
backend Node persistente (porta 3847) + SQLite + Telegram. A Vercel é serverless
(função efêmera, ~10s). Então a estratégia foi **extrair os conceitos** e
re-implementá-los client-side, dentro do nosso orquestrador já existente.

## Mapa: o que cada repo tem × o que o nosso agente já tinha × o que foi adicionado

| Capacidade | Origem | Antes | Agora |
|---|---|---|---|
| Plan→build arquivo-a-arquivo→rodar→autocorrigir | (nosso) | ✅ | ✅ |
| Execução no navegador (HTML/JS/Python) + feedback de erro | (nosso) | ✅ | ✅ |
| CRUD GitHub + PR + Vercel import (conta do aluno) | (nosso) | ✅ | ✅ |
| **Memória de projeto** (persiste + injeta + apaga) | Golem + Bitloops | ❌ | ✅ |
| **Guardrails** (teto de chamadas, gate de falhas, anti-stale) | Golem | parcial | ✅ |
| **Checklist viva** (pending/doing/done por arquivo) | Golem | ❌ | ✅ |
| **Raciocínio no commit/PR** (o "porquê" no histórico) | Bitloops | ❌ | ✅ |

## Features adotadas (todas dentro do limite Vercel)

### 1. Memória de projeto (Golem working memory + Bitloops repo memory)
- `ProjectSnapshot.memory` (string, teto `MEMORY_MAX = 2000`) e `tasks[]` — persistidos
  por projeto no `localStorage`.
- Durante o build, `runProject` acumula decisões num buffer local (`remember()`):
  objetivo, stack/entry, plano, arquivos criados/faltantes. Ao fim, `setMemory()`.
- Injetada no contexto de toda chamada: `agentCall` manda `context: "MEMÓRIA DO
  PROJETO:\n…"` e o chat por-arquivo (`send`) também. Reduz retrabalho e deriva.
- **Apagável** — `clearMemory()` (botão de borracha no topo do painel Agente). É a
  "lógica de apagar de memória": zera memória + checklist sem tocar nos arquivos.

### 2. Guardrails de execução (Golem)
- **Anti-loop:** `agentCall` tem teto `MAX_CALLS = 26` por run; ao estourar, marca
  `aborted` e o loop para com aviso claro.
- **Gate de falhas consecutivas:** 3 arquivos seguidos falhando pausa o build (não
  fica rodando à toa).
- **Anti-stale:** `genOne` rejeita conteúdo vazio ou idêntico a outro arquivo / à
  tentativa anterior e re-tenta com um "nudge" pedindo conteúdo novo.

### 3. Checklist viva (Golem task-tracking)
- `tasks[]` com estado `pending → doing → done | failed` por arquivo planejado.
- Render fixo no topo do painel Agente (contador X/Y) e o que "falta criar" entra no
  contexto do `genfile`.

### 4. Raciocínio ligado ao commit (Bitloops git-linked reasoning)
- `buildReasoning()` monta objetivo + memória do agente e entra no **corpo** do commit
  (`publishWorkspace`, `commitDirty` — mensagem multilinha) e no **body do PR**
  (`open_pr` aceita `body`). O histórico do Git passa a explicar o "porquê", não só o "o quê".

## Verificação (auditoria de portas/botões/conectores/memória)

- Todos os `onClick` da UI têm handler definido; rotas `/api/projects/*` presentes
  (agent, deploy, github, github/connect|callback|disconnect|setup).
- Memória: persistida (hydrate/save), injetada (runProject + send) e apagável (clearMemory) — OK.
- Sintaxe: `transpileModule` limpo. `next build` compila sem erro (não conclui só no
  sandbox de 45s; roda no Mac/Vercel). `tsconfig` é `strict` mas sem `noUnusedLocals`.
- **Código dormente** (definido, não plugado — sem efeito em runtime): `deployToVercel`
  (substituído por `openVercelImport`, deploy na conta do aluno) e
  `openPreviewInNewTab`/`previewActiveHtml` (prévia foi removida). Candidatos a remoção futura.

## Não adotado (e por quê)
- **Observabilidade/daemon do Bitloops, Telegram/job-queue/sub-agentes do Golem:** exigem
  processo persistente → fora do serverless da Vercel. Caminho natural quando entrar o
  executor remoto (VPS).
- **Retrieval semântico (embeddings) do Bitloops:** é o "RAG na barra" já previsto; fica
  para depois, quando houver índice persistente.
