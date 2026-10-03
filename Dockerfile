# syntax=docker/dockerfile:1.6
# Imagem do `web` (Next 14 + custom server com Socket.IO em server.js).
#
# NOTA (importante): NÃO usamos `output: standalone`. Standalone só inclui o que o Next
# traça — e o `socket.io` é usado pelo server.js (custom server), fora do grafo do Next,
# então ficaria de fora e a imagem subiria quebrada. Por isso carregamos as deps de fato.
# Debian slim (não alpine) p/ evitar dores com binários nativos (sharp, three, etc.).

# ───────────────────────── Stage 1: builder ─────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app
# Placeholders SÓ de build: prisma generate e o next build (que importa as rotas, e
# o src/lib/db.ts lança erro se MONGODB_URI estiver vazio). Os valores REAIS entram
# em runtime via env_file (.env). Estes placeholders nunca conectam em nada.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="mongodb://placeholder:27017/build" \
    MONGODB_URI="mongodb://placeholder:27017/build" \
    NEXTAUTH_SECRET="build-placeholder" \
    NEXTAUTH_URL="http://localhost:3000"

# openssl/ca-certificates: o Prisma precisa pra gerar/rodar o engine no Debian slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# npm install (não `npm ci`): resolve sem exigir o lock 100% sincronizado e tolera
# conflitos de peer (wagmi/aptos/web3). --ignore-scripts: NÃO roda o postinstall
# (`prisma generate`) aqui, porque o schema ainda não foi copiado — geramos depois.
RUN npm install --no-audit --no-fund --legacy-peer-deps --ignore-scripts
COPY . .
# Pusher (realtime) — variáveis NEXT_PUBLIC_* são EMBUTIDAS no build do Next, então
# precisam existir AQUI (build-arg), não bastam em runtime. Vêm do .env via compose
# (build.args). Vazias por padrão → o client tem guard e degrada sem realtime, nunca
# quebra. NUNCA passe o PUSHER_SECRET aqui (secret é server-only, fica só em runtime).
ARG NEXT_PUBLIC_PUSHER_KEY=""
ARG NEXT_PUBLIC_PUSHER_CLUSTER=""
ENV NEXT_PUBLIC_PUSHER_KEY=$NEXT_PUBLIC_PUSHER_KEY \
    NEXT_PUBLIC_PUSHER_CLUSTER=$NEXT_PUBLIC_PUSHER_CLUSTER
# Escritório coworking (flags de BUILD — embutidas no bundle; sem isto a aba fica a antiga).
# Vêm do .env do VPS via compose (build.args). Off por padrão → nada muda até ligar.
ARG NEXT_PUBLIC_ESCRITORIO_COWORK=""
ARG NEXT_PUBLIC_AGENTS_ADMIN=""
ARG NEXT_PUBLIC_AGENT_AVATARS=""
# Sala de Pesquisa unificada (Estudos + Pesquisa, sub-abas). Mesma mecânica: off por padrão.
ARG NEXT_PUBLIC_UNIFIED_RESEARCH_ROOM=""
ARG NEXT_PUBLIC_MAP_HARNESS=""
ENV NEXT_PUBLIC_ESCRITORIO_COWORK=$NEXT_PUBLIC_ESCRITORIO_COWORK \
    NEXT_PUBLIC_AGENTS_ADMIN=$NEXT_PUBLIC_AGENTS_ADMIN \
    NEXT_PUBLIC_AGENT_AVATARS=$NEXT_PUBLIC_AGENT_AVATARS \
    NEXT_PUBLIC_UNIFIED_RESEARCH_ROOM=$NEXT_PUBLIC_UNIFIED_RESEARCH_ROOM \
    NEXT_PUBLIC_MAP_HARNESS=$NEXT_PUBLIC_MAP_HARNESS
# agora o prisma/schema.prisma já está na imagem → gera o client e builda.
RUN npx --yes prisma generate && npm run build

# ───────────────────────── Stage 2: runtime ─────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# openssl + ca-certificates no RUNTIME (não só no build): o Prisma detecta a versão do
# openssl em runtime pra localizar o Query Engine. Sem isso a detecção caía em
# debian-openssl-1.1.x e não achava o engine → toda query Prisma dava 500.
# ffmpeg: montagem do Vídeo Overview do Studio (slides Imagen + narração → mp4).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 10001 zaeon
# Copia o app já buildado + node_modules (inclui socket.io e o client Prisma gerado)
COPY --from=builder /app ./
USER zaeon

EXPOSE 3000
# start do package.json: NODE_ENV=production node server.js
CMD ["node", "server.js"]
