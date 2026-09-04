#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/bootstrap-vps.sh — provisiona/atualiza a BOX da beta Zaeon (VPS própria).
#
# IDEMPOTENTE: pode rodar de novo à vontade (só instala o que falta, só clona se não
# existe, nunca sobrescreve .env/.env.secrets preenchidos). Cobre os passos 1 e 4 do
# runbook docs/MIGRACAO_VPS_NOVA.md; os passos 🔒 (.env com o Atlas, DNS, secrets do
# GitHub) continuam humanos — o script PARA e diz o que falta.
#
# USO (na box, como root ou com sudo):
#   curl -fsSL https://raw.githubusercontent.com/web3-engineer/zaeon-os/main/scripts/bootstrap-vps.sh | sudo bash
#   # ou, já com o repo clonado:
#   sudo bash scripts/bootstrap-vps.sh
#
# VARS opcionais: DEPLOY_PATH (default /opt/zaeon-os) · BRANCH (default main)
#                 SKIP_FIREWALL=1 · SKIP_DB_PUSH=1 · REPO (default web3-engineer/zaeon-os)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/zaeon-os}"
BRANCH="${BRANCH:-main}"
REPO="${REPO:-web3-engineer/zaeon-os}"
export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.beta.yml}"

log()  { printf '\n\033[1;36m→ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "rode como root (ou com sudo)."

# ── 1. Docker + Compose v2 + git ─────────────────────────────────────────────
log "Docker / Compose / git"
if ! command -v docker >/dev/null 2>&1; then
  # script oficial: funciona em Ubuntu/Debian e instala o plugin compose junto
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  apt-get update -qq && (apt-get install -y -qq docker-compose-plugin || apt-get install -y -qq docker-compose-v2) \
    || die "não consegui instalar o plugin 'docker compose' (v2). Instale manualmente e rode de novo."
fi
command -v git >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq git; }
systemctl enable --now docker >/dev/null 2>&1 || true
ok "docker $(docker --version | cut -d' ' -f3 | tr -d ,) · $(docker compose version --short)"

# ── 2. Firewall (22/80/443) ──────────────────────────────────────────────────
if [ "${SKIP_FIREWALL:-0}" != "1" ]; then
  log "Firewall (ufw): 22, 80, 443"
  command -v ufw >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq ufw; }
  ufw allow 22/tcp  >/dev/null
  ufw allow 80/tcp  >/dev/null
  ufw allow 443/tcp >/dev/null
  # se a porta SSH não é a 22, libere ANTES de ativar (senão você se tranca fora):
  #   ufw allow <porta>/tcp
  ufw --force enable >/dev/null
  ok "ufw ativo: $(ufw status | grep -cE '^(22|80|443)/tcp' ) regras"
else
  warn "firewall pulado (SKIP_FIREWALL=1)"
fi

# ── 3. Código ────────────────────────────────────────────────────────────────
log "Código em $DEPLOY_PATH (branch $BRANCH)"
if [ ! -d "$DEPLOY_PATH/.git" ]; then
  git clone "https://github.com/$REPO" "$DEPLOY_PATH"
fi
cd "$DEPLOY_PATH"
git fetch --all --prune -q
git checkout -q "$BRANCH"
git reset -q --hard "origin/$BRANCH"
ok "HEAD = $(git rev-parse --short HEAD) ($(git log -1 --format=%s | cut -c1-70))"

# ── 4. .env / .env.secrets (🔒 humano preenche; o script só garante que existem) ──
log ".env / .env.secrets"
if [ ! -f .env ]; then
  cp .env.example .env
  chmod 600 .env
  warn ".env criado a partir do .env.example — PREENCHA antes de subir (ver abaixo)."
fi
touch .env.secrets && chmod 600 .env.secrets   # o compose exige que exista (env_file)
# GIT_SHA (o que /api/health mostra como commit) — mesmo padrão do deploy.yml
if grep -q '^GIT_SHA=' .env.secrets; then
  sed -i "s/^GIT_SHA=.*/GIT_SHA=$(git rev-parse --short HEAD)/" .env.secrets
else
  echo "GIT_SHA=$(git rev-parse --short HEAD)" >> .env.secrets
fi
# harness ligado (decisão: tudo ativado no deploy) — só se ausente, respeita kill-switch manual
grep -q '^AURA_HARNESS=' .env || echo "AURA_HARNESS=1" >> .env

