# Motor do REA (engenharia reversa) — roda SÓ na Contabo, exposto só na Tailscale (docs/OCTA_REA.md).
# node:22 (REA exige ^22.23.4) + JDK 21 + Ghidra 12.1.4 + binwalk/unblob + rea-agents + a ponte fina.
FROM node:22-bookworm

ARG REA_VERSION=6.9.0
ARG GHIDRA_VERSION=12.1.4
ARG GHIDRA_RELEASE=20260921

ENV DEBIAN_FRONTEND=noninteractive
# JDK 21 (Temurin), unzip, binwalk/unblob e deps nativas de firmware; python p/ unblob
RUN apt-get update && apt-get install -y --no-install-recommends \
      wget unzip ca-certificates gnupg python3 python3-pip python3-venv \
      binwalk p7zip-full file xz-utils zstd lz4 procps \
    && mkdir -p /etc/apt/keyrings \
    && wget -qO- https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" > /etc/apt/sources.list.d/adoptium.list \
    && apt-get update && apt-get install -y --no-install-recommends temurin-21-jdk \
    && rm -rf /var/lib/apt/lists/*
ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64
ENV PATH="$JAVA_HOME/bin:$PATH"

# Android/JADX is a separate provider: Ghidra does not supply it. rea-agents 6.9.0 audits exactly
# this jar (dist/android/JadxRelease.js: version 0.7.1, same sha256, revision 5844800) — unchanged
# from 6.5.0, so no re-pin. "JADX 1.5.6" in the skill is the engine bundled inside this 0.7.1 wrapper.
RUN mkdir -p /opt/rea-android && wget -q https://github.com/1013503897/jadx-headless-mcp/releases/download/v0.7.1/jadx-headless-mcp-0.7.1-all.jar -O /opt/rea-android/jadx.jar \
    && echo '6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75  /opt/rea-android/jadx.jar' | sha256sum -c -
ENV REA_JADX_MCP_JAR=/opt/rea-android/jadx.jar

# unblob (firmware) num venv isolado — opcional; não derruba o build se falhar
RUN python3 -m venv /opt/unblob && (/opt/unblob/bin/pip install --no-cache-dir unblob || echo "unblob falhou — segue sem") 
ENV PATH="/opt/unblob/bin:$PATH"

# Ghidra (bring-your-own do REA) — release oficial do GitHub
RUN cd /opt && wget -q "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_${GHIDRA_VERSION}_build/ghidra_${GHIDRA_VERSION}_PUBLIC_${GHIDRA_RELEASE}.zip" -O ghidra.zip \
    && unzip -q ghidra.zip && rm ghidra.zip && mv ghidra_${GHIDRA_VERSION}_PUBLIC /opt/ghidra
ENV GHIDRA_INSTALL_DIR=/opt/ghidra

# REA, pinado na MESMA versão da skill vendorizada no app (vendor/skills/reverse-engineer-anything)
RUN npm i -g rea-agents@${REA_VERSION} && rea --version

# Navegador do caminho WEB (`analyze-web-bundle <url>` — infra/rea-engine/web-bundle.mjs): o REA só analisa uma página
# por CDP no loopback. Camada própria, depois do REA, pra não invalidar o cache do JDK/Ghidra. Toda saída dele passa
# pelo proxy de saída da ponte (barra IP interno/tailnet); o CDP fica só no 127.0.0.1 do container.
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/* && chromium --version
ENV REA_CHROMIUM=chromium

# a ponte fina (HTTP → CLI do REA), roda como usuário sem privilégio
RUN useradd -m -u 10001 rea && mkdir -p /work && chown rea:rea /work
COPY bridge.mjs /app/bridge.mjs
COPY android-request.mjs /app/android-request.mjs
COPY web-bundle.mjs /app/web-bundle.mjs
USER rea
WORKDIR /work
ENV REA_BRIDGE_PORT=8799
EXPOSE 8799
CMD ["node", "/app/bridge.mjs"]
