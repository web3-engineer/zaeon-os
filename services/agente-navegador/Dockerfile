# Agente de navegador (F9): Chromium headless, SOMENTE LEITURA, SEM CREDENCIAL.
#
# CONTEXTO DE BUILD = ./services (não ./services/agente-navegador), porque este serviço importa
# `../leitor-proxy/guarda.mjs` — a MESMA política de rede que o Leitor roda em produção e que o web
# usa. Três consumidores, uma definição; copiar o arquivo criaria a terceira versão de "que domínio
# pode", e a que ficasse velha seria a que concede.
#
# DEBIAN E NÃO ALPINE, de propósito: esta é a receita de Chromium que a imagem principal deste
# repositório JÁ roda em produção (Dockerfile da raiz, usada pela captura do Octa), com os mesmos
# nomes de pacote. A imagem fica maior que o equivalente Alpine; em troca, o primeiro deploy não é
# também o primeiro teste de uma combinação nova de libc + Chromium + puppeteer.
FROM node:20-slim

# chromium + fontes: as mesmas linhas da imagem principal (fontes faltando → screenshot com
# retângulos no lugar de texto, que é falha silenciosa: o HTML lê certo e a foto mente).
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates chromium fonts-liberation fonts-noto-core fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# puppeteer-core PINADO na mesma versão da raiz (24.43.1). Duas versões de driver falando com o
# mesmo Chromium é defeito que só aparece em produção.
COPY agente-navegador/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Caminho ABSOLUTO: o `server.mjs` vive em /app e importa "../leitor-proxy/guarda.mjs", que resolve
# pra /leitor-proxy/guarda.mjs. (`COPY` com ".." no DESTINO não é válido — foi o primeiro jeito que
# eu escrevi, e está errado.)
COPY leitor-proxy/guarda.mjs /leitor-proxy/guarda.mjs
COPY agente-navegador/sessoes.mjs agente-navegador/server.mjs ./

# HOME em /tmp porque o container roda `read_only: true` com /tmp em tmpfs (ver compose). Sem isto
# o Chromium não tem onde escrever o perfil e morre no boot.
ENV NODE_ENV=production \
    PORT=8788 \
    HOME=/tmp \
    AGENTE_CHROMIUM_PATH=/usr/bin/chromium

# NÃO-ROOT, como o leitor-proxy. Eu havia deixado root achando que o Chromium precisaria disso pra
# escrever o perfil; o próprio leitor-proxy desmente — ele roda `USER node` com `tmpfs: [/tmp]`, que
# o compose monta 1777. Então o perfil em /tmp/perfil é gravável pelo `node` e não há motivo pra
# root. Camadas que acompanham: cap_drop ALL, no-new-privileges, read_only e ZERO credencial aqui.
USER node
EXPOSE 8788
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8788)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
