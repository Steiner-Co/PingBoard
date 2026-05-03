###############################################################################
# Stage 1 — Install dev dependencies (needed to build the frontend)
###############################################################################
FROM oven/bun:1.3.13 AS deps

WORKDIR /app
COPY package.json bun.lock ./
COPY apps/pingboard/package.json apps/pingboard/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY packages/ui/package.json packages/ui/
RUN bun install --frozen-lockfile

###############################################################################
# Stage 2 — Build the frontend
###############################################################################
FROM deps AS build
WORKDIR /app
COPY . .
RUN cd packages/ui && bun run build

###############################################################################
# Stage 3 — Runtime
###############################################################################
FROM oven/bun:1.3.13-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends iputils-ping ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Bun workspaces install per-package node_modules; copy everything wholesale.
# (Cleanup of source-only files happens after the copy.)
COPY --from=build /app /app

# Drop frontend source after dist is built; keep the dist + package.json
RUN rm -rf /app/packages/ui/src /app/packages/ui/index.html \
    /app/packages/ui/public.html /app/packages/ui/vite.config.ts \
    /app/packages/ui/tailwind.config.js /app/packages/ui/postcss.config.js \
    /app/packages/ui/components.json /app/packages/ui/tsconfig.json \
    /app/packages/ui/node_modules

RUN mkdir -p /data
ENV DATA_DIR=/data
ENV PINGBOARD_STATIC_DIR=/app/packages/ui/dist
ENV PORT=3000
ENV NODE_ENV=production

# Copy entrypoint and add a `pingboard` shim for `docker exec pingboard pingboard <cmd>`
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && printf '#!/bin/sh\nexec /entrypoint.sh "$@"\n' > /usr/local/bin/pingboard \
    && chmod +x /usr/local/bin/pingboard

EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/_health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
CMD []
