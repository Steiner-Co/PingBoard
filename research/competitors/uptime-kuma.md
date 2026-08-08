# Competitor Research — Uptime Kuma

> Research date: 2026-07-31. All claims verified against live sources cited inline. GitHub repo state verified via GitHub API on 2026-07-31.

## Overview

Uptime Kuma is the de facto standard for self-hosted uptime monitoring and PingBoard's closest competitor — the PRD names it explicitly as the "closest in spirit" product to beat (PRD.md §2.3).

- **Origin:** Launched July 2021 by Hong Kong developer Louis Lam (`louislam`) as a solo side project ([repo created 2021-07-03](https://api.github.com/repos/louislam/uptime-kuma); [youngju.dev deep dive, May 2026](https://www.youngju.dev/blog/culture/2026-05-16-uptime-monitoring-status-pages-2026-better-stack-pingdom-uptime-robot-uptime-kuma-checkly-deep-dive.en)).
- **Scale (verified via GitHub API, 2026-07-31):** **89,647 stars, 8,186 forks, 769 open issues**, last push same day — extremely active. (A [May 2026 third-party article](https://www.youngju.dev/blog/culture/2026-05-16-uptime-monitoring-status-pages-2026-better-stack-pingdom-uptime-robot-uptime-kuma-checkly-deep-dive.en) cited ~65k stars; the API number is authoritative and shows continued growth.)
- **License:** **MIT** ([GitHub API license field](https://api.github.com/repos/louislam/uptime-kuma); [repo README](https://github.com/louislam/uptime-kuma)).
- **Governance:** Still effectively a benevolent-dictator project led by Louis Lam with a very large contributor community (hundreds of translation/PR contributors per release — see [release notes](https://github.com/louislam/uptime-kuma/releases)). Funded via GitHub Sponsors and OpenCollective ([README sponsors section](https://github.com/louislam/uptime-kuma)). Notably, the project added an `AGENTS.md` "anti AI slop" file and an "AI usage warning" to its PR template in 2026 — a governance response to low-quality AI-generated PR volume ([2.3.0 release notes, PR #7204](https://github.com/louislam/uptime-kuma/releases); [2.1.2 release notes, PRs #6951/#6963](https://github.com/louislam/uptime-kuma/releases)).
- **Stack:** Node.js (≥ 20.4) backend, Vue 3 frontend (migrated from Vue 2 in 2.0), SQLite default database with optional MariaDB in 2.x ([uptimekuma.io v2 guide](https://uptimekuma.io/uptime-kuma-v2-whats-new/); [README](https://github.com/louislam/uptime-kuma)).
- **Deployment:** Single Docker container (`docker run -d -p 3001:3001 -v uptime-kuma:/app/data louislam/uptime-kuma:2`), rootless by default since 2.0 ([README](https://github.com/louislam/uptime-kuma); [v2 guide](https://uptimekuma.io/uptime-kuma-v2-whats-new/)). Also runs bare-metal on Node.js + pm2.

## Features

- **Monitor types (30+ in 2.x):** HTTP(s), HTTP(s) Keyword, HTTP(s) JSON Query, TCP, Ping (ICMP), DNS, WebSocket, Push (heartbeat/cron), Steam Game Server, Docker container, gRPC, Kafka producer, RabbitMQ, SNMP, Tailscale ping, database monitors (MySQL, PostgreSQL, SQL Server, Redis, OracleDB added in 2.3.0), NTLM auth, Globalping-backed DNS/multi-location checks ([README feature list](https://github.com/louislam/uptime-kuma); [v2 guide — new monitor types](https://uptimekuma.io/uptime-kuma-v2-whats-new/); [2.3.0 release notes](https://github.com/louislam/uptime-kuma/releases)).
- **Check interval:** as low as 20 seconds ([README](https://github.com/louislam/uptime-kuma)).
- **Notifications:** **90+ providers** (91 as of 2.x) — Telegram, Discord, Slack, Gotify, Pushover, SMTP email, ntfy, WhatsApp, Signal (with templating), Matrix, PagerDuty, Opsgenie, Grafana OnCall, Home Assistant, plus a steady drip of niche additions each release (EgoSMS, VKTeams, Telnyx, VK, MAX messenger in 2.3–2.4) ([README](https://github.com/louislam/uptime-kuma); [v2 guide](https://uptimekuma.io/uptime-kuma-v2-whats-new/); [release notes](https://github.com/louislam/uptime-kuma/releases)).
- **Other:** maintenance windows with weekly recurrence, 2FA, per-monitor proxy support (incl. SOCKS for notifications in 2.2.0), TLS certificate info + domain-expiry checks, Prometheus metrics endpoint, status badges, structured JSON logging (2.2.0), i18n via Weblate (dozens of languages) ([README](https://github.com/louislam/uptime-kuma); [2.x release notes](https://github.com/louislam/uptime-kuma/releases); [v2 guide](https://uptimekuma.io/uptime-kuma-v2-whats-new/)).

## Pricing

- **Free and open source (MIT), no paid tier, no official SaaS/cloud.** Funding is donations only ([README sponsors](https://github.com/louislam/uptime-kuma); [youngju.dev](https://www.youngju.dev/blog/culture/2026-05-16-uptime-monitoring-status-pages-2026-better-stack-pingdom-uptime-robot-uptime-kuma-checkly-deep-dive.en)).
- A third-party managed-hosting ecosystem has grown around it (e.g. smartxhosting.uk, DANIAN) — demand for "Uptime Kuma without the ops" exists and is being monetized by others, not by the project ([uptimekuma.io](https://uptimekuma.io/uptime-kuma-v2-whats-new/); [danian.co](https://danian.co/articles/post/reselling-managed-uptime-kuma)).

## Status pages

- Multiple status pages per instance (since 1.13.0), per-page custom domain mapping (since 1.14.0), password protection, grouping of monitors, custom CSS ([Status Page wiki](https://github.com/louislam/uptime-kuma/wiki/Status-Page); [README](https://github.com/louislam/uptime-kuma)).
- 2.x improved the editor to near-WYSIWYG with custom-CSS preview, added recurring maintenance windows, incident posts with basic formatting, and a stabilized status-page API ([v2 guide](https://uptimekuma.io/uptime-kuma-v2-whats-new/)). 2.3.0 added collapsible groups; 2.4.0 added incidents to RSS ([release notes](https://github.com/louislam/uptime-kuma/releases)).
- **Hard limitations (verified):**
  - Status pages **cache results for 5 minutes and only refresh every 5 minutes** — explicitly "not as responsive as the dashboard" ([Status Page wiki](https://github.com/louislam/uptime-kuma/wiki/Status-Page)). No live updates.
  - **Sorting on status pages was added and then reverted in 2.3.0 "due to bad performance"** ([2.3.0 release notes, PR #7194](https://github.com/louislam/uptime-kuma/releases)) — a sign of frontend performance strain.
  - No custom subdirectory support and no custom HTML/meta embedding — official workaround is an iframe hack ([Status Page wiki](https://github.com/louislam/uptime-kuma/wiki/Status-Page)).

## UX notes

- The 2.0 Vue 2→Vue 3 migration (stable Oct 2025) made the UI "noticeably snappier" — faster panels, smooth scrolling at a few hundred monitors — but it is **not a ground-up redesign**; screens are "mostly in the same places" ([v2 guide](https://uptimekuma.io/uptime-kuma-v2-whats-new/)).
- The UI is utilitarian Bootstrap-era Vue: functional and dense, but not a 2026-grade polished interface. PingBoard's PRD assessment — "the UI feels dated, the public status pages aren't polished" (PRD.md §2.3) — remains fair post-2.0; even sympathetic reviews call the changes "small UI improvements," not a redesign ([v2 guide](https://uptimekuma.io/uptime-kuma-v2-whats-new/)).
- **Feature-surface bloat:** 30+ monitor types and 91 notification providers live in the same add-monitor/settings flows, so the indie-hacker core path (HTTP check + Slack/Discord alert) is buried in long dropdowns. This is exactly the "five years of features most users don't need" critique in PRD.md §2.3.
- 2.1.x shipped and then had to remove `vite-plugin-pwa` because it cached frontend files unexpectedly, causing stale-UI bugs ([2.1.1 and 2.1.2 release notes, PRs #6907/#6933](https://github.com/louislam/uptime-kuma/releases)) — polish/regression friction typical of the project's large-surface UI.
- Through an Emil Kowalski lens: the dashboard updates in real time via socket.io (genuinely "alive"), but the status page — the customer-facing surface — is a 5-minute-refresh page with no transition craft; through the Vercel Web Interface Guidelines lens, the app shows its age in form density and lack of considered empty/loading states (subjective but consistently echoed in reviews: [web-alert.io 2026](https://web-alert.io/blog/uptime-kuma-alternative-uptime-monitoring-2026)).

## Recent moves (last 12 months, verified via GitHub releases API)

Release cadence is roughly **one stable release per month**, plus patch releases — very active maintenance:

| Release | Date | Headlines |
|---|---|---|
| 2.0.0 (stable) | 2025-10-20 | MariaDB support, Vue 3, rootless Docker, after ~1 year of beta (beta.0 was 2024-10-29) ([releases API](https://api.github.com/repos/louislam/uptime-kuma/releases); [v2 guide](https://uptimekuma.io/uptime-kuma-v2-whats-new/)) |
| 2.0.1 / 2.0.2 | 2025-10-20/22 | Immediate post-release patches ([releases API](https://api.github.com/repos/louislam/uptime-kuma/releases)) |
| 1.23.17 | 2025-10-20 | Final 1.x line release ([releases API](https://api.github.com/repos/louislam/uptime-kuma/releases)) |
| 2.1.0–2.1.3 | 2026-02-07 → 02-19 | Globalping DNS, PWA cache fix, domain-expiry/RDAP work ([release notes](https://github.com/louislam/uptime-kuma/releases)) |
| 2.2.0 | 2026-03-05 | SOCKS proxy for notifications, WhatsApp provider, JSON structured logging; **security fix GHSA-c7hf-c5p5-5g6h (CVE-2026-32230 — missing authz on ping badge endpoint leaks private monitor response times)** ([release notes](https://github.com/louislam/uptime-kuma/releases); [SentinelOne CVE entry](https://www.sentinelone.com/vulnerability-database/cve-2026-32230/)) |
| 2.2.1 | 2026-03-10 | **Security fix GHSA-v832-4r73-wx5j (CVE-2026-33130 — path traversal via notification templates)** ([SentinelOne CVE entry](https://www.sentinelone.com/vulnerability-database/cve-2026-33130/)) |
| 2.3.0–2.3.2 | 2026-05-01 → 05-03 | OracleDB monitor, collapsible status-page groups; **reverted status-page sorting for performance; SQLite locking regressions (`SQLITE_BUSY`) required a single-connection env flag and two rapid patch releases** ([release notes](https://github.com/louislam/uptime-kuma/releases)) |
| 2.4.0 | 2026-05-31 | RSS incidents, EgoSMS/VKTeams providers; **security fix for LiquidJS RCE in notification templates (GHSA-gf2q-c269-pqgc)** ([release notes](https://github.com/louislam/uptime-kuma/releases)) |

Other signals:

- **Upgrade pain is real:** 1.x→2.x requires a one-time data-volume `chown` (rootless Docker), and there are open reports of extremely slow DB migrations when upgrading (e.g. [issue #7184, Mar 2026](https://github.com/louislam/uptime-kuma/issues/7184); [v2 guide breaking-changes list](https://uptimekuma.io/uptime-kuma-v2-whats-new/)).
- **Multi-user/RBAC still absent:** single shared admin login remains the model as of mid-2026; the long-standing request ([issue #128, open since 2021](https://github.com/louislam/uptime-kuma/issues/128)) and a fresh [multi-user+SSO request (#7413, May 2026)](https://github.com/louislam/uptime-kuma/issues/7413) are both unfulfilled ([Better Stack guide](https://betterstack.com/community/guides/monitoring/uptime-kuma-guide/); [nmaas docs](https://docs.nmaas.eu/nmaas-applications/tutorials/uptime-kuma/)).
- **No official REST API** for managing monitors; community tooling (uptime-kuma-api, AutoKuma) fills the gap and had to chase 2.x compatibility ([web-alert.io](https://web-alert.io/blog/uptime-kuma-alternative-uptime-monitoring-2026); [v2 guide](https://uptimekuma.io/uptime-kuma-v2-whats-new/)).
- **Three CVEs patched in ~3 months** (Mar–May 2026), two of them in the notification-template/badge surface ([SentinelOne CVE-2026-32230](https://www.sentinelone.com/vulnerability-database/cve-2026-32230/); [SentinelOne CVE-2026-33130](https://www.sentinelone.com/vulnerability-database/cve-2026-33130/); [2.4.0 release notes](https://github.com/louislam/uptime-kuma/releases)).

## Weaknesses & opportunities for PingBoard

1. **Status pages are the weakest customer-facing surface — attack there.** Kuma's status pages cache for 5 minutes, refresh on a timer, can't sort (reverted for perf), and can't embed custom HTML ([Status Page wiki](https://github.com/louislam/uptime-kuma/wiki/Status-Page); [2.3.0 release notes](https://github.com/louislam/uptime-kuma/releases)). PingBoard's SSE live status page with polished ShadCN design (PRD §4, §6.5) is a direct, demonstrable win — "your status page updates the second your monitor flips" is a one-line differentiator Kuma cannot match without a rewrite.
2. **Design gap persists post-Vue 3.** The 2.0 migration modernized the engine, not the design ([v2 guide](https://uptimekuma.io/uptime-kuma-v2-whats-new/)). A 2026-grade UI (Kowalski-grade interaction polish on the dashboard, Web-Interface-Guidelines-clean forms) remains unclaimed territory — Kuma's UI is community-patch-driven, not design-led.
3. **Feature bloat vs opinionated focus.** 30+ monitor types / 91 notification channels create configuration noise for the indie 80% ([v2 guide](https://uptimekuma.io/uptime-kuma-v2-whats-new/)). PingBoard's 5 monitor types + 5 channels + smart-inference wizard (PRD §6, §7.2) should market "time-to-first-check" against Kuma's long dropdowns.
4. **Upgrade/migration friction.** Rootless chown, slow 2.x migrations, SQLite locking regressions, and PWA cache bugs all hit in the last 9 months ([issue #7184](https://github.com/louislam/uptime-kuma/issues/7184); [2.3.x release notes](https://github.com/louislam/uptime-kuma/releases)). PingBoard's single-Bun-binary, migrations-at-boot, zero-dep story should stay boring — boring reliability is the pitch.
5. **Security surface from breadth.** Three CVEs in Q1–Q2 2026, all in the long tail (badge endpoints, notification templates) ([SentinelOne](https://www.sentinelone.com/vulnerability-database/cve-2026-32230/), [SentinelOne](https://www.sentinelone.com/vulnerability-database/cve-2026-33130/), [2.4.0 notes](https://github.com/louislam/uptime-kuma/releases)). PingBoard's narrow surface + single auth boundary (PRD §13) is structurally easier to keep clean — worth stating in positioning, carefully.
6. **Where Kuma genuinely wins — don't fight these head-on:** 89.6k stars of trust and distribution; niche monitor types (game servers, Docker, SNMP, Tailscale, DBs) that PingBoard v1 explicitly defers (PRD §6.1); 91 notification channels vs 5; i18n; badges; Prometheus metrics. The counter-position is focus, not parity: "the 5 channels you actually use, done well."
7. **Neutral/shared constraints (not differentiators):** single shared admin login (PingBoard is also single-admin — PRD §6.7), single-region probing (both are single-instance; [uptimekuma.io comparison](https://uptimekuma.io/uptime-kuma-vs-uptime-robot/)), no official management API (PingBoard v1 defers API tokens — PRD §14).
8. **Watch item:** the managed-hosting ecosystem around Kuma ([danian.co](https://danian.co/articles/post/reselling-managed-uptime-kuma)) proves willingness to pay for "Kuma without ops" — validates PingBoard's future cloud path (PRD §15) more than it threatens the OSS product.

## Sources

- GitHub repo & README: https://github.com/louislam/uptime-kuma
- GitHub API (stars/forks/license/releases, fetched 2026-07-31): https://api.github.com/repos/louislam/uptime-kuma · https://api.github.com/repos/louislam/uptime-kuma/releases
- Release notes (2.1.0–2.4.0): https://github.com/louislam/uptime-kuma/releases
- Uptime Kuma v2 "what's new" guide: https://uptimekuma.io/uptime-kuma-v2-whats-new/
- Status Page wiki: https://github.com/louislam/uptime-kuma/wiki/Status-Page
- 2026 monitoring landscape deep dive: https://www.youngju.dev/blog/culture/2026-05-16-uptime-monitoring-status-pages-2026-better-stack-pingdom-uptime-robot-uptime-kuma-checkly-deep-dive.en
- CVE-2026-32230 (badge endpoint authz): https://www.sentinelone.com/vulnerability-database/cve-2026-32230/ · https://synscan.net/vuln/cve-2026-32230
- CVE-2026-33130 (notification template path traversal): https://www.sentinelone.com/vulnerability-database/cve-2026-33130/
- Slow 2.x migration report: https://github.com/louislam/uptime-kuma/issues/7184
- Multi-user requests: https://github.com/louislam/uptime-kuma/issues/128 · https://github.com/louislam/uptime-kuma/issues/7413
- Better Stack Uptime Kuma guide (no multi-user/RBAC): https://betterstack.com/community/guides/monitoring/uptime-kuma-guide/
- Webalert "Uptime Kuma alternative 2026" (single login, no REST API): https://web-alert.io/blog/uptime-kuma-alternative-uptime-monitoring-2026
- Uptime Kuma vs Uptime Robot (single-region by design): https://uptimekuma.io/uptime-kuma-vs-uptime-robot/
- Managed Kuma hosting ecosystem: https://danian.co/articles/post/reselling-managed-uptime-kuma
- PingBoard positioning: PRD.md (this repo)
