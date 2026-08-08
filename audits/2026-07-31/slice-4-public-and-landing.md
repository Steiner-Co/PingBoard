# Slice 4 — Public status page + landing (2026-07-31 sweep)

Re-verified every prior AUDIT.md Slice 4 entry and the AUDIT-EMIL.md themes touching
this slice against current source, then hunted new issues. Line numbers are current.

Headline: **42 fixed · 8 persists · 10 new.** The slice is in much better shape than
the stale docs suggest — the persists table in AUDIT.md (lines 54, 68, 70) is now
wrong on all three counts for this slice.

Spot-checks requested by the task:

- Landing favicon → `logomark.png`: **confirmed** — `apps/landing/index.html:5-6`,
  `apps/landing/src/components/logo.tsx:6`, and `packages/ui/public.html:5-6`.
- OG meta server-injected: **confirmed** — `apps/pingboard/src/server.ts:332-349`
  matches the slug and serves `public.html` through `injectPublicShellMeta`
  (`apps/pingboard/src/routes/public.ts:240-280`), which swaps the
  `<!--pingboard:meta-->` block (`packages/ui/public.html:8-21`) with escaped,
  per-page title/description/OG/Twitter tags and withholds the description for
  password-protected pages (`routes/public.ts:260-263`).

---

## Fixed

### Public status page

- **`packages/ui/public.html:2`** — `color-scheme: light dark` now on `<html>`
  (was AUDIT.md L4 [med]). Admin shell `packages/ui/index.html:2` matches.
- **`packages/ui/src/public/PublicStatusPage.tsx:113-127`** — loading state now has
  `role="status"`, `aria-live="polite"`, and an `sr-only` "Loading status…" (was L113-122 [high]).
- **`PublicStatusPage.tsx:309-322`** — `OverallStatusBanner` status text is inside
  `role="status" aria-live="polite" aria-atomic="true"` with an `sr-only` label and
  `aria-hidden` visual duplicate (was L294 [high]). The "Updated …" line is
  deliberately `aria-live="off"` with a comment explaining why (`:324-329`) — good judgment.
- **`PublicStatusPage.tsx:118-124`** — live 3s `animate-ping` outlier is gone; the
  only ping left is the loading indicator at 1.5s, matching the app-wide cadence
  (was L296-305 [low] + AUDIT-EMIL.md:94 [med]).
- **`PublicStatusPage.tsx:374-378`** — `MonitorRow` status dot now
  `role="img" aria-label="{name} status: {label}"` (was L328-347 [high]).
- **`packages/ui/src/components/uptime-timeline.tsx:74-77, 162-165`** — mobile
  tooltip offset is computed against the visible 30-day window with edge clamping
  (`clamp(3.5rem, …)`) (was L369-372/394 [med]).
- **`uptime-timeline.tsx:28, 118`** — roving index is clamped with
  `Math.min(roving, timeline.length - 1)` and the empty case returns early
  (`:45-51`) (was L377 [low]).
- **`uptime-timeline.tsx:89-142`** — timeline bars are real `<button>`s with
  roving tabindex, per-day `aria-label`s, arrow/Home/End navigation, and a
  `role="group"` label (was L387-402 [high]).
- **`uptime-timeline.tsx:24, 68-69, 124`** — tooltip entry animation fires only
  for pointer entry (`viaPointer`), not keyboard focus (was AUDIT-EMIL.md:29 [high]).
- **`uptime-timeline.tsx:67`** — tooltip uses `origin-bottom`, scaling from the
  bar, not center (was AUDIT-EMIL.md:131 [med]).
- **`PublicStatusPage.tsx:487-495`** — `MaintenanceBanner` "Scheduled maintenance"
  is an `<h2>` inside `role="status" aria-live="polite"` (was L590-637 [med]).
