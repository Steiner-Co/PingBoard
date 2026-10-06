# Changelog

## v1.0.0 — 2026-10-06

First stable release. The headline is a ground-up redesign of the entire
product — admin, public status pages, auth, and landing — plus domain
expiry tracking as a first-class feature.

## What's Changed

**Design system**
* App shell redesigned (landing-aligned), with per-screen lime primary actions and breadcrumb titles
* Shared screen language across every admin screen: headers, section cards, list rows, normal-casing labels
* Phosphor icons everywhere: plain glyphs for actions and indicators, circle-fill reserved for status columns; themed minimal scrollbars; zoom-aware viewport

**Monitors & Domains**
* Monitors page: Figma-driven redesign
* Domains: expiry, registrar, nameserver and SSL tracking split out from uptime monitors — its own page, API, and MCP surface

**Status pages**
* The page is the editor: inline title/description editing on a live canvas with a floating formatting toolbar
* Inline monitor and group management directly on the canvas
* Curated theme presets (Synthwave, Noir) via Custom CSS; per-page theme setting removed, accent folded into themes

**Channels**
* List-row layout with routed-monitor chips; type-picker dialog (Webhook, Discord, Slack, ntfy, Email) with lime accents

**Incidents & Maintenance**
* Incidents: leveled analytics row — frequency chart fills its panel, offender list capped with scroll
* Maintenance: weekly calendar replaces the timeline strip — windows as timed entries in day cells, live window highlighted

**Settings**
* Section cards, lime primary actions, Instance details moved into a modal, destructive sign-out

**Auth & Landing**
* Split auth layout with password reveal and forgot-password view
* Blog: reader redesign, authors, unified art; footer studio attribution; mobile pass

## Upgrade guide (0.9.x → 1.0.0)

No breaking changes; database migrations run automatically on boot.

* Status pages: the per-page **theme setting is gone**. Pages keep any Custom CSS they already have — restyle via the curated presets or your own CSS.
* The per-page **accent color** was folded into themes; pages using it keep their look through the preset system.
* If you pin the image tag, bump to `1.0.0`; `latest` tracks it as usual.

## Docker image
```
docker pull ghcr.io/steiner-co/pingboard:1.0.0
```

**Full Changelog**: https://github.com/Steiner-Co/PingBoard/compare/v0.9.0...v1.0.0
