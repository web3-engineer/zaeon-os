# Zaeon OS — Agente de Pesquisa no WhatsApp (Plano de Implementação)

> Status: DRAFT v1 · Data: 2026-06-11
> Contexto: roda em cima da migração para VPS (ver `SPRINT_VPS_PLAN.md`).
> Referência de arquitetura: `zenith-warmer` (Evolution/whatsmeow), já montado e auditado.

---

## Conclusão (TL;DR)

Dá pra entregar isso rápido porque **~70% já existe no zenith-warmer** e é reaproveitável
quase verbatim. O usuário, **na própria aba de perfil**, conecta o WhatsApp **dele** (mesmo
pareamento por QR/código que vocês já usam), e a Zaeon vira um assistente de pesquisa que
fala com ele pelo WhatsApp — com áudio, "digitando...", e respostas ancoradas na biblioteca
de pesquisa dele.

A peça nova de verdade é o **caminho de entrada** (inbound): o warming é 100% saída e nem
consome mensagem recebida. O assistente precisa de webhook → roteamento → resposta com IA.

**3 princípios não-negociáveis do design** (entram no código, não são enfeite):
1. **Consentimento por construção** — o pareamento WhatsApp exige a pessoa aprovar no
   próprio aparelho. Só o dono do número conecta. Nada de número de terceiro.
2. **Auto-identificação como IA** — o agente diz que é um assistente de IA. Ele é o
   "gêmeo de pesquisa" do usuário falando *com* o usuário, não um disfarce pra enganar ninguém.
3. **Kill switch** — desconectar/pausar é um clique no perfil, e revoga a sessão na hora.

---

## 1. O que herdamos do zenith-warmer (reuso direto)

| Componente | Arquivo no zenith-warmer | Uso no agente |
|---|---|---|
| Wrapper Evolution API | `app/services/evo_client.py` | Pareamento + envio. Fork quase intacto. |
| Pareamento (QR + código) | `create_instance`, `get_qr_code`, `connect_session(subscribe=["MESSAGE"])`, `request_pairing_code` | Aba de perfil: usuário escaneia QR / digita código. |
| Enviar texto | `send_text` | Resposta do agente. |
| Enviar mídia | `send_media` | Imagens/PDF da pesquisa. |
| **Nota de voz** | `send_audio` + `audio.py` (`to_ogg_opus` via ffmpeg) | Agente responde em áudio (TTS → Ogg/Opus). |
| **"digitando..." / "gravando..."** | `send_presence` (`composing`/`recording`/`paused`) | Humaniza o ritmo da resposta. |
| Resiliência | `circuit.py`, `EvoResult`, `http_pool`, retries+breaker | Mesma robustez do warming. |
| IA / geração | `ai_service.py` (AsyncOpenAI + rate limiter) | Base do motor de resposta (trocamos o prompt). |
| Observabilidade | `observability/` (Prometheus + Grafana + Loki + Promtail, dashboards, alertas) | Igual; só adiciona métricas do agente. |
| Stack | FastAPI + arq + Postgres + Redis + SQLAlchemy + Alembic + Sentry + prometheus_client | Reuso integral. |

> Conclusão prática: o agente é, na essência, um **fork enxuto do zenith-warmer** com o
> motor invertido (de outbound-scripted para inbound-reativo) e plugado na pesquisa da Zaeon.

---

## 2. O que é NOVO (precisa construir)

1. **Inbound webhook.** Configurar a instância Evolution pra POSTar `MESSAGES_UPSERT` num
   endpoint FastAPI nosso. (O zenith-warmer **não** tem isso — não achei `set_webhook` no
   `evo_client`; é adição nova: ou campo `webhook` no `/instance/create`, ou método
   `set_webhook` chamando `/webhook/set/:instance`.)
2. **Roteador de conversa.** Recebe a mensagem do dono → de-dup (idempotência por message id,
   igual ao padrão `ProcessedWebhook`) → enfileira no arq → processa um turno.