- **`PublicStatusPage.tsx:585-600`** — password input now has `<label htmlFor>`,
  `name="password"`, `autoComplete="current-password"`, `aria-invalid`,
  `aria-describedby` (was L606-614 [med] and L687-694 [high]).
- **`PublicStatusPage.tsx:598`** — input uses `focus-visible:ring-2`, not `:focus`
  (was L691 [med]).
- **`PublicStatusPage.tsx:602-609, 543-547, 557-565`** — error is `role="alert"`
  linked via `aria-describedby`, and focus returns to the input on every failure
  (was L695-702 [med]).
- **`PublicStatusPage.tsx:611-617`** — submit is `disabled={submitting}` only;
  empty submit shows an inline error instead of a dead button; `aria-busy` added
  (was L696-702 [high]).
- **`PublicStatusPage.tsx:615`** — submit press feedback is `active:scale-[0.98]`
  (was `scale-95`, L727 [low]).
- **OG/title meta client-side only → FIXED.** Server-side injection per above;
  client `useDocumentMeta` (`PublicStatusPage.tsx:675-709`) now only *updates in
  place* the tags the server rendered (attribute names deliberately aligned —
  `routes/public.ts:272-276`) and adds the status-tinted `theme-color`
  (`:698-707`) (was L672-703 [high]; clears the "likely persists" note at AUDIT.md:54).
- **`PublicStatusPage.tsx:211, 332`** — "Updated" uses `query.dataUpdatedAt`
  (already noted fixed in the persists table, re-confirmed).
- **Amber-on-amber small text → FIXED.** `--warning` is now a text-grade token
  (light `oklch(0.52 0.15 62)`, dark `oklch(0.78 0.16 75)` —
  `packages/ui/src/globals.css:105, 164`), and maintenance times use
  `formatDateTime`/`formatDateTimeRange` (`PublicStatusPage.tsx:506, 517`)
  (was L319, 528, 533-535, 545-546 [low]).
- **`PublicStatusPage.tsx:256`** — "Powered by PingBoard" has `translate="no"`
  (part of the AUDIT.md:70 cross-cutting [low], now cleared for this slice).

### Landing

- **`apps/landing/index.html:8-9`** — `theme-color` now has light/dark
  media-query variants instead of a hardcoded dark value (was L6-9 [low]).
- **`apps/landing/src/globals.css:60, 93`** — `color-scheme: light` on `:root`,
  `dark` on `.dark` (was L45-104 [med]; clears AUDIT.md:68 for the landing app).
- **`apps/landing/src/LandingPage.tsx:18`** — `<main aria-labelledby="hero-heading">`
  (was L18 [low]).
- **All section anchors have `scroll-mt-8`** — `Hero.tsx:14`, `FeatureGrid.tsx:46`,
  `FAQ.tsx:32`, `Manifesto.tsx:5`, `Pricing.tsx:5` (was [low] ×5).
- **`Hero.tsx:31`** — primary CTA no longer lifts on hover; `hover:opacity-90` +
  `active:scale-[0.98]` (was L31 [med]).
- **All four decorative mocks are `aria-hidden`** — `DashboardMock.tsx:22` (plus
  wrapper `Hero.tsx:43`), `ChannelsSection.tsx:13, 41`, `DomainsSection.tsx:21, 53`,
  `StatusSection.tsx:29, 62` (was [low]/[high] ×4 and the mock-wall note at
  AUDIT.md L22-92; clears the persists-table rows at AUDIT.md:35, 53).
- **`ChannelsSection.tsx:33`, `DomainsSection.tsx:45`, `StatusSection.tsx:54`** —
  sections now `aria-labelledby` their headings (was [low] ×3).
- **`FeatureGrid.tsx:57`** — feature titles are `<h3>` (was L57 [low]).
- **`FAQ.tsx:45-62`** — accordion complete: `aria-controls` ↔ panel `id`,
  `role="region"`, `aria-labelledby` (was L43-67 [high]).
