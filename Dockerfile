FROM node:20-alpine3.20 as builder

WORKDIR /app

COPY . .

RUN npm ci
RUN npm run build

FROM node:20-alpine3.20

LABEL org.opencontainers.image.source="https://github.com/navikt/poao-frontend"

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/build .

USER node

CMD ["node", "/app/server.js"]
