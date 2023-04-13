FROM node:18.15-alpine3.17 as builder

WORKDIR /app

COPY . .

RUN npm ci
RUN npm run build

FROM node:18.15-alpine3.17

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build .

USER node

CMD ["node", "/app/server.js"]