- **`FAQ.tsx:49`** — focus-visible ring added (was L47 [high]).
- **`FAQ.tsx:53, 64`** — both transitions are `motion-safe:`-gated
  (was L50-53, 58-61 [med]).
- **`Pricing.tsx:23`** — CTA `hover:opacity-90`, no lift (was L23 [med]).
- **`Pricing.tsx:23`** — raw hex `#003cff` gone; uses `bg-primary` (was L24-40 [low]).
- **`Pricing.tsx:40-42`** — "Coming soon" is now a dashed-border pill, visually
  distinct from the active CTA (was L40-42 [low]).
- **`SiteFooter.tsx:15, 34-39`** — "Steiner&Co." has `translate="no"`; "Docs" is a
  real `/docs` router link (was L5, L13-18 [low]).
- **`TopNav.tsx:23, 43-45`** — active state derives from `useLocation()` with
  `aria-current="page"` (was L5-10 [med]).
- **`TopNav.tsx:37`** — logo link has `focus-visible:ring` and `active:scale-[0.98]`
  (was L15 [low]).
- **`FooterCTA.tsx:40`** — `active:scale-[0.98]` (was `scale-95`, L40 [low]).
- **`apps/landing/src/components/icons.tsx:8-9`** — `Stroke` svg has explicit
  `width`/`height` (was L5-19 [low]).
- **`apps/landing/src/components/logo.tsx:18`** — Wordmark "PingBoard" has
  `translate="no"`; propagates to `Manifesto.tsx:19` and `FooterCTA.tsx:23`
  (was L18 [low] + Manifesto L18-20).
- **Theme switch reduced-motion: FIXED twice over.** `App.tsx:77` wraps the app in
  `<MotionConfig reducedMotion="user">`, and `theme-switch.tsx:101-140` dropped
  `whileHover`/`whileTap` entirely — CSS `active:scale-[0.97]` plus an opacity-only
  icon crossfade (was AUDIT-EMIL.md:38, 92 [high]).
- **`apps/landing/src/components/ui/button.tsx:8`** — landing Button no longer has
  the `translate-y-px` drift; press feedback is `scale-[0.98]`, matching the rest
  of the product (was L8 [low]; resolves most of AUDIT-EMIL.md:52 for this slice).
- **`globals.css:173-188`** — the view-transition theme wipe is gated behind
  `prefers-reduced-motion: no-preference` (theme-switch view transition itself at
  `theme-switch.tsx:50-67`).
- **`App.tsx:61-66`** — route crossfade is opacity-only, enter 0.28s / exit 0.15s
  with a custom quart-out curve, `initial={false}` so prerendered HTML doesn't
  flash. Emil-canonical; called out as a pass.

## Persists

- **`PublicStatusPage.tsx:192`** [high] — whole status page still enters with
  `slide-in-from-bottom-1 + fade-in-0` over 500ms on every visit. Emil's verdict
  stands (AUDIT-EMIL.md:30): a status page is revisited constantly; the answer to
  "is it up?" should paint instantly. Drop the slide, keep at most a short fade.
- **`FooterCTA.tsx:36-47`** [med] — copy success is still signaled only by a visual
  icon swap; the button's `aria-label` never changes and there is no `aria-live`
  announcement. SR users get no confirmation the command was copied (was L10-18).
- **`uptime-timeline.tsx:131`** [low] — timeline bars use
  `focus-visible:outline-2 outline-ring` while the rest of the codebase uses
  `ring-*` utilities. Cosmetic inconsistency only (was L467).
- **`packages/ui/public.html`** [low] — still no static `theme-color` fallback in
  the shell; the tint is applied only after JS runs (`PublicStatusPage.tsx:698-707`).
  A neutral default in the meta block would cover the pre-hydration window.
- **`packages/ui/public.html`** [low] — no `<link rel="preconnect">`. Nearly moot:
  the page loads no cross-origin resources (favicon and bundle are same-origin).
