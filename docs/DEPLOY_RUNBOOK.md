# Deploy Runbook — Zaeon na Oracle Cloud Always Free (ARM A1)

> Alvo: VM.Standard.A1.Flex (4 OCPU / 24 GB, ARM, grátis pra sempre), Ubuntu 24.04, região
> São Paulo (sa-saopaulo-1) — IP brasileiro ajuda na geo-consistência do WhatsApp.
> Stack: `docker-compose.yml` da raiz (web + agent-gateway + postgres-pgvector + 2 redis + obs).

---

## Fase 1 — Criar a VPS (você faz no console Oracle; eu te guio)

### 1.1 Conta
1. https://www.oracle.com/cloud/free/ → "Start for free".
2. E-mail, país **Brazil**, telefone (SMS), **cartão de crédito** (só verificação — não cobra).
3. **Home Region: escolha `Brazil East (São Paulo)`** — NÃO dá pra mudar depois. (IP BR.)

### 1.2 Chave SSH (rode no SEU mac antes)
```bash
ssh-keygen -t ed25519 -f ~/.ssh/zaeon_oracle -C "zaeon-vps"
cat ~/.ssh/zaeon_oracle.pub   # copie esta linha — vai colar no console
```

### 1.3 Criar a instância
Console → **Compute → Instances → Create instance**:
- **Image:** Canonical Ubuntu 24.04 (confirme "Always Free eligible").
- **Shape:** Change shape → **Ampere** → `VM.Standard.A1.Flex` → **4 OCPUs / 24 GB**.
  (Tem que aparecer a etiqueta "Always Free eligible".)
- **Networking:** Create new VCN, **Assign public IPv4 address: Yes**.
- **SSH keys:** Paste public keys → cole o conteúdo do `.pub`.
- Create.

> ⚠️ **"Out of capacity" no A1?** É comum no free. Soluções: troque o Availability Domain
> (AD-1/2/3), tente de novo em alguns minutos, ou um script de retry. Persista — libera.

### 1.4 Abrir portas — DOIS firewalls (o erro nº1 de todo mundo)
A Oracle bloqueia em **dois** lugares; precisa abrir nos dois:

**(a) Nuvem — Security List da VCN:** Networking → VCN → Subnet → Security List → Add Ingress:
- `0.0.0.0/0` TCP **80** e **443** (HTTP/HTTPS).
- (porta 22 já vem aberta.)

**(b) Instância — iptables do Ubuntu Oracle (vem restritivo!):** depois de logar por SSH:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```
> Sem o passo (b), o site fica inacessível mesmo com a Security List aberta. Pega todo mundo.

### 1.5 Entrar
```bash
ssh -i ~/.ssh/zaeon_oracle ubuntu@<IP_PUBLICO>
```
✅ **Pare aqui e me avise** com o IP público + confirmação de que o SSH entrou. Aí fazemos a Fase 2.

---

## Fase 2 — Preparar a VM (Docker + repo)

```bash
# Docker + compose plugin
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu && newgrp docker

# Swap (ARM tem RAM de sobra, mas swap evita OOM em build pesado de node_modules)
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Repo
git clone <URL_DO_REPO> zaeon && cd zaeon
```

> **ARM:** `docker compose up --build` builda web (node) e agent (python) nativo em arm64 — ok.
> As imagens pinadas (pgvector, redis, prometheus, grafana, loki) são multi-arch.

---

## Fase 3 — Secrets (.env) e subir

1. Crie o `.env` na raiz a partir de `.env.deploy.example` + suas vars atuais do web.
   (Eu te entrego o template comentado — ver `.env.deploy.example`.)
2. Suba:
```bash
docker compose up -d --build      # primeira vez demora (build do node_modules em ARM)
docker compose ps
docker compose logs -f web agent-api
```
3. Migração pgvector roda sozinha no boot do Postgres (montada em initdb). Conferir:
```bash
docker compose exec postgres psql -U zaeon -d zaeon_agent -c "\dx"   # deve listar 'vector'
docker compose exec postgres psql -U zaeon -d zaeon_agent -c "\dt"   # research_chunks, agent_instances...
```

## Fase 4 — Smoke test
```bash
curl -s localhost:3000 | head           # web
curl -s localhost:8000/health           # agent-api → {"status":"ok"}
curl -s localhost:8000/metrics | head   # prometheus metrics
```
- Grafana: `http://<IP>:3001` (login admin / GRAFANA_PASSWORD). Dashboard "Zaeon Agent" provisionado.
- Prometheus: `http://<IP>:9090/targets` → `zaeon_agent_api` deve estar UP.

## Fase 5 — TLS + domínio
- Apontar A record do domínio → IP da VPS.
- Reverse proxy com TLS automático (Caddy) na frente do `web` e `agent-api` — adiciono no compose
  quando você tiver o domínio.

---

## Pendências que NÃO dependem da VPS (lembrete)
- **Adapter Go** publicando inbound (`wa:evt`) — sem isso o agente não ouve (tarefa #13).
- Credencial **GCP rotacionada** (tarefa #1) no `.env` → Vertex liga.
- `set_proxy` no pareamento lê o proxy vinculado na aba admin (tarefa #12).
