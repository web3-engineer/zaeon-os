# Motor da Forja (repo → grafo/árvore) — roda SÓ na Contabo, exposto só na Tailscale (RUNBOOK-FORJA-ENGINE.md).
# Python 3.11 + uv (graphifyy / Graphify) + Node 22 + pnpm (understand-anything) + a ponte fina.
# A Forja consome a SAÍDA dos engines (graph.json / knowledge-graph.json), nunca o código-fonte deles.
FROM node:22-bookworm

# Fixados no build (capture sha no RUNBOOK ao reconstruir). graphifyy pelo PyPI; understand por revisão git.
ARG GRAPHIFY_VERSION=
ARG UNDERSTAND_REV=main
ARG PNPM_VERSION=10.6.2

ENV DEBIAN_FRONTEND=noninteractive
# python+venv p/ uv; git/tar p/ a ponte (clone raso e tarball); build-essential p/ grammars tree-sitter sem wheel
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv python3-pip git ca-certificates curl build-essential \
    && rm -rf /var/lib/apt/lists/*

# uv (instalador isolado do Astral) e o graphifyy como ferramenta global → o CLI `graphify`
ENV UV_INSTALL_DIR=/usr/local/bin
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh
ENV PATH="/root/.local/bin:${PATH}"
RUN if [ -n "$GRAPHIFY_VERSION" ]; then uv tool install "graphifyy==${GRAPHIFY_VERSION}"; else uv tool install graphifyy; fi \
    && ln -sf /root/.local/bin/graphify /usr/local/bin/graphify \
    && graphify --version

# pnpm (via corepack do Node 22) e o Understand-Anything (plugin do Claude Code) — clona a revisão fixada e
# compila o core. A análise /understand exige Claude Code + gateway na box (provisionamento; ver RUNBOOK).
RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate
RUN git clone --depth 1 --branch "${UNDERSTAND_REV}" https://github.com/Egonex-AI/Understand-Anything /opt/understand-anything \
    || git clone --depth 1 https://github.com/Egonex-AI/Understand-Anything /opt/understand-anything
RUN cd /opt/understand-anything && (pnpm install --frozen-lockfile || pnpm install) \
    && (pnpm --filter @understand-anything/core build || echo "build do core adiado — ver RUNBOOK")

# a ponte fina (HTTP → engine), roda como usuário sem privilégio
RUN useradd -m -u 10002 forja && mkdir -p /work && chown forja:forja /work
COPY vetting.mjs /app/vetting.mjs
COPY bridge.mjs /app/bridge.mjs
COPY config /app/config
USER forja
WORKDIR /work
ENV FORJA_BRIDGE_PORT=8800
EXPOSE 8800
CMD ["node", "/app/bridge.mjs"]
