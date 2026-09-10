#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────────────
# Bring-up da Zaeon numa VPS nova — idempotente (pode rodar de novo sem medo).
#
# Roda NA BOX, como root:
#     curl -fsSL <raw do repo>/scripts/vps-bringup.sh -o bringup.sh
#     bash bringup.sh
#   ou, com o repo já clonado:  bash scripts/vps-bringup.sh
#
# O que faz:  docker → clone/atualiza repo → confere .env → sobe compose →
#             prisma db push (aditivo) → verifica app + Atlas.
# O que NÃO faz: não inventa segredos. O .env é seu; o script só valida.
#
# Variáveis (todas opcionais, com default):
#   DEPLOY_PATH=/root/zaeon-os   REPO_URL=git@github.com:web3-engineer/zaeon-os.git
#   BRANCH=main                  COMPOSE_FILE=docker-compose.beta.yml
#   SWAP_GB=4                    SKIP_BUILD=0
# ───────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/root/zaeon-os}"
REPO_URL="${REPO_URL:-git@github.com:web3-engineer/zaeon-os.git}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.beta.yml}"
SWAP_GB="${SWAP_GB:-4}"
SKIP_BUILD="${SKIP_BUILD:-0}"

# Chaves sem as quais o app sobe torto (ou nem sobe). Conferidas ANTES do build,
# que leva 10–20 min — melhor falhar em 2 segundos do que em 20 minutos.
REQUIRED_KEYS=(
  DATABASE_URL MONGODB_URI
  NEXTAUTH_URL NEXTAUTH_SECRET
  GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
  GOOGLE_PROJECT_ID GOOGLE_LOCATION
)

say()  { printf '\n\033[1;36m→ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "rode como root (sudo -i)."

# ── 1. Docker ──────────────────────────────────────────────────────────────
say "Docker"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  ok "docker + compose plugin já instalados ($(docker --version | cut -d, -f1))"
else
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  ok "docker instalado"
fi
systemctl enable --now docker >/dev/null 2>&1 || true

# ── 2. Swap (rede de segurança pro build do Next/LibreOffice) ──────────────
say "Swap"
if [ "$(swapon --show --noheadings | wc -l)" -gt 0 ]; then
  ok "swap já ativo: $(free -h | awk '/Swap/{print $2}')"
elif [ "$SWAP_GB" -gt 0 ]; then
  fallocate -l "${SWAP_GB}G" /swapfile && chmod 600 /swapfile
  mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "swap de ${SWAP_GB}G criado e persistido"
fi

# ── 3. Repo ────────────────────────────────────────────────────────────────
say "Repositório"
if [ -d "$DEPLOY_PATH/.git" ]; then
  git -C "$DEPLOY_PATH" fetch --all --prune
  git -C "$DEPLOY_PATH" reset --hard "origin/$BRANCH"
  ok "repo atualizado em $DEPLOY_PATH ($(git -C "$DEPLOY_PATH" rev-parse --short HEAD))"
else
  mkdir -p "$(dirname "$DEPLOY_PATH")"
  git clone --branch "$BRANCH" "$REPO_URL" "$DEPLOY_PATH" || die \
    "clone falhou. O repo é privado: gere a chave da box (ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N '') e cadastre a pública como Deploy Key em github.com/web3-engineer/zaeon-os/settings/keys — depois rode de novo."
  ok "repo clonado em $DEPLOY_PATH"
fi
cd "$DEPLOY_PATH"

# ── 4. .env (seu; o script só valida) ──────────────────────────────────────
say ".env"
[ -f .env ] || die \
"$DEPLOY_PATH/.env não existe. Crie-o com os segredos reais (Atlas/Vertex/OAuth) antes de rodar.
   Contrato das chaves: .env.example.  Mínimo obrigatório:
   ${REQUIRED_KEYS[*]}"

missing=()
for key in "${REQUIRED_KEYS[@]}"; do
  # presente = linha 'KEY=' com algo depois do '=' que não seja só aspas vazias
  val="$(grep -E "^${key}=" .env | head -1 | cut -d= -f2- | tr -d '"'"'"' ' || true)"
  [ -n "$val" ] || missing+=("$key")
done
[ "${#missing[@]}" -eq 0 ] || die ".env incompleto — faltam: ${missing[*]}"
ok "${#REQUIRED_KEYS[@]} chaves obrigatórias presentes"

# NEXTAUTH_URL apontando pro domínio certo evita loop de login silencioso.
nextauth_url="$(grep -E '^NEXTAUTH_URL=' .env | head -1 | cut -d= -f2- | tr -d '"'"'"' ')"
case "$nextauth_url" in
  https://*) ok "NEXTAUTH_URL = $nextauth_url" ;;
  *) warn "NEXTAUTH_URL='$nextauth_url' não é https:// — o OAuth do Google vai recusar o callback." ;;
esac

