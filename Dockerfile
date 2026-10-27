# MedCore frontend Node contract is major 24, the same line as .nvmrc.
# The patch floats inside that line, as GitHub Actions node-version 24 does.
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=$PUBLIC_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine

WORKDIR /app

ARG PUBLIC_API_URL
ENV NODE_ENV=production
ENV PORT=10000
ENV PUBLIC_API_URL=$PUBLIC_API_URL

COPY server.mjs security-headers.mjs ./
RUN npm install --omit=dev sirv@3.0.2

COPY --from=builder /app/build ./build

EXPOSE 10000

CMD ["node", "server.mjs"]