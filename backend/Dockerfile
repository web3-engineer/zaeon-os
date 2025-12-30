FROM node:20-alpine

WORKDIR /app

# Copia apenas o necessário para instalar deps
COPY package*.json ./
RUN npm install

# Copia o código e o tsconfig
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript -> dist
RUN npm run build

ENV NODE_ENV=production
# Cloud Run define PORT automaticamente
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "start"]