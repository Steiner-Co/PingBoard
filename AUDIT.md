# PingBoard UI/UX Audit — 2026-07-20

Full-product design-engineering audit (Emil Kowalski methodology + general UI/UX review),
run as five parallel audits: dashboard/shell, forms & auth flows, list/detail pages,
public status page + landing, and a cross-cutting motion/interaction sweep.
**Findings only — fixes tracked separately.** Severities: high = fix before launch.

## Cross-cutting themes (what multiple auditors independently hit)

1. **The UI can misreport monitoring reality.** Errors render as empty states
   ("No incidents on record" when the fetch failed), initial loading flashes fake
   zero-data ("No monitors yet", "0 open"), relative times freeze at render time,
   and the public page's "Updated just now" formats the render clock, not data age.
   For an uptime product this is the trust-killer class. → Theme A below.
2. **`degraded` renders brand-green** (StatusBadge `variant="default"`), and the
   amber/warn color is hardcoded three different ways with no `--warning` token.
3. **Forms have data-loss traps**: SMTP password silently wiped, destructive
   retention change auto-saves from a dropdown with no confirm, the edit page's
   dirty-nav guard references `useBlocker` in a comment but never calls it,
   the wizard has no guard at all.
4. **Motion is half-converged**: four press-feedback styles, `transition-all` on
   core primitives, four pulse-dot durations, and two reduced-motion violations
   (theme-reveal wipe, landing pings). Five-token convergence map at the bottom.
5. **Landing/public trust details**: fabricated "★ 1.2k" star badge, broken
   "…production stacks on the planet" sentence, dashboard mockup that doesn't match
   the real blueprint UI, off-brand purple accent, and client-side-only OG meta so
   shared status links unfurl as a bare "Status".

---

## Slice 1 — Admin dashboard + shell

Base path: `packages/ui/src/`

| # | Severity | File:line | Finding | Recommended fix |
|---|----------|-----------|---------|-----------------|
| 1 | high | `pages/DashboardPage.tsx:110,135` + `components/section-cards.tsx:76` | Loading is conflated with empty: during the initial fetch the user sees zeroed stat cards with "No monitors yet", a "No results." table, and "Not enough data yet" in the chart before data lands. Only the true empty state is gated. | Branch on `query.isPending` and render Panel-shaped skeletons so layout is stable and copy never lies. |
| 2 | high | `pages/DashboardPage.tsx:75-78` (also `fleet-chart.tsx:32`, `DashboardPage.tsx:248`) | No error state anywhere: a failed `/api/admin/monitors` fetch renders as a calm, empty, all-zero dashboard. | Explicit error Panel per region ("Couldn't reach the API" + retry via `query.refetch()`), distinct from empty copy. |
| 3 | med | `pages/DashboardPage.tsx:40,291` + `lib/utils.ts:8` | Relative times computed once at render and never tick; open incident "3m ago" stays frozen in an open tab. | Shared 30s clock tick (`useNow`) re-rendering `formatRelative` consumers; SSE for data, clock for labels. |
| 4 | med | `pages/DashboardPage.tsx:162-176` + `components/section-cards.tsx:168` | Status-filter chips and the clickable Down stat cell lack `focus-visible` rings and press states. | Add `focus-visible:ring-2 ring-ring/30` + `active:scale-[0.98]` (150ms ease-out). |
| 5 | med | `pages/DashboardPage.tsx:236-238` | Live feed renders a DOWN check as lowercase muted text — the most important event gets the weakest treatment. | Uppercase mono label tinted `text-destructive`/amber for non-up items. |
| 6 | med | `pages/DashboardPage.tsx:86-96,221` | Feed insert jank: new item animates in but siblings shove down instantly and the evicted item vanishes; keyframes restart under fast cadence. | Height+opacity transition (grid-rows/FLIP), fade the evicted item; interruptible transitions over keyframes. |
| 7 | med | `pages/DashboardPage.tsx:203-206` vs `components/app-sidebar.tsx:60-62` | Infinite 2s ping on the Live badge contradicts the sidebar's own documented no-pulse principle. | Pulse only on activity (one cycle per feed arrival), rest static. |
| 8 | med | `components/data-table.tsx:302-305` | Row-click navigation is pointer-only (no tabIndex/role/key handler); misclicks near the menu edge navigate. | Full-cell name-link hit area, or mirror row-click with `tabIndex={0}` + Enter. |
| 9 | med | `components/unlumen-ui/theme-switch.tsx:107-121` | Theme toggle off-system (size-9 round vs size-7 siblings), hover scale ungated for touch, serialized exit→enter springs feel slow. | `size-7` ghost button, gate hover, crossfade ~150ms bounce 0. |
| 10 | med | `components/nav-main.tsx:31` + `components/ui/sidebar.tsx:488` | Add-monitor CTA declares `duration-200 ease-linear` but inherits `transition-[width,height,padding]` — hover color and press snap untransitioned. | `transition-[background-color,transform] duration-150 ease-out`. |
| 11 | med | `components/site-header.tsx:40-50` | "Status page" link pops in after the pages query resolves, shifting the header cluster ~90px every load; header carries a stray width/height linear transition. | Reserve the slot; drop the header transition. |
| 12 | low | `components/ui/button.tsx:8` | Shared Button uses `transition-all`. | Explicit property list with duration/easing. |
| 13 | low | `components/data-table.tsx:281,261` | Dead template config: `sticky top-0` header never sticks; row-selection state exists with no checkbox column. | Remove both or wire them up. |
| 14 | low | `pages/DashboardPage.tsx:236` vs `:289`; `components/data-table.tsx:339` | Numeric typography drifts between rails (mono vs proportional); monitor count lacks `tabular-nums`. | Standardize rail numerics on mono micro-label style. |
| 15 | low | `components/data-table.tsx:73`, `pages/DashboardPage.tsx:230`, `components/section-cards.tsx:137` | Degraded/warn amber hardcoded three ways; no `--warning` token. | Add `--warning` token, route all warn styling through it. |

