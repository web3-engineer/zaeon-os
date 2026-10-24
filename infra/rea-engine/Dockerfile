# Motor do REA (engenharia reversa) — roda SÓ na Contabo, exposto só na Tailscale (docs/OCTA_REA.md).
# node:22 (REA exige 22+) + JDK 21 (Ghidra 11) + Ghidra + binwalk/unblob + rea-agents + a ponte fina.
FROM node:22-bookworm

ARG REA_VERSION=6.5.0
ARG GHIDRA_VERSION=12.2
ARG GHIDRA_RELEASE=20261016

ENV DEBIAN_FRONTEND=noninteractive
# JDK 21 (Temurin), unzip, binwalk/unblob e deps nativas de firmware; python p/ unblob
RUN apt-get update && apt-get install -y --no-install-recommends \
      wget unzip ca-certificates gnupg python3 python3-pip python3-venv \
      binwalk p7zip-full file xz-utils zstd lz4 \
    && mkdir -p /etc/apt/keyrings \
    && wget -qO- https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" > /etc/apt/sources.list.d/adoptium.list \
    && apt-get update && apt-get install -y --no-install-recommends temurin-21-jdk \
    && rm -rf /var/lib/apt/lists/*
ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64
ENV PATH="$JAVA_HOME/bin:$PATH"

# unblob (firmware) num venv isolado — opcional; não derruba o build se falhar
RUN python3 -m venv /opt/unblob && (/opt/unblob/bin/pip install --no-cache-dir unblob || echo "unblob falhou — segue sem") 
ENV PATH="/opt/unblob/bin:$PATH"

# Ghidra (bring-your-own do REA) — release oficial do GitHub
RUN cd /opt && wget -q "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_${GHIDRA_VERSION}_build/ghidra_${GHIDRA_VERSION}_PUBLIC_${GHIDRA_RELEASE}.zip" -O ghidra.zip \
    && unzip -q ghidra.zip && rm ghidra.zip && mv ghidra_${GHIDRA_VERSION}_PUBLIC /opt/ghidra
ENV GHIDRA_INSTALL_DIR=/opt/ghidra

# REA, pinado na MESMA versão da skill vendorizada no app (vendor/skills/reverse-engineer-anything)
RUN npm i -g rea-agents@${REA_VERSION} && rea --version

# a ponte fina (HTTP → CLI do REA), roda como usuário sem privilégio
RUN useradd -m -u 10001 rea && mkdir -p /work && chown rea:rea /work
COPY bridge.mjs /app/bridge.mjs
USER rea
WORKDIR /work
ENV REA_BRIDGE_PORT=8799
EXPOSE 8799
CMD ["node", "/app/bridge.mjs"]
