###############################################################################
# Stage 1 — Install workspace dependencies (dev deps included for build)
###############################################################################
FROM oven/bun:1.3.13-alpine AS deps

WORKDIR /app
COPY package.json bun.lock ./
COPY apps/pingboard/package.json apps/pingboard/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY packages/ui/package.json packages/ui/
RUN bun install --frozen-lockfile

###############################################################################
# Stage 2 — Build frontend + bundle backend into single files
###############################################################################
FROM deps AS build
WORKDIR /app
COPY . .
# Frontend → packages/ui/dist
RUN cd packages/ui && bun run build
# Backend → /out/server.js, /out/cli.js (single bundles, deps inlined).
# Skip --minify: it costs cold-boot parse time without meaningfully shrinking
# the final image (the bun:alpine base dominates at ~156 MB).
RUN bun build apps/pingboard/src/server.ts \
    --outdir /out --target bun
RUN bun build apps/pingboard/src/cli.ts \
    --outdir /out --target bun

###############################################################################
# Stage 3 — Runtime: alpine + bundled JS + static + migrations only
###############################################################################
FROM oven/bun:1.3.13-alpine AS runtime

# iputils provides ping; ca-certificates for outbound TLS.
RUN apk add --no-cache iputils ca-certificates

WORKDIR /app

COPY --from=build /out/server.js /app/server.js
COPY --from=build /out/cli.js /app/cli.js
COPY --from=build /app/packages/ui/dist /app/static
COPY --from=build /app/packages/db/drizzle /app/drizzle

RUN mkdir -p /data
ENV DATA_DIR=/data
ENV PINGBOARD_STATIC_DIR=/app/static
ENV PINGBOARD_MIGRATIONS_DIR=/app/drizzle
ENV PORT=3000
ENV NODE_ENV=production

# Entrypoint + `pingboard` shim for `docker exec pingboard pingboard <cmd>`.
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
