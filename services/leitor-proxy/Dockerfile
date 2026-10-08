# Leitor (Fatia 7, G6): Node 20, zero dependência, sem credencial. Ver server.mjs.
FROM node:20-alpine
WORKDIR /app
COPY guarda.mjs server.mjs ./
ENV NODE_ENV=production PORT=8787
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "server.mjs"]
