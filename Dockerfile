FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24-slim

LABEL org.opencontainers.image.source="https://github.com/navikt/poao-frontend"

WORKDIR /app

COPY node_modules ./node_modules
COPY package.json ./
COPY build ./

USER node

CMD ["node", "/app/server.js"]