- **`PublicStatusPage.tsx:599`** [low] — `autoFocus` on the password gate remains;
  previously judged defensible for a gate, still is.
- **`apps/landing/src/globals.css:151-157`** [low] — `--ease-out-quart`,
  `--ease-in-out-quart`, `--ease-drawer`, `--motion-overlay-*` are defined but
  referenced nowhere (grep confirms zero usages); every component still uses
  Tailwind's built-in `ease-out`. Either wire them into `@theme` or delete —
  dead tokens are worse than no tokens (partial fix of AUDIT-EMIL.md:44).
- **First-paint stagger not adopted** [low] — `FeatureGrid.tsx:53` renders all six
  cards synchronously and `PublicStatusPage.tsx:223-242, 426-470` paints
  monitor/incident rows at once. These were Emil recommendations
  (AUDIT-EMIL.md:123-124), not defects; recording as consciously-open.

## New

- **`apps/landing/src/pages/BlogIndex.tsx:72`** [med] — `transition-all` on the
  post-row arrow. AUDIT.md Slice 5 declared "no remaining instances in either app";
  one has crept back in. Should be `transition-[color,transform]`.
- **`PublicStatusPage.tsx:139-141`** [med] — every fetch failure — network offline,
  500, rate limit — renders "Status page not found." `fetchPublic` throws
  `GateError('other')` for non-OK responses (`:74`) and network errors land here
  too, so a visitor with a flaky connection is told the page doesn't exist.
  Distinguish "not found" from "can't reach the server, retrying".
- **Low-contrast small text across the landing** [med] — `text-foreground/40` at
  12px (`BlogIndex.tsx:26, 64`, `BlogPost.tsx:19, 33, 53, 66`,
  `DocsLayout.tsx:19, 58, 71`) sits around 2.3:1 on the white card;
  `text-foreground/50` at 12px (`FeatureGrid.tsx:58`) around 3.2:1 — both under
  WCAG 4.5:1 for body-size text. Decorative mocks are exempt (`aria-hidden`);
  these are real content.
- **No `og:image` / `twitter:image` anywhere** [low] — neither the server-injected
  status-page tags (`routes/public.ts:265-277`) nor the landing `<Seo>`
  (`components/Seo.tsx:21-33`) emit an image, so every link unfurl is imageless.
  A single static social card would fix both.
- **`apps/landing/src/lib/site.ts:6`** [low] — `SITE_URL = 'https://pingboard.dev'`
  is self-described as a placeholder, yet it feeds canonical/OG URLs and the
  sitemap/rss postbuild. If that domain isn't live and serving this site, every
  canonical tag points at the wrong origin.
- **`apps/landing/index.html:10`** [low] — no static `<title>` fallback; title
  exists only via `<Seo>` during prerender. Dev server and any non-prerendered
  path serve a title-less document.
- **`apps/landing/src/components/logo.tsx:5-9`** [low] — `Logo` sets both
  `alt="PingBoard"` and `aria-hidden`. The `aria-hidden` wins everywhere, making
  the alt dead code; pick one (the current callers all label their parent link,
  so `alt=""` + `aria-hidden` is the honest form).
- **`PublicStatusPage.tsx:648-669`** [low] — theme menu shows a check icon on the
  active item but uses plain `DropdownMenuItem`s; nothing exposes the selected
  state to AT. `DropdownMenuRadioGroup`/`RadioItem` would announce it.
- **`apps/landing/src/pages/DocsPage.tsx:9-12`** [low] — `/docs` is a client-side
  `<Navigate>`; the prerendered `/docs/index.html` ships no content and depends on
  JS for the redirect. Prefer a build-time redirect or prerender the first doc at
  `/docs`.
- **`apps/landing/src/sections/Manifesto.tsx:5`** [low] — `id="about"` is a dead
  anchor: TopNav "About" now routes to `/about` (`TopNav.tsx:17`) and nothing
  links to `#about`. Harmless but stale.
