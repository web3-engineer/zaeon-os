# Deploy da Beta — Zaeon OS (VPS + GitHub Actions)

Guia objetivo pra subir a beta numa VPS e ligar o CI/CD do GitHub.
O `web` é um **custom server** (Next 14 + Socket.IO em `server.js`), por isso vai
de **Docker no VPS** — não em Vercel.

## 0. Visão geral

- **CI** (`.github/workflows/ci.yml`): a cada push roda `npm ci` + `prisma generate`
  + lint (não-bloqueante) + `vitest` + `next build`. É a checagem de build real.
- **CD** (`.github/workflows/deploy.yml`): no push pra `main` (ou manual), faz SSH no
  VPS, `git reset --hard origin/main` e `docker compose up -d --build`. Só roda se os
  secrets do VPS existirem.
- **Stack da beta** (`docker-compose.beta.yml`): `web` + `redis` + `caddy` + `voice-engine`
  + `abnt-service` + `pdf-loader`. A stack completa (postgres/pgvector, agent-gateway,
  observabilidade) fica no `docker-compose.yml`, pra depois.

**Nada aqui conhece o IP da box.** O `deploy.yml` lê tudo dos secrets e o
`docker-compose.beta.yml` lê o perfil de RAM do `.env`. Trocar de VPS = trocar
secrets e rodar o bring-up. Sem editar código.

**Mongo é Atlas externo.** Os dados não vivem na VPS: `DATABASE_URL`/`MONGODB_URI`
apontam pro cluster. Trocar de box preserva os dados por construção — desde que a
connection string seja a mesma e o IP novo esteja liberado no **Network Access** do Atlas.

---

## 1. Bring-up numa box nova

### 1.1 Acesso (uma vez, no seu Mac)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/zaeon_vps -C "zaeon-deploy" -N ''
ssh-copy-id -i ~/.ssh/zaeon_vps.pub root@<IP_DA_BOX>
ssh -i ~/.ssh/zaeon_vps root@<IP_DA_BOX> 'echo ok'
```

Guarde a **privada** (`~/.ssh/zaeon_vps`): ela vira o secret `VPS_SSH_KEY` no passo 3.

### 1.2 Acesso do repo (privado)

O clone precisa de credencial. O mais simples é uma **Deploy Key**: gere um par na
própria box e cadastre a pública em *Settings → Deploy keys* do repositório.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N '' -C "box-$(hostname)"
cat ~/.ssh/id_ed25519.pub     # cole em github.com/web3-engineer/zaeon-os/settings/keys
```

### 1.3 O `.env` (só você tem os segredos)

Na box, em `<DEPLOY_PATH>/.env`. O contrato das chaves é o `.env.example`.
Obrigatórias pro bring-up (o script confere antes de buildar):

```
DATABASE_URL, MONGODB_URI, NEXTAUTH_URL, NEXTAUTH_SECRET,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_PROJECT_ID, GOOGLE_LOCATION
```

> **`NEXTAUTH_SECRET` tem que ser o mesmo de antes**, senão toda sessão ativa é
> invalidada e o mundo relogga. **`NEXTAUTH_URL`** tem que ser o `https://` do
> domínio final — o callback do OAuth do Google recusa qualquer outra coisa.

A credencial do Vertex (`GOOGLE_CREDENTIALS`, JSON multilinha) **não** vai no `.env`:
vai no `.env.secrets`, que o deploy do GitHub materializa a partir do secret
`GOOGLE_CREDENTIALS_B64`. Pra fazer à mão no 1º boot:

```bash
# no seu Mac:
base64 -i gcp-sa.json | tr -d '\n'
# na box:
echo "GOOGLE_CREDENTIALS=$(echo '<B64>' | base64 -d | tr -d '\n')" > .env.secrets
```

### 1.4 Subir

```bash
bash scripts/vps-bringup.sh
```

Idempotente — pode rodar de novo. Ele instala docker, cria swap, clona/atualiza o
repo, **valida o `.env` antes do build** (falhar em 2s é melhor que em 20min),
escolhe o perfil de RAM pela memória da box, sobe o compose, roda `prisma db push`
(aditivo) e verifica app + Atlas no fim.

Variáveis opcionais: `DEPLOY_PATH` (default `/root/zaeon-os`), `REPO_URL`, `BRANCH`,
`COMPOSE_FILE`, `SWAP_GB`, `SKIP_BUILD`.

> A 1ª build é pesada (next build + LibreOffice + torch): 10–20 min. As seguintes
> usam cache. Os pesos do Kokoro baixam no 1º uso e ficam no volume `hf_cache`.

### 1.5 Verificar — antes do DNS

Pela rede pública ainda não dá: o `web` só escuta na rede interna (`expose`, não
`ports`) e o Caddy não emite certificado enquanto o domínio não resolver pra cá.
De dentro da box:

```bash
make ps        # todos os serviços de pé
make health    # {"status":"ok",...} — liveness, NÃO toca o banco
make ready     # conta usuários no Atlas — esta é a prova de que os dados vieram
```

