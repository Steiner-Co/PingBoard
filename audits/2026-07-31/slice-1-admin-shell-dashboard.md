# Slice 1 — Admin shell + dashboard — re-audit 2026-07-31

Re-verified every 2026-07-21 Slice 1 finding (AUDIT.md), the relevant 'Persists
from 07-20' rows, and the AUDIT-EMIL.md themes touching this surface against
CURRENT source. Base path: `packages/ui/src/`. Severities: `high` = real-user
impact, `med` = accessible-but-not-great, `low` = polish / consistency.

Big picture: the shell was substantially reworked after 2026-07-21. The icon
system migrated to `@solar-icons` behind an `Icon` wrapper that defaults
`aria-hidden`, the data-table row anti-pattern is gone (stretched-link
pattern), the sidebar got a keyboard-instant path, and the dashboard got
proper loading/error/empty branching. Most motion findings (theme wipe,
ping-per-heartbeat, grid-rows feed entry, reduced-motion leaks) are closed.

## Fixed since 2026-07-21

| # | Finding (07-21) | Where verified now | Sev |
|---|---|---|---|
| F1 | No skip link on admin shell | Skip link added `layouts/AdminLayout.tsx:78-85`; target `<main id="main-content" tabIndex={-1}>` at `AdminLayout.tsx:87` (via `components/ui/sidebar.tsx:320-339`) | high |
| F2 | `<TableRow onClick={navigate}>` anti-pattern | Removed. Rows are plain cells (`components/data-table.tsx:299-318`); navigation via stretched link `data-table.tsx:426-430` (`after:absolute after:inset-0`); mobile cards use a real `Link` (`data-table.tsx:384-420`) | high |
| F3 | Decorative `<HugeiconsIcon>` never `aria-hidden` (21+ instances) | HugeiconsIcon fully removed (0 grep matches). New `Icon` wrapper defaults `aria-hidden` (`components/ui/icon.tsx:48-50`); all slice-1 call sites use it (`nav-main.tsx:38,69`, `nav-user.tsx:57,81`, `app-sidebar.tsx` header logo `alt=""` at :59, `site-header.tsx:40,51`, `data-table.tsx:191,202-205,222,364,374`, `DashboardPage.tsx:159-162,389,401`, `EmptyState.tsx:29-33`, `QueryError.tsx:29`) | high |
| F4 | Theme-switch over-animated (view-transition wipe + rotate/scale spring) (Emil) | Wipe gone — plain `setTheme` (`components/unlumen-ui/theme-switch.tsx:69-72`); `main.tsx:12` `disableTransitionOnChange`; no `theme-reveal` keyframe in `globals.css`. Icon swap is opacity-only 150ms easeOut (`theme-switch.tsx:97-108`); `whileHover`/`whileTap` springs removed; `active:scale-[0.97]` CSS press (`theme-switch.tsx:89`) | high |
| F5 | Keyboard-initiated sidebar toggle animates (Emil frequency rule) | `instant` flag suppresses all transitions for the Cmd/Ctrl+B flip (`components/ui/sidebar.tsx:43-46,101-120`), consumed via `group-data-[instant]:transition-none` at `sidebar.tsx:233,245,307,434,499` | high |
| F6 | Live indicator replays `animate-ping` per heartbeat (Emil) | Static dot, color carries state, `aria-hidden` (`pages/DashboardPage.tsx:212-219`, comment at :213-216) | high |
| F7 | Activity feed entry animates `grid-template-rows` (layout) | Now `motion-safe:starting:opacity-0 motion-safe:starting:-translate-y-1` via `@starting-style` — transform/opacity only, reduced-motion gated (`DashboardPage.tsx:230`) | high |
| F8 | `Skeleton`/`Sonner` spinner unconditional animation | `motion-safe:animate-pulse` (`components/ui/skeleton.tsx:7`); `motion-safe:animate-spin` (`components/ui/sonner.tsx:25`) | high |
| F9 | No custom easing tokens (Emil) | Tokens defined in `globals.css:195-201` (`--ease-out-quart`, `--ease-in-out-quart`, `--ease-drawer`, `--motion-overlay-in/out`); consumed by `ui/sheet.tsx:69` and `ui/tooltip.tsx:45`. (Adoption gap on plain interaction surfaces — see P24.) | high |
| F10 | Overlay enter/exit same speed (Emil asymmetric timing) | Tooltip `200ms in / 120ms out` via tokens (`ui/tooltip.tsx:45`); sheet matches (`ui/sheet.tsx:69`) | med |
| F11 | Add-monitor CTA `duration-200 ease-linear` | `duration-150 ease-out` now (`components/nav-main.tsx:35`) | med |
| F12 | Loading conflated with empty ("No monitors yet" flash) | Explicit branches: `isPending` → skeleton, `isError` → `QueryError`, empty only on `isSuccess && length===0` (`DashboardPage.tsx:141-151`) | med |
| F13 | `section-cards.tsx` findings (`100%` literal, Link>div cursor-pointer) | File deleted; replaced by `components/status-hero.tsx` (dl/dt/dd metrics, no Link-wrapped divs) | low |
| F14 | Panel blueprint crosshair ticks on every panel (Emil) | `components/panel.tsx:15-17` is now a plain bordered `<section>` — no ticks | low |
| F15 | Press-feedback magnitude drift | Converged on `active:scale-[0.97]`: `ui/button.tsx:12`, `nav-main.tsx:35`, `site-header.tsx:13,38`, `theme-switch.tsx:89`. (One 0.98 outlier remains — see N10.) | med |
| F16 | `theme-switch` `motion.button` missing `type="button"` | Plain `<button type="button">` (`theme-switch.tsx:82-83`) | low |
| F17 | Icon-only `SidebarTrigger` had no accessible name | `<span className="sr-only">Toggle Sidebar</span>` (`ui/sidebar.tsx:287`) | low |
| F18 | No `color-scheme` | `<html style="color-scheme: light dark">` (`index.html:2`) | med |
| F19 | Brand token missing `translate="no"` | `app-sidebar.tsx:60` `translate="no"` on "PingBoard" | low |
| F20 | Status-page header slot reservation (Emil) | Slot renders only while pending, with sizing comment, `aria-hidden`; `null` when no page exists (`site-header.tsx:54-62`) | low |
| F21 | `use-now` module-level `Date.now()` / hydration concerns | Hook redesigned on `useSyncExternalStore` with resubscribe refresh (`hooks/use-now.ts:12-31`); app is CSR-only so hydration is moot | low |
| F22 | Active nav item not exposed to AT | `aria-current={isActive ? 'page' : undefined}` on `SidebarMenuButton` (`ui/sidebar.tsx:551`) | low |

