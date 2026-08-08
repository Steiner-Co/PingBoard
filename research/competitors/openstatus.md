# Competitor Research — OpenStatus (openstatus.dev)

> Researched: 2026-07-31. All claims cite current public sources (site, docs, changelog, GitHub).

## Overview

OpenStatus is an open-source platform combining **status pages and uptime monitoring** in one product, offered as a hosted SaaS (openstatus.dev) or self-hosted. It is the most direct "powerful but heavy" competitor named in PingBoard's PRD (§2).

- **Repo:** [openstatusHQ/openstatus](https://github.com/openstatusHQ/openstatus) — 8,922 stars, 723 forks, 57 open issues, last push 2026-07-30 (very active, daily commits) — [GitHub API, queried 2026-07-31](https://api.github.com/repos/openstatusHQ/openstatus)
- **License:** **AGPL-3.0** ([GitHub README footer](https://github.com/openstatusHQ/openstatus)) — a meaningful wedge vs PingBoard's MIT.
- **Stack:** Next.js dashboard, Hono API server, Go checker, Turso/libsql database, Drizzle ORM, Tinybird analytics, Tailwind + shadcn/ui ([README Tech Stack](https://github.com/openstatusHQ/openstatus)).
- **Positioning:** "The compliance-first status page" / status page + uptime monitoring + "API monitoring as code" (YAML, CLI, Terraform, MCP server for AI agents) ([GitHub](https://github.com/openstatusHQ/openstatus), [openstatus.dev](https://www.openstatus.dev/)).
- **Headline capability:** 28 global regions checking in parallel across 3 cloud providers ([README](https://github.com/openstatusHQ/openstatus)).

## Features

### Monitor types
Only **three** monitor types: **HTTP, TCP, and DNS** — "HTTP, TCP & DNS monitors — check APIs, servers, and DNS resolution" ([docs.openstatus.dev](https://docs.openstatus.dev/)). Notably **no ICMP ping** monitor (PingBoard v1 has one).
- HTTP supports headers/body, binary payloads, request assertions, follow-redirects ([changelog: Binary payload Aug 2024, Request assertions Apr 2024, Follow Redirect Sep 2025](https://www.openstatus.dev/changelog)).
- TCP added Nov 2024, DNS added Nov 2025 ([changelog](https://www.openstatus.dev/changelog)).
- No synthetic/browser multi-step monitoring (their own "what is synthetic monitoring" guide is definitional, not a shipped feature: [guides](https://www.openstatus.dev/guides/what-is-synthetic-monitoring)).

### Checking model
- Frequencies: `30s`, `1m`, `5m`, `10m` (default), `30min`, `1h` ([docs: Monitor](https://docs.openstatus.dev/synthetic/features/monitor)).
- Multi-region by default: 28 regions in parallel across 3 clouds; Starter limited to 6 regions per monitor, Pro/Scale get all 28 ([pricing](https://www.openstatus.dev/pricing)).
- On-demand "run check" API / global speed checker ([changelog](https://www.openstatus.dev/changelog)).
- **Private locations:** lightweight probe (8.5 MB Docker image) for internal endpoints, GA-ish since beta Oct 2025 ([changelog: Private Location beta Oct 2025](https://www.openstatus.dev/changelog), [README](https://github.com/openstatusHQ/openstatus)).

### Notification channels — 12 (13 incl. MS Teams)
Terraform provider reference lists 12 provider types: **Discord, Email, Slack, PagerDuty, OpsGenie, Webhook, Telegram, SMS, WhatsApp, Google Chat, Grafana OnCall, ntfy** ([docs: Terraform reference](https://docs.openstatus.dev/reference/terraform/)); **Microsoft Teams** was added May 11, 2026 ([changelog](https://www.openstatus.dev/changelog)). Plan-gated: 10 channels on Starter, 20 on Pro/Scale ([pricing](https://www.openstatus.dev/pricing)).

### Developer/agent tooling (their current differentiator)
- CLI (interactive + `--json`), monitoring-as-code YAML, Terraform/OpenTofu provider, GitHub Actions, typed API (ConnectRPC) with Node/Python/PHP SDKs, **MCP server** (May 2026), in-dashboard AI chat assistant (May 2026, self-hostable with your own model Jul 2026), Slack agent (Feb 2026) ([README Tooling](https://github.com/openstatusHQ/openstatus), [changelog](https://www.openstatus.dev/changelog)).

### Incidents & extras
- Status reports with component impacts (Jun 2026), maintenance windows, audit logs (Pro+, Apr 2026), OTel exporter (Pro+), API key scopes, website screenshots for incidents ([changelog](https://www.openstatus.dev/changelog), [pricing](https://www.openstatus.dev/pricing)).

## Pricing (hosted)

[openstatus.dev/pricing](https://www.openstatus.dev/pricing) (fetched 2026-07-31). All plans: **unlimited team members**, monthly or annual (annual = 2 months free), EUR/USD via Stripe, 30-day refund.

| | Hobby (free) | Starter $30/mo | Pro $100/mo | Scale $500/mo |
|---|---|---|---|---|
| Monitors | 1 | 20 | 50 | 50 |
| Check interval | 10 min | 1 min | 30s | 30s |
| Status pages | 1 (3 components) | 1 (+$20/mo each extra) | 5 (+$20/mo each extra) | 10 (+$20/mo each extra) |
| Components | 3 | 20 | 50 | 500 |
| Regions per monitor | — | 6 | 28 | 28 |
| Data retention | — | 3 months | 12 months | 24 months |
| Notification channels | — | 10 | 20 | 20 |
| Custom theme | — | — | ✓ | ✓ |
| Private locations / OTel / audit log | — | — | ✓ | ✓ |

Add-ons (billed monthly on top of any plan): **White Label $300/mo** (included in Scale), **Email Authentication $100/mo** (included in Scale), **IP Restriction $100/mo** (included in Scale), **extra status pages $20/mo each**. Enterprise: SOC2, SAML/SSO, custom regions, dedicated SLA ([pricing](https://www.openstatus.dev/pricing)).

Observation: a team wanting 3 public status pages + white label on Starter pays $30 + $40 + $300 = **$370/mo** — the add-on model escalates fast, which PingBoard ("self-host means unlimited", PRD §5) directly undercuts.

## Status pages

This is OpenStatus's strongest surface; the changelog shows more status-page work than monitoring work in the last 12 months ([changelog](https://www.openstatus.dev/changelog)):
- Component-based pages (components, groups, per-component subscriptions, component impacts on reports), grouped monitors, custom domain, password protection, email-authentication and IP-restriction gating (paid add-ons), white label.
- Custom themes (Pro+, Jul 2026), Theme Explorer (Oct 2025), i18n/locale switcher (Mar 2026), configurable history window (Jun 2026), search-engine indexing control (Apr 2026).
- Subscribers via email + RSS + webhook + Slack feed; embeddable widget; public JSON status page (Nov 2025); badge v2; auto-post status updates to X and Bluesky (Jun 2026); status-page importer from Atlassian Statuspage / Better Stack / Instatus (Mar 2026).
- Status-page redesign shipped in beta Oct 2025.

PingBoard's PRD (§6.5) covers the core (groups, themes, password, custom domain via reverse proxy, 30/90-day bars) but not: subscriber notifications, maintenance windows, white label, custom themes beyond light/dark, or i18n. Fine for v1; worth tracking as the gap users will name first (especially **subscribers** and **maintenance windows**, which OpenStatus includes on all paid plans).

## UX notes

- Built with **Tailwind + shadcn/ui** — same component language PingBoard targets ([README](https://github.com/openstatusHQ/openstatus)). They invested visibly in design engineering: a **shadcn component registry** of their own (Feb 2026), a hand-rolled data-table series, "Live Mode", and a July 2026 **command menu** ([blog](https://www.openstatus.dev/blog), [changelog](https://www.openstatus.dev/changelog)).
- The status-page redesign (beta, Oct 2025) plus Theme Explorer and custom themes (Jul 2026) means their public pages are genuinely good-looking and brandable — this is the bar PingBoard's "look good enough to show customers" (PRD §6.5) is measured against, not Uptime Kuma's.
- Dashboard is a full Next.js app: powerful but heavy — workspace/plan concepts, limits, audit logs, AI assistant. Judged against the Emil Kowalski lens (defaults > knobs; invisible correctness), OpenStatus exposes a lot of surface area; PingBoard's opportunity is the *opposite* discipline — fewer, better defaults, a dashboard that feels alive (SSE, <2s status changes, PRD §5) rather than feature-dense.
- Setup UX is their weak point: time-to-first-check self-hosted is measured in hours and multiple failure modes (see below) vs PingBoard's <60s goal (PRD §17).

## Recent moves (last ~12 months, Jul 2025 → Jul 2026)

From the official [changelog](https://www.openstatus.dev/changelog) and [blog](https://www.openstatus.dev/blog):

- **Jul 2025:** "Same Pricing. More Monitors." — raised monitor quotas at same price ([blog](https://www.openstatus.dev/blog)); CLI: import/manage monitors.
- **Aug–Sep 2025:** status-page badge v2; follow-redirect support; Product Hunt launch (Oct 22, "The Brutal Reality" retrospective).
- **Oct 2025:** **Status page redesign (beta)**, **Multi-cloud** (3 providers), **Private locations (beta)**, Theme Explorer, grouped monitors.
- **Nov 2025:** **DNS monitoring**, JSON status page, Slack feed subscribe.
- **Dec 2025:** Telegram, WhatsApp, Google Chat notifications; monitor external name.
- **Jan 2026:** White Label + Email Authentication add-ons, status-page unsubscribe, Grafana OnCall, global speed-checker skill.
- **Feb 2026:** Node **SDK**, **Slack agent**, shadcn component registry.
- **Mar 2026:** Status-page **i18n**, Terraform provider expansion (pages/notifications), **Status Page Importer** (from Statuspage/Better Stack/Instatus), CLI status-page/status-report commands.
- **Apr 2026:** **Audit logs**, **IP Restriction**, embed status page anywhere, indexing control.
- **May 2026:** **MCP server**, **chat assistant** (ChatOps pivot), **MS Teams** notifications, API key scopes, CLI global check.
- **Jun 2026:** Python + PHP SDKs, component impacts, configurable page history, auto-post to **X/Bluesky**, agent webhook + "tokenminning" (agent-readable status pages).
- **Jul 2026:** **Custom themes** for status pages, **command menu**, self-host the AI assistant with your own model, **lightweight self-host status-page-only guide** ([docs](https://www.openstatus.dev/docs/guides/self-host-status-page-only)).

Trajectory read: OpenStatus is moving **up-market and agent-ward** (SOC2/SSO enterprise tier, audit logs, MCP/ChatOps/AI) — not toward simpler self-hosting. The Jul 2026 "status-page-only" self-host guide is a partial concession to self-hosters, not a full-product simplification.

## Weaknesses & opportunities for PingBoard

### Self-hosting operational weight (PingBoard's core wedge — confirmed worse than the PRD claims)
The current [self-hosting guide](https://www.openstatus.dev/docs/guides/self-hosting-openstatus) (updated Jul 2026) shows a **9-service docker-compose stack**: `workflows` (:3000), `server` (:3001), `dashboard` (:3002), `status-page` (:3003), `private-location` ingest (:8081), `libsql` (:8080 + :5001), `tinybird-local` (:7181), plus a `db-migrate` one-shot — **plus** separately deployed probe containers elsewhere. Concretely a self-hoster must:

1. Install the **Tinybird CLI** and run `tb --local deploy` + `tb --local deployment promote`, then paste the token into **two different env var names** (`TINY_BIRD_API_KEY` and `TINYBIRD_TOKEN` — the docs call getting only the first "the most common self-hosting mistake") ([docs](https://www.openstatus.dev/docs/guides/self-hosting-openstatus)).
2. Set `RESEND_API_KEY` — **magic-link login doesn't work without a third-party email API key** ([docs](https://www.openstatus.dev/docs/guides/self-hosting-openstatus)).
3. **Hand-write SQL against the database to unlock features**: workspace limits (monitors, periodicity, retention) and even the paid "plan" must be set via raw `UPDATE workspace ...` curl commands — self-hosted instances are still gated by the SaaS plan system ([docs](https://www.openstatus.dev/docs/guides/self-hosting-openstatus)).
4. Run an **external cron** (system crontab or a hand-built Alpine cron container) for private-location health checks, or locations show "error" forever ([docs](https://www.openstatus.dev/docs/guides/self-hosting-openstatus)).
5. Accept documented limitations: **self-hosting only works with private locations** (you deploy probes yourself; no managed 28-region checking), and **IP restriction is insecure outside Vercel** (X-Forwarded-For spoofable) ([docs](https://www.openstatus.dev/docs/guides/self-hosting-openstatus)).

vs PingBoard: one container, one port, one volume, in-process scheduler, SQLite, `docker run` → first check <60s (PRD §4, §12). This comparison should be on the landing page.

### Other weaknesses
- **License: AGPL-3.0** vs PingBoard MIT — a real concern for companies embedding or extending; PingBoard should say so plainly ([GitHub](https://github.com/openstatusHQ/openstatus)).
- **Feature gating survives self-hosting** — even after deploying 9 services, limits/plan live in a DB row you must edit by hand (source above). PingBoard's "Self-host means unlimited" (PRD §5) is a clean counter-position.
- **No ICMP/ping monitor** — PingBoard v1 covers it ([docs.openstatus.dev](https://docs.openstatus.dev/)).
- **Complexity overshoot for the indie segment**: 28 regions, OTel export, Terraform, MCP, audit logs, workspaces — exactly the "enterprise-grade operational complexity" PingBoard's PRD §2 positions against. Their own roadmap momentum (ChatOps, agents, enterprise tier) points away from indie self-hosters.
- **Add-on pricing traps** on hosted plans ($20/page, $100–300/mo gating for page access control and white label) ([pricing](https://www.openstatus.dev/pricing)).

### Where OpenStatus genuinely beats PingBoard v1 (don't kid ourselves)
- **Subscriber notifications** (email/RSS/Slack feed), **maintenance windows**, white label, i18n, per-component subscriptions, embed/JSON/badge surfaces, status-page importer ([changelog](https://www.openstatus.dev/changelog)).
- **Multi-region checking** (28 regions parallel) and private locations for hybrid setups.
- **Alert breadth**: 13 channels incl. SMS, WhatsApp, PagerDuty/OpsGenie/Grafana OnCall, MS Teams vs PingBoard's 5.
- Ecosystem/tooling maturity: CLI, Terraform, SDKs, GitHub Action, MCP.

Recommended positioning for PingBoard: not "more features, cheaper" but **"the 60-second self-hosted status page"** — single container, unlimited everything, MIT, polished defaults. Track subscribers + maintenance windows as the first post-v1 features, since OpenStatus users cite them and PingBoard v1 lacks them.

## Sources

- Pricing: https://www.openstatus.dev/pricing (fetched 2026-07-31)
- GitHub repo / stars / license / stack / images: https://github.com/openstatusHQ/openstatus and https://api.github.com/repos/openstatusHQ/openstatus (queried 2026-07-31)
- Self-hosting guide (services, Tinybird, SQL limits, cron, limitations): https://www.openstatus.dev/docs/guides/self-hosting-openstatus
- Lightweight status-page-only self-host: https://www.openstatus.dev/docs/guides/self-host-status-page-only
- Docs overview (monitor types, channels, regions): https://docs.openstatus.dev/
- Monitor config (frequencies, regions): https://docs.openstatus.dev/synthetic/features/monitor
- Notification channel list (12 providers): https://docs.openstatus.dev/reference/terraform/
- Changelog (all recent moves): https://www.openstatus.dev/changelog
- Blog (last 12 months): https://www.openstatus.dev/blog
- Competitive framing (their own comparisons): https://www.openstatus.dev/compare , https://www.openstatus.dev/compare/uptime-kuma , https://www.openstatus.dev/guides/how-openstatus-compares-to-other-status-page-tools
