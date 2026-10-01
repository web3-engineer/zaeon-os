# Agentes em background — Sala de Pesquisa (fila + worker)

Objetivo: **sair da sala e o agente continua trabalhando.** Antes, a pesquisa rodava
dentro do stream da requisição — se o usuário saísse, o Next abortava o handler e a
pesquisa morria (a sessão ficava presa em `running` para sempre). Agora o trabalho roda
num **worker de fundo** (BullMQ sobre Redis) e o `ScholarSession` no banco é a fonte da
verdade: o cliente reconecta pollando a sessão.

## Arquitetura

```
POST /api/ai/scholar ──(SCHOLAR_BG=1)──▶ cria ScholarSession(status=queued)
        │                                 enfileira job na fila "scholar" (Redis)
        └────────────────────────────────▶ responde { sessionId } na hora (202)

worker (SCHOLAR_WORKER=1, instrumentation.ts) ──▶ consome a fila
        └─ runScholarPipeline(): plan → search → full-text → synthesize → verify
           grava cada fase em ScholarSession.thread.events e o resultado final
           (status=done, references/results/insights…)

cliente (OmegaScholarContext) ──▶ polla /scholar/sessions?id= a cada 1.5s
        └─ renderiza thread.events como fases; ao done, carrega a sessão.
           Sair e voltar reengata pelo mesmo poll (resume no mount).
```

Peças novas/alteradas:
- `lib/scholar/pipeline.ts` — pipeline extraído da rota (roda inline OU no worker).
- `lib/queue/scholar.ts` — fila BullMQ + `enqueueScholarJob` (no-op sem `REDIS_URL`).
- `instrumentation.ts` — sobe o Worker quando `SCHOLAR_WORKER=1`.
- `app/api/ai/scholar/route.ts` — enfileira (bg) ou roda inline (fallback).
- `app/workstation/student/omega/OmegaScholarContext.tsx` — detecta `{sessionId}` e
  polla; resume ao voltar (agora aceita `queued` e tetos de 10 min).
- `docker-compose.beta.yml` — `web` (SCHOLAR_WORKER=0) + serviço `worker` (=1).

## Flags (env)

| Var | Onde | Efeito |
|---|---|---|
| `SCHOLAR_BG` | web | `1` = enfileira; ausente/`0` = modo inline legado (stream) |
| `SCHOLAR_WORKER` | worker | `1` = este processo consome a fila; `0` = não |
| `SCHOLAR_WORKER_CONCURRENCY` | worker | jobs simultâneos (default 3) |
| `REDIS_URL` | ambos | sem isso tudo cai no inline (dev sem Redis funciona) |

**Padrão seguro:** sem `SCHOLAR_BG=1` nada muda — a rota se comporta como antes. Dá pra
mergear sem risco e só ligar quando o worker estiver de pé.

## Como testar em dev

```bash
npm install                      # instala bullmq
# subir um redis local, se não tiver:
docker run -d --name zredis -p 6379:6379 redis:7-alpine

# terminal 1 — web (só enfileira)
REDIS_URL=redis://localhost:6379/0 SCHOLAR_BG=1 SCHOLAR_WORKER=0 npm run dev

# terminal 2 — worker (consome a fila) — precisa do mesmo build/rota:
REDIS_URL=redis://localhost:6379/0 SCHOLAR_WORKER=1 npm run start   # ou dev num 2º processo
```
Teste: abra a Sala de Pesquisa, dispare uma busca, **saia da sala** (troque de aba/rota)
e volte — a barra deve reengatar e concluir. Confira no Redis a fila `bull:scholar:*` e
no banco a `ScholarSession` indo de `queued`→`running`→`done`.

## Deploy (prod)

`docker compose -f docker-compose.beta.yml up -d --build` sobe `web` + `worker`. O worker
é o mesmo image do web com `SCHOLAR_WORKER=1` (não recebe HTTP). Se faltar RAM no VPS,
remova o serviço `worker` e mude `SCHOLAR_WORKER=1` no `web` (o worker roda no processo
do web — funciona, mas divide CPU/RAM com o site).