## Slice 2 — Admin forms & flows

| # | Severity | File:line | Finding | Recommended fix |
|---|----------|-----------|---------|-----------------|
| 1 | high | `packages/ui/src/components/ui/button.tsx:8` | `disabled:opacity-50` on mint primary → the washed-out disabled CTA is the most-seen state in wizard/dialogs. | Dedicated disabled recipe (`disabled:bg-muted disabled:text-muted-foreground`), no opacity. |
| 2 | high | `packages/ui/src/pages/SettingsPage.tsx:285-293` | SMTP password wipe trap: revealing the field then saving an unrelated edit sends `pass: ''` and silently clears the stored password. | Send sentinel when revealed-but-empty; explicit "Remove password" action with confirm. |
| 3 | high | `packages/ui/src/pages/SettingsPage.tsx:189-192` | Retention select auto-saves on change — irreversible raw-data deletion from a single dropdown misclick, no confirm. | Route reductions through `useConfirm` or explicit Save. |
| 4 | high | `packages/ui/src/pages/MonitorEditPage.tsx:139-148,231-244` | Dirty guard has holes: comment claims `useBlocker` but it's never called — sidebar nav and Back discard edits silently. | Actually wire `useBlocker(isDirty)`. |
| 5 | med | `packages/ui/src/pages/MonitorWizardPage.tsx:315-335` | Wizard has no dirty guard at all — Cancel/back silently discards 3 steps of input. | Reuse the confirm-discard prompt when non-default fields exist. |
| 6 | med | `MonitorWizardPage.tsx:134` + `ChannelsPage.tsx:251-314` | Enter key is dead: no `<form>` wrappers, so Enter in single-input steps does nothing. | Wrap steps/dialog in `<form onSubmit>`. |
| 7 | med | `MonitorEditPage.tsx:164-168,360` (also wizard:311, settings:129,403) | Validation errors render as one plain `<p>` at the form bottom — far from the field, no `role="alert"`, `aria-invalid` styles exist but never trigger. | Field-anchored errors + `aria-invalid`/`aria-describedby`, focus first invalid on submit. |
| 8 | med | `MonitorEditPage.tsx:313-331` | `Number('')===0`: clearing Timeout/Retries snaps to 0, field can't be emptied mid-edit. | Raw string state, coerce on blur/submit (copy TCP port pattern at :588-593). |
| 9 | med | `MonitorWizardPage.tsx:109-113,325` + `ChannelsPage.tsx:310` | Disabled-as-validation: buttons disable with no hint why, combined with #1 the wizard looks stuck. | Keep enabled + inline message, or helper text naming the missing field. |
| 10 | med | `MonitorWizardPage.tsx:376-387` | TagInput silently swallows invalid tags / 17th tag — Enter appears dead. | Transient inline hint + `aria-invalid` flash; add `focus-within:border-ring`. |
| 11 | med | `ChannelsPage.tsx:309` | Footer Cancel skips `reset()` (unlike Esc/overlay/X) — cancelled create-drafts reappear next open. | Cancel through the same reset path. |
| 12 | med | `SettingsPage.tsx:41` vs `MonitorWizardPage.tsx:135` vs `ChannelsPage.tsx:61` | Four different content widths/alignments across sibling admin pages. | One convention (left-pinned `max-w-3xl` suggested) app-wide. |
| 13 | med | `MonitorWizardPage.tsx:340-362` | Stepper a11y: no `aria-current="step"`, step changes unannounced, no focus target on later steps, no page `<h1>`. | `aria-current`, polite live region or heading focus, real h1. |
| 14 | low | `packages/ui/src/components/ui/button.tsx:8` | `transition-all` on every button. | Explicit property list ~150ms ease-out. |
| 15 | low | `SettingsPage.tsx:131,168,405` | Mixed feedback channels: adjacent forms use toast vs inline green text vs inline error. | Standardize: toasts for async side-effects, inline for field validation; add `role="status"`/`alert`. |

