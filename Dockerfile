FROM node:18-alpine as builder

WORKDIR /app

COPY . .

RUN npm ci
RUN npm run build

FROM node:18-alpine

LABEL org.opencontainers.image.source="https://github.com/navikt/poao-frontend"

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build .

USER node

CMD ["node", "/app/server.js"]