## Limitações / próximos passos

- **Reinício do worker no meio de um job:** BullMQ retenta (`attempts: 2`). Jobs presos
  em `running` por >10 min o cliente marca como erro; vale um "reaper" que rode
  `scholarSession.updateMany({ status: running, createdAt < now-15min } → error)` no boot.
- **Sala de Estudos (chat da Aura):** ainda é streaming no cliente (não sobrevive a sair).
  Migrar pro mesmo padrão (job + sessão + resume) é a fase 2.
- **Multi-réplica:** já suportado (a fila serializa); é só subir mais containers `worker`.

## Fase 2 — Studio (Sala de Estudos)

Mapa do que sobrevive a "sair da sala":

| Artefato | Antes | Agora |
|---|---|---|
| **Podcast / Vídeo** | já era background (`void runPodcastGeneration`) | igual — sobrevive (fire-and-forget no Node do VPS) |
| **Mapa mental / Guia / FAQ / Flashcards** | inline (morria ao sair) | **background** (fire-and-forget) + cliente faz polling |
| **Imagem** | inline | ainda inline (rápida; o render depende de `dataUrl`) — follow-up |
| **Molécula** | síncrona/instantânea (PubChem) | inalterada (não precisa) |

O padrão fire-and-forget funciona porque o `web`/`worker` é Node de processo longo (não
serverless): uma promise não-aguardada continua após a resposta. Para robustez a
restart (retry/durabilidade), o passo seguinte é rotear o Studio pela MESMA fila BullMQ
da pesquisa — o `StudioArtifact.status` (queued/running/done) já está pronto pra isso.

**Chat da Aura (harness):** continua streaming ao vivo (melhor pro caso comum de estar
na sala). Torná-lo retomável exige persistir cada turno como sessão (como o scholar) —
fase 3.
```


---
## Fase 3 — chat da Aura retomável (PR 1: fundação, feita)

O turno do harness foi extraído para `lib/agent/runChatTurn.ts` e roda em DOIS lugares (mesmo
padrão do `lib/scholar/pipeline.ts`): inline no request (hoje; `turnId=null`, nada persiste) ou
no worker da fila `chat` (persistindo em `ChatTurn`).

| Peça | O quê |
|---|---|
| `prisma` `ChatTurn` | `status` queued→running→done/error, `answer` (HarnessOutput inteiro), `partial` (eventos @@PROGRESS@@) |
| `lib/agent/chat-turn-store.ts` | toda leitura por id exige `userId` (anti-IDOR) |
| `lib/agent/chat-turn-wire.ts` | HarnessOutput → texto de protocolo (route, worker e cliente usam o MESMO) |
| `lib/queue/chat.ts` | fila `chat`; mesma conexão e mesmo carregador opcional do bullmq; `jobId = turnId`; `attempts: 1` |
| `lib/queue/chat-worker.ts` | `processChatJob`: roda o turno, grava o parcial com throttle de 300ms (writes encadeados) |
| `lib/queue/reaper.ts` | no boot do worker: ChatTurn/ScholarSession em queued/running com `updatedAt` > 15 min → `error` |
| `instrumentation.ts` | `SCHOLAR_WORKER=1` sobe também o `Worker("chat")` (`CHAT_WORKER_CONCURRENCY`, default 4) |

**Por que `attempts: 1`** (o scholar usa 2): turno que falhou já está como `error` no banco e o
aluno já viu a mensagem; retentar reabriria o turno por baixo dele e gastaria modelo de novo. Worker
que MORRE no meio não depende disso: o BullMQ devolve job "stalled" pra fila sozinho.

Este PR **não muda nada em runtime**: o route continua inline (agora via `runChatTurn(null, …)`). O
modo background (`CHAT_BG=1`), os endpoints `/api/ai/chat/turns` e o reengate no cliente são o PR 2.
Antes de ligar: `npx prisma db push` (modelo novo `ChatTurn`).