3. **Motor de resposta com persona + RAG.** Injeta no prompt: (a) a persona do agente, (b)
   contexto recuperado da biblioteca de pesquisa do usuário (os PDFs/notas já no Zaeon),
   (c) histórico curto da conversa. Reaproveita os engines Python que já existem
   (`research-engine`, `abnt-service`) como fonte de contexto.
4. **Transcrição de áudio recebido.** Se o usuário manda áudio, transcrever (Whisper/STT)
   antes de mandar pro LLM. (Saída de áudio já está pronta via `audio.py`.)
5. **Modelo de dados `AgentInstance`.** Espelha `WarmerInstance` (UUID `evo_instance_id`,
   `evo_token`, `remote_jid`, `status`, `owner_id`), mas keyed ao usuário Zaeon.
6. **UI no perfil (Next.js).** Card "Conectar WhatsApp": exibe QR, status de conexão
   (via Socket.IO que vocês já têm no `server.js`!), toggle de áudio, botão desconectar,
   e o aviso de consentimento + disclosure de IA.
7. **Guard-rails.** Disclosure automática na 1ª mensagem, rate limit por usuário, e
   escopo de conteúdo (só assuntos de pesquisa — não vira um WhatsApp genérico).

---

## 3. Arquitetura

```
  Celular do usuário (número DELE)
        │  pareia por QR/código (consentido)
        ▼
   Evolution API (whatsmeow)  ◀── mesma infra do warming
        │  MESSAGES_UPSERT (webhook)         ▲ send_text/audio/presence
        ▼                                    │
  ┌───────────────────────────────────────────────┐
  │  agent-gateway  (novo serviço Python/FastAPI)  │
  │  ── /webhook/wa  → de-dup → enqueue (arq)      │
  │  ── worker: turno = persona + RAG + STT/TTS    │
  │  ── evo_client (fork do zenith-warmer)         │
  └───────┬───────────────────────────────┬────────┘
          │ contexto de pesquisa          │ status conexão
          ▼                               ▼
   research-engine / abnt-service    Next.js app (server.js + Socket.IO)
   (RAG sobre a biblioteca)          → aba de Perfil (QR, toggles, kill switch)
          │
          ▼
   Postgres (AgentInstance, ConversationLog)  ·  Redis (fila + sessão + dedup)
```

**Decisão:** o agente é um **novo container Python** (`agent-gateway/`) — não embute no
backend Node. Razão: reuso máximo do zenith-warmer (que é Python) e isolamento. No
`docker-compose` da VPS ele é só mais um serviço, ao lado de `web`, `backend` e as engines.

---

## 4. Fluxo de um turno (inbound → resposta)

1. Usuário manda "resumir o paper X" no WhatsApp.
2. Evolution → `POST /webhook/wa` no agent-gateway.
3. De-dup pelo `key.id` da mensagem (idempotência). Enfileira turno no arq.
4. Worker: `send_presence(composing)` → mostra "digitando..." no celular do usuário.
5. Se for áudio recebido → baixa mídia → STT (Whisper) → texto.
6. RAG: busca na biblioteca de pesquisa do usuário (research-engine) o contexto do paper X.
7. LLM gera resposta com persona + contexto. (1ª msg da sessão inclui disclosure de IA.)
8. Se o usuário prefere voz → TTS → `to_ogg_opus` → `send_audio` (com `recording` presence).
   Senão → `send_text`.
9. Loga em `ConversationLog`. Métricas Prometheus: turnos, latência, tokens, falhas.

---

## 5. Modelo de dados (novo)

```
AgentInstance
  id, owner_id (FK users), evo_instance_id (UUID), evo_token (UUID),
  remote_jid, status (IDLE/CONNECTING/CONNECTED/PAUSED/REVOKED),
  voice_enabled (bool), persona_json (JSON), created_at, last_active_at

ConversationLog
  id, agent_instance_id (FK), direction (in/out), kind (text/audio/media),
  content_preview, tokens, latency_ms, created_at
  (índice composto por agent_instance_id + created_at)
```

