# Competitor research — 2026-07-31

Researched live (web sources cited in each file) against PingBoard's positioning in
`PRD.md`: self-hosted, single container, zero deps, polished modern UI, MIT, indie
hackers.

| Competitor | File | Model | Headline |
|---|---|---|---|
| Uptime Kuma | `uptime-kuma.md` | OSS, self-host (MIT) | Healthy maintenance (2.0 stable 2025-10, ~1 release/mo, 89.6k★). Status pages are the weak spot: 5-min cache, no live updates, no custom HTML. 3 CVEs in ~3 months, all in long-tail features. Don't fight on breadth (30+ monitor types, 91 channels). |
| BetterStack | `betterstack.md` | SaaS only | UI quality is the bar. Status-page customization is paywalled hard: custom CSS $12–15/page/mo, password $42–50, white-label $208–250. Free tier: 10 monitors, 3-min checks. Moving upmarket (AI SRE, MCP, error tracking). |
| Uptime Robot | `uptime-robot.md` | SaaS only | Free: 50 monitors @ 5-min. Paid from $9/mo for only 10 monitors. Everything past 5-min checks paywalled; legacy price hikes up to 425%; false-positive complaints persist. Wins on mobile apps, SMS/voice, subscribers — not v1 targets. |
| Pingdom | `pingdom.md` | SaaS only | No free tier; ~$10/mo per 10 checks, realistic small-team spend ~$100/mo. One status page per org, logo+colors only, HTTP-only custom domain. SolarWinds went PE-owned (Apr 2025) with reported 100–300% renewal hikes — migration tailwind. |
| OpenStatus | `openstatus.md` | OSS (AGPL) + hosted | Self-host is heavy: 9-service compose + probes + Tinybird + raw SQL to unlock limits. AGPL-3.0, feature gating even self-hosted. No ICMP ping. Hosted: free 1 monitor, then $30+. Strong status-page polish and agent tooling; trajectory is upmarket. |

## Cross-cutting takeaways

1. **Status pages are the wedge.** Live SSE updates (vs Kuma's 5-min cache), full
   customization at $0 (vs BetterStack's per-page add-ons), unlimited pages with
   proper custom domains (vs Pingdom's one-page HTTP-only) — this is PingBoard's
   sharpest, most demonstrable differentiator.
2. **Self-host simplicity is unopposed.** "One container, MIT, unlimited" has no
   real competitor: OpenStatus is AGPL + 9 services, Kuma's v2 brought SQLite
   locking regressions and upgrade pain.
3. **Compete on focus and polish, not parity.** Monitor-type and channel breadth
   (Kuma's 91 channels, Uptime Robot's SMS/voice/mobile) is a losing game for v1.
4. **Ride the migration sentiment.** Pingdom/SolarWinds PE renewal hikes and
   BetterStack's add-on pricing create active "looking for alternatives" demand.
