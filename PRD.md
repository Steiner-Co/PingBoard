# PingBoard — Product Requirements Document

> **Status:** Draft v1 — Core OSS product
> **Last updated:** 2026-05-03
> **Scope:** This PRD covers the open-source self-hosted product only. A future cloud/SaaS version is anticipated but explicitly out of scope here.

---

## 1. Overview

PingBoard is a dead-simple, self-hosted uptime monitoring tool with built-in public status pages. It runs as a single Docker container with zero external dependencies — pull, run, open the browser, done.

The product targets **indie hackers and solo builders** who want to monitor their projects' uptime and optionally show a public status page, without configuring Turso, Tinybird, Workers, multi-region infrastructure, or any of the operational complexity that comes with enterprise-grade monitoring tools.

---

## 2. Problem & Opportunity

**The current uptime-monitoring landscape forces a choice between three bad options:**

1. **Hosted SaaS (BetterUptime, Pingdom, Uptime Robot)** — paid, per-monitor pricing, often requires giving a third party access to internal endpoints, lock-in.
2. **OpenStatus self-hosted** — powerful but operationally heavy: requires Turso, Tinybird, Cloudflare Workers, and a Next.js app. Hours to set up.
3. **Uptime Kuma** — closest in spirit; one container, SQLite, easy to run. But the UI feels dated, the public status pages aren't polished, and it has accumulated five years of features that most users don't need.

**The opportunity:** match Uptime Kuma's setup simplicity, ship a modern polished UI (ShadCN-grade), and stay aggressively focused on the 80% of features indie hackers actually need.

---

## 3. Target Users

**Primary:** Indie hackers and solo developers shipping side projects or small SaaS products.
- Has 1–20 services/endpoints they care about
- Is comfortable running `docker run` on a $5 VPS
- Wants public status pages they can point customers at
- Doesn't need multi-region, doesn't need a 99.99% SLA on the monitor itself

**Secondary:** Small teams (2–5 people) self-hosting internal tooling.
- Wants to monitor internal services not reachable from the public internet
- Cares about a clean UI for the team to glance at

**Non-users (explicitly):**
- Enterprises needing SOC2, multi-region, RBAC, audit logs, SSO
- Anyone needing >100 monitors (no hard cap, but not optimized for it)
- Users who want a SaaS — that comes later, separately

---

## 4. Goals & Non-Goals

### Goals (v1)
- **Setup time:** Under 60 seconds from `docker run` to first monitor checking.
- **Single container, single port, single volume.** No external services.
- **Polished modern UI** built on ShadCN — feels like a 2026 product, not a 2020 one.
- **Public status pages** that look good enough to show customers without embarrassment.
- **Cover 95% of indie monitoring needs** with a small set of monitor types and notification channels.
- **MIT licensed**, monorepo, designed so a future cloud version can import core packages without code duplication.

### Non-Goals (v1)
- Multi-region probing
- Multi-tenancy / workspaces / teams
- Billing, plans, tier enforcement
- SSO, RBAC, audit logs
- Mobile apps
- Synthetic monitoring (multi-step browser flows)
- A marketplace of integrations
- Custom domain TLS automation (user runs their own reverse proxy)

---

## 5. Product Principles

1. **Setup is the product.** Every decision is judged by its effect on time-to-first-check. If it adds setup friction, default it off.
2. **UI is the only configuration interface.** No YAML, no env-var configuration of monitors, no CLI for daily ops. Env vars exist only for boot-time concerns (port, data dir).
3. **Opinionated defaults beat infinite knobs.** 60-second interval, 10-second timeout, 1 retry — sensible defaults, exposed but not in your face.
4. **The dashboard must feel alive.** Real-time SSE updates, not polling. A status change appears within 2 seconds.
5. **Self-host means unlimited.** No artificial limits in the OSS product, ever. Plan limits only exist in the future cloud version.
6. **Code is one source of truth.** No config files, no YAML imports, no two-source-of-truth reconciliation. SQLite is canonical.
7. **One process, no orchestration.** No Redis, no queue worker, no separate scheduler container. Everything in-process.

---

## 6. Core Features (v1 Scope)

### 6.1 Monitor Types
| Type | Description | v1 |
|---|---|---|
| **HTTP(S)** | URL check with status code + optional keyword/JSON assertion | ✅ |
| **TCP** | Open a TCP connection to host:port | ✅ |
| **Ping (ICMP)** | Standard ping check | ✅ |
| **DNS** | Resolve a record (A/AAAA/MX/TXT/CNAME) and optionally match a value | ✅ |
| **Keyword/JSON** | HTTP check with body content assertion | ✅ (variant of HTTP) |
| Docker, gRPC, Steam, Kafka, Push | — | ❌ (post-v1) |

