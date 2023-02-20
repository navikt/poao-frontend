FROM node:16.19.1-alpine3.16 as builder

WORKDIR /app

COPY . .

RUN npm ci
RUN npm run build

FROM node:16.19.1-alpine3.16

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build .

USER node

CMD ["node", "/app/server.js"]