## Slice 3 — Admin list & detail pages

| # | Severity | File:line | Finding | Recommended fix |
|---|----------|-----------|---------|-----------------|
| 1 | high | `packages/ui/src/components/StatusBadge.tsx:17` | `degraded` maps to `variant="default"` = solid brand green — a degraded monitor renders in the color that means healthy. | Amber/warning treatment matching the maintenance chip. |
| 2 | high | `IncidentsPage.tsx:65`, `MaintenancePage.tsx:59`, `StatusPagesPage.tsx:118` | Query errors render as empty states ("No incidents on record" on fetch failure). Only MonitorDetailPage handles `isError`. | Branch on `isError` first with retryable error block. |
| 3 | high | `lib/utils.ts:8`, `MonitorDetailPage.tsx:253`, `IncidentsPage.tsx:166`, `MaintenancePage.tsx:49` | Times never tick: "Last check … ago", open-incident durations, and maintenance active/upcoming/past bucketing all snapshot render time. | `useNow(30_000)` hook driving these derivations. |
| 4 | med | `MonitorDetailPage.tsx:740-741`, `MaintenancePage.tsx:182-183`, `IncidentsPage.tsx:194`, `MonitorDetailPage.tsx:460,465` | Raw `toLocaleString()` datetimes ("21/07/2026, 02:00:00 → …") with seconds noise and repeated dates. | Shared `formatDateTime`/`formatRange` helpers; same-day ranges collapse to "Jul 21, 02:00–04:00". |
| 5 | med | `layouts/AdminLayout.tsx:21` | Header + tab title say just "Monitor" on every detail page. | Set title from monitor name once loaded; "Monitors / {name}" breadcrumb. |
| 6 | med | `MonitorDetailPage.tsx:459-481`, `IncidentsPage.tsx:193-199` | Incident timestamps/durations lack `tabular-nums`, disagree with dashboard's mono voice. | Apply the dashboard numeric treatment; right-align Duration. |
| 7 | med | `StatusPagesPage.tsx:626-696` | Edit dialog: selected/ordered monitors and unselected pool render identically (intended divider renders null), no order index, rows jump on reorder. | "On this page" / "Available" sections, order index, tracked reorder. |
| 8 | med | `MonitorDetailPage.tsx:669-704` | Maintenance inline form: no End>Start validation, Enter dead, bare text labels. | `<form>` wrapper, client validation, shared Label styling. |
| 9 | med | `MonitorDetailPage.tsx:133,287-293` | Chart ticks carry seconds, tooltip has no date, "ms" repeats per Y tick. | `HH:mm` ticks, labelFormatter with day+time, single axis unit. |
| 10 | med | `MonitorDetailPage.tsx:391-397,515-517`, `IncidentsPage.tsx:233-235` | "Add tags…" / "Add a note…" italic ghost buttons: tiny targets, read as unfinished. | Dashed-outline xs Button ("+ Add tags"), non-italic; raise note icon on row hover. |
| 11 | low | `MonitorDetailPage.tsx:225` | Hover gradient on non-interactive stat cards at `duration-500`. | Remove, or 200ms + `(hover:hover)` gate if kept. |
| 12 | low | `ui/button.tsx:8`, `ui/badge.tsx:8` | `transition-all` on Button and Badge. | Explicit property list. |
| 13 | low | `MonitorDetailPage.tsx:197-202` | Overflow menu duplicates the visible Edit button; dilutes Delete. | Drop the duplicate item. |
| 14 | low | `MonitorDetailPage.tsx:754-758` | Window-delete confirm copy wrong for past/future windows (MaintenancePage tailors it correctly). | Reuse state-aware copy. |
| 15 | low | `MonitorDetailPage.tsx:111-122` | Error state hand-rolls EmptyState styling with a bare text button. | Use `EmptyState` + outline Button action. |

