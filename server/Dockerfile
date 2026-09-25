# ─────────────────────────────────────────────────────────────────────────────
# Stroke AI — Server
#
# Multi-stage build: compile TypeScript in a full node_modules environment,
# then ship only production dependencies + compiled output. Keeps the final
# image free of TypeScript/dev tooling.
#
# Base image is Debian slim (glibc), NOT Alpine (musl) — changed in Phase 8.
# The AI Insights retrieval pipeline uses onnxruntime-node (via
# @huggingface/transformers) to run a local embedding model, and
# onnxruntime-node ships NO musl-compatible prebuilt binary. On Alpine it
# would fail at container START, not at build — the image builds cleanly and
# then crashes the first time retrieval actually runs. There is no working
# WASM fallback under Node either: transformers.js's browser/WASM build
# expects to fetch local model files as URLs, which fails outright against a
# real filesystem path (verified directly, not assumed). Matching the base
# image's libc to the native binary is the standard, supported fix — a
# slightly larger image is the entire cost.
#
# Migrations are NOT run automatically on container start — see the note
# above CMD. Run `npx prisma migrate deploy` as its own step (CI/CD job or
# init container) before rolling out a new version, especially with more
# than one replica: several containers all migrating on boot at once is a
# race condition waiting to happen.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production runtime ──────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist

# The vendored embedding model (server/models/) — see
# prisma/scripts/vendor-embedding-model.ts. Never downloaded at runtime;
# it ships in the image so a container can run fully offline and so the
# model a deployment uses is exactly the one pinned in models/manifest.json.
COPY models ./models
# ⚠️ Includes the speech-to-text model when it was fetched before the build
# (`npm run models:fetch:whisper`, ~240 MB; see models/whisper-manifest.json).
# With STT_PROVIDER=local the server refuses to start if it is missing.

# ⚠️ Encrypted patient files (voice-note audio) must live on a MOUNTED, backed-up
# volume, never inside the image — and this container runs as a non-root user
# that cannot write to /app. Mount a volume and point FILE_STORAGE_DIR at it,
# e.g.  -v /srv/indostates/storage:/data/storage -e FILE_STORAGE_DIR=/data/storage

# Runs as a non-root user — never run a production Node process as root.
# Debian's useradd/groupadd, not Alpine's busybox addgroup/adduser.
RUN groupadd --system strokeai && useradd --system --gid strokeai --no-create-home strokeai
USER strokeai

EXPOSE 5000

# Do not bake `npx prisma migrate deploy` into CMD for multi-replica setups
# (see file header). For a single-instance deployment where that's not a
# concern, override CMD to `sh -c "npx prisma migrate deploy && node dist/server.js"`.
CMD ["node", "dist/server.js"]
