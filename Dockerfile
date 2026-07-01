FROM node:22-alpine AS builder

WORKDIR /app

ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=$PUBLIC_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

RUN npm install -g sirv-cli

COPY --from=builder /app/build ./build

EXPOSE 10000

CMD ["sh", "-c", "sirv build --single --host 0.0.0.0 --port ${PORT:-10000}"]