---

## 6. Encaixe na sprint da VPS

- O agent-gateway entra no **mesmo `docker-compose`** que estamos montando (serviço novo).
- Herda o **mesmo Dockerfile multi-stage** do zenith-warmer (python 3.12-slim, non-root,
  **ffmpeg** já incluso — necessário pro áudio).
- Herda o **mesmo CI** (`tests.yml`: pytest + cov floor + mypy) e o padrão `deploy-prod.yml`.
- Herda o **mesmo Prometheus/Grafana/Loki** — só adiciona um `job_name: agent_gateway` e
  um dashboard novo. Alertas no padrão de `zenith-alerts.yaml`.
- **Evolution API:** precisa rodar uma instância do Evolution acessível à VPS. Decisão aberta
  (ver §8): subir um Evolution dedicado pro Zaeon, ou reusar a infra do zenith-warmer.

---

## 7. Conformidade & risco (honesto, de engenheiro pra engenheiro)

- **WhatsApp ToS:** bridges não-oficiais (Evolution/whatsmeow) **violam o ToS** do WhatsApp
  e o número **pode ser banido** — vocês já vivem isso no warming (tem até painel de
  diagnóstico de ban). Pra um produto que o usuário final conecta o número pessoal, o ban
  é um risco que precisa estar **explícito no consentimento**.
- **Caminho oficial (recomendado avaliar):** **WhatsApp Business Cloud API** (Meta). É
  compliant, tem webhooks de inbound nativos, áudio e typing oficiais. Custa por conversa e
  exige número Business, mas elimina o risco de ban e é o caminho "produto sério". Trade-off:
  perde parte do reuso do `evo_client` (a API é outra), mas o **motor de IA + RAG + persona +
  TTS/STT é idêntico** — só troca a camada de transporte.
- **Recomendação:** abstrair o transporte atrás de uma interface (`MessagingTransport`) com
  duas implementações — `EvolutionTransport` (reuso imediato, MVP/interno) e
  `CloudApiTransport` (produção). Decide-se por usuário/plano. Isso é o mesmo padrão que o
  zenith-warmer já usa em `payments/base.py` (provider plugável).

---

## 8. Fases

**Fase A — Fundação (reuso)**
- Scaffold `agent-gateway/` como fork enxuto do zenith-warmer (evo_client, audio, circuit, obs).
- Modelo `AgentInstance` + migração. Interface `MessagingTransport`.

**Fase B — Pareamento (consentido)**
- Endpoint de connect + QR. UI no perfil (Next.js + Socket.IO pra status ao vivo).
- Consentimento + disclosure + kill switch.

**Fase C — Inbound + motor**
- Webhook `MESSAGES_UPSERT` + de-dup + fila.
- Motor de turno: persona + RAG (research-engine) + histórico.
- `send_presence` ("digitando..."), `send_text`.

**Fase D — Rich features**
- STT do áudio recebido (Whisper). TTS + `send_audio` (nota de voz).
- Toggle de voz no perfil. Mídia da biblioteca.

**Fase E — Hardening + observabilidade**
- Métricas/dashboards/alertas do agente. Rate limit por usuário. Testes (cov floor).

---

## 9. Decisões travadas (2026-06-11)

1. **Transporte:** ✅ **Evolution atrás de `MessagingTransport`** — reuso máximo no MVP,
   `CloudApiTransport` plugável depois. Risco de ban fica explícito no consentimento.
2. **Escopo:** ✅ **Assistente geral.** Implica: **camada de moderação de conteúdo**
   (pré-resposta) + **rate limit por usuário** na Fase C; disclosure de IA na 1ª msg
   continua obrigatório. Custo de token maior — monitorar via métricas.
3. **RAG:** ✅ **pgvector na mesma Postgres da VPS** (ver §10 para o porquê e o desenho).

Ainda em aberto (não bloqueiam a Fase A):
- **Evolution dedicado pro Zaeon** vs reusar infra do zenith-warmer (Fase B).
- **STT:** Whisper API vs faster-whisper self-hosted (Fase D).

