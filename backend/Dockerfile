# ── base ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
COPY backend/tsconfig.json ./tsconfig.json
RUN npm ci

# ── development (hot-reload) ───────────────────────────────────────────────────
FROM base AS development
COPY backend/src ./src
COPY db ./db
CMD ["node", "/app/node_modules/tsx/dist/cli.mjs", "watch", "src/server.ts"]

# ── build ─────────────────────────────────────────────────────────────────────
FROM base AS build
COPY backend/src ./src
COPY db ./db
RUN npm run build

# ── production ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db
CMD ["node", "dist/server.js"]
