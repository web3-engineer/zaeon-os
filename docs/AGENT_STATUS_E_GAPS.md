# Zaeon Agent — Status & Gaps (o que falta pro objetivo)

> Atualizado: 2026-06-11. Objetivo: assistente de pesquisa da Zaeon rodando no WhatsApp
> (número do próprio usuário, consentido) + no app, com memória nas Salas, voz, planos,
> onboarding, e proxy pro 1-a-1. Ver `WHATSAPP_AGENT_PLAN.md` e `docs/ADR-001`.

## Mapa de prontidão

| Componente | Estado | O que falta |
|---|---|---|
| Engines (gênero, .edu, planos, onboarding) | ✅ pronto + testado | — |
| Orquestrador de turno (STT→mod→RAG→LLM→mod→voz) | ✅ pronto + testado | — |
| Moderação / comandos | ✅ pronto + testado | — |
| Interfaces de provider (LLM/RAG/Search/Voice/Transport) | ✅ pronto | — |
| Aba admin de Proxy (UI + API + schema) | ✅ pronto | cifrar senha; elo set_proxy no deploy |
| Ponte Redis — **produtor** (`wa:cmd`) | ✅ código | Redis vivo |
| Ponte Redis — **consumer inbound** (`wa:evt`) | 🟡 **este passo** | Redis vivo + publisher Go |
| Impl Vertex (LLM/embeddings/search/voz) | 🟡 esqueleto compila | credencial GCP |
| Impl pgvector (RAG) | 🟡 esqueleto compila | Postgres+pgvector |
| Impl whatsmeow transport | 🟡 esqueleto compila | adapter vivo |
| Carregar perfil/plano do usuário | 🔴 TODO | repo cross-service (este passo: interface+fake) |
| Webhook FastAPI / worker | 🟡 esqueleto | consumer ligado (este passo) |
| docker-compose do stack | 🔴 falta | este passo (terreno) |
| Observabilidade (prometheus/grafana) | 🔴 falta | este passo (configs) |
| **Inbound publisher no adapter Go** | 🔴 não existe | **lado Go — bloqueia ouvir** |
| Migração pgvector | ✅ SQL pronto | rodar no Postgres (VPS) |

## Três baldes

**(A) Dá pra codar AGORA, sem VPS — foco deste passo:**
- Consumer de inbound `wa:evt` + dedup + enfileirar turno (fecha a ponte Redis no código).
- Fake de Redis + testes do par produtor↔consumer.
- `ProfileRepository` (interface + fake) pra destravar `_load_profile` do worker.
- `docker-compose` do stack (web, agent-api, agent-worker, adapter, postgres+pgvector, redis×2, prometheus/grafana/loki).
- Configs de observabilidade (scrape + dashboard base + alertas) espelhando o zenith.

**(B) Precisa da VPS / infra (eu te guio quando chegar lá):**
- Subir Postgres+pgvector e rodar `migrations/001_pgvector.sql`.
- Subir os dois Redis (app + barramento) e o adapter dedicado.
- Credencial GCP (chave rotacionada) no agent-gateway → Vertex liga.
- DNS + TLS + deploy via CI.

**(C) Precisa do lado Go (adapter whatsmeow) — fora deste repo Python:**
- **Inbound publisher**: handler `events.Message` do whatsmeow publicando em `wa:evt`/`wa:inbound`. **Sem isso o agente não ouve** — é o bloqueador nº1.
- `set_proxy` por instância (já tem endpoint no plano) + adapter dedicado pro Zaeon.

## Sequência recomendada

1. **(A) agora:** fechar ponte no código + perfil + compose + observabilidade → produto consistente.
2. **(C) Go:** inbound publisher + adapter dedicado (pode rodar em paralelo, é outra pessoa/skill).
3. **(B) VPS:** subir infra, migração, credenciais, deploy, smoke test.

> Quando chegar em (B), eu te guio passo a passo (criar VPS, instalar Docker, subir compose,
> rodar migração, colar secrets, apontar DNS). Até lá, tudo que dá é (A) — é o que faço agora.