## Persists

| # | Finding | Current location | Sev |
|---|---|---|---|
| P1 | SSE activity feed not announced to AT — no `aria-live` on the live list; new heartbeats land silently | `DashboardPage.tsx:226-263` | med |
| P2 | Mobile sidebar (Sheet) hides the close button — `[&>button]:hidden`, no visible close control | `ui/sidebar.tsx:201` | med |
| P3 | Sidebar pointer-initiated toggle still animates layout properties (`transition-[width]` :233, `transition-[left,right,width]` :245, rail :307, `transition-[margin,opacity]` :434, `transition-[width,height,padding]` :499). Keyboard path is instant (F5), but pointer path reflows — Emil: transform/opacity only | `ui/sidebar.tsx:233,245,307,434,499` | med |
| P4 | `SidebarRail` removed from keyboard tab order (`tabIndex={-1}`) | `ui/sidebar.tsx:300` | med |
| P5 | `formatRelative` hand-rolls English-only strings ("3m ago") instead of `Intl.RelativeTimeFormat` | `lib/utils.ts:57-68` | med |
| P6 | `TooltipProvider delayDuration = 0` collapses the initial-hover delay; Emil's two-delay skip pattern unimplemented | `ui/tooltip.tsx:9` | med |
| P7 | Font via CSS `@import` (`globals.css:4` `@fontsource-variable/outfit`) — blocks first paint; no `<link rel="preload" as="font">` in `index.html` (was Inter, now Outfit; same issue) | `globals.css:4`, `index.html:3-9` | med |
| P8 | Header/page-title hierarchy undifferentiated — route title always `text-base font-medium` regardless of context (Emil typography-as-structure) | `site-header.tsx:31`, `AdminLayout.tsx:14-23` | med |
| P9 | `document.title` set in `useEffect`; first paint shows "PingBoard" then snaps (CSR-inherent, still as reported) | `AdminLayout.tsx:54-56` | low |
| P10 | Auth-bootstrap loader has no `role="status"`/`aria-live` | `App.tsx:38-45` | low |
| P11 | Dashboard search input: `aria-label` only — no `name`, `type="search"`, `autoComplete="off"`, `inputMode` | `DashboardPage.tsx:163-169` | low |
| P12 | Status-filter single-select uses `aria-pressed` buttons; `radiogroup`/`aria-checked` (or `aria-current`) reads more correctly | `DashboardPage.tsx:172-189` (`aria-pressed` :185) | low |
| P13 | "View all →" trailing glyph not `aria-hidden` | `DashboardPage.tsx:285` | low |
| P14 | Actions column has no header definition → renders an empty `<th>`; needs `sr-only` label | `data-table.tsx:149-152` (render :284-290) | low |
| P15 | Table empty row ("No monitors match this filter.") has no `aria-live`; refetch/filter changes aren't announced | `data-table.tsx:321-328` | low |
| P16 | `loadingLabel="Reading heartbeats"` missing trailing ellipsis (a11y side fixed — `chart-loading-label.tsx:36,42` has `role="status" aria-live`) | `fleet-chart.tsx:76` | low |
| P17 | "Fleet avg · 24h" is a `<span>` with no association to the panel heading | `fleet-chart.tsx:50-52` | low |
| P18 | `theme-color` hardcoded `#0f172a` (stale slate; dark bg is oklch 0.1822); no `media="(prefers-color-scheme)"` variants | `index.html:8` | low |
| P19 | No `<meta name="description">` | `index.html` | low |
| P20 | Sonner `<Toaster>` relies on library-default `aria-live`; no explicit wrapper/pin check | `main.tsx:17` | low |
| P21 | External links open in new tab with no audible "(opens in new tab)" hint — GitHub link and status-page link | `site-header.tsx:33-43, 44-53` | low |
| P22 | Combined `transition-[color,background-color,transform]` though hover only changes colors and only press transforms (Emil: split the lists) | `site-header.tsx:12-13, 38` | low |
| P23 | Dashboard empty state bypasses shared `EmptyState`; `min-h-[420px]` vs shared `min-h-[320px]` — two near-identical empty states, two heights (Emil cohesion) | `DashboardPage.tsx:387` vs `components/EmptyState.tsx:24` | low |
| P24 | Easing tokens exist (F9) but plain interaction surfaces still use Tailwind built-in `ease-out`/`ease` — tokens not adopted where they were the point | `ui/button.tsx:12`, `nav-main.tsx:35`, `site-header.tsx:13`, `ui/sidebar.tsx:233` | low |
| P25 | Dashboard skeleton improved (hero/chart/table/rails mirror loaded layout) but still omits the search/filter row | `DashboardPage.tsx:340-382` vs loaded `:157-191` | low |

