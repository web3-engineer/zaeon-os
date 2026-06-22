# Sprint: Zaeon OS — Vercel → VPS (CI/CD + Observabilidade nível Zenith-Warmer)

> Status: DRAFT v1 · Autor: Martinez + assistente eng · Data: 2026-06-11
> Objetivo: tirar o zaeon-os da Vercel e rodá-lo self-hosted em container numa VPS,
> com pipeline de CI/CD e monitoramento equivalentes ao padrão do `zenith-warmer`.

---

## Conclusão (TL;DR)

O zaeon-os **não é um app Next serverless** — é um sistema multi-serviço com WebSocket
persistente (`server.js` + Socket.IO), um backend Express dockerizado e três engines
Python. A Vercel nunca foi a casa certa pra isso (WS persistente não roda bem lá, e o
`maxDuration: 300` no route do scholar é gambiarra contra o limite serverless).
**Migrar pra VPS conserta uma incompatibilidade real, não é só cosmético.**

Há **1 item de segurança P0** que entra no caminho crítico: uma chave de service account
(`service-account copy.json`) está versionada no git.

---

## 1. Fotografia atual (o que o recon encontrou)

**Stack**
- Next.js 14.2.15 com **custom server** (`server.js`: HTTP + Socket.IO).
- `backend/` — Express 5 + Socket.IO, **já tem Dockerfile** (mirado em Cloud Run, PORT 8080).
- Engines Python: `abnt-service/`, `research-engine/`, `suggestion-forge/` (+ `quality-engine/`).
- Dados/infra: MongoDB (Mongoose), Prisma, Redis (Upstash + ioredis), Pusher, NextAuth.
- IA: Google Vertex/Gemini, Groq. Web3: aptos, ethers, viem, wepin.
- Logs: `pino` já presente. Repo no GitHub: `web3-engineer/zaeon-os`.

**Gaps que separam o zaeon-os do "nível bacana"**
| Área | Hoje | Alvo |
|---|---|---|
| Deploy | Push-to-Vercel mágico | Imagens versionadas + deploy reproduzível na VPS |
| CI | **Zero** (`.github/` não existe) | Lint + typecheck + test + build + push em PR |
| Quality gates | **Desligados** (`ignoreBuildErrors: true`, `eslint.ignoreDuringBuilds: true`) | Gates reais (faseado: warn → block) |
| Container web | `output: standalone` **não setado** | Imagem multi-stage slim |
| WebSocket | Forçado na Vercel | 1º cidadão na VPS |
| Observabilidade | Nenhuma | Métricas + logs + traces + uptime + alertas |
| Secrets | `.env` local + 1 chave vazada | Cofre/Docker secrets + rotação |

---

## 2. Segurança — P0 (caminho crítico, fazer já)

`service-account copy.json` está **trackeado no git**. O `.gitignore` cobre
`service-account.json`, mas o sufixo " copy" passou batido.

Plano (você executa o passo do GCP, eu preparo o resto):
1. **Rotacionar** a chave no GCP (criar nova key da service account, atualizar onde é usada, deletar a antiga). → *você*
2. Remover o arquivo do working tree + adicionar padrões ao `.gitignore` (`*copy*.json`, `service-account*.json`). → *eu*
3. Purgar do histórico com `git filter-repo` (ou BFG) e forçar push. → *eu preparo o comando, decidimos juntos por ser reescrita de histórico*
4. Confirmar que nenhum outro segredo está trackeado (varredura). → *eu*

> Regra de ouro do projeto: operação destrutiva (reescrever histórico, force-push) só com sua confirmação explícita. Eu deixo tudo pronto e paro antes de apertar o botão.

---

## 3. Arquitetura alvo na VPS

```
                  Internet
                     │  443/80
              ┌──────▼───────┐
              │ Reverse Proxy│  (Caddy ou Traefik — TLS automático)
              └──┬────┬───┬──┘
        web ─────┘    │   └───── backend (Socket.IO agent)
   (Next+Socket.IO)   │
                      ├─ abnt-service (Python)
                      ├─ research-engine (Python)
                      └─ suggestion-forge (Python)

  Rede interna Docker · Volumes p/ uploads/dados
  Dados gerenciados (recomendado p/ v1): Mongo Atlas + Upstash Redis
  Observabilidade: Prometheus · Grafana · Loki · Alertmanager · Uptime Kuma
```

**Decisão de v1:** manter Mongo (Atlas) e Redis (Upstash) **gerenciados** no começo —
reduz o raio de explosão da migração. Self-host de banco entra numa fase posterior, se quiser.

---

