# Roadmap to v1.0.0

> **Status:** Draft — 2026-08-09
> **Current release:** v0.7.0
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
story. The plan below reflects that, with one deliberate exception (v0.8.0).

**Numbering convention from here on:** minor = feature release, patch = fixes only.
(v0.6.5 skipped .1–.4; consider those reserved for hotfixes to the 0.6 line.)

---

## v0.7.0 — Hardening: nothing half-broken at launch

Theme: a launch wave of new users will find every rough edge in the first hour.

- **Close the remaining audit med clusters** (`audits/2026-07-31/`):
  - ~~Dialog draft loss — dirty-guard confirm on Esc/overlay/X for the channels dialog;
    viewport cap + scroll on `DialogContent`~~ — shipped (`e4e2514`)
  - ~~Browser Back bypassing all dirty guards~~ — shipped 2026-08-10: data router +
    `useBlocker`-based `useUnsavedGuard` covers Back/Forward on all guarded forms
  - Contrast regressions in landing prose (`text-foreground/40` at 12px, FeatureGrid)
  - ~~Shared form-input wrapper to close the recurring missing
    `name`/`autoComplete`/`type`/`spellCheck` findings~~ — shipped 2026-08-10
    (`FieldInput`/`FieldTextarea`, `components/ui/field.tsx`)
  - `transition-all` regression in the landing blog
- ~~**Refresh the stale audit docs**~~ — done 2026-08-10: `AUDIT.md` rewritten with the
  post-sweep commit map; slice files carry a pointer addendum.
- **Security pass** — security headers story (what the app sets vs what the reverse proxy
  must), verify public-endpoint rate limits and auth rate limiting under load, SSRF
  re-check on webhook channels, session/cookie flags audit against PRD §13.
- ~~**Public status page shell polish**~~ — done 2026-08-10: pulse on down states,
  crossfaded SSE status flips, radio-theme menu, timeline focus rings, theme-color
  fallbacks, shared form primitives on the gate/error states.
- **Core-flow e2e tests** — setup → add monitor → incident opens → notification fires →
  appears on status page → resolves. Launch regressions must be caught by CI, not users.

## v0.8.0 — Status page subscriptions

Theme: the biggest remaining product gap vs hosted competitors, and a launch headline.
BetterStack monetizes subscribers per-page; Uptime Kuma doesn't have them at all.

- **RSS/Atom feed per status page** — incidents + maintenance as feed items. Cheap, no
  PII, indie-credible.
- **Email subscriptions** — visitor enters address on the public page, double opt-in
  confirmation, one-click unsubscribe link in every mail. Reuses the existing SMTP
  config; admin can disable per page. Double opt-in *is* the abuse mitigation.
- Admin view: subscriber count per page (no per-subscriber browsing needed for v1).

> **Decision point:** if this feels like scope creep before launch, swap v0.8.0 and
> v0.9.0 — ship docs first, subscriptions as the first post-launch feature (v1.1.0).
> Recommendation: keep it pre-1.0. It's the feature that makes the launch post spread.

## v0.9.0 — Docs, onboarding & demo

Theme: the first 10 minutes decide whether a new user stays.

- **Reverse-proxy guides** — Caddy, nginx, Traefik examples (PRD §12 requirement).
- **README final pass** — one page from `docker run` to first monitor (PRD §17).
- **Docs/landing content final** — audit the existing docs pages for gaps; screenshots
  refreshed against the redesigned admin.
- **Demo instance or seeded demo mode** — something linkable in the launch post so people
  can click around without installing.
- **Verify PRD §17 success criteria end-to-end** — timed 60s setup, cold boot < 2s,
  status page TTFB < 200ms on a $5 VPS. Image size already passes (46.5 MB compressed
  vs 150 MB budget).

## v0.9.x — Release candidate(s)

- Bug bash across every admin page + public shell (visual-qa-sweep style, both themes).
- Accessibility sweep (keyboard-only walkthrough, screen-reader pass on the dashboard).
- Upgrade-path rehearsal: 0.6.x data dir → latest image, verify migrations + no data loss.
- RC soak: run it on the production VPS for a week before tagging 1.0.0.

## v1.0.0 — Public launch

- Final release notes + upgrade guide.
- Announcement blog post (the landing blog exists — use it).
- Show HN / Product Hunt assets: screenshots, GIF of the 60-second setup, demo link.
- Optional: Docker Hub mirror of the image (GHCR-only is fine for launch).

---

## Explicitly post-1.0

- `pingboard backup` CLI (single tarball) — PRD §12 nice-to-have
- SMS/phone alerts, PagerDuty/Opsgenie (webhook covers the programmable case)
- Multi-user / RBAC / audit log — cloud-version concerns (PRD §4 non-goals)
- Docker, gRPC, Kafka monitor types
- i18n
