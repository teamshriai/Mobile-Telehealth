# ─────────────────────────────────────────────────────────────────────────────
# OncoTrace AI — Server
#
# Multi-stage build: compile TypeScript in a full node_modules environment,
# then ship only production dependencies + compiled output. Keeps the final
# image free of TypeScript/dev tooling.
#
# Migrations are NOT run automatically on container start — see the note
# above CMD. Run `npx prisma migrate deploy` as its own step (CI/CD job or
# init container) before rolling out a new version, especially with more
# than one replica: several containers all migrating on boot at once is a
# race condition waiting to happen.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production runtime ──────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist

# Runs as a non-root user — never run a production Node process as root.
RUN addgroup -S oncotrace && adduser -S oncotrace -G oncotrace
USER oncotrace

EXPOSE 5000

# Do not bake `npx prisma migrate deploy` into CMD for multi-replica setups
# (see file header). For a single-instance deployment where that's not a
# concern, override CMD to `sh -c "npx prisma migrate deploy && node dist/server.js"`.
CMD ["node", "dist/server.js"]
