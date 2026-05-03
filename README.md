# PingBoard

> Dead-simple, self-hosted uptime monitoring with built-in status pages. One container, one volume, one port.

## Quickstart

```bash
docker run -d --restart=always \
  -p 3000:3000 \
  -v pingboard:/data \
  --name pingboard \
  ghcr.io/<your-org>/pingboard:latest
```

Open `http://localhost:3000`, create your admin account, add your first monitor. Done in under a minute.

## What it does

- **5 monitor types** — HTTP(S), TCP, ping, DNS, plus keyword/JSON assertions on HTTP bodies
- **5 notification channels** — email (SMTP), webhook, Discord, Slack, ntfy
- **Public status pages** — multiple per instance, optional password protection, custom slugs
- **Live dashboard** — real-time updates via SSE, no polling
- **Single binary feel** — one container, one SQLite file under `/data`, no Redis, no queue

## Configuration

All optional — no env vars are required to boot.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATA_DIR` | `/data` | SQLite database location |
| `PINGBOARD_BASE_URL` | (auto) | Used in alert links — set to your public URL when behind a reverse proxy |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |

## Reverse proxy

PingBoard does not handle TLS itself. Put it behind Caddy / nginx / Traefik with a normal HTTP-to-app proxy.

Example Caddyfile:

```
status.example.com {
  reverse_proxy pingboard:3000
}
```

## Backups

Stop the container, copy `/data/pingboard.db` (and `pingboard.db-wal` if present), restart.

```bash
docker stop pingboard
cp -r /var/lib/docker/volumes/pingboard /backups/pingboard-$(date +%F)
docker start pingboard
```

## CLI

```bash
# Reset the admin password (e.g. if forgotten)
docker exec pingboard pingboard reset-password admin@example.com
```

## Development

Requires [Bun](https://bun.sh) >= 1.3.

```bash
bun install
bun run typecheck
bun test

# Backend at :3000, frontend at :5173 (proxied)
cd apps/pingboard && bun run dev
# in another terminal:
cd packages/ui && bun run dev
```

## Architecture

- **Runtime:** Bun (`Bun.serve` + `bun:sqlite`)
- **DB:** SQLite via Drizzle ORM (single `pingboard.db` file)
- **Realtime:** Server-Sent Events
- **Frontend:** React 18 + Vite + Tailwind + ShadCN
- **Scheduler:** in-process `setTimeout` loops — no Redis, no queue
- **Repo:** Turborepo monorepo, MIT licensed

See [`PRD.md`](./PRD.md) for the full product spec and roadmap.

## Roadmap

v1 (this release):
- ✅ Core monitor types, channels, status pages, dashboard, public pages

v1.x:
- SSL certificate expiry monitoring
- Maintenance windows
- API tokens for programmatic access

Future (cloud):
- Multi-region probing
- Workspaces and billing (open-source code, hosted operationally)

## License

[MIT](./LICENSE)