# validação mínima do .env — pára aqui se faltar o essencial (o app não sobe sem isto)
missing=()
need() { local v; v="$(grep -E "^$1=" .env | head -1 | cut -d= -f2- | tr -d '"' )"; case "$v" in ""|*USER:PASS*|*gerar-com*) missing+=("$1");; esac; }
need DATABASE_URL; need MONGODB_URI; need NEXTAUTH_URL; need NEXTAUTH_SECRET
need GOOGLE_CLIENT_ID; need GOOGLE_CLIENT_SECRET; need GOOGLE_PROJECT_ID
if ! grep -qE '^GOOGLE_CREDENTIALS=.+' .env .env.secrets 2>/dev/null && ! grep -qE '^GOOGLE_PRIVATE_KEY=.+' .env; then
  missing+=("GOOGLE_CREDENTIALS (ou GOOGLE_CLIENT_EMAIL+GOOGLE_PRIVATE_KEY)")
fi
if [ "${#missing[@]}" -gt 0 ]; then
  printf '\n\033[1;31m✗ Faltam no %s/.env (🔒 passo 2 do runbook):\033[0m\n' "$DEPLOY_PATH"
  printf '   - %s\n' "${missing[@]}"
  cat <<EOF

   Dicas:
   · DATABASE_URL e MONGODB_URI = a MESMA connection string do Atlas de antes (é o que preserva os dados).
   · NEXTAUTH_URL = https://beta.zaeon.space (mesmo domínio → OAuth não muda).
   · NEXTAUTH_SECRET igual ao antigo mantém as sessões; novo = todo mundo re-loga (sem perder dado).
   · GOOGLE_CREDENTIALS = o JSON da service account em UMA linha (aspas simples), em .env.secrets:
       GOOGLE_CREDENTIALS='{"type":"service_account",...}'
     ou base64 → decodifique você mesmo: echo "\$B64" | base64 -d | tr -d '\n'
   Preencha e rode de novo:  sudo bash scripts/bootstrap-vps.sh
EOF
  exit 2
fi
ok ".env essencial preenchido"

# ── 5. Subir a stack ─────────────────────────────────────────────────────────
log "docker compose up -d --build ($COMPOSE_FILE) — o 1º build leva alguns minutos"
docker compose up -d --build --remove-orphans
docker compose up -d --force-recreate web
ok "containers: $(docker compose ps --format '{{.Name}}={{.State}}' | tr '\n' ' ')"

# ── 6. Schema aditivo (mesmo Atlas; nunca destrutivo) ─────────────────────────
if [ "${SKIP_DB_PUSH:-0}" != "1" ]; then
  log "prisma db push (aditivo: mentor_templates, plugged_mentors, users.activeMentorId, memory_drawers…)"
  # sem --accept-data-loss: em modo não-interativo o Prisma RECUSA mudança destrutiva
  if docker compose exec -T web npx prisma db push --skip-generate 2>&1 | tail -15; then
    ok "db push ok"
  else
    warn "db push falhou — app segue no ar; veja o erro acima (índice único? credencial do Atlas?)."
  fi
else
  warn "db push pulado (SKIP_DB_PUSH=1)"
fi

# ── 7. Health (de dentro do web; o público é só o Caddy) ──────────────────────
log "Health"
for i in 1 2 3 4 5 6; do
  if out="$(docker compose exec -T web node -e "fetch('http://localhost:3000/api/health').then(r=>r.text()).then(t=>{console.log(t);process.exit(0)}).catch(e=>{process.exit(1)})" 2>/dev/null)"; then
    ok "web /api/health → $out"; break
  fi
  [ "$i" = 6 ] && warn "web ainda não respondeu /api/health — confira: docker compose logs --tail=100 web"
  sleep 10
done

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Box pronta em $DEPLOY_PATH. Próximos passos 🔒 (docs/MIGRACAO_VPS_NOVA.md §5–§7):
  1. DNS: registro A de "beta" → $(curl -fsS -m 5 https://api.ipify.org 2>/dev/null || echo '<IP desta box>')  (TTL 300)
     · confira:  dig +short beta.zaeon.space
     · o Caddy emite o HTTPS sozinho depois que o DNS propagar (docker compose logs -f caddy)
  2. Índices Atlas da memória (senão o recall degrada em silêncio):
       mongosh "<ATLAS_SRV_URI>/<DB>" scripts/atlas-memory-indexes.mongo.js
  3. GitHub → Settings → Secrets → Actions: VPS_HOST, VPS_PORT, VPS_USER, VPS_SSH_KEY,
     DEPLOY_PATH=$DEPLOY_PATH  → push em main volta a deployar aqui (com db push + flag).
  4. Smoke: curl -s https://beta.zaeon.space/api/health  → {"commit":"$(git rev-parse --short HEAD)","harness":"on",...}
Kill-switch do harness: sed -i 's/^AURA_HARNESS=.*/AURA_HARNESS=0/' .env && docker compose up -d --force-recreate web
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
