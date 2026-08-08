# Competitor Research — Pingdom (SolarWinds)

> Research date: 2026-07-31. All claims cite a URL; third-party pricing figures were cross-checked across at least two sources where possible.

## Overview

Pingdom is the veteran of the uptime-monitoring category: founded in 2005, acquired by SolarWinds in 2014 ([Pingdom blog](https://www.pingdom.com/blog/pingdom-joining-solarwinds/)). It is a cloud-only, closed-source SaaS positioned as an "external monitoring and digital experience" tool — uptime checks, page speed, transaction monitoring, and Real User Monitoring (RUM) — not a full observability platform ([CubeAPM, Jun 2026](https://cubeapm.com/blog/pingdom-pricing-and-review/)).

Ownership is now the most important fact about the company. In February 2025 SolarWinds agreed to be acquired by private-equity firm Turn/River Capital for ~$4.4B at $18.50/share ([SolarWinds press release, Feb 2025](https://www.solarwinds.com/company/newsroom/press-releases/solarwinds-to-be-acquired-by-turn-river-capital)); the deal closed in April 2025 and SolarWinds was taken private and delisted from the NYSE ([SolarWinds press release, Apr 2025](https://www.solarwinds.com/company/newsroom/press-releases/turnriver-completes-acquisition-of-solarwinds)). Third-party analysts note PE ownership of monitoring vendors historically means price increases and enterprise focus rather than product investment ([Notifier, Feb 2026](https://notifier.so/guides/datadog-vs-pingdom/), [UpDog](https://updog.watch/compare/pingdom-alternatives)).

Pingdom is strategically interesting for PingBoard because it is the archetype of PRD "bad option #1" (PRD.md §2): paid SaaS, per-monitor pricing, third party probes your endpoints, lock-in — and its weaknesses map almost one-to-one onto PingBoard's pitch.

## Features

Core product split: **Synthetic Monitoring** and **Real User Monitoring**, purchased separately ([CubeAPM, Jun 2026](https://cubeapm.com/blog/pingdom-pricing-and-review/)).

**Monitor types (Synthetic):**
- Uptime checks: HTTP(S), TCP port, ping/ICMP, DNS, and email-server checks (SMTP/POP3/IMAP), plus keyword/content checks on HTTP ([CubeAPM](https://cubeapm.com/blog/pingdom-pricing-and-review/), [Pulsetic comparison table](https://pulsetic.com/pingdom-alternative/)). Breadth is narrower than UptimeRobot — no heartbeat/cron, no SSL-cert or domain-expiry monitors per comparison data ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/), [Pulsetic](https://pulsetic.com/pingdom-alternative/)).
- "Advanced Checks" — page-speed monitoring and transaction monitoring (multi-step flows: login, signup, search, checkout, form submission). This is Pingdom's genuine differentiator; transaction checks are a feature PingBoard explicitly puts out of scope ([CubeAPM](https://cubeapm.com/blog/pingdom-pricing-and-review/)).
- Minimum check interval is **1 minute — no 30-second option at any price** ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/)).
- Checks run from 100+ global locations (SolarWinds marketing says "60+"; both figures appear in current sources), but locations are used **round-robin, not in parallel** — a regional outage can take a full rotation to surface ([openstatus, Jun 2026](https://www.openstatus.dev/guides/top-five-pingdom-alternatives), [Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/)).

**RUM:** separate product, JS snippet, priced by pageviews; session/load-time/bounce-rate analytics ([CubeAPM](https://cubeapm.com/blog/pingdom-pricing-and-review/)).

**Alerting / notification channels:**
- Email on all tiers; SMS via per-tier included credits (50–1,000/month, no rollover); **no phone-call alerting and no mobile app** ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/)).
- Native integrations are surprisingly thin for the price: **Slack, PagerDuty, VictorOps, and webhooks — no native Microsoft Teams, Telegram, or Discord** ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/)). VictorOps itself is a dead brand (Splunk On-Call), which says something about how often this list gets touched.
- Reporting: uptime/SLA reports, and AI-powered anomaly detection added in 2025 ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/)).

**Not in Pingdom:** self-hosting, open source, cron/heartbeat monitoring, multi-parallel-region checks, incident management/on-call, private status pages with SSO ([openstatus, Jun 2026](https://www.openstatus.dev/guides/top-five-pingdom-alternatives), [Hyperping](https://hyperping.com/compare/pingdom-alternative)).

## Pricing

No free plan — only a 14-day trial ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/), [CubeAPM](https://cubeapm.com/blog/pingdom-pricing-and-review/)). Pingdom's free plan was retired years ago under SolarWinds ([openstatus, Jun 2026](https://www.openstatus.dev/guides/top-five-pingdom-alternatives)).

Pricing is a usage-slider model with ~22 tiers (no named plans), per monitor count ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/)):

| Uptime checks | Monthly | Annual (per mo) | SMS credits/mo |
|---|---|---|---|
| 10 | $15 | $10 | 50 |
| 50 | $65 | $50 | 200 |
| 100 | $124 | $95 | 350 |
| 200 | $241 | $185 | 400 |

(Source: [Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/); consistent with [StackScored, Apr 2026](https://www.stackscored.com/pricing/uptime-monitoring/pingdom/) entry at $10/mo for 10 monitors and [OneUptime](https://oneuptime.com/compare/pingdom).)

- Official calculator (Jun 2026): entry Synthetic bundle = **$198/yr** (10 uptime checks, 1 Advanced Check, 50 SMS alerts); entry RUM = **$198/yr** (100K pageviews); ~$33/mo combined annually ([CubeAPM, Jun 2026](https://cubeapm.com/blog/pingdom-pricing-and-review/)).
- Realistic production spend is far above the entry price: CubeAPM models ~$100/mo (25 checks + light RUM) for a small team, ~$400/mo at 100 checks, ~$1,000/mo at 500 checks ([CubeAPM, Jun 2026](https://cubeapm.com/blog/pingdom-pricing-and-review/)).
- Advanced Checks (page speed + transactions) are scarce per tier — the entry plan includes exactly **1**, so monitoring login + checkout + search forces an upgrade ([CubeAPM, Jun 2026](https://cubeapm.com/blog/pingdom-pricing-and-review/)).
- SolarWinds as a whole moved to **subscription-only licensing on Aug 1, 2025**, with new contracts requiring 3-year commitments and ~10% annual escalators; customer-reported renewal increases of 100–300% ([Netdata, 2026](https://www.netdata.cloud/blog/solarwinds-price-increases-2026/)). Note: that article covers the broader SolarWinds portfolio; Pingdom self-serve was already subscription-only, but the direction of travel (higher prices, enterprise focus) applies to the whole portfolio.
- Price-vs-alternatives: at 100 monitors Pingdom is ~$95/mo annual vs UptimeRobot ~$29/mo and Notifier $19/mo — a 2–3x premium at every comparable tier ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/)).

## Status pages

Pingdom **does** include public status pages (some competitor blogs claim otherwise — e.g. [openstatus](https://www.openstatus.dev/guides/top-five-pingdom-alternatives) and [AtomPing](https://atomping.com/blog/pingdom-vs-uptimerobot-vs-atomping/) say "no status page"; the official pricing page and docs contradict this: "Public status pages and reports" is a listed plan feature — [pingdom.com/pricing](https://www.pingdom.com/pricing), [SolarWinds docs](https://documentation.solarwinds.com/en/success_center/pingdom/content/topics/public-status-page.htm), [CubeAPM](https://cubeapm.com/blog/pingdom-pricing-and-review/)). The competitors' claim is best read as "too weak to count."

Actual status-page offering:
- **One status page per organization, on every tier** — no matter how much you pay. Multiple products/clients each needing a page is impossible ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/)).
- Customization is logo + colors only; no custom CSS, no layout control, no password protection, no private pages ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/), [Pulsetic](https://pulsetic.com/pingdom-alternative/), [Hyperping](https://hyperping.com/compare/pingdom-alternative)).
- Custom domain support exists (CNAME to `stats.pingdom.com`) but **works over HTTP only — no HTTPS on custom domains** ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/), [Pingdom blog](https://www.pingdom.com/blog/public-status-pages-under-your-own-custom-domain/)).
- Subscriber notifications are email-only, and incidents are posted **manually** — the page does not auto-sync with monitor state the way Better Stack's does ([Better Stack, May 2026](https://betterstack.com/community/comparisons/better-stack-vs-pingdom/)).
- No status badges, no custom email templates, no translations ([Pulsetic](https://pulsetic.com/pingdom-alternative/)).

## UX notes

Judged against the Web Interface Guidelines lens and the Emil Kowalski "unseen details compound" lens:

- **The product feels its age.** Recurring third-party verdicts: "the UI has grown cluttered with enterprise features most teams don't need" ([UpDog](https://updog.watch/compare/pingdom-alternatives)); a "learning curve" once you leave basic checks, with setup that "can feel more complex than expected" ([CubeAPM, Jun 2026](https://cubeapm.com/blog/pingdom-pricing-and-review/)). Review aggregates are decent (GetApp 4.5/5, TrustRadius 9.5/10) but Trustpilot sits at 2.5/5 on a small sample ([CubeAPM](https://cubeapm.com/blog/pingdom-pricing-and-review/)).
- **22 unnamed pricing tiers** is the opposite of opinionated defaults — the buyer assembles a configuration before seeing a product ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/)).
- **No mobile app** — a monitoring tool whose alert story in 2026 is email/SMS/webhook with no first-party push ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/)).
- Users frequently report **false downtime alerts** in reviews — the single most trust-destroying failure mode for a monitoring tool ([Hyperping, Dec 2025](https://hyperping.com/blog/pingdom-vs-uptimerobot-vs-hyperping)).
- The status page is the most visible surface to a customer's customers, and Pingdom's is stuck at logo+colors, HTTP-only custom domains, manual incident posting ([Notifier](https://notifier.so/guides/uptimerobot-vs-pingdom/), [Better Stack](https://betterstack.com/community/comparisons/better-stack-vs-pingdom/)). Under the Kowalski lens, this is exactly where "beauty is leverage": the status page is the one page your users judge you by, and Pingdom ships it as an afterthought.
- The main investment vector is clearly the SolarWinds Observability SaaS suite — docs actively steer Pingdom users toward migrating to it ([SolarWinds docs](https://documentation.solarwinds.com/en/success_center/observability/content/intro/websites/migrate-pingdom.htm)) — so standalone Pingdom UX polish is not where R&D goes.

## Recent moves (last ~12–18 months)

- **Feb 2025:** SolarWinds announces take-private by Turn/River Capital, ~$4.4B ([press release](https://www.solarwinds.com/company/newsroom/press-releases/solarwinds-to-be-acquired-by-turn-river-capital)).
- **Apr 2025:** Acquisition completes; SolarWinds delisted from NYSE ([press release](https://www.solarwinds.com/company/newsroom/press-releases/turnriver-completes-acquisition-of-solarwinds)).
- **Aug 1, 2025:** SolarWinds portfolio goes subscription-only; 3-year commitments, ~10% annual escalators; customer-reported renewal hikes of 100–300% ([Netdata, 2026](https://www.netdata.cloud/blog/solarwinds-price-increases-2026/)).
- **2025:** AI-powered anomaly detection added to Pingdom alerting/reporting ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/)).
- **Ongoing:** Strategic push to migrate Pingdom users into SolarWinds Observability SaaS (official migration guides) ([SolarWinds docs](https://documentation.solarwinds.com/en/success_center/observability/content/intro/websites/migrate-pingdom.htm)); pricing-page copy now leads with "Get unified visibility and intelligent insights with SolarWinds Observability SaaS" ([xpay.sh pricing scrape, May 2026](https://www.xpay.sh/saas-pricing/solarwinds-pingdom/)).
- **Pricing drift up:** entry synthetic tier moved from ~$10/mo to ~$15/mo monthly billing ($10 annual), and the calculator-based bundles now anchor at $198/yr ([Notifier, May 2026](https://notifier.so/guides/uptimerobot-vs-pingdom/), [CubeAPM, Jun 2026](https://cubeapm.com/blog/pingdom-pricing-and-review/)).

## Weaknesses & opportunities for PingBoard

Each Pingdom weakness maps to a PingBoard PRD strength:

1. **Price at indie scale.** $10–15/mo for 10 checks, scaling to ~$95/mo at 100 checks, plus separate RUM billing — vs PingBoard's "self-host means unlimited, no artificial limits ever" (PRD §5.5). An indie with 15 side projects is already off Pingdom's entry tier. **Opportunity: lead every comparison with "unlimited monitors for the cost of a $5 VPS."**
2. **No self-host, no data control.** Cloud-only, closed-source, probes from the outside; monitoring internal endpoints means exposing them to a third party ([openstatus, Jun 2026](https://www.openstatus.dev/guides/top-five-pingdom-alternatives)). This is PingBoard's core thesis (PRD §2, §3 secondary user).
3. **Status page is embarrassingly weak.** 1 page per org, logo+colors only, HTTP-only custom domains, manual incident posts, no password protection. PingBoard's v1 spec (N pages, grouping, 90-day/30-day uptime bars, light/dark/auto themes, password protection, auto incident surfacing — PRD §6.5) already beats it on paper. **The status page is PingBoard's single best wedge.**
4. **Notification channels stuck in 2019.** No Discord, no Teams, no ntfy/push, no mobile app. PingBoard v1 ships Discord, Slack, ntfy, and generic webhooks (PRD §6.3) — ntfy alone is a love letter to the self-hosting crowd Pingdom ignores.
5. **Dated, cluttered UX vs "feels like a 2026 product" (PRD §4).** Pingdom's interface has accreted enterprise features for a decade; PingBoard's ShadCN-grade, single-admin, wizard-driven flow (PRD §7) with real-time SSE updates is the direct counter-position. Under the Kowalski lens: Pingdom's good-enough-everywhere UX is exactly the opening taste-based products exploit.
6. **PE-ownership turbulence = migration tailwind.** Post-acquisition price hikes and 3-year lock-ins across the SolarWinds portfolio are actively pushing users to evaluate alternatives ([Netdata, 2026](https://www.netdata.cloud/blog/solarwinds-price-increases-2026/), [UpDog](https://updog.watch/compare/pingdom-alternatives)). A "Leaving Pingdom?" migration note in PingBoard's README/docs would catch this traffic.
7. **Where PingBoard should NOT compete:** transaction/browser monitoring, RUM, page-speed analysis, 100+ probe locations, SLA reporting. These are Pingdom's real moats and are explicitly PingBoard non-goals (PRD §4, §14). Comparison content should concede these up front and reframe on the indie use case — credibility beats feature-checkbox wars. Also note Pingdom's 1-minute floor vs PingBoard's 10-second interval option (PRD §6.2): faster detection is a legitimate technical win to claim.
8. **False-positive trust gap.** Repeated user complaints about false downtime alerts ([Hyperping, Dec 2025](https://hyperping.com/blog/pingdom-vs-uptimerobot-vs-hyperping)) make PingBoard's retry-before-down default (PRD §6.2) worth calling out explicitly as a trust feature.

## Sources

- [Pingdom pricing page (official)](https://www.pingdom.com/pricing)
- [CubeAPM — Pingdom Pricing and Review 2026 (Jun 2026)](https://cubeapm.com/blog/pingdom-pricing-and-review/)
- [Notifier — UptimeRobot vs Pingdom (May 2026)](https://notifier.so/guides/uptimerobot-vs-pingdom/)
- [Notifier — Datadog vs Pingdom (Feb 2026)](https://notifier.so/guides/datadog-vs-pingdom/)
- [openstatus — Top Five Pingdom Alternatives (Jun 2026)](https://www.openstatus.dev/guides/top-five-pingdom-alternatives)
- [StackScored — Pingdom Pricing 2026 (Apr 2026)](https://www.stackscored.com/pricing/uptime-monitoring/pingdom/)
- [Netdata — SolarWinds Price Increases 2026](https://www.netdata.cloud/blog/solarwinds-price-increases-2026/)
- [SolarWinds press release — to be acquired by Turn/River (Feb 2025)](https://www.solarwinds.com/company/newsroom/press-releases/solarwinds-to-be-acquired-by-turn-river-capital)
- [SolarWinds press release — Turn/River completes acquisition (Apr 2025)](https://www.solarwinds.com/company/newsroom/press-releases/turnriver-completes-acquisition-of-solarwinds)
- [SolarWinds docs — Pingdom Public Status Page](https://documentation.solarwinds.com/en/success_center/pingdom/content/topics/public-status-page.htm)
- [SolarWinds docs — Migrate from Pingdom to SolarWinds Observability SaaS](https://documentation.solarwinds.com/en/success_center/observability/content/intro/websites/migrate-pingdom.htm)
- [Better Stack vs Pingdom (May 2026)](https://betterstack.com/community/comparisons/better-stack-vs-pingdom/)
- [Hyperping — Pingdom vs UptimeRobot vs Hyperping (Dec 2025)](https://hyperping.com/blog/pingdom-vs-uptimerobot-vs-hyperping)
- [Hyperping — Pingdom alternative](https://hyperping.com/compare/pingdom-alternative)
- [Pulsetic — Pingdom alternative comparison](https://pulsetic.com/pingdom-alternative/)
- [UpDog — Pingdom alternatives](https://updog.watch/compare/pingdom-alternatives)
- [OneUptime vs Pingdom](https://oneuptime.com/compare/pingdom)
- [AtomPing — Pingdom vs UptimeRobot vs AtomPing (Mar 2026)](https://atomping.com/blog/pingdom-vs-uptimerobot-vs-atomping/)
- [Pingdom blog — public status pages custom domain](https://www.pingdom.com/blog/public-status-pages-under-your-own-custom-domain/)
- [xpay.sh — SolarWinds Pingdom pricing scrape (May 2026)](https://www.xpay.sh/saas-pricing/solarwinds-pingdom/)
