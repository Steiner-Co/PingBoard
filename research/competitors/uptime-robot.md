# Competitor Research — UptimeRobot

> Researched 2026-07-31 against current live sources (uptimerobot.com pricing/blog/help pages, third-party reviews). PingBoard positioning per `PRD.md`: self-hosted single container, zero deps, MIT, polished modern UI, indie hackers.

## Overview

UptimeRobot is the incumbent mass-market hosted uptime-monitoring SaaS, launched 2010, now claiming **3.3M+ users** ([IsDown acquisition post](https://uptimerobot.com/blog/uptimerobot-has-acquired-isdown/)). It is closed-source, hosted-only (no self-host option), and owned by Itrinity, which has been actively expanding it (API v3, mobile redesign, IsDown acquisition). Its pitch is simplicity + an extremely generous free tier (50 monitors), monetized via check-interval and feature gating. It is the tool PingBoard users most likely already know — and the one whose pricing/trust stumbles (legacy-plan hikes, the 2024 free-tier ToS episode) create the opening for a self-hosted alternative ([Hyperping review analysis](https://hyperping.com/blog/uptimerobot-reviews)).

## Features

**Monitor types** ([pricing page feature table](https://uptimerobot.com/pricing/)):

- HTTP(S), Keyword, Ping, Port — core types, all plans
- API monitoring (custom headers, JSON field validation), UDP, DNS, SSL expiry, domain expiry, heartbeat/cron — paid plans (heartbeat/cron is also on free per [help center](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan))
- Location-specific monitoring (multi-region from 4 regions: NA, EU, Asia, Australia) and slow-response alerts (50–5000 ms thresholds) — paid
- Maintenance windows, custom headers/statuses, incidents with root-cause comments/post-mortems (commenting paid-only)

**Check intervals:** 5 min free / 60s Solo / 30s Team / 15s Scale; custom & faster on Enterprise.

**Verification:** checks run from 15+ global locations and "an alert fires only when several locations agree" ([agentic setup post](https://uptimerobot.com/blog/your-ai-agent-can-now-set-up-uptime-monitoring-no-signup-required/)) — note this contradicts persistent community complaints about single-node false positives (see UX notes).

**Notification channels** ([pricing page](https://uptimerobot.com/pricing/)):

- Email, SMS, voice call, Email2SMS (SMS/voice are metered credits: $3/10 up to $100/1000, one-time purchases)
- Free plan: only 5 integrations — Google Chat, Discord, Pushover, Pushbullet, Splunk
- Solo: + Slack, Mattermost, Telegram, MS Teams
- Team+: + Webhook, Zapier, PagerDuty
- Recurring/prolonging notifications (alert when down x min, repeat every y min) — paid
- "Advanced notification options" shipped Nov 2025 ([blog](https://uptimerobot.com/blog/new-feature-advanced-notification-options-for-the-pro-plan/)); timing-based delayed/tiered alerts described in the [Jan 2026 roadmap Q&A](https://uptimerobot.com/blog/uptimerobot-product-roadmap-qa/)

**Other:** REST API v3 (below), Terraform provider with a dedicated engineer, read-only MCP server (edit support in progress), monitor grouping + tagging (Aug 2025, Solo+), mobile apps iOS/Android, monthly email reports, 2FA, team seats (login vs notify-only).

## Pricing

From the live [pricing page](https://uptimerobot.com/pricing/) (checked 2026-07-31; prices are per "monitor tier" selector — entry tier shown, they scale up with monitor count):

| Plan | Annual /mo | Monthly /mo | Monitors (entry) | Interval | Status pages | Retention |
|---|---|---|---|---|---|---|
| Free | $0 | $0 | **50** | 5 min | 1 (basic) | 3 months |
| Solo | $9 | $10 | 10 | 60s | 3, custom domain | 12 months |
| Team | $29 | $34 | 100 | 30s | 100, white-label | 24 months |
| Scale | $54 | $64 | 200 (or 500) | 15s | Unlimited | 24 months |
| Enterprise | custom | custom | any | custom/faster | unlimited | custom |

Key details:

- Free plan: 50 monitors, 5-min checks, core types, **only 5 integrations, basic status page, no seats** ([pricing](https://uptimerobot.com/pricing/)). Officially **usable commercially** — the Nov 2024 attempt to ban commercial use was reversed ([help center, Jun 2026](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan), [agentic post](https://uptimerobot.com/blog/your-ai-agent-can-now-set-up-uptime-monitoring-no-signup-required/)).
- Solo starts at only **10 monitors** at the $9 tier — monitor count scales the price; 50 monitors on Solo costs more (third-party tracking puts Solo w/ 50 monitors at ~$19/mo and Team at ~$38/mo: [cubeapm pricing review, Jun 2026](https://cubeapm.com/blog/uptimerobot-pricing-and-review/), [stackranger review, Jul 2026](https://stackranger.com/en/website-monitoring/uptimerobot-review/)).
- Extra login seats $15–19/mo each; SMS/voice credits extra on all plans.
- Team bundles 30% off IsDown; Scale 50%; Enterprise includes IsDown Business.
- **Legacy-plan price hikes:** long-time customers report forced migrations, e.g. $8/mo → $34/mo (425%), $88/yr → $348/yr ([Hyperping review roundup](https://hyperping.com/blog/uptimerobot-reviews)).

## Status pages

From the [status-page product page](https://uptimerobot.com/status-page/) and [pricing comparison](https://uptimerobot.com/pricing/):

- **Counts:** 1 (Free) / 3 (Solo) / 100 (Team) / unlimited (Scale).
- **Customization (paid):** logo, brand colors, custom fonts, layouts, light/dark themes, density settings, favicon; white-label (remove UptimeRobot branding) is Team+.
- **Custom domain** on paid plans (few clicks, hosted TLS — no reverse-proxy work for the user).
- **Subscribers:** end users can subscribe to email updates (paid); announcements/maintenance posts with timeline.
- **Private pages:** password protection + search-engine no-index opt-out (paid).
- **11 languages** (EN, AR, ZH, NL, FR, DE, HI, ID, PT, ES, TR).
- **Data controls:** show/hide uptime %, bar charts, response times, monitored URLs, paused monitors; Google Analytics embed.
- **Grouping:** monitors can be shown under named groups on the page (tags are internal-only); **group-level aggregated status on status pages is still in research**, not shipped ([roadmap Q&A](https://uptimerobot.com/blog/uptimerobot-product-roadmap-qa/)).
- Free-tier page is "basic" — UptimeRobot-branded, limited customization.
- v3 API can fully manage pages programmatically ([v3 API post](https://uptimerobot.com/blog/introducing-the-uptimerobot-v3-api/)).

This is a genuinely strong offering on paid tiers — deeper than PingBoard v1 (subscribers, translations, white-label, hosted custom-domain TLS). PingBoard v1 counters with password protection + custom domain via reverse proxy, but no subscribers/i18n.

## UX notes

- **Review sites vs community split:** G2 average ~4.8/5 across 48 recent reviews — praised for minutes-fast setup and dependable basic HTTP alerting; Reddit/X/self-hosted forums are markedly harsher ([Hyperping review analysis](https://hyperping.com/blog/uptimerobot-reviews)).
- **False positives are the #1 community complaint:** documented cases of 140 alert emails in one incident window and 70+ false alerts/day; users explicitly ask for multi-location verification before alerting. UptimeRobot claims multi-location agreement on its agent-flow page, suggesting the gap is plan- or monitor-type-dependent ([Hyperping](https://hyperping.com/blog/uptimerobot-reviews), [agentic post](https://uptimerobot.com/blog/your-ai-agent-can-now-set-up-uptime-monitoring-no-signup-required/)).
- **Dashboard is functional but utilitarian** — long-time users describe it as simple/logical rather than polished; the company itself invested in a **brand refresh + completely redesigned mobile app (Nov 2025)** ([mobile app post](https://uptimerobot.com/blog/redesigned-mobile-app/)), implicitly acknowledging UI debt. No comparable public web-dashboard redesign.
- Alert content is not customizable (can't edit email body); keyword monitoring misses JS-rendered content; no scripted/synthetic checks ([Hyperping](https://hyperping.com/blog/uptimerobot-reviews)).
- Feature discoverability issues: tiered/delayed alerting already exists but users didn't know — the CPO admits documentation gaps ([roadmap Q&A](https://uptimerobot.com/blog/uptimerobot-product-roadmap-qa/)).
- Trust/UX failures beyond pixels: quiet ToS reversal left stale "non-commercial only" claims all over third-party content; brand-impersonation phishing emails exploiting their template design ([announcement, May 2026](https://uptimerobot.com/blog/category/announcements/)).

Design-lens takeaway for PingBoard (Vercel guidelines / Kowalski craft): UptimeRobot competes on breadth and price, not on interface feel. A dashboard with real-time SSE updates, restrained motion (<300 ms ease-out), good defaults, and status pages that look considered out-of-the-box is a real differentiator against an incumbent whose polish effort went to the mobile app and marketing site, not the core web UI.

## Recent moves (last ~12 months, newest first)

- **Jul 2026 — Acquired IsDown** (third-party dependency monitoring, 6,000+ services tracked); IsDown discounts now bundled into Team/Scale/Enterprise plans ([acquisition post](https://uptimerobot.com/blog/uptimerobot-has-acquired-isdown/), [pricing](https://uptimerobot.com/pricing/)).
- **Jul 2026 — Agentic/AI-agent signup flow:** AI agents (Claude Code, Cursor, MCP) can create a monitor + free account via proof-of-work + email confirmation; `llms.txt` and a public `github.com/uptimerobot/ai` skill repo ([agentic post](https://uptimerobot.com/blog/your-ai-agent-can-now-set-up-uptime-monitoring-no-signup-required/)).
- **Jan 2026 — Roadmap Q&A:** committed to teams/escalation management, group-level status on status pages, Terraform provider investment, MCP server (read-only live, edit coming) ([Q&A](https://uptimerobot.com/blog/uptimerobot-product-roadmap-qa/)).
- **Nov 2025 — Redesigned iOS/Android app** ([post](https://uptimerobot.com/blog/redesigned-mobile-app/)) and **Advanced Notification Options** (delayed/recurring alerts) ([post](https://uptimerobot.com/blog/new-feature-advanced-notification-options-for-the-pro-plan/)).
- **Sep 2025 — API v3 launched:** true REST, JWT bearer auth, cursor pagination, heartbeat/DNS monitor support, integrations API, PSP management; v2 frozen ([post](https://uptimerobot.com/blog/introducing-the-uptimerobot-v3-api/)).
- **Aug 2025 — Monitor Grouping** (Solo+) and TLS 1.2+ enforcement ([announcements](https://uptimerobot.com/blog/category/announcements/)).
- **2025 — Legacy plan migrations / price increases** (community-reported, 4x+ jumps) ([Hyperping](https://hyperping.com/blog/uptimerobot-reviews)).
- Ongoing: migration from "Pro/Enterprise" naming to Solo/Team/Scale/Enterprise tiers.

## Weaknesses & opportunities for PingBoard

**Weaknesses (with evidence):**

1. **Hosted-only, no self-host** — cannot monitor internal/LAN services; requires trusting a third party with endpoint data. PingBoard's single container is a hard structural advantage here (PRD §2).
2. **Pricing gate on everything that matters:** faster-than-5-min checks, SSL/DNS monitoring, webhook/Slack/PagerDuty, white-label, subscribers, custom design are all paid; monitor counts and seats scale the bill ([pricing](https://uptimerobot.com/pricing/)). PingBoard: "self-host means unlimited" (PRD §5) — 60s default interval and all channels free beats the $9–29/mo entry.
3. **Pricing trust damage:** legacy-plan hikes up to 425% and the announced-then-quietly-reversed commercial-use ban ([Hyperping](https://hyperping.com/blog/uptimerobot-reviews)). PingBoard's MIT license makes this class of rug-pull impossible — worth saying explicitly on the landing page.
4. **False-positive reputation** at scale ([Hyperping](https://hyperping.com/blog/uptimerobot-reviews)). PingBoard can't out-verify a multi-region SaaS, but honest retry-before-down defaults + clear incident annotations are the credible counter; don't over-claim.
5. **Web dashboard UX is stagnant** — the redesign energy went to mobile and marketing. PingBoard's ShadCN-grade real-time dashboard targets exactly this gap (PRD §2, §4).
6. **Solo tier monitor bait:** $9/mo entry includes only 10 monitors — a user with 30 side-project endpoints pays meaningfully more. PingBoard: unlimited monitors, free.
7. **Free-tier retention is 3 months**; PingBoard ships 30-day heartbeats + permanent DailyStat rollups by default (PRD §9, §16).

**Where UptimeRobot genuinely beats PingBoard v1 (don't pretend otherwise):**

- Hosted custom domains with TLS in a few clicks (PingBoard requires user's reverse proxy)
- Status-page **email subscribers**, 11-language translations, white-label
- SMS/voice-call alerting, mobile push apps
- Multi-region checks (15+ locations, 4 selectable regions)
- Mature API + Terraform + MCP; maintenance windows; heartbeat/cron monitoring (PingBoard post-v1)
- Zero-ops: no Docker host needed at all; agentic AI-agent onboarding flow is a distribution channel PingBoard lacks

**Positioning recommendation:** PingBoard's sharpest wedge is "the UptimeRobot free tier, but unlimited and yours" — self-hosted, MIT, 60s checks, all notification channels, no per-monitor/per-seat meter, no pricing emails ever. Avoid competing on SMS/voice, multi-region, or status-page subscribers in v1 messaging; UptimeRobot wins those and the PRD explicitly excludes them.

## Sources

- https://uptimerobot.com/pricing/ — plans, feature comparison, SMS pricing (checked 2026-07-31)
- https://uptimerobot.com/status-page/ — status-page feature set
- https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan — free plan terms, commercial use, sponsored plans
- https://uptimerobot.com/blog/uptimerobot-has-acquired-isdown/ — IsDown acquisition, 3.3M+ users
- https://uptimerobot.com/blog/your-ai-agent-can-now-set-up-uptime-monitoring-no-signup-required/ — agentic signup, 15+ locations, multi-location alert agreement, free-tier contents
- https://uptimerobot.com/blog/uptimerobot-product-roadmap-qa/ — tiered alerting, status-page group status research, Terraform, MCP
- https://uptimerobot.com/blog/introducing-the-uptimerobot-v3-api/ — API v3 details
- https://uptimerobot.com/blog/redesigned-mobile-app/ — mobile redesign (Nov 2025)
- https://uptimerobot.com/blog/new-feature-advanced-notification-options-for-the-pro-plan/ — advanced notifications (Nov 2025)
- https://uptimerobot.com/blog/category/announcements/ — announcement timeline (grouping, TLS, v3, IsDown, agentic, phishing)
- https://hyperping.com/blog/uptimerobot-reviews — G2/Reddit/X sentiment, false positives, legacy price hikes, 2024 ToS episode (competitor-authored; claims cross-checked above)
- https://cubeapm.com/blog/uptimerobot-pricing-and-review/ — third-party price cross-check (Jun 2026)
- https://stackranger.com/en/website-monitoring/uptimerobot-review/ — third-party price cross-check (Jul 2026; note: its "non-commercial free tier" claim is outdated per official help center)