---

## 10. RAG — onde guardar os vetores (análise)

**O contexto que importa:** o zaeon-os é **Mongo** hoje (Mongoose + Prisma). Postgres é do
zenith-warmer. MAS o `agent-gateway` é um serviço Python novo que **já precisa de um Postgres
próprio** (espelha o zenith-warmer: `AgentInstance`, `ConversationLog`). Logo, **pgvector é só
uma extensão nesse Postgres que já vai existir** — custo marginal ~zero, e o app Mongo nem é tocado.

### Opções comparadas

| Opção | Prós | Contras | Veredito |
|---|---|---|---|
| **pgvector** (no Postgres do agent-gateway) | 1 store p/ metadados + logs + vetores; transação ACID; **busca híbrida** (tsvector + vetor) numa query só; backup/monitor únicos; managed fácil (Supabase/Neon) | Introduz Postgres (mas o agente já precisa dele) | ✅ **Recomendado** |
| **Mongo Atlas Vector Search** | Zero store novo (Zaeon já é Mongo); fica perto da biblioteca | **Só no Atlas** (Mongo self-host community não tem vetor); acopla o agente ao Mongo; agente passa a falar com Mongo **e** Postgres = 2 stores | Evitar (acopla demais) |
| **Vector DB dedicado** (Qdrant/Weaviate/Milvus) | Melhor recall/latência em escala enorme; features avançadas (filtros, quantização) | Mais um serviço pra rodar/backup/monitorar numa VPS já cheia; overkill no volume de vocês | Só se passar de ~10M chunks |
| **Redis/Upstash Vector** | Já usam Redis; baixa latência | Upstash Vector é produto à parte (managed novo); menos maduro p/ híbrido; Redis vetorial come RAM | Não compensa agora |

### Por que pgvector encaixa (e como não ter problema)

1. **Escala real de vocês:** biblioteca de pesquisa = milhares a poucos milhões de chunks.
   pgvector com índice **HNSW** (≥0.5.0) entrega isso com folga. O ponto onde vector DB
   dedicado ganha é dezenas de milhões de vetores + QPS alto — vocês não chegam perto.

2. **Gotcha de dimensão (esse pega gente):** índice HNSW/IVFFlat do pgvector aceita até
   **2000 dimensões**. `text-embedding-3-large` tem **3072** → **não indexa** direto.
   Soluções: usar `text-embedding-3-small` (1536, indexa liso) **ou** `halfvec` (pgvector
   0.7+) p/ indexar 3072. **Recomendo `3-small` (1536)** — barato, rápido, suficiente.

3. **Índice:** **HNSW** (melhor recall/latência, mais RAM) em vez de IVFFlat (precisa treinar,
   pior recall). `m=16, ef_construction=64` é um bom ponto de partida.

4. **Busca híbrida de graça:** Postgres full-text (`tsvector`) + vetor na **mesma query** dá
   keyword + semântico juntos. Um vector DB puro não faz isso sem gambiarra. Ganho real de
   qualidade de retrieval.

5. **Não pesar a VPS:** em vez de self-hostar Postgres competindo com web+worker+monitoring
   numa máquina só, considerar **Supabase ou Neon** (Postgres + pgvector **managed**). Tira
   o banco do caminho crítico da VPS e já vem com pgvector ligado. (Decisão de ops, Fase C.)

