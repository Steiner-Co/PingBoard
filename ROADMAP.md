# Roadmap to v1.0.0

> **Status:** Draft — 2026-08-10
> **Current release:** v0.8.0
> **Target:** v1.0.0 = public launch (Show HN / Product Hunt / announcement)

## Where we are

The PRD's v1 feature scope is **complete, and in places exceeded**:

- Monitor types: HTTP(S), TCP, ping, DNS — plus SSL expiry, domain expiry, and push (all
  post-v1 candidates in the PRD, already built)
- Channels: email, webhook, Discord, Slack, ntfy — all five, with test buttons
- Status pages: branding (logo/accent/custom CSS), live editor, password protection,
  custom domains, SSE live updates
- Beyond PRD: maintenance windows, API tokens, MCP server on npm (`@pingboard/mcp`),
  instance version badge + update check

What stands between here and launch is **not features** — it's correctness, trust, and
story. The plan below reflects that.

**Numbering convention from here on:** minor = feature release, patch = fixes only.
(v0.6.5 skipped .1–.4; consider those reserved for hotfixes to the 0.6 line.)

---

## v0.7.0 — Hardening: nothing half-broken at launch — SHIPPED 2026-08-10

Shipped: dialog draft-loss guards, data router + `useBlocker` Back/Forward protection,
`FieldInput`/`FieldTextarea` form wrappers, refreshed audit docs, public status page
shell polish, dropdown clipping fix. The items left open at tag time moved to v0.8.0.

## v0.8.0 — Hardening, part two — SHIPPED 2026-08-10

Theme: close the last launch blockers found by the audit.

- ~~Contrast regressions in landing prose~~ — `text-foreground/40` 12px text and
  FeatureGrid's `/50` now use the AA-passing `muted-foreground` token.
- ~~`transition-all` regression in the landing blog~~ — explicit `[color,translate]`.
- ~~**Security pass** (PRD §13)~~ — baseline security headers on every response + CSP on
  the HTML shells; login/setup throttled (10 attempts/min per IP); rate limiting keyed
  on the socket IP, with `X-Forwarded-For` honored only behind
  `PINGBOARD_TRUST_PROXY=true`; public limit configurable via
  `PINGBOARD_PUBLIC_RATE_LIMIT`; session IDs SHA-256-hashed at rest (mirrors API
  tokens); PRD §13 and the self-hosting guide updated, including the outbound-request
  (SSRF) posture. Full inventory: auth boundary, public allow-list projection, cookie
  flags, input validation, XSS escaping, and SSE gating all verified OK.
- ~~**Core-flow e2e tests**~~ — `apps/pingboard/src/e2e.test.ts` walks setup → channel →
  monitor → status page → incident opens → webhook fires → recovery against a real
  booted server; runs in CI via root `bun test`.

## v0.9.0 — Stabilization: test everything, fix what shakes out

Theme: a wave of testing, fixes, and polish. Nothing new gets built; what exists gets
proven.

- **Bug bash** across every admin page + public shell (visual-qa-sweep style, both
  themes, desktop + mobile).
- **Accessibility sweep** — keyboard-only walkthrough, screen-reader pass on the
  dashboard.
- **Upgrade-path rehearsal** — 0.6.x data dir → latest image, verify migrations + no
  data loss.
- **Reverse-proxy guides** — Traefik example still missing (Caddy + nginx are in the
  self-hosting docs); PRD §12 requirement.
- **README final pass** — one page from `docker run` to first monitor (PRD §17).
- **Docs/landing content final** — audit the docs pages for gaps; refresh screenshots
  against the redesigned admin.
- **Demo instance or seeded demo mode** — something linkable in the launch post.
- **Verify PRD §17 success criteria end-to-end** — timed 60s setup, cold boot < 2s,
  status page TTFB < 200ms on a $5 VPS. Image size already passes (46.5 MB compressed
  vs 150 MB budget).
- **RC soak** — run the release candidate on the production VPS for a week before
  tagging 1.0.0.
- Known candidate fix: **"run check now" for a saved monitor** — the e2e pass found
  `POST /api/admin/monitors/run` is a dry-run that never persists a heartbeat or
  reconciles incidents; forcing a real check requires a no-op PATCH. Worth a real
  endpoint/button.

## v1.0.0 — Public launch

- Final release notes + upgrade guide.
- Announcement blog post (the landing blog exists — use it).
- Show HN / Product Hunt assets: screenshots, GIF of the 60-second setup, demo link.
- Optional: Docker Hub mirror of the image (GHCR-only is fine for launch).

---

## Explicitly post-1.0

- **Status page subscriptions** (RSS/Atom per page + double-opt-in email, subscriber
  count in admin) — the strongest v1.1.0 candidate; deferred on 2026-08-10 to keep the
  path to 1.0 short. BetterStack monetizes subscribers per-page; Uptime Kuma doesn't
  have them at all. Would also work as the first post-launch headline.
- `pingboard backup` CLI (single tarball) — PRD §12 nice-to-have
- SMS/phone alerts, PagerDuty/Opsgenie (webhook covers the programmable case)
- Multi-user / RBAC / audit log — cloud-version concerns (PRD §4 non-goals)
- Docker, gRPC, Kafka monitor types
- i18n
