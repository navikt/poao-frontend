FROM node:14-alpine as builder

WORKDIR /app

COPY . .

RUN npm ci
RUN npm run build

FROM node:14-alpine

WORKDIR /app

COPY --from=builder /app/build .
COPY --from=builder /app/node_modules ./node_modules

USER node

CMD ["node", "/app/server.js"]