Also noted: Incidents/StatusPages flash false zero-counts during load (fixed by #2's branching); detail skeleton mixes Panel where the page uses Card.

## Slice 4 — Public status page + landing

| # | Severity | File:line | Finding | Recommended fix |
|---|----------|-----------|---------|-----------------|
| 1 | high | `apps/landing/src/sections/DashboardPreview.tsx:33-121` | Mockup diverges from the real product: rounded corners, gradient wash, no Panel/CornerTicks — prospects see a UI that doesn't exist. | Rebuild the mock in the blueprint language (sharp panels, ticks, mono micro-labels). |
| 2 | high | `packages/ui/public.html:7` + `PublicStatusPage.tsx:672-703` | OG/title meta injected client-side only; unfurlers don't run JS, so shared status links preview as bare "Status" — during incidents, the page's core moment. | Server-render title/description/OG for `/:slug` in the HTML shell. |
| 3 | high | `apps/landing/src/sections/FeaturesGrid.tsx:143` + `Readme.tsx:51-53` | Fabricated "★ 1.2k" star badge; broken overclaiming sentence "…production stacks on the planet". | Drop/fetch-real star count; rewrite to a truthful claim. |
| 4 | high | `PublicStatusPage.tsx:387-402` | Timeline bars: `aria-label` without role, no keyboard access, hover-only tooltip — 90 days of data invisible to AT/keyboard/touch users. | Focusable bars (`tabIndex`, role), tooltip on focus, gate brightness hover. |
| 5 | med | `PublicStatusPage.tsx:369-372` vs `:394` | Mobile tooltip mispositioned: `left` computed against all 90 entries while only 30 are visible below `sm`. | Compute against the visible window. |
| 6 | med | `PublicStatusPage.tsx:292` | "Updated just now" formats render time — decorative freshness; misleads when refetches fail. | `formatRelative(query.dataUpdatedAt)` + interval re-render + stale indicator on refetch error. |
| 7 | med | `RightColumnNav.tsx:2` + section anchors | Nav active state hardcoded to README; anchors lack `scroll-mt` so sections bury under the sticky bar. | `scroll-mt-12` + IntersectionObserver scroll-spy. |
| 8 | med | `apps/landing/src/globals.css:52` + `Readme.tsx:79`, `FeaturesGrid.tsx:130,167` | Landing `--primary` is blue/purple; code snippets hardcode a violet accent — off the brand-green single-accent rule. | Sync landing tokens with the product theme; recolor snippets. |
| 9 | med | `PublicStatusPage.tsx:606-614` | Password gate: placeholder-only input, error not associated (`aria-describedby`/`aria-invalid` missing). | Hidden label + wired error semantics. |
| 10 | med | `apps/landing/src/sections/Hero.tsx:40,82,96` | Three infinite `animate-ping` loops ungated for reduced motion (public page gates correctly). | `motion-safe:animate-ping`. |
| 11 | med | `Readme.tsx:82-89` | Copy button: no state announcement, no press feedback, clipboard failure silently swallowed. | `aria-live` "Copied", `active:scale-[0.97]`, select-text fallback. |
| 12 | med | `ConfigSection.tsx:9-19` + `Readme.tsx:5` + `PluginStrip.tsx:33` | Content drift: SDK import snippet isn't a real install path yet (config API is committed but unbuilt — see task backlog), quickstart tab keyed `compose` shows curl, "Browse all →" links nowhere real. | Align snippets with the real config surface when built; rename tab key; fix or drop "Browse all". |
| 13 | low | `PublicStatusPage.tsx:319,528,533-535,545-546` | Amber-on-amber small text below 4.5:1 in light mode; maintenance times via raw `toLocaleString()`. | `text-amber-700`; shared short range formatter. |
| 14 | low | `apps/landing/src/components/ui/button.tsx:8`, `ui/tabs.tsx:60` | `transition-all` on landing Button/TabsTrigger. | Explicit property list. |
| 15 | low | `PublicStatusPage.tsx:393-399` | No print affordance: background-color-only bars/dots strip when printing; dark page prints dark. | `print-color-adjust: exact` + light `@media print` block. |

## Slice 5 — Motion & interaction sweep (cross-cutting)

| # | Severity | File:line | Finding | Recommended fix |
|---|----------|-----------|---------|-----------------|
| 1 | high | `apps/landing/src/sections/Hero.tsx:40,82,96` | Bare `animate-ping` ×3: default 1s (frantic), no motion-safe gate. | `motion-safe:animate-ping` + 2s duration to match the app motif. |
| 2 | high | `packages/ui/src/globals.css:159` + `apps/landing/src/globals.css:127` | `theme-reveal` full-screen clip-path wipe has no reduced-motion fallback — the largest motion in the product plays unconditionally. | Gate behind `prefers-reduced-motion: no-preference`; instant swap otherwise. |
| 3 | high | `packages/ui/src/components/ui/button.tsx:8`, `apps/landing/src/components/ui/button.tsx:8` | Core Button: `transition-all` + `translate-y-px` press, conflicting with the app's `active:scale` standard. | Explicit properties + `active:scale-[0.98]` 150ms ease-out. |
| 4 | high | Cross-file | Press feedback styled 4 ways (`translate-y-px`, scale-98 linear, scale-98 ease-out, scale-95). | Converge: `active:scale-[0.98]`, transform 150ms ease-out. |
| 5 | med | `nav-main.tsx:31` | Press runs `duration-200 ease-linear` — mechanical. | 150ms ease-out. |
| 6 | med | `ui/sheet.tsx:66` | Sheet mixes `transition ease-in-out` with animate-in/out keyframes. | Let animate-in own enter/exit; drop redundant transition. |
| 7 | med | `MonitorDetailPage.tsx:225` | 500ms hover fade on frequently-seen cards. | 150–200ms. |
| 8 | med | `DashboardPage.tsx:167`; `IncidentsPage.tsx:231`; `MonitorDetailPage.tsx:394,411,513` | Chips and inline action buttons: hover but no press feedback. | Add press standard. |
| 9 | med | `Readme.tsx:86`; `RightColumnNav.tsx:32`; `site-header.tsx:34,45` | Copy button/nav CTA/header icons: no press feedback. | `active:scale-[0.97]` 150ms ease-out. |
| 10 | med | `MonitorWizardPage.tsx:284`; `MonitorEditPage.tsx:706` | Selectable channel cards in two files, both missing press feedback. | Shared class incl. `active:scale-[0.99]`. |
| 11 | med | `PublicStatusPage.tsx:109,279`; `DashboardPage.tsx:204`; Hero | Pulse-dot motif at 4 durations (1s/1.5s/2s/3s). | One token (2s), loading may stay 1.5s. |
| 12 | low | `PublicStatusPage.tsx:180` vs `DashboardPage.tsx:221` | Page-entrance 500ms (public) vs 200ms (admin), undocumented divergence. | 200ms for app surfaces; make 500ms deliberate for public if kept. |
| 13 | low | `ui/tooltip.tsx:45` | Tooltip defaults to 150ms while other overlays pin `duration-100`. | Add `duration-100`. |
| 14 | low | `SetupPage.tsx:36`; `App.tsx:40` | `animate-pulse` without motion-safe. | `motion-safe:animate-pulse`. |
| 15 | low | `ui/sidebar.tsx:222,234,293,423` | Sidebar collapse animates width/margin with ease-linear (shadcn default). | ease-out; accept layout cost or move to transforms. |
| 16 | low | shadcn overlays | animate-in/out not motion-safe gated (small moves, low risk). | Optionally gate zoom/slide utilities. |
| 17 | low | `tabs.tsx` (both), `badge.tsx` (both), `toggle.tsx:10`, `sidebar.tsx:293` | Remaining `transition-all` instances. | Specify properties. |

**Already correct (verified, no action):** overlay entrances start at zoom-95 (never scale-0); select/dropdown/tooltip are transform-origin-aware via Radix vars; dialogs correctly stay center-origin; Tailwind v4 auto-gates `hover:` behind `(hover:hover)`; uptime-bar hover uses interruptible `transition-[filter] duration-100`.

## Motion convergence tokens (adopt app-wide)

1. **Press**: `active:scale-[0.98]`, `transition-transform 150ms ease-out` — every pressable.
2. **Hover/state color**: `transition-colors` at 150ms default ease.
3. **Overlays**: `animate-in/out fade-in-0 zoom-in-95` at `duration-100`.
4. **Entrances**: `motion-safe:animate-in fade-in-0 slide-in-from-{top,bottom}-1 duration-200` for app surfaces; 300–500ms reserved for landing/public hero moments.
5. **Pulse dot**: `motion-safe:animate-ping`, `animationDuration: 2s`, solid core — one motif everywhere.
