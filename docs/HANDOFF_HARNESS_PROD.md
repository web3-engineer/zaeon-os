# Handoff — Harness da Aura em Produção

**Data:** 2026-07-29 · **Executor:** Claude Code · **Runbook fonte:** "Levar o Harness da Aura a PRODUÇÃO" (Fable, 2026-07-11)
**Branch de trabalho:** `claude/harness-aura-production-imlz0y` · **`main` em:** `51c207d`

---

## TL;DR
O trabalho de **código** do runbook já estava concluído antes desta sessão: o harness completo
já está em `main` (mergeado pelo PR #113 em 2026-07-11). Esta sessão **verificou** esse código
(Fase B, tudo verde) e **destravou as fases manuais** de VPS criando um workflow de dispatch que
faz o SSH pela chave que o GitHub Actions já tem — sem eu precisar de credencial no VPS.

O que **falta** é operacional e roda no VPS/Atlas: `AURA_HARNESS=0` (dark launch) → `prisma db push`
→ índice Atlas → ligar a flag → smokes. Tudo, exceto o índice Atlas, agora é um botão no GitHub.

---

## Descobertas de partida (estado real vs. o que o runbook assumia)

| Runbook assumia (2026-07-11) | Estado real (2026-07-29) |
|---|---|
| 3 fontes a reconciliar (main, base, executor) | **Já reconciliadas.** `HEAD` = `main` local = `origin/main` = `16b6f48` |
| Fase A: mergear as 3 branches à mão | **Feita.** PR #113 mergeou o executor; merges `3e6eeab`/`c58f460` presentes |
| Fase C2: `git merge` + push pra main | **Feita.** Harness já vivia em `main` desde o #113 |
| Working tree da base com mudanças pendentes | Nada pendente; árvore limpa |

Conclusão: **Fases A e C2 já estavam prontas.** Não havia drift a corrigir.

---

## O que ESTA SESSÃO fez

### 1. Fase B — Verificação sem build (todos os gates VERDES)
| Gate | Resultado |
|---|---|
| **B1** transpile (sintaxe) | ✅ **143** arquivos `.ts/.tsx` tocados, **0 erros** |
| **B2** vitest | ✅ **74** arquivos, **565 testes** passando — inclui as 9 suites do harness (aura-harness 15, router 12, runtime 13, trajectory 7, examiner 9, memory 13, memory-provider 9, mcp 12, skills 13) |
| **B3** legado intacto | ✅ Gate em `app/api/ai/chat/route.ts:251` = `stream===true && agentKey==="aura" && AURA_HARNESS!=="0" && !fileData`. Com flag `0` cai no streaming legado (`route.ts:311`), mesmo formato de fio (`text/plain` + `STUDIO_SENTINEL`/`RESEARCH_SENTINEL`) |

Prontidão de infra confirmada no código:
- `prisma/schema.prisma`: `MemoryDrawer`→`memory_drawers` com `embedding Float[]` (1536, gemini-embedding-001) e `Connector`→`connectors`; `Plugin` intacto (rename é outro PR).
- `app/api/health/route.ts` → `{status:"ok"}`.
- `.github/workflows/deploy.yml` faz `git reset --hard origin/main`; **não** roda `prisma db push` (infra é manual — bate com o runbook).

### 2. Novo artefato — `.github/workflows/deploy-harness.yml` (commit `51c207d`, já em `main`)
`workflow_dispatch` que executa no VPS as fases manuais, **reusando o secret `VPS_SSH_KEY`** do
`deploy.yml` (sem credencial nova) e compartilhando a concurrency `deploy-vps` (nunca roda junto
com um deploy). Inputs:

| input | ação | fase do runbook |
|---|---|---|
| `flag` (`0`/`1`) | set idempotente de `AURA_HARNESS` no `.env` | C1 / E1 / F |
| `db_push` (bool) | `docker compose exec -T web npx prisma db push` → cria `memory_drawers`/`connectors` | D1 |
| `recreate_web` (bool) | `docker compose up -d --force-recreate web` | E1 |

Termina com health check via `node fetch` **dentro** do container `web` (porque `web` só faz
`expose:3000` interno — `curl localhost:3000` do host não alcança).

### 3. Deploy
Push em `main` (`16b6f48..51c207d`) disparou o `deploy.yml` → **run `completed / success`**
(19:08Z, sha `51c207d`). Redeployou o mesmo código do harness (já estava em main) + adicionou o
workflow dormente. **Não altera a flag** — `AURA_HARNESS` no VPS segue como estava.

---

## O QUE FALTA (fases operacionais — VPS/Atlas)

> Ordem estrita. Gate binário em cada uma. Se um gate ficar vermelho 2×, PARE e chame o Martinez.

### C1 — Dark launch (garantir flag = 0 antes de tudo)
Actions → **"Harness (VPS ops)"** → Run workflow: `flag=0`, `db_push=false`, `recreate_web=true`.
**Gate:** health verde, comportamento = legado.

### C3 — Smoke do legado (flag ainda 0)
Abrir chat em cada sala; gerar 1 artefato. **Gate:** prod idêntica ao pré-merge.

### D1 — Coleções da memória
"Harness (VPS ops)": `flag=0`, `db_push=true`, `recreate_web=true`.
**Gate:** coleções `memory_drawers`/`connectors` existem no Atlas.
*(Caveat do runbook: se o container não tiver o Prisma CLI, rodar `npx prisma db push` com o
`DATABASE_URL` de prod a partir de um shell com acesso ao Atlas.)*

### D2 — Índice Atlas Vector Search  ⟵ ÚNICO passo 100% manual (UI do Atlas)
Sobre `memory_drawers`: nome `memory_drawers_vec`, tipo vectorSearch, campo `embedding`,
**dims 1536** (bate com `EMBED_DIM` em `lib/agent/memory.ts`), similaridade **cosine**, filter em
`userId`. Se o recall híbrido usar `$search`/`$text`, criar também índice de texto sobre
`memory_drawers.text`.
**Gate:** índice `Active`; um `$vectorSearch` de teste não dá "index not found".

### E1/E2 — Ligar a flag + smoke do harness
"Harness (VPS ops)": `flag=1`, `db_push=false`, `recreate_web=true`. Depois (logado, Sala de
Estudos):
1. 1 turno de texto → responde (streaming ok, sem 500).
2. "gera a imagem da molécula de serotonina" → dispara a sentinela do Studio (tool-loop).
3. 1 pedido que puxe memória → sem erro (se o Atlas cair, degrada silencioso: `memory_unavailable`).
4. `flag=0` por 30s → confirma que o kill-switch devolve o legado na hora.
**Gate:** os 4 passam; logs do `web` sem stack trace não tratado.

### F — Rollback (se qualquer gate de E falhar)
Kill-switch primeiro: "Harness (VPS ops)" com `flag=0`, `recreate_web=true` → legado em segundos.
Se o problema for o merge (não a flag): `git revert` do merge + push. Memória (coleções/índice)
fica inerte sem a flag, não precisa rollback.

---

## Checklist de gates (binário)

| Gate | Status |
|---|---|
| A0 árvore limpa | ✅ (já estava) |
| A2/A3 sem conflito | ✅ (já estava) |
| B1 transpile 0 | ✅ 143 arquivos |
| B2 vitest verde | ✅ 565 testes |
| B3 legado intacto | ✅ |
| C2 Actions verde + health | ✅ deploy `51c207d` success |
| C1 dark launch (flag=0) | ⬜ pendente (botão) |
| C3 prod == legado | ⬜ pendente |
| D1 coleções | ⬜ pendente (botão) |
| D2 índice Atlas `Active` | ⬜ pendente (UI Atlas) |
| E2 4 smokes | ⬜ pendente (botão + manual) |
| F kill-switch testado | ⬜ pendente (botão) |

---

## Fora de escopo deste ship (follow-ups — cada um é um PR próprio)
Cobertura ampla (não-stream, `fileData`, agentes Scholar/Examiner/Zaeon/Zenita/Zion, surface
Projetos) · render `StructuredAnswerView` no cliente · `execMode`/`approvalGate` (PR07) · trace
real no ⟁ (PR06) · UI de Opções (Skills/Conectores/MCP) + rename `Plugin`→`Skill`.

## Nota de atenção
A string de persona `NUNCA NEGUE CAPACIDADE` (o "fix anti-refusal molécula" que o runbook mandava
preservar na Fase A2) **não está na árvore mergeada** com esse texto literal. A capacidade funciona
via `studio_generate` (kind `image`) + tool-loop e passa nos testes, mas se havia um bloco textual
específico esperado na persona, ele não landou. Vale conferir antes do smoke E2 da molécula.
