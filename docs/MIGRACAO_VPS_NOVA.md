# MIGRAÇÃO — Zaeon pro servidor novo (Hostinger caiu → VPS própria)

> **Contexto (2026-09-03).** A beta na Hostinger ficou fora do ar (`/api/health` = timeout; os 4
> deploys do dia falharam com `dial tcp: i/o timeout` no SSH; o último deploy verde era de 29/jul).
> **Dados NÃO se perderam** — o Mongo é Atlas externo: usuários, estudos, conversas e memória estão
> salvos. Perdemos só o host da aplicação. Migramos pra VPS própria **`75.119.140.97`** (24 GB / 300 GB)
> mantendo o **mesmo domínio** (`beta.zaeon.space`) → só repontar DNS; OAuth não muda.
> De brinde sobe tudo que já está em `main`: harness visível (#117), Mentores backend + UI (#118/#119)
> e o deploy com `db push` + flag (#120). 🔒 = passo humano/credencial (Martinez).
>
> **Atalho:** `scripts/bootstrap-vps.sh` faz os passos 1, 3 e 4 sozinho (idempotente) e pára
> dizendo o que falta no `.env`. O que sobra é DNS, índices Atlas e secrets do GitHub.

## 0. O que você precisa ter em mãos (🔒)
- SSH na `75.119.140.97` (root ou sudo).
- **Connection string do Atlas — a MESMA de antes** (é o que preserva os dados) → `DATABASE_URL` e `MONGODB_URI`.
- Credencial Vertex (`GOOGLE_CREDENTIALS` JSON + `GOOGLE_PROJECT_ID`) — a IA inteira depende disto.
- OAuth Google (`GOOGLE_CLIENT_ID`/`SECRET`) — o mesmo app; e o `NEXTAUTH_SECRET` antigo, se tiver.
- Acesso ao DNS de `zaeon.space` (registro A de `beta`).
- Acesso aos secrets do GitHub (pro deploy futuro mirar a box nova).
- `main` já tem #117/#118/#119/#120 mergeadas (`c8a0ee7`+). Só falta a **#116** (script dos índices Atlas) — mergeie ou use o script direto da branch.

## 1. Provisionar a box (🔒 SSH · o script faz o resto)
```bash
ssh root@75.119.140.97
curl -fsSL https://raw.githubusercontent.com/web3-engineer/zaeon-os/main/scripts/bootstrap-vps.sh | sudo bash
```
Instala Docker + Compose v2 + git, abre 22/80/443 no ufw, clona em `/opt/zaeon-os` (`DEPLOY_PATH=` muda),
cria `.env` do template e **pára** pedindo o passo 2. (Se a porta SSH não for 22, `ufw allow <porta>/tcp` antes.)

## 2. `.env` com o MESMO Atlas (🔒 — preserva os dados)
Edite `/opt/zaeon-os/.env` (já criado do `.env.example`). Essenciais:
```
DATABASE_URL="mongodb+srv://…@cluster…/zaeon?…"   # o MESMO cluster/DB de prod (dados intactos)
MONGODB_URI="idem"
NEXTAUTH_URL="https://beta.zaeon.space"            # MESMO domínio → OAuth NÃO muda
NEXTAUTH_SECRET="<o mesmo de antes = sessões continuam; novo (openssl rand -base64 32) = todo mundo re-loga>"
GOOGLE_CLIENT_ID=…  GOOGLE_CLIENT_SECRET=…          # OAuth (o mesmo app Google)
GOOGLE_PROJECT_ID=…  GOOGLE_LOCATION=us-central1
GEMINI_MODEL=… GEMINI_MODEL_FLASH=… GEMINI_MODEL_PRO=…
AURA_HARNESS=1                                     # tudo ativado (o script/deploy já garantem)
BETA_DOMAIN="beta.zaeon.space"  ACME_EMAIL="…"     # Caddy/Let's Encrypt (defaults já são estes)
```
`GOOGLE_CREDENTIALS` (JSON multiline) vai em **`.env.secrets`**, em uma linha, entre aspas simples:
```
GOOGLE_CREDENTIALS='{"type":"service_account","project_id":"…","private_key":"-----BEGIN…\n…","client_email":"…"}'
```
(Tem o base64 do secret do GitHub? `echo "$B64" | base64 -d | tr -d '\n'`.) O compose lê `env_file: [.env, .env.secrets]`
— **`.env.secrets` precisa existir** (o script já faz `touch`). Nenhum dos dois é commitado.
Tinha o `.env` antigo salvo? Reuse; só o que é específico de host muda (nada, na prática).

## 3. Migrar dados? Não — o Atlas é o mesmo
Sem dump/restore: apontando pro mesmo `DATABASE_URL`, os dados já estão lá. O que **não** vem: cache Redis
(efêmero, ok) e os artefatos do Studio no volume `studio_data` da Hostinger (podcasts/imagens antigos —
regeneráveis, perda aceitável).

## 4. Subir a stack + schema aditivo
Rode o script de novo (agora com o `.env` preenchido) — ele faz `up --build`, `prisma db push` e o health:
```bash
sudo bash /opt/zaeon-os/scripts/bootstrap-vps.sh
```
Manual, se preferir:
```bash
cd /opt/zaeon-os && export COMPOSE_FILE=docker-compose.beta.yml
docker compose up -d --build && docker compose up -d --force-recreate web
docker compose exec -T web npx prisma db push --skip-generate   # aditivo; recusa destrutivo
docker compose logs -f web caddy
```
`db push` cria `mentor_templates` (slug único), `plugged_mentors` (único composto), `users.activeMentorId`
e as coleções da memória. O catálogo dos 13 Mentores **semeia sozinho** no 1º `GET /api/mentors`.

### 4b. Índices Atlas da memória (🔒 mongosh · o gate que mata a memória em silêncio)
`db push` não cria índices Atlas Search. Sem eles o recall/L3 degrada silencioso (o chat responde, mas
sem memória). Rode **uma vez** contra o mesmo cluster:
```bash
mongosh "<ATLAS_SRV_URI>/<DB>" scripts/atlas-memory-indexes.mongo.js   # PR #116 (ou Atlas UI → Search → JSON)
```
Cria `memory_drawers_vec` (1536d, cosine, filter `userId`) e `memory_drawers_text` (text/room/wingLabel).
Ficam `queryable` em ~1–2 min. Idempotente.

## 5. Repontar o DNS (🔒 — o cutover)
No painel de DNS de `zaeon.space`: registro **A** de `beta` → `75.119.140.97` (era o IP da Hostinger).
- Baixe o TTL antes (300 s) pra propagar rápido. Confirme: `dig +short beta.zaeon.space` → `75.119.140.97`.
- O Caddy reemite o HTTPS de `beta.zaeon.space` sozinho na box nova (Let's Encrypt) — acompanhe com
  `docker compose logs -f caddy`. Precisa das portas 80/443 abertas e do DNS já apontando.
- Domínio igual → o redirect do OAuth Google não muda — nada a reconfigurar.

## 6. Secrets do GitHub (🔒 — deploy futuro)
Settings → Secrets and variables → Actions:
`VPS_HOST=75.119.140.97` · `VPS_PORT=22` (ou a sua) · `VPS_USER=root` · `VPS_SSH_KEY=<chave PRIVADA com acesso à box>`
· `DEPLOY_PATH=/opt/zaeon-os`. A partir daí, push em `main` deploya aqui **e já roda `db push` + flag** (#120).
Ops sem redeploy (flag on/off, `db push`, recreate): Actions → "Harness (VPS ops)" → Run workflow.

## 7. Smoke (pós-cutover)
1. `curl -s https://beta.zaeon.space/api/health` → `{"status":"ok","commit":"<sha da main>","harness":"on",...}`.
2. Login (OAuth funciona — mesmo domínio). Uma conversa na Sala de Estudos → **resposta estruturada** (cartão, não texto achatado).
3. Plugin Store → **Mentores** → Plugar Kekulé → seletor ⟁ mostra "Kekulé · Farmácia" → *"me explica a cafeína"* → voz de farmácia + imagem inline. Skill sem runtime aparece como "em breve".
4. 2ª conta não vê o mentor nem a memória da 1ª.
5. `docker compose logs --tail=200 web` sem stack não tratado.

## 8. Rollback / rede de segurança
- Harness torto → `sed -i 's/^AURA_HARNESS=.*/AURA_HARNESS=0/' .env && docker compose up -d --force-recreate web`
  (app segue no ar, chat legado). Religar: `=1` + recreate.
- Box nova com problema grave → repontar o DNS de volta pra Hostinger se ela voltar; senão, corrigir na box (temos SSH).
- Código: `git revert` do merge + push (deploya sozinho quando os secrets do §6 estiverem no lugar).
- Dados nunca em risco (Atlas externo; `db push` recusa destrutivo).

## 9. Ordem executável
1. `main` pronta (feito). 2. Box + `.env` (§1–§2). 3. `up --build` + `db push` (§4) + índices Atlas (§4b).
4. DNS (§5). 5. Secrets do GitHub (§6). 6. Smoke (§7). 7. Watch.

## 10. Fronteira
Fable escreveu o runbook e o script; o executor/Martinez roda os passos 🔒 (SSH/creds/DNS/secrets).
Assim que a box responder em `beta.zaeon.space`, a Zaeon volta — já com os Mentores e o harness no ar.
