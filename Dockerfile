FROM node:18.17.1-alpine3.17 as builder

WORKDIR /app

COPY . .

RUN npm ci
RUN npm run build

FROM node:18.17.1-alpine3.17

LABEL org.opencontainers.image.source="https://github.com/navikt/poao-frontend"

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build .

USER node

CMD ["node", "/app/server.js"]
