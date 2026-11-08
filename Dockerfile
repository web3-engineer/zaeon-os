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
# chat único: a Sala de Pesquisa vira o modo pesquisa do chat da Aura (lib/chat/chatUnico.ts)
ARG NEXT_PUBLIC_CHAT_UNICO=""
ARG NEXT_PUBLIC_BLUEPRINT_PRATICO=""
ARG NEXT_PUBLIC_VIDEO_DOC=""
ARG NEXT_PUBLIC_LOUNGE_3D=""
ARG NEXT_PUBLIC_CYBER_AVATAR_GLB=""
ARG NEXT_PUBLIC_CYBER_LANDMARKS=""
ARG NEXT_PUBLIC_AURA_ECONOMY=""
# Realtime do cyberespaço: "pusher" (padrão) | "colyseus"; voz push-to-talk "on" | "off" (só com colyseus)
ARG NEXT_PUBLIC_REALTIME=""
ARG NEXT_PUBLIC_VOZ=""
ARG NEXT_PUBLIC_COLYSEUS_URL=""
ARG NEXT_PUBLIC_MOBILE_UI=""
ARG NEXT_PUBLIC_PROJETOS=""
# PR-A2: aba "Mentores" (/mentores + rebrand da loja). Off por padrão.
ARG NEXT_PUBLIC_MENTORES_TAB=""
# Octa Code: painel /octa/saude + cron de evals (a IDE em si vem pelo Marketplace, sem flag). Off por padrão.
ARG NEXT_PUBLIC_OCTA_CODE=""
# Blueprint REA (engenharia reversa, lib/rea-blueprint) — par do REA_BLUEPRINT de runtime. Off por padrão.
ARG NEXT_PUBLIC_REA_BLUEPRINT=""
ENV NEXT_PUBLIC_ESCRITORIO_COWORK=$NEXT_PUBLIC_ESCRITORIO_COWORK \
    NEXT_PUBLIC_AGENTS_ADMIN=$NEXT_PUBLIC_AGENTS_ADMIN \
    NEXT_PUBLIC_AGENT_AVATARS=$NEXT_PUBLIC_AGENT_AVATARS \
    NEXT_PUBLIC_UNIFIED_RESEARCH_ROOM=$NEXT_PUBLIC_UNIFIED_RESEARCH_ROOM \
    NEXT_PUBLIC_MAP_HARNESS=$NEXT_PUBLIC_MAP_HARNESS \
    NEXT_PUBLIC_CHAT_UNICO=$NEXT_PUBLIC_CHAT_UNICO \
    NEXT_PUBLIC_BLUEPRINT_PRATICO=$NEXT_PUBLIC_BLUEPRINT_PRATICO \
    NEXT_PUBLIC_VIDEO_DOC=$NEXT_PUBLIC_VIDEO_DOC \
    NEXT_PUBLIC_LOUNGE_3D=$NEXT_PUBLIC_LOUNGE_3D \
    NEXT_PUBLIC_CYBER_AVATAR_GLB=$NEXT_PUBLIC_CYBER_AVATAR_GLB \
    NEXT_PUBLIC_CYBER_LANDMARKS=$NEXT_PUBLIC_CYBER_LANDMARKS \
    NEXT_PUBLIC_AURA_ECONOMY=$NEXT_PUBLIC_AURA_ECONOMY \
    NEXT_PUBLIC_REALTIME=$NEXT_PUBLIC_REALTIME \
    NEXT_PUBLIC_VOZ=$NEXT_PUBLIC_VOZ \
    NEXT_PUBLIC_COLYSEUS_URL=$NEXT_PUBLIC_COLYSEUS_URL \
    NEXT_PUBLIC_MOBILE_UI=$NEXT_PUBLIC_MOBILE_UI \
    NEXT_PUBLIC_PROJETOS=$NEXT_PUBLIC_PROJETOS \
    NEXT_PUBLIC_MENTORES_TAB=$NEXT_PUBLIC_MENTORES_TAB \
    NEXT_PUBLIC_OCTA_CODE=$NEXT_PUBLIC_OCTA_CODE \
    NEXT_PUBLIC_REA_BLUEPRINT=$NEXT_PUBLIC_REA_BLUEPRINT
# agora o prisma/schema.prisma já está na imagem → gera o client e builda.
RUN npx --yes prisma generate && npm run build