### Esquema (pgvector)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE research_chunks (
  id           bigserial PRIMARY KEY,
  owner_id     integer NOT NULL,           -- isola por usuário (multi-tenant)
  doc_id       text NOT NULL,              -- id do PDF/nota na biblioteca
  chunk_text   text NOT NULL,
  embedding    vector(1536) NOT NULL,      -- text-embedding-3-small
  tsv          tsvector,                   -- p/ busca híbrida
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX ON research_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX ON research_chunks USING gin (tsv);
CREATE INDEX ON research_chunks (owner_id);   -- filtro por dono antes do ANN
```

> **Regra de ouro multi-tenant:** sempre filtrar por `owner_id` — o agente de um usuário
> só recupera da biblioteca **dele**. Isso é privacidade E qualidade de retrieval.

---

## 11. Vertex AI — usar o Google ao máximo (pesquisado 2026-06-11)

Vocês já têm `@google-cloud/vertexai` no stack. Pra "assistente pra todo aluno/professor/
pesquisador" (multi-tenant em escala), o Vertex entra forte. O segredo é usá-lo no **cérebro,
embeddings, caching e safety** desde já, e manter o **store de vetores atrás de uma interface**
pra não criar lock-in. Mapa:

### Cérebro — Gemini no Vertex
- **Roteador de modelo por complexidade:** Gemini 2.5 **Flash** no grosso dos turnos, **Pro**
  pra raciocínio pesado. Corta custo sem perder qualidade.
- **Multimodal nativo:** Gemini entende **áudio direto** → **dispensa STT separado (Whisper)**;
  lê **PDF/imagem** nativamente → simplifica o "manda um paper aqui". (Mexe na Fase D do plano.)
- **Safety filters** embutidos → reforçam a moderação exigida pelo "assistente geral".

### Embeddings — Gemini Embedding (Vertex)
- `gemini-embedding-001`: **3072 dims**, mas tem `output_dimensionality` (Matryoshka) → dá pra
  pedir **1536 ou 768** sem trocar de modelo. **É isso que reconcilia com o pgvector:** pede
  1536, indexa liso no HNSW (limite 2000). Embedding do Google + dado no **teu** Postgres.
- Gemini Embedding 2 é multimodal (texto/imagem/doc/áudio/vídeo) — útil pra indexar além de texto depois.

### RAG store — 3 caminhos por fase de escala (atrás de `RagBackend`)
1. **pgvector** (Postgres/AlloyDB/Supabase) + embeddings Gemini@1536 → **MVP**. Teu dado, busca
   híbrida, mais barato. (É o §10.)
2. **Vertex AI Vector Search** (ScaNN — mesma tech do Google Search) → quando passar de ~milhões
   de vetores / QPS alto. Custo = VMs do índice + indexação (`nº exemplos × dims × 4 bytes × $3/GB`).
3. **Vertex AI RAG Engine** (orquestração gerenciada; backend RagManagedDb/Spanner ou Vector
   Search 2.0; **Serverless em preview**) → terceiriza o pipeline RAG inteiro, plugado no Gemini
   como tool (grounding nativo). Menos ops quando virar "assistente pra todo mundo".

### Custo em escala (o pulo do gato com muitos usuários)
- **Context caching:** tokens em cache custam **10%** do input. 200 alunos perguntando sobre o
  mesmo paper/ementa → cacheia o documento **uma vez**. Implícito (auto) + explícito.
- **Provisioned Throughput:** capacidade reservada pra carga previsível (época de prova, campanha).

### Recomendação
Abstrair provider (igual ao `MessagingTransport`): `LLMProvider` + `RagBackend`.
**Fase 1:** Gemini (Vertex) + pgvector (Gemini embeddings @1536). **Fase 2 (escala):** vira a
chave do `RagBackend` pra Vertex Vector Search ou RAG Engine **sem tocar na lógica do agente**.
Resultado: Vertex no máximo onde importa agora, porta aberta pro gerenciado quando a escala pedir.

```
Conclusão: ~70% vem do zenith-warmer; a peça nova é o inbound (webhook→IA→resposta).
O que muda: novo container agent-gateway, fork do evo_client, motor persona+RAG, UI no perfil.
O que checei: pareamento consentido, send_audio/presence, audio.py (ffmpeg), obs stack, CI, ausência de inbound no warming.
Riscos: ToS do WhatsApp (ban) — mitigado por consentimento explícito + opção Cloud API.
Próximo passo: você responde as 5 decisões da §9; eu começo o scaffold do agent-gateway na Fase A.
```