### 6.2 Per-monitor configuration
- Name, URL/host, type
- Check interval (10s / 30s / 1m / 5m / 15m / 1h)
- Timeout (default 10s)
- Retry count before declaring "down" (default 1)
- HTTP method, headers, body (HTTP types only)
- Expected status codes (default 2xx)
- Expected keyword / JSONPath assertion (optional)
- Follow redirects, verify TLS toggle
- Pause/resume
- Tags (for grouping)

### 6.3 Notification Channels (v1)
- **Email** (SMTP — user configures their own SMTP creds)
- **Webhook** (generic POST with JSON payload — covers everything programmable)
- **Discord** (webhook URL)
- **Slack** (webhook URL)
- **ntfy** (self-hosted push notifications — popular with the indie crowd)

A monitor can be linked to N channels. A channel sends on: down → up transitions, configurable.

### 6.4 Incidents
- Auto-opened when a monitor first reports `down` (after retries exhausted)
- Auto-closed when the monitor next reports `up`
- Manually annotatable (add a note: "Cloudflare outage, not our fault")
- Listed per-monitor and globally
- Surfaced on the public status page

### 6.5 Status Pages
- N status pages per instance (default 1, no upper limit)
- Each has: slug, title, description, theme (light/dark/auto), optional password protection
- Each lists a curated set of monitors, optionally grouped (e.g., "API", "Web", "Database")
- Per-monitor display: current status, 90-day uptime bar, average response time, recent incidents
- Public URL: `https://yourdomain.com/:slug`
- Optional custom domain: user points DNS, configures their own reverse proxy

### 6.6 Admin Dashboard
- Monitors list (table with status, response time, uptime %, last check)
- Monitor detail (response time chart, heartbeat history, incident log, settings)
- Channels list (test notification button)
- Status pages list (with public URL preview)
- Settings (admin password change, retention period, SMTP config)

