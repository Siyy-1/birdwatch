# ── base ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./
RUN npm install --frozen-lockfile

# ── development (hot-reload) ───────────────────────────────────────────────────
FROM base AS development
COPY . .
CMD ["node", "/app/node_modules/tsx/dist/cli.mjs", "watch", "src/server.ts"]

# ── build ─────────────────────────────────────────────────────────────────────
FROM base AS build
COPY . .
RUN npm run build

# ── production ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY package.json ./
RUN npm install --frozen-lockfile --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/server.js"]