Pra checar **pelo IP**, do seu Mac, antes de mexer no DNS, ligue o bloco de
bootstrap do Caddy (HTTP puro, sem TLS):

```bash
echo 'BOOTSTRAP_HOST=<IP_DA_BOX>' >> .env && docker compose up -d caddy
# do seu Mac:
curl http://<IP_DA_BOX>/healthz      # ok
curl http://<IP_DA_BOX>/api/health   # {"status":"ok",...}
```

Remova a linha `BOOTSTRAP_HOST` depois que o DNS estiver apontado — o site público
é o bloco de cima do `Caddyfile`, com TLS.

---

## 2. DNS + HTTPS (Caddy)

Quem fica público é o **Caddy** (80/443): TLS automático via Let's Encrypt e proxy
pro `web:3000`, com upgrade de WebSocket de fábrica (Socket.IO funciona sem config
extra). Config em `Caddyfile`, domínio e e-mail vêm do `.env`
(`BETA_DOMAIN` / `ACME_EMAIL`).

1. Baixe o **TTL** do registro pra 300s algumas horas antes — a troca propaga rápido.
2. Aponte o **A record**: `beta.zaeon.space → <IP_DA_BOX>`.
3. Confirme e verifique:
   ```bash
   dig +short beta.zaeon.space          # → o IP novo
   curl -s https://beta.zaeon.space/healthz      # ok
   curl -s https://beta.zaeon.space/api/health   # {"status":"ok","commit":"<sha>",...}
   ```
4. Abra 80, 443 e a porta do SSH no firewall da box, se houver.

O certificado sai sozinho em segundos depois que o DNS resolve. Como o domínio não
muda, o OAuth do Google não precisa de nada.

---

## 3. Ligar o CD (GitHub Actions)

Em **Settings → Secrets and variables → Actions**:

| Secret                    | Valor                                              |
|---------------------------|----------------------------------------------------|
| `VPS_HOST`                | IP da box                                          |
| `VPS_PORT`                | `22` (a box antiga da Hostinger usava `22022`)     |
| `VPS_USER`                | `root`                                             |
| `VPS_SSH_KEY`             | conteúdo da **chave privada** (`~/.ssh/zaeon_vps`) |
| `DEPLOY_PATH`             | caminho do clone (ex.: `/root/zaeon-os`)           |
| `GOOGLE_CREDENTIALS_B64`  | base64 do JSON da service account (Vertex)         |
| `GOOGLE_PROJECT_ID_VALUE` | id do projeto GCP                                  |

Via CLI:

```bash
gh secret set VPS_HOST    -R web3-engineer/zaeon-os --body '<IP_DA_BOX>'
gh secret set VPS_PORT    -R web3-engineer/zaeon-os --body '22'
gh secret set VPS_USER    -R web3-engineer/zaeon-os --body 'root'
gh secret set DEPLOY_PATH -R web3-engineer/zaeon-os --body '/root/zaeon-os'
gh secret set VPS_SSH_KEY -R web3-engineer/zaeon-os < ~/.ssh/zaeon_vps
```

> **Ordem importa.** Trocar `VPS_HOST` pra uma box que ainda não tem o repo clonado
> faz o próximo push na `main` falhar no deploy — e o deploy pra box antiga para na
> mesma hora. Vire os secrets **depois** que o bring-up passou.

Teste sem esperar um push: *Actions → Deploy (VPS) → Run workflow*.
Sem os secrets, o job loga um aviso e pula (não falha o pipeline).

Pronto: push em `main` dispara o deploy. Mudança só de `.md`/`docs/` não redeploya.

---

## 4. Operação

```bash
make ps | make logs | make health | make ready
make restart                 # recria os containers
make deploy                  # pull + up (deploy manual)
```

**Rollback do harness** (app segue no ar, camada agêntica desliga):
```bash
sed -i 's/^AURA_HARNESS=.*/AURA_HARNESS=0/' .env
docker compose -f docker-compose.beta.yml up -d --force-recreate web
```

**Deploy quebrou:** o container antigo continua servindo até o novo subir.
`docker compose logs -f web` mostra o erro.

**RAM:** o compose é box-agnóstico. Defaults = perfil de 8 GB (~5.2g de teto).
Numa box ≥16 GB o `vps-bringup.sh` escreve o perfil folgado no `.env`
(`MEM_WEB=4g MEM_VOICE=3g MEM_ABNT=2g MEM_PDF=2g MEM_REDIS=512m`, ~11.75g).
Limite é **teto, não reserva**.

---

## 5. Segurança

- `.env` e `.env.secrets` estão no `.gitignore` e no `.dockerignore` — segredos
  nunca vão pro git nem pra imagem.
- `.env.example` é o contrato das chaves, sem valores.
- `PUSHER_SECRET` e afins são server-only: não entram como build-arg.
- Super admins: ver `lib/auth/roles.ts`.
