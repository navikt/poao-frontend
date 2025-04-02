FROM node:22-alpine3.21 AS builder

WORKDIR /app

COPY . .

RUN --mount=type=secret,id=NODE_AUTH_TOKEN,env=NODE_AUTH_TOKEN \
    npm config set //npm.pkg.github.com/:_authToken=$NODE_AUTH_TOKEN
RUN npm config set @navikt:registry=https://npm.pkg.github.com

RUN npm ci
RUN npm run build

FROM node:22-alpine3.21

LABEL org.opencontainers.image.source="https://github.com/navikt/poao-frontend"

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/build .

USER node

CMD ["node", "/app/server.js"]