### 6.7 Authentication
- Single admin account (email + password)
- Created on first run via setup wizard
- Cookie-based session, HTTP-only, SameSite=Lax
- Password reset only via CLI (since there's no email-from-PingBoard SMTP guarantee at install time)

---

## 7. User Flows

### 7.1 First-run setup
```
1. User: docker run -d -p 3000:3000 -v pingboard:/data ghcr.io/.../pingboard
2. Browser → http://localhost:3000
3. Welcome page: "Set up your admin account"
   • Email + password form
   • Submit → admin created, logged in, redirected to dashboard
4. Empty dashboard with single CTA: "Add your first check"
```

### 7.2 Adding a monitor
```
1. Click "Add monitor"
2. Wizard step 1: paste URL or host:port
   • Smart input infers type (https → HTTP; host:5432 → TCP; 1.1.1.1 → ping)
3. Wizard step 2: interval (default 1 minute)
4. Wizard step 3: notify where? (skip / pick existing channel / create new)
5. Submit → check fires immediately, monitor appears on dashboard with first heartbeat within 2s
```

### 7.3 Creating a status page
```
1. Settings → Status pages → "Create page"
2. Form: slug, title, description, theme
3. Pick which monitors to include, optionally group them
4. Save → public URL shown, "Copy link" button
5. Optional: "Add custom domain" → instructions for user's reverse proxy
```

### 7.4 Receiving an alert
```
1. Monitor goes down → retries exhausted → incident opened
2. Linked notification channels fire in parallel
3. Email/Discord/Slack/ntfy receives:
   "🔴 [PingBoard] my-api is DOWN
   Status: 503 (was 200)
   First detected: 14:32 UTC
   View: https://your-instance.com/admin/monitors/{id}"
4. When it recovers:
   "🟢 [PingBoard] my-api is UP
   Downtime: 4m 12s"
```

---

## 8. Information Architecture

### Routing

```
PUBLIC (no auth required)
  GET  /                       → Login if not setup; else redirect to /admin
  GET  /:slug                  → Status page HTML
  GET  /api/public/:slug       → Status page data (JSON)
  GET  /api/public/:slug/sse   → Live updates for that page

ADMIN (cookie-gated, all routes under /admin/* and /api/admin/*)
  GET  /admin                  → Dashboard
  GET  /admin/monitors         → Monitor list
  GET  /admin/monitors/:id     → Monitor detail
  GET  /admin/channels         → Channel list
  GET  /admin/pages            → Status page list
  GET  /admin/settings         → Settings
  *    /api/admin/*            → All CRUD
  GET  /api/admin/sse          → Global live updates

AUTH
  POST /api/auth/setup         → Only succeeds when User table is empty
  POST /api/auth/login
  POST /api/auth/logout
```

### Reserved slugs
Status page slugs cannot collide with: `admin`, `api`, `auth`, `_health`, `static`, `assets`, `favicon.ico`.

---

## 9. Data Model

SQLite via Drizzle ORM. Schema lives in `packages/db`.

```
User
  id (uuid), email, password_hash, role, created_at

Session
  id, user_id, expires_at, created_at

Monitor
  id (uuid), name, type, target,
  interval_seconds, timeout_seconds, retry_count,
  config (json),       -- type-specific: method, headers, expected_codes, etc.
  paused, created_at, updated_at

Heartbeat
  id, monitor_id, status (up|down|degraded),
  response_time_ms, status_code, message, checked_at
  INDEX (monitor_id, checked_at DESC)

DailyStat                          -- rollup, written by daily job
  monitor_id, date, uptime_pct, avg_response_ms, incidents_count
  PRIMARY KEY (monitor_id, date)

Incident
  id, monitor_id, started_at, resolved_at,
  cause (auto|manual), note

NotificationChannel
  id, name, type (email|webhook|discord|slack|ntfy),
  config (json), enabled

MonitorChannel                     -- many-to-many
  monitor_id, channel_id

StatusPage
  id, slug (unique), title, description, theme,
  password_hash (nullable), custom_domain (nullable)

StatusPageMonitor                  -- many-to-many w/ display order
  status_page_id, monitor_id, group_name, sort_order

Setting                            -- key-value
  key, value
```

**Design notes:**
- All primary IDs are UUIDs to enable future cross-instance merging (cloud).
- `Monitor.config` and `NotificationChannel.config` are JSON columns — adding a new monitor type or channel doesn't require a migration.
- `Heartbeat` is the hot table; aggregated to `DailyStat` after retention period (default 90 days) by a daily cleanup job.
- No `workspace_id` columns in v1. Will be added by a single migration when cloud comes.

---

## 10. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | **Bun** | Single-binary feel, built-in HTTP/WS/SQLite/test runner, fast boot |
| HTTP server | **`Bun.serve`** | Native, no Express needed |
| Database | **SQLite** via `bun:sqlite` | Zero ops, single file, the whole thesis |
| ORM | **Drizzle** | Type-safe, no codegen step, lightweight |
| Real-time | **SSE** | One-way push is all we need; debuggable, auto-reconnect, plain HTTP |
| Frontend | **React 18 + Vite + Tailwind + ShadCN** | Polished UI, modern DX, owned components |
| Auth | **Hand-rolled cookie sessions + bcrypt** | ~100 LOC; single-admin doesn't need a framework |
| Scheduler | **In-process `setTimeout` loops** | One Map of timers, pause/resume = clear/restart |
| Container | **Single multi-stage Dockerfile** | Target ~80–100MB final image |
| Migrations | **Drizzle Kit** | Schema-first, migrations run automatically at boot |

---

## 11. Repository Structure

Monorepo, MIT licensed, designed so future cloud packages slot in without disrupting OSS.

```
pingboard/
├── apps/
│   └── pingboard/              The OSS Docker app (single binary entry)
├── packages/
│   ├── core/                   Engine: checkers, scheduler, notifier interface
│   ├── db/                     Drizzle schema + migrations
│   ├── ui/                     React components, pages, ShadCN setup
│   └── shared/                 Types, utilities used across packages
├── docker/
│   └── Dockerfile              Multi-stage build
├── docs/                       (future) Documentation site
├── LICENSE                     MIT
├── README.md
├── PRD.md                      This file
├── package.json                Workspace root
└── turbo.json                  Build pipeline
```

**Future additions (not v1):**
- `packages/cloud/` — multi-tenancy, billing, region orchestration
- `apps/pingboard-cloud/` — the SaaS deployment
- `apps/docs/` — documentation website
- `apps/landing/` — marketing site

---

## 12. Setup & Deployment

### Self-host (canonical)
```bash
docker run -d --restart=always \
  -p 3000:3000 \
  -v pingboard:/data \
  --name pingboard \
  ghcr.io/<org>/pingboard:latest
```

### Environment variables (all optional)
```
PORT=3000                       Default 3000
DATA_DIR=/data                  Default /data
PINGBOARD_BASE_URL=             Used in notification links; auto-detected if unset
PINGBOARD_TRUST_PROXY=          Set to 'true' behind a reverse proxy (rate limiting keys on X-Forwarded-For)
PINGBOARD_PUBLIC_RATE_LIMIT=    Public API req/min per client IP; default 60
LOG_LEVEL=info                  debug|info|warn|error
```

### Backups
Stop container → copy `/data/pingboard.db` and `/data/pingboard.db-wal` → restart.
A `pingboard backup` CLI command emits a single tarball (post-v1 nice-to-have).

### Reverse proxy
Documented examples for Caddy, nginx, Traefik. PingBoard does not handle TLS itself.

---

## 13. Security Model

- **Single auth boundary** — middleware protects everything under `/admin/*` and `/api/admin/*`. No per-route opt-in.
- **Public API is allow-list** — only returns data for monitors explicitly attached to the requested status page, projected to a tight field list (name, group, status, uptime, response time, timeline — never targets, config, or secrets). Monitors not attached to a page are not enumerable from public endpoints.
- **Rate-limited public endpoints** — 60 req/min per client IP, configurable via `PINGBOARD_PUBLIC_RATE_LIMIT`. Client IP is the socket address; `X-Forwarded-For` is only trusted when `PINGBOARD_TRUST_PROXY=true`. Login and setup are separately throttled (10 attempts/min per IP).
- **Cookie security** — HTTP-only, SameSite=Lax, Secure when `BASE_URL` is https. Session IDs are stored SHA-256-hashed at rest, so a database read doesn't leak live sessions.
- **Passwords** — argon2id (Bun's `Bun.password` default), never logged.
- **Status page passwords** — separate cookie, name-scoped to the page (`pb_page_<pageId>`), verified only against that page; never elevates to admin.
- **Security headers** — `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options`/`frame-ancestors` on every response, plus a baseline CSP on the HTML shells.
- **Outbound requests** — monitors and webhooks fetch arbitrary admin-configured URLs, internal addresses included (that's the product working as intended for self-hosting). Documented in the self-hosting guide; a denylist becomes required before any multi-tenant mode.
- **CSRF** — same-origin policy + SameSite cookies covers the common case for v1. CSRF tokens deferred unless threat model requires.

---

## 14. Out of Scope (v1)

Explicitly deferred to keep v1 shippable:

- Multi-region / distributed probing
- SMS / phone call alerts
- PagerDuty, Opsgenie, VictorOps integrations (covered by webhook)
- SSO (Google, GitHub, OIDC)
- Multi-user / RBAC / teams
- Audit log
- API tokens for programmatic access
- Maintenance windows (planned downtime that suppresses alerts)
- Synthetic monitoring (multi-step flows)
- SSL certificate expiry monitoring (could be a v1.x add — small scope)
- Mobile app
- Backup automation
- i18n (English only at launch)

---

## 15. Future Considerations

These shape v1 design choices but are not v1 deliverables.

### Cloud / SaaS
- Will be a separate app (`apps/pingboard-cloud/`) that imports `packages/core`, `packages/db`, `packages/ui`
- Multi-tenancy via `workspace_id` column added in a single migration
- Billing via Stripe, code lives in `packages/cloud/billing/` (open source, billing operations stay private)
- A `PINGBOARD_MODE=cloud` env flag activates plan enforcement; default `selfhost` mode is unlimited
- Multi-region probing via remote probe agents reporting to a central coordinator

### Docs site & landing page
- Will live in `apps/docs/` and `apps/landing/` as separate Vite/Next apps
- Independent deploys; no impact on the core container

---

## 16. Resolved Decisions

Decisions reached during planning (2026-05-03):

1. **Heartbeat retention default** — **30 days.** Smaller DB footprint preferred over deeper raw history; aggregated DailyStat preserves long-term uptime trends for the status page chart. Configurable via Settings.
2. **Default check interval** — **60 seconds.** Safe for shared SMTP/webhook quotas; user can choose 30s/1m/5m/15m/1h per monitor.
3. **First-run wizard depth** — **Skippable.** After admin signup, land on empty dashboard with prominent "Add your first check" CTA. The wizard launches on click; no forced flow.
4. **Status page chart range** — **30 days.** Industry-standard window (matches Statuspage, BetterUptime, OpenStatus); shows real reliability story without mobile crowding.
5. **Password recovery** — **CLI only.** `pingboard reset-password <email>` generates a new random password and prints to stdout. No email-based recovery in v1 (avoids assuming SMTP at install time).

---

## 17. Success Criteria for v1 launch

- [ ] `docker run` to first heartbeat in < 60 seconds (timed)
- [ ] Container image < 150 MB
- [ ] Cold boot < 2 seconds
- [ ] All five monitor types implemented and tested
- [ ] All five notification channels implemented with a "Send test" button
- [ ] Public status page renders with sub-200ms TTFB on a $5 VPS
- [ ] One-page docs README that gets a new user to a running monitor
- [ ] MIT LICENSE, public GitHub repo, GHCR-published image