# ───────────────────────── Stage 1b: CAD (SolidCraft CLI, Rust) ─────────────────────────
# O binário `solidcraft-cli` do conector CAD do Eiffel (lib/cad/mcp.ts). Compilado AQUI, no deploy,
# e só o binário vai pra imagem final (o target/ de ~3,5 GB fica neste estágio). Build de IMAGEM, não
# de runtime: acontece uma vez, não por turno. Medido (handoff §1, 4 vCPU): ~16 min de parede, exit 0,
# sem placa — a screenshot cai no rasterizador de CPU, e modelar + exportar STEP roda headless.
#
# PINADO POR COMMIT, nunca `main`: 0.40.0-rc.3 é release candidate. Clona a tag (raso, rápido) e AFIRMA
# o SHA — se a tag for movida, o build falha alto em vez de compilar outro commit em silêncio.
# docs/building.md do SolidCraft não declara dependência de sistema: é `cargo build` e pronto, e a
# imagem `rust:1-bookworm` (full) já traz git + toolchain (rust-version mínimo do crate = 1.95).
FROM rust:1-bookworm AS cad
WORKDIR /src
ARG SOLIDCRAFT_TAG=v0.40.0-rc.3
ARG SOLIDCRAFT_SHA=7001949c49e211a430fe4747221589b2b9384f2c
RUN git clone --depth 1 --branch "$SOLIDCRAFT_TAG" https://github.com/tangency-labs/solidcraft . \
    && test "$(git rev-parse HEAD)" = "$SOLIDCRAFT_SHA" \
       || { echo "ABORTANDO: $SOLIDCRAFT_TAG != $SOLIDCRAFT_SHA (tag movida?)"; exit 1; }
# Features padrão (raytrace-cpu + profile) — o que foi medido funcionando headless. strip OBRIGATÓRIO:
# o perfil release vem [optimized + debuginfo], 646 MB → ~134 MB sem os símbolos.
RUN cargo build --release -p solidcraft-cli \
    && strip target/release/solidcraft-cli

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
# chromium + fontes: captura de tela da página do Octa pro agente (lib/octa/captura.ts, via puppeteer-core).
# O sandbox do Chromium não sobe aqui (usuário não-root, sem user namespaces no seccomp padrão do Docker):
# OCTA_CHROMIUM_SEM_SANDBOX=1 liga --no-sandbox, aceitável SÓ com as camadas do captura.ts juntas
# (JS desligado, rede em allowlist + DNS travado, sem navegação/file:, contexto novo por captura, teto de tempo).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates ffmpeg \
       chromium fonts-liberation fonts-noto-core fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*
ENV OCTA_CHROMIUM_PATH=/usr/bin/chromium \
    OCTA_CHROMIUM_SEM_SANDBOX=1

RUN useradd --create-home --uid 10001 zaeon
# O binário do CAD (SolidCraft CLI) — SÓ o binário, strippado, do estágio `cad`. Absoluto de
# propósito: a entrada do catálogo (lib/cad/mcp.ts) aponta pra /usr/local/bin/solidcraft-cli.
COPY --from=cad /src/target/release/solidcraft-cli /usr/local/bin/solidcraft-cli
# Copia o app já buildado + node_modules (inclui socket.io e o client Prisma gerado)
COPY --from=builder /app ./
# /app/.studio é o volume dos arquivos gravados pelo app (Studio, aulas, cartolina, músicas do lounge). O processo
# roda como `zaeon`: a pasta tem que ser DELE — volume novo herda o dono daqui; o que já existe o deploy acerta
# (chown no deploy.yml). Sem isso, toda gravação dava EACCES → 500.
RUN mkdir -p /app/.studio && chown -R zaeon:zaeon /app/.studio
# Cache do otimizador de imagem do Next (/app/.next/cache/images): sem dono `zaeon`, cada <Image> dava
# "Failed to write image to cache … EACCES" e era REotimizada a cada pedido (CPU à toa, imagem lenta).
RUN mkdir -p /app/.next/cache/images && chown -R zaeon:zaeon /app/.next/cache
# /app/public/models/body é o volume da GEOMETRIA do Atlas do Corpo (31,4 MB, 15 pedaços .bin.gz).
# Vazio na imagem de propósito: quem o enche é infra/anatomia-geometria.mjs, uma vez, no deploy.
# Mesma regra do .studio acima — o volume novo herda ESTE dono, e sem ele a gravação daria EACCES.
# O manifesto (public/models/atlas.json) NÃO está aqui: ele é versionado e vem na imagem, e é por
# isso que a busca anatômica do mentor funciona mesmo com este volume vazio.
RUN mkdir -p /app/public/models/body && chown -R zaeon:zaeon /app/public/models
# /app/cad é a RAIZ do sandbox do SolidCraft (--allow-path em lib/cad/mcp.ts): os designs descartáveis
# de cada conversa vivem em /app/cad/<escopo>. Dono `zaeon` (o processo é dele) — volume novo herda
# este dono, igual ao .studio. Deve existir antes do primeiro `export`/`save`, senão daria EACCES.
RUN mkdir -p /app/cad && chown -R zaeon:zaeon /app/cad
USER zaeon

EXPOSE 3000
# start do package.json: NODE_ENV=production node server.js
CMD ["node", "server.js"]