# AURA_HARNESS ligado por padrão (o deploy.yml faz o mesmo; aqui é pro 1º boot manual).
grep -q '^AURA_HARNESS=' .env || { echo 'AURA_HARNESS=1' >> .env; ok "AURA_HARNESS=1 adicionado"; }

# ── 4b. Perfil de RAM ──────────────────────────────────────────────────────
# O compose é box-agnóstico: os defaults são o perfil conservador de 8 GB.
# Numa box maior, escrevemos o perfil folgado no .env (limite é teto, não reserva).
say "Perfil de RAM"
total_gb="$(awk '/MemTotal/{printf "%d", $2/1048576}' /proc/meminfo)"
if grep -q '^MEM_WEB=' .env; then
  ok "perfil já definido no .env: $(grep -E '^MEM_' .env | tr '\n' ' ')"
elif [ "$total_gb" -ge 16 ]; then
  {
    echo ""
    echo "# Perfil de RAM (box de ${total_gb} GB) — escrito pelo vps-bringup.sh."
    echo "MEM_WEB=4g"; echo "MEM_VOICE=3g"; echo "MEM_ABNT=2g"
    echo "MEM_PDF=2g"; echo "MEM_REDIS=512m"
  } >> .env
  ok "box de ${total_gb} GB → perfil folgado (~11.75g de teto)"
else
  ok "box de ${total_gb} GB → perfil conservador (defaults do compose, ~5.2g)"
fi

# .env.secrets: o deploy do GitHub reescreve depois; aqui só garante que existe,
# senão o compose falha no env_file antes mesmo de buildar.
if [ ! -f .env.secrets ]; then
  umask 177; : > .env.secrets
  warn ".env.secrets criado vazio. GOOGLE_CREDENTIALS (Vertex) entra por aqui —
      no seu Mac:  base64 -i gcp-sa.json | tr -d '\\n'
      na box:      echo \"GOOGLE_CREDENTIALS=\$(echo '<B64>' | base64 -d | tr -d '\\n')\" > .env.secrets
      Ou deixe o primeiro deploy do GitHub Actions materializar (secret GOOGLE_CREDENTIALS_B64)."
fi
grep -q '^GIT_SHA=' .env.secrets || echo "GIT_SHA=$(git rev-parse --short HEAD)" >> .env.secrets

# ── 5. Subir ───────────────────────────────────────────────────────────────
export COMPOSE_FILE
say "Subindo containers (COMPOSE_FILE=$COMPOSE_FILE)"
if [ "$SKIP_BUILD" = "1" ]; then
  docker compose up -d --remove-orphans
else
  warn "primeira build leva 10–20 min (next build + LibreOffice + torch). Café."
  docker compose up -d --build --remove-orphans
fi
docker compose ps

# ── 6. Schema aditivo no Atlas ─────────────────────────────────────────────
say "prisma db push (aditivo — cria coleções/índices novos, não migra dados)"
if docker compose exec -T web npx prisma db push --skip-generate 2>&1 | tail -15; then
  ok "db push concluído"
else
  warn "db push falhou — o app sobe mesmo assim (rotas degradam). Veja: docker compose logs web"
fi

# ── 7. Verificação de verdade ──────────────────────────────────────────────
say "Verificando"
for i in $(seq 1 30); do
  if docker compose exec -T web node -e "fetch('http://localhost:3000/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))" 2>/dev/null; then
    break
  fi
  [ "$i" -eq 30 ] && die "web não respondeu /api/health em 5 min. Logs: docker compose logs --tail=100 web"
  sleep 10
done
echo -n "  health: "
docker compose exec -T web node -e "fetch('http://localhost:3000/api/health').then(r=>r.text()).then(t=>console.log(t))"

# O health NÃO toca o banco de propósito. Este contador é a prova de que o Atlas
# respondeu E de que os dados antigos estão lá (é a mesma connection string).
echo -n "  atlas:  "
if docker compose exec -T web node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.user.count().then(n=>{console.log('conectado —',n,'usuários no banco');process.exit(0)})
 .catch(e=>{console.error('FALHOU:',e.message);process.exit(1)});" 2>&1; then
  ok "Atlas ok"
else
  die "o app subiu mas NÃO fala com o Atlas. Confira DATABASE_URL e libere o IP $(curl -s -4 ifconfig.me 2>/dev/null || echo 'da box') no Network Access do Atlas."
fi

say "Pronto"
cat <<EOF
  A stack está de pé nesta box. O HTTPS público só funciona depois do DNS
  (o Caddy precisa do domínio resolvendo aqui pra emitir o certificado).

  Verificar pelo IP, antes do DNS (opcional):
      echo 'BOOTSTRAP_HOST=$(curl -s -4 ifconfig.me 2>/dev/null || echo SEU_IP)' >> .env
      docker compose up -d caddy
      # do seu Mac:  curl http://<IP>/healthz   → ok
  Remova a linha BOOTSTRAP_HOST do .env depois que o DNS estiver apontado.

  Próximo passo: repontar o A record de beta.zaeon.space para esta box.
EOF