## New

| # | Finding | Location | Sev |
|---|---|---|---|
| N1 | Duplicate `<h1>` on the dashboard route: shell header renders `<h1>` (route title) and the new `StatusHero` renders another `<h1>` ("All systems operational" / "N monitors down"). One must drop to h2/p | `site-header.tsx:31` + `status-hero.tsx:84` | med |
| N2 | "View open incidents →" trailing glyph not `aria-hidden` (same class as P13, new surface) | `status-hero.tsx:97` | low |
| N3 | `zoom: 1.1` on `html` — non-standard CSS zoom to enlarge the whole product; multiplies with user zoom, overrides UA text-size expectations, and risks fixed/overlay (Radix popper) geometry drift | `globals.css:233-239` | low |
| N4 | Global `letter-spacing: 0.025em` on `body` (`--tracking-normal`) — positive tracking applied to *all* text including the `text-[10px]`/`text-[11px]` mono labels it claims to protect; small text with loose tracking reads worse | `globals.css:142,243` | low |
| N5 | `FeedItem.at` (`Date.now()`) is stored but never rendered — dead data; feed rows show response time but no timestamp of when the check landed | `DashboardPage.tsx:61,94` (never read) | low |
| N6 | `FleetChart` error state is a plain `<div>` — no `role="alert"`, inconsistent with `QueryError` (`QueryError.tsx:22`) and with the chart's own loading label (`chart-loading-label.tsx:36-42`) | `fleet-chart.tsx:56-65` | low |
| N7 | `DashboardSkeleton` region has no `role="status"`/`aria-busy` — AT users get silence during full-page load (only the chart sub-region is labelled) | `DashboardPage.tsx:340-382` | low |
| N8 | Stretched-link `::after` spans the entire row including the actions cell: row text can't be selected, and clicking blank space in the actions cell navigates to detail | `data-table.tsx:301, 426-428` | low |
| N9 | Dead `stopPropagation` leftover on the actions `TableCell` — guarded a row-level `onClick` that no longer exists after F2 | `data-table.tsx:306-309` | low |
| N10 | Press-scale drift: filter chips use `active:scale-[0.98]` vs the converged 0.97 everywhere else (button.tsx:12, nav-main.tsx:35, site-header.tsx:13, theme-switch.tsx:89) | `DashboardPage.tsx:180` | low |
| N11 | GitHub and status-page links are `hidden … sm:flex` — no mobile affordance for either in the header | `site-header.tsx:13, 38` | low |
| N12 | Sticky table header is inert: `sticky top-0` sits inside `overflow-x-auto` (no vertical scroll container), so it never sticks — misleading dead utility | `data-table.tsx:276, 278` | low |
| N13 | Theme switch still depends on framer-motion (`motion/react`) for a 150ms opacity fade, with no `<MotionConfig reducedMotion="user">` in the app — motion is opacity-only so impact is minimal, but the mixed-motion-system smell remains (Emil cohesion) | `theme-switch.tsx:5, 97-108`; `main.tsx:10-20` | low |
