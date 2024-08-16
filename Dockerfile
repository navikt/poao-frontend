FROM node:20-alpine3.20 AS builder

WORKDIR /app

COPY . .

RUN --mount=type=secret,id=npm_auth_token \
    NODE_AUTH_TOKEN=$(cat /run/secrets/npm_auth_token) \
    npm ci
RUN npm run build

FROM node:20-alpine3.20

LABEL org.opencontainers.image.source="https://github.com/navikt/poao-frontend"

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/build .

USER node

CMD ["node", "/app/server.js"]