## 4. Recomendação de VPS (pra você abrir a conta já)

- **Specs mínimas:** 4 vCPU / 8 GB RAM / 80–160 GB NVMe.
  (Next SSR + Node backend + 3 engines Python + stack de monitoramento pesam.)
- **OS:** Ubuntu 24.04 LTS (ou 22.04 LTS).
- **Sugestões de provedor:** Hetzner (CPX31/CPX41 — melhor custo/benefício), Hetzner é o sweet spot; alternativas: DigitalOcean, Linode, Vultr.
- **Na criação, já marque:**
  - Chave **SSH** (não senha).
  - IPv4 dedicado.
  - Backups/snapshots automáticos (vale os centavos).
  - Firewall do provedor: liberar só 22, 80, 443.
- **DNS:** tenha em mãos o domínio que vai apontar pro IP (A record). Sem domínio, sem TLS automático.

> Me diga o provedor escolhido que eu ajusto o runbook de hardening pro formato dele.

---

## 5. Fases da sprint

**Fase 0 — Segurança & prep (P0)**
- Rotacionar chave, purgar histórico, varredura de secrets.

**Fase 1 — Containerização (P0)**
- `output: standalone` no `next.config.mjs`.
- Dockerfile multi-stage do web (`server.js`).
- Revisar Dockerfile do backend (porta/env).
- Dockerfiles das engines Python (uvicorn/gunicorn).
- `.dockerignore` em cada serviço.

**Fase 2 — Orquestração (P1)**
- `docker-compose.yml` (web, backend, engines, proxy).
- `compose.override` p/ dev local.
- Reverse proxy + TLS (Caddy/Traefik).
- `.env.example` consolidado + estratégia de secrets na VPS.

**Fase 3 — CI/CD (P1)**
- GitHub Actions: lint → typecheck → test → build → push GHCR.
- Quality gates faseados (warn primeiro, depois block).
- Deploy na VPS (SSH + `compose pull && up`, ou Watchtower).
- Smoke test pós-deploy + rollback.

**Fase 4 — Observabilidade (P1)**
- Prometheus + Grafana + Loki + cAdvisor + node-exporter.
- `prom-client` no web/backend (métricas de app).
- Alertmanager → Slack/Discord. Uptime Kuma p/ uptime externo.
- Sentry p/ erros. Dashboards base no Grafana.

**Fase 5 — Hardening & corte (P2)**
- UFW, fail2ban, SSH hardened, updates automáticos.
- Cutover de DNS, monitorar 48h, desligar Vercel.

---

## 6. O que EU faço enquanto você abre a conta da VPS

Não dependo da VPS pra adiantar ~70% do trabalho. Em paralelo eu vou:

1. **Segurança:** preparar o `.gitignore` corrigido + comandos de purge de histórico (prontos, sem executar) + varredura de secrets.
2. **Web container:** setar `output: standalone` + escrever o Dockerfile multi-stage + `.dockerignore`, e validar `next build` localmente.
3. **Engines Python:** escrever Dockerfile de cada serviço.
4. **Compose:** montar `docker-compose.yml` + override de dev + config do reverse proxy.
5. **CI/CD:** escrever o workflow do GitHub Actions completo.
6. **Observabilidade:** configs de Prometheus/Grafana/Loki/Alertmanager + dashboards base.
7. **Runbook:** documento de operação da VPS (hardening, deploy, rollback, secrets).

Quando a VPS estiver de pé, sobra só: colocar secrets, apontar DNS, primeiro deploy e smoke test.

---

## 7. Decisões abertas (preciso de você)

Pra eu mirar no mesmo padrão do `zenith-warmer` em vez de chutar:
1. **Orquestração:** Docker Compose (1 VPS, recomendado pra v1) vs Kubernetes/k3s?
2. **Monitoramento:** Prometheus+Grafana+Loki self-hosted vs Datadog vs igual ao zenith-warmer?
3. **CI/CD:** GitHub Actions (recomendado, repo já no GitHub) vs outro?

> Defaults assumidos abaixo se você não disser nada: **Compose + Prometheus/Grafana/Loki + GitHub Actions.**
```
Conclusão: migração conserta problema arquitetural real (WS), não é só estética.
O que muda: sai da Vercel, entra container orquestrado + CI/CD + observabilidade.
O que checei: stack, custom server, Dockerfiles existentes, gates desligados, 1 secret vazado.
Riscos: reescrita de histórico (destrutivo, só com OK), cutover de DNS.
Próximo passo: você abre a VPS (4vCPU/8GB/Ubuntu LTS) + responde as 3 decisões; eu adianto os artefatos.
```
