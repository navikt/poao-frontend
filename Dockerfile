FROM node:22-alpine3.21

LABEL org.opencontainers.image.source="https://github.com/navikt/poao-frontend"

WORKDIR /app

COPY node_modules ./node_modules
COPY package.json ./
COPY build ./

USER node

CMD ["node", "/app/server.js"]
