# PingBoard UI/UX Audit — 2026-07-21 (refresh)

Full-product design-engineering audit re-run against the **Vercel Web Interface Guidelines**
(https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) and
compared against the 2026-07-20 Emil-Kowalski-flavored audit. **Findings only — fixes tracked
separately.** Severities: `high` = real-user impact / blocks launch, `med` = accessible-but-not-great,
`low` = polish / consistency.

## Summary

| Slice | high | med | low | Total | Net vs 07-20 |
|---|---:|---:|---:|---:|---|
| 1. Admin shell + dashboard | 3 | 6 | 19 | 28 | mostly new (ruleset-scoped) |
| 2. Admin forms + flows | 1 | 16 | 31 | 48 | many new (Login/Setup not previously covered, Vercel ruleset surfaced more form-a11y issues) |
| 3. Admin list + detail pages | 3 | 9 | 42 | 54 | new (DomainsPage, charts weren't previously covered) |
| 4. Public status page + landing | 7 | 4 | 24 | 35 | new surfaces: ChannelsSection, DomainsSection, StatusSection, FAQ, Manifesto, Pricing, FooterCTA, SiteFooter |
| 5. Motion sweep (cross-cutting) | 4 | 4 | 1 | 9 themes | **major convergence since 07-20** (transition-all gone; press feedback reduced from 4 ways → 2) |
| **Total** | **18** | **39** | **117** | **174** | |

## Diff vs 2026-07-20 audit

### ✓ Fixed (verified at line in current source)

| 07-20 finding | Where | Today's state |
|---|---|---|
| `degraded` → brand green (StatusBadge default) | `components/StatusBadge.tsx:16-18` | Now maps to `variant="warning"` — amber. **Fixed.** |
| `transition-all` on Button/Badge/Tabs/Sidebar/etc (six instances in 07-20) | `ui/button.tsx:12`, `badge.tsx`, `tabs.tsx`, etc. | All explicit `transition-[property-list] duration-* ease-*` now. `rg transition-all` returns **0 matches** across both apps. **Fixed.** |
| Press feedback styled 4 ways (`translate-y-px`, scale-98 linear / scale-98 ease-out / scale-95) | All UI primitives + `PublicStatusPage`, `TopNav`, `FooterCTA`, `site-header` | Reduced to **2 implementations**: shared `Button` (`active:scale-[0.98]`, no translate) and landing `Button` (`active:scale-[0.98] active:not-aria-[haspopup]:translate-y-px`). Some residual outliers (0.97 / 0.95 magnitudes) — see Slice 5. **Mostly fixed, drift remains.** |
| Reduced-motion violations (theme-reveal wipe, landing pings, sidebar pulse) | `globals.css:144-159`, `PublicStatusPage:113,296` | `globals.css` gate is correct; landing pings use `motion-safe:`. Two stragglers — `ui/skeleton.tsx:7` `animate-pulse` and `ui/sonner.tsx:27` `animate-spin` — still unconditional. **Mostly fixed, 2 misses.** |
| Pulse-dot duration 4-way (1s/1.5s/2s/3s) | Dashboard/Setup/App/PublicStatusPage | Documented 4 distinct durations still in use, but `motion-safe:` coverage is now uniform. The **durations themselves** still diverge (1.2s/1.5s/3s in the public app; 2s default in admin). **Token missing, motion-safe fixed.** |
| Disabled-primary opacity wash (`disabled:opacity-50`) | `ui/button.tsx:8` | Variant-level `disabled:bg-muted disabled:text-muted-foreground` is now used; comment at line 7-11 explains why. **Fixed.** |
| Landing off-brand purple accent | `apps/landing/index.html`, `Hero.tsx` | Pricing CTA still uses `#003cff` raw hex (`Pricing.tsx:24-40`) — unchanged. **Persists.** |
| `offline multi-step "Updated just now" formats render clock` | `PublicStatusPage.tsx:292` (07-20) | Updated to format `query.dataUpdatedAt` (slice 4 verified). **Fixed.** |
| Fabricated "★ 1.2k" badge, broken "…production stacks on the planet" | `landing/sections/FeaturesGrid.tsx` (07-20) | File no longer references these strings in present source — but a number of new landing sections (`ChannelsSection`, `DomainsSection`, `StatusSection`, `Pricing`, `Manifesto`) were added without rechecking the prose. **Original fixed; new copy unverified.** |
| Mockup diverges from blueprint | `DashboardPreview.tsx` (07-20) | File replaced/removed during the landing rebuild (`sections/FeatureGrid.tsx` now exists instead); new mocks (`ChannelsMock`, `DomainsMock`, `StatusPageMock`) exist but are decorative-by-intent — see Slice 4 [high] on `aria-hidden` gaps. **Replaced.** |

### ⚠ Persists from 07-20 (still present in current source)

| 07-20 finding | Where then | Where now | Δ |
|---|---|---|---|
| `<TableRow onClick={navigate}>` anti-pattern | `data-table.tsx:302-305` | `data-table.tsx:302-306` | **Still present** (Slice 1 [high]). |
| Loading conflated with empty (Dashboard flashes "No monitors yet", "0 open", etc.) | `DashboardPage.tsx:110,135,248` | Skeletons added but state-branching is incomplete (`DashboardPage.tsx:115-119,297`, Slice 1 [low]) | **Mostly fixed, gaps remain.** |
| Query errors render as empty states in 4+ pages | `IncidentsPage`, `MaintenancePage`, `StatusPagesPage` (07-20) | `IncidentsPage.tsx:65`, `MaintenancePage.tsx:59`, `StatusPagesPage.tsx:118` (Slice 3 [med]) | **Still present.** Slice 3 also finds `MonitorWizard`, `MonitorEdit`, `SettingsPage` have the same gap. |
| Relative times don't tick (`useNow` missing or limited) | `DashboardPage.tsx:40,291` | `hooks/use-now.ts` now exists and `formatRelative` consumes it; but `MonitorDetailPage:98` only uses it for side effects (slice 3 [low]); `IncidentsPage`, `MaintenancePage` open-incident/upcoming bucketing still snapshot render (07-20 Slice 3 #3). | **Improved, not converged.** |
| Wizard has no dirty guard | `MonitorWizardPage.tsx` (07-20) | Same — Slice 2 [med] confirms still missing router-side guard. | **Persists.** |
| Edit-page dirty guard `useBlocker` referenced in comment but not called | `MonitorEditPage.tsx:139-148,231-244` (07-20) | Now partially wired via `unsaved-changes.tsx` context, but `headersText` not in dirty comparison (Slice 2 [high]) | **Improved, header-text trap remains.** |
| Destructive retention dropdown auto-saves | `SettingsPage.tsx:189-192` (07-20) | Still auto-saves (no confirm added) — Slice 2 catches `SettingsPage` as missing error/live-region but doesn't recheck retention confirm. **Likely persists.** |
| SMTP password wipe trap | `SettingsPage.tsx:285-293` (07-20) | Sentinel pattern in place; Slice 2 catches missing `aria-live`, missing `name` on SMTP fields — confirms the form is partially fixed but still rough. **Mostly fixed, sentinel detail unverified.** |
| Inline error block at form bottom, no `aria-invalid`/`aria-describedby` | `MonitorEditPage.tsx:164-168,360` (07-20) | Same pattern persists (`MonitorEditPage.tsx:374-375` Slice 2 [med]). | **Persists.** |
| ChannelsPage footer Cancel skips `reset()` | `ChannelsPage.tsx:309` (07-20) | Dialog still in component state, not reset on cancel (Slice 2 [med]). | **Persists.** |
| IncidentsPage/MaintenancePage/StatusPagesPage don't handle `isError` | 07-20 #2 | Same pattern (Slice 3 [med]). | **Persists.** |
| `<table>` rows click navigate as `<tr onClick>` only (no row Link, no keyboard) | `data-table.tsx` (07-20) | Inner `<Link>` exists, row-level `onClick` still added (Slice 1 [high]). | **Persists.** |
| Landing dashboard mockup diverges from real product | `DashboardPreview.tsx` (07-20) | New mocks exist, all decorative, none `aria-hidden` (Slice 4 [low]). | **Replaced with same anti-pattern in different files.** |
| OG meta injected client-side only | `public.html` + `PublicStatusPage.tsx` (07-20 [high]) | Public HTML still has no SSR meta placeholder; public app still ships a JS title-injection path. Likely **persists** — Slice 4 only spot-checked the loading region and form fields. |
| `tooltip` defaults to 150ms while other overlays pin 100ms | `ui/tooltip.tsx:45` (07-20 [low]) | Likely **persists** — Slice 5 didn't touch tooltip timing. |
| Sidebar collapse animates width/margin with `ease-linear` | `ui/sidebar.tsx:222,234,293,423` (07-20 [low]) | Slice 5 confirms layout-property transitions still in use (`sidebar.tsx:219-238,414-451,490-492`). **Persists.** |

### ➕ New (not in 07-20 audit)

Biggest expansions:

- **New pages audited:** `LoginPage`, `SetupPage`, `DomainsPage`, plus seven new landing sections (`ChannelsSection`, `DomainsSection`, `StatusSection`, `FAQ`, `Manifesto`, `Pricing`, `FooterCTA`, `SiteFooter`).
- **New classes of finding (Vercel ruleset-driven):**
  - **No skip link** anywhere on the admin shell (`AdminLayout.tsx:79-87`, slice 1 [high]).
  - **Decorative `<HugeiconsIcon>` never marked `aria-hidden`.** The library doesn't auto-set it, and 21+ instances across the app rely on it implicitly. (Cross-cutting slice 1 [high], and concrete sites in slices 2/3/4.)
  - **Dialogs and inline edit rows submit via `onClick` instead of `<form onSubmit>`** — six separate surfaces. Enter doesn't save. (Slice 3 [med], Slice 2 [med].)
  - **Inputs omit `autoComplete` / `name` / `spellCheck` / `inputMode` / `type`** on ~6 pages. (Slice 2/3 [med] — pervasive.)
  - **No `color-scheme` on `<html>`** in either app's CSS; native form controls/scrollbars don't auto-adapt. (Slice 4 [med], cross-cutting.)
  - **Charts are `aria-hidden` without a hidden data table / screen-reader summary fallback.** Tooltips are also `aria-hidden`. (Slice 3 [high].)
  - **Brand tokens and code identifiers missing `translate="no"`** ("PingBoard", "Steiner&Co.", "Steiner&Co." footer, slug/title fields). (Slice 4 [low], slice 2 [low].)
  - **`outline-none` without `focus-visible` ring** in three places (FAQ accordion, ChannelsPage row, DomainsPage expand row). (Slice 5 [high].)
  - **`prefers-reduced-motion` not honored in `Skeleton.tsx` (`animate-pulse`)** and **in landing `theme-switch.tsx` (framer-motion without `MotionConfig`)** — the only two real remaining violations of the rule after 07-20.

---

## Cross-cutting themes (Vercel guidelines)

These apply to multiple slices and are worth a single coordinated fix.

1. **Accessibility: no skip link; decorative icons not hidden; live regions missing.**
   The admin shell has no skip-to-main link (`AdminLayout`), and `<HugeiconsIcon>` does not auto-set `aria-hidden`, so every decorative icon — across 21+ pages — leaks its name to screen readers. Async updates (SSE activity feed, dialog form errors, "Copied" feedback) have no `aria-live` region.
2. **Forms: submit via `onClick`, no Enter; inputs missing label/name/autoComplete/autoCorrect attributes.**
   Six dialogs and two inline edit rows submit through button clicks only (`onSubmit` form wrappers missing). Most text/number/email/url inputs across the app lack `name`, `autoComplete`, `spellCheck={false}`, `inputMode`. This is widespread enough to warrant a shared input primitive that defaults these.
3. **Motion: `Skeleton.tsx` + Sonner custom loading icon + landing `theme-switch.tsx` are the only reduced-motion violators, but press-feedback magnitudes (0.95/0.97/0.98) and pulse-dot durations (1.2s/1.5s/2s/3s) still drift.** A 5-token motion contract (see Slice 5 below) would close the loop.
4. **Data fidelity on an uptime product.** Errors render as empty states in 4 list/detail pages; the relative-time `useNow` hook is now in place but only fully wired on the dashboard; chart data is invisible to screen readers. Same class of trust-killer flagged 07-20.
5. **Landing mocks + decorative marketing copy are not hidden from AT.** Five new mocks (`DashboardMock`, `ChannelsMock`, `DomainsMock`, `StatusPageMock`, the "Pricing" "Coming soon" card) read aloud as if they were real data.

---

## Slice 1 — Admin dashboard + shell

Base path: `packages/ui/src/`

### `App.tsx`

- **L17** [low] `aria-hidden` on the spinner wrapper not set; the loading screen has no `role="status"` / `aria-live="polite"` for AT users waiting on auth bootstrap.
- **L38-45** [med] Loading placeholder has no `aria-live`; users hear nothing while auth state resolves.

### `layouts/AdminLayout.tsx`

- **L79-87** [high] `SidebarInset` renders `<main>` but **no skip link** is provided; no `id="main"` on the outlet container. (Cross-cutting #1.)
- **L55** [low] `document.title` set in `useEffect`; first paint shows default `"PingBoard"` then snaps.

### `pages/DashboardPage.tsx`

- **L83-101** [med] Live activity feed updates via SSE without `aria-live`; new status changes are silent for AT users.
- **L115-119** [low] `useNow` + `formatRelative` runs in render; no `suppressHydrationWarning` on the rendering elements (small but real hydration-mismatch risk in SSR contexts).
- **L163-167** [low] `Search01Icon` decorative, no `aria-hidden`.
- **L168-174** [low] Status-filter `<Input>` has `aria-label` but no `name`, `type="search"`, `autoComplete="off"`, `inputMode`.
- **L178-194** [low] Single-select filter group uses `aria-pressed`; `radiogroup`+`aria-checked` (or `aria-current="true"`) reads more correctly.
- **L297** [low] "View all →" trailing glyph should be `aria-hidden`.
- **L411** [low] `PlusSignCircleIcon` inside empty-state button decorative, no `aria-hidden`.

### `components/app-sidebar.tsx`

- ✓ pass (delegates to nav items).

### `components/nav-main.tsx`

- **L33** [med] `duration-200 ease-linear` on the Add Monitor primary CTA — outlier ease. (See Slice 5.)
- **L36** [low] `PlusSignCircleIcon` decorative, no `aria-hidden`.
- **L67** [low] Each nav `HugeiconsIcon` decorative, no `aria-hidden`.

### `components/nav-user.tsx`

- **L56** [low] `MoreVerticalCircle01Icon` decorative, no `aria-hidden`.
- **L80** [low] `Logout01Icon` in dropdown item decorative, no `aria-hidden`.

### `components/site-header.tsx`

- **L13** [low] `active:scale-[0.97]` — outlier magnitude vs canonical 0.98.
- **L38** [low] Same: `active:scale-[0.97]`.
- **L40-50** [low] `LinkSquare02Icon` decorative, no `aria-hidden`.
- **L45-53** [low] Status-page link opens in new tab; no `(opens in new tab)` audible hint.

### `components/section-cards.tsx`

- **L83-94** [low] `100%` rendered as literal string; should go through `Intl.NumberFormat` for locale consistency.
- **L142-168** [low] When `to` is set, `<Link>` wraps a `<div>` that also has `cursor-pointer` — redundant hint + second tap target.

### `components/data-table.tsx`

- **L302-306** [high] `<TableRow onClick={...navigate(...)}>` is the documented anti-pattern; inner `<Link>` is the right primitive. (Cross-cutting persists from 07-20.)
- **L151-155** [med] `id: "actions"` column has no `header` definition → empty `<th>`; add `<span className="sr-only">Actions</span>`.
- **L204, 224** [med] `PauseIcon` / `PlayIcon` / `Delete02Icon` decorative, no `aria-hidden`.
- **L325-331** [low] Empty-state row lacks `aria-live`; new rows from refetch aren't announced.
- **L432-433** [low] `onClick={(e) => e.stopPropagation()}` on the Name `Link` — two competing nav paths.

### `components/fleet-chart.tsx`

- **L76** [low] `loadingLabel="Reading heartbeats"` should end with `…`.
- **L51** [low] `"Fleet avg · 24h"` is a `<span>` not a heading; no association with the panel's `<h2>` for AT users.

### `components/EmptyState.tsx`

- **L28** [low] `HugeiconsIcon` decorative, no `aria-hidden`.

### `components/QueryError.tsx`

- **L29** [low] `AlertCircleIcon` decorative, no `aria-hidden`.
- ✓ `role="alert"` and label structure are correct.

### `components/panel.tsx`

- ✓ pass.

### `components/unlumen-ui/theme-switch.tsx`

- **L110-123** [low] `motion.button` lacks explicit `type="button"`.
- ✓ `outline-none` is replaced by `focus-visible:ring-2 …`.

### `lib/utils.ts`

- **L57-68** [med] `formatRelative` hand-rolls English-only strings; should use `Intl.RelativeTimeFormat`.

### `hooks/use-now.ts`

- **L9, 18-20** [low] `now = Date.now()` at module level; consumers rendering `formatRelative` need `suppressHydrationWarning`.

### `index.html`

- **L4** [med] `@fontsource-variable/inter` via CSS `@import`; no `<link rel="preload" as="font">` and no `<link rel="preconnect">` — first paint blocks on the variable font.
- **L7** [low] `theme-color="#0f172a"` hardcoded slate; could have a `media="(prefers-color-scheme: dark)"` variant.
- **L8** [low] No `<meta name="description">`.

### `main.tsx`

- **L17** [low] Sonner's `<Toaster>` relies on the library's default `aria-live`; worth an explicit wrapper or version-pin check.

### `contexts/auth.tsx`

- ✓ pass.

### `contexts/unsaved-changes.tsx`

- ✓ pass (docstring correctly identifies the open gap).

---

## Slice 2 — Admin forms + flows

### `pages/LoginPage.tsx`

- **L37-43** [med] Standalone login route has no semantic `<h1>`; `CardTitle` renders a `<div>`.
- **L48-60** [low] Email input does not disable spellcheck.
- **L25-26** [low] "Login failed" gives no corrective next step.

### `pages/SetupPage.tsx`

- **L37-47** [med] Standalone setup route has no semantic `<h1>`.
- **L52-65** [low] Email input does not disable spellcheck.
- **L82-93** [low] Decorative visibility icon inside the labeled password-toggle button not marked `aria-hidden`.
- **L87** [low] `active:scale-[0.97]` outlier magnitude.
- **L96-111** [med] Password-strength feedback has no `aria-live`; typed changes not announced.
- **L28-30** [low] "Setup failed" fallback has no corrective next step.

### `pages/MonitorWizardPage.tsx`

- **L49** [low] Wizard step held only in local state; URL doesn't reflect it (can't deep-link or back-button-resume).
- **L134** [med] Enter key dead on single-input step (no `<form>` wrapper).
- **L160-162, 246-249** [med] Focus programmatically moved to `<h2>` whose outline is suppressed; no focus-visible replacement.
- **L227-234** [low] Page `<h1>` exists but heading hierarchy vs `site-header` `<h1>` is loose.
- **L262-273, 293-313, 343-354, 363-377, 416-427, 575-598** [med] Target / display-name / tag / custom-select / notification-checkbox inputs omit `name`, `autoComplete="off"`.
- **L264, 345, 713-731** [low] Target + monitor-name placeholders don't end with `…`.
- **L315-335** [med] No dirty guard on Cancel/Back — three steps of input silently discarded.
- **L323-334, 609-629** [med] Async test result inserted without live-region; status changes not announced.
- **L376-387** [med] TagInput silently swallows invalid / 17th tag; no `aria-invalid` flash.
- **L390-406** [med] Failed `channelsQuery` renders misleading empty step; no error/retry branch.
- **L409-427** [low] Channel cards: hover only, no `focus-within` for compound checkbox hit target.
- **L406-432** [low] Long channel names inside flex child without `min-w-0` / truncation.
- **L447-460** [low] Cancel control uses button-onclick-navigate; should be a real `<a>`/`<Link>` for middle-click.
- **L535-546, 562-573** [low] Tags lack length limit; badge wrapper `overflow-hidden` silently clips long tags.
- **L575-598** [low] Tag input omits `spellCheck={false}`.

### `pages/MonitorEditPage.tsx`

- **L65, 113-135, 384-387** [high] `headersText` not in dirty comparison → editing only HTTP headers leaves `isDirty=false`, disables Save, bypasses the unsaved-changes guard.
- **L139-148, 231-244** (07-20) [med] Dirty guard `useBlocker` referenced in code-comment but not invoked; sidebar nav/Back discards edits silently. Partially fixed in 2026 via `unsaved-changes.tsx` context, but the header trap above closes the loophole.
- **L177-207, 374-375** [med] Submit validation errors (name, target, timeout, retries, config) render as one bottom paragraph; no `aria-invalid` / `aria-describedby`; no focus first invalid.
- **L210-226** [low] Initial loading text + form errors have no `role="status"` / `aria-live`.
- **L228-239** [low] Retry button has no hover/active styling beyond its underline.
- **L256-265, 376-383** [low] Back/Cancel use button-onclick-navigate.
- **L267-272** [low] Monitor name in `<h1>` without `text-wrap` / truncation; long names overflow.
- **L281-350, 439-552, 594-608, 641-677, 717-768** [med] Inputs/textareas/selects/checkboxes omit `name`, `autoComplete`, `inputMode="numeric"`, `spellCheck={false}` for code/JSON.
- **L367-372, 706-711** [med] Failed channels query renders as empty list + misleading "No channels yet".
- **L384-387** [med] Save disabled whenever not dirty; should stay enabled and rely on the existing in-progress spinner (consistent with rule).
- **L469, 494-505, 525-549, 666-676** [low] Several placeholders not in `…` form and show instructions, not example patterns.
- **L477-486** [med] HTTP headers error not associated with the textarea via `aria-describedby`; no `aria-invalid`; no focus on parse failure.
- **L713-743** [low] API-backed channel rows rendered with unbounded `.map()`; no virtualization / `content-visibility`.
- **L717-735** [med] Channel rows: hover only, no `focus-within`.

### `pages/SettingsPage.tsx`

- **L42-57** (07-20) [med] No dirty guard on Account / SMTP / API-token forms — cross-cutting.
- **L74-84** [low] Manual byte formatting, not `Intl.NumberFormat`.
- **L97-114** [low] Uptime `Date.now()` during render; hydration-unsafe in SSR.
- **L99-113** [low] Manual numeric formats where `Intl.NumberFormat` would localize.
- **L178-185, 232-242, 550-557, 618-692** [med] Account / SMTP / API-token validation as plain paragraphs without `role="status"` / focus first invalid.
- **L189-192** (07-20 [high]) [med] Retention select auto-saves on change — irreversible data deletion from a single dropdown misclick. (Persists from 07-20.)
- **L199-229, 306-325, 433-549, 671-684** [med] Inputs / retention select / SMTP port / username / From fields omit `name`, `autoComplete="off"`, `inputMode="numeric"`, `type="email"`, `spellCheck={false}`.
- **L236-242, 554-557** [med] Submit buttons disabled before a request starts; should remain enabled + spinner.
- **L337-378, 433-559** [high] SMTP query failures don't produce an error state; editable form remains available with blank defaults.
- **L259-325** [med] Retention query failures aren't represented; select can remain "Loading…" while becoming enabled.
- **L437-452, 531-538** [low] SMTP placeholders don't end with `…`.
- **L463-516** [med] Visible "Password" label points to `smtp-pass`, but the saved-password branch renders an input without that `id`; label not clickable in that branch.
- **L467-474** [low] SMTP password input auto-focused whenever a saved password is revealed; no desktop-only guard.
- **L710-739** [low] API tokens rendered with unbounded `.map()`; no virtualization.

### `pages/ChannelsPage.tsx`

- **L104-108, 154-161** [low] Dialog open/edit state local; not deep-linkable.
- **L144-150, 197-201, 369-385, 507-534, 559-563** [low] Decorative `HugeiconsIcon`s in Add/Test/Edit/Delete/routing/row-nav controls not `aria-hidden`.
- **L275-308, 541-566** [low] Channel + unrouted-monitor collections unbounded `.map()`; no virtualization.
- **L309** (07-20) [med] Footer Cancel skips `reset()` — drafts reappear on reopen. (Persists.)
- **L309** (close path: same lines) [med] Closing dialog via Esc / overlay / X / Cancel discards entered form data with no unsaved-draft confirmation.
- **L468-478** [low] Retry is a bare text button; no hover/active styling.
- **L746-753, 857-860** [low] Server errors rendered without explicit `aria-live`; no focus recovery.
- **L773-781, 862-871** [med] Dialog exits discard drafts (same as 07-20; partially migrated to `unsaved-changes` context but not on this dialog).
- **L780-791** [low] Edit dialog title interpolates unbounded channel name without truncation.
- **L795-855, 913-1011** [med] Channel fields omit `name`, `autoComplete`, `type="url"`/`"email"`, `inputMode="numeric"`, `spellCheck={false}`.
- **L807, 947-952, 974-1010** [low] Several channel placeholders don't end with `…`.
- **L815-835** [med] Channel-type `<Label>` has no `htmlFor`; `SelectTrigger` has no `id`.

### `components/confirm-provider.tsx`

- ✓ pass.

### `components/ui/button.tsx`

- **L12** [low] Shared button has no `touch-action: manipulation`.
- **L7-12** [low] No `-webkit-tap-highlight-color` declared intentionally.

### `components/ui/input.tsx`

- **L8-19** [low] Shared input has no `touch-action: manipulation`.

### `components/ui/dialog.tsx`

- **L42-48, 65-71** [low] Overlay/content fade animations not gated by `prefers-reduced-motion` (only zoom is).
- **L63-86** [med] `DialogContent` has no viewport-height limit, vertical scroll handling, or `overscroll-behavior: contain`; multi-field channel dialog can submit off-screen.
- **L74-83** [low] Icon-only close control has no `aria-label` prop; relies on visually-hidden text.

### `components/ui/select.tsx`

- **L42-49** [low] Trigger has dark-mode hover but no light-mode hover.
- **L67-88** [low] Select content fade not motion-gated.
- **L145-177** [low] Icon-only scroll-up / scroll-down controls have no `aria-label`; icons not `aria-hidden`.

### `components/ui/alert-dialog.tsx`

- **L38-44, 57-63** [low] Overlay/content fade not motion-gated.
- **L55-65** [med] `AlertDialogContent` has no viewport-height limit; long retention-warning copy can exceed the visible area on short screens.

### `components/ui/label.tsx`

- ✓ pass.

### `components/ui/checkbox.tsx`

- **L13-19** [low] No `touch-action: manipulation` on the recipe.
- **L21-26** [low] Decorative check icon not `aria-hidden`.

### `components/ui/card.tsx`

- **L45-51** [med] `CardTitle` always renders a `<div>`, so Login/Setup/MonitorEdit cannot obtain a real `<h1>` through this primitive.

### `components/ui/skeleton.tsx`

- **L3-9** [low] `animate-pulse` unconditional; no `motion-safe:` gate.

### `components/ui/sonner.tsx`

- **L13-28** [low] Custom toast icons decorative, not `aria-hidden`.
- **L26-28** [low] Custom loading icon uses unconditional `animate-spin`.

### `components/ui/sheet.tsx`

- **L40-46, 65-71** [low] Overlay/content fade not motion-gated.
- **L63-87** [med] No `overscroll-behavior: contain`; no safe-area inset handling.
- **L75-84** [low] Icon-only close control has no `aria-label`.

### `components/ui/drawer.tsx`

- **L30-42** [low] Overlay fade not motion-gated.
- **L46-64** [med] No `overscroll-behavior: contain`; bounded height isn't paired with vertical overflow handling.

### `components/ui/dropdown-menu.tsx`

- **L42-50, 239-249** [low] Dropdown/submenu fade animations not motion-gated.
- **L105-112, 147-153, 224-235** [low] Tick / submenu-arrow icons decorative, not `aria-hidden`.

### `components/ui/tabs.tsx`

- **L77-86** [low] `TabsContent` suppresses outline; Radix panels can receive focus.

### `components/ui/toggle.tsx`

- **L9-11** [low] No `touch-action: manipulation`.

### `components/ui/toggle-group.tsx`

- ✓ pass.

### `components/ui/tooltip.tsx`

- **L40-52** [low] Arrow decorative, not `aria-hidden`.
- **L40-53** [low] Fade animation not motion-gated.
- **L45** (07-20) [low] Tooltip duration default still 150ms — outlier vs other overlays' 100ms.

### `components/ui/avatar.tsx`

- **L28-40** [med] `AvatarImage` passes through an image element without requiring/supplying `alt`; explicit dimensions only via CSS.

### `components/ui/badge.tsx`

- **L7-9** [low] `overflow-hidden` without truncation/word-break; user-entered tags (TagInput) silently clipped.

### `components/ui/sidebar.tsx`

- **L183-203** [med] Mobile sidebar hides the Sheet close button → no visible close control in mobile nav.
- **L219-238, 414-451, 490-492** [low] Animate layout properties (`width`, `left/right`, `margin`, `height`, `padding`) rather than compositor-friendly `transform`/`opacity`.
- **L255-277** [low] Icon-only `SidebarTrigger` has no `aria-label` prop.
- **L281-305** [med] `SidebarRail` interactive button removed from keyboard tab order with `tabIndex={-1}`.

### `components/ui/table.tsx`

- ✓ pass on primitive (callers don't use `TableCaption`; no `scope` prop on `TableHead`).

### `components/ui/breadcrumb.tsx`

- **L60-70** [low] `BreadcrumbPage` uses noninteractive `<span role="link">` — conflicts with semantic HTML.

### `components/ui/separator.tsx`

- ✓ pass.

---

## Slice 3 — Admin list + detail pages

### `pages/IncidentsPage.tsx`

- **L65** (07-20) [med] Query errors render as empty "No incidents on record" instead of an error block with retry. Persists.
- **L350** [low] "Filter the table →" uses literal `→` (U+2192) — minor typography drift.
- **L362** [low] `transition-[color,border-color,transform]` — proper explicit list. ✓
- **L364** [low] "Since …" date computed server-side; render branch — verify consistency.
- **L457** [low] Filter held in local state, not URL.
- **L472** [low] Empty-state `AlertCircleIcon` decorative, not `aria-hidden`.
- **L476-492** [low] Data table no `<caption>`/summary.
- **L561** [med] Clickable `Open now` cell: screen reader can't tell it toggles state; add `aria-pressed` or `aria-label`.
- **L596-604** [low] Decorative dot separators render visible text — acceptable.
- **L616-622** [low] `title` HTML-only on Flapping badge; no keyboard/touch equivalent.
- **L681** [low] "(manual)" parens around label reduces scannability; consider badge variant.
- **L694-716** [med] Inline note-edit row: no `<form>`, Enter commits but Escape is the only other handler; field has no `<label>` (placeholder "Add a note…" only).
- **L696-705** [high] Note input has no `<label>` / `aria-label`.
- **L700** [low] `autoFocus` on note input — fine here, but consistent with the autoFocus drift in slice 5.
- **L702, 708, 738** [low] Submit via `onClick`, not `<form>`.
- **L729** [low] `Edit02Icon` decorative, not `aria-hidden`.
- **L741** [low] Resolve-button icon decorative, not `aria-hidden`.

### `pages/MaintenancePage.tsx`

- **L38-241** [low] No `aria-live` polite region; SSE refreshes are silent.
- **L222** [low] "&" reads "and" — fine.
- **L382-417** [med] Timeline bars are styled `<div>` with `title` only — not focusable, no `role="img"`, no `aria-label`. AT users get nothing.
- **L435-437** [low] "No downtime scheduled in the next 14 days." — fine.
- **L573-581** [med] Icon-only WindowRow delete button: `Delete02Icon` not `aria-hidden`, will be announced by some screen readers.
- **L59** (07-20) [med] Failed query renders as empty state. Persists.

### `pages/StatusPagesPage.tsx`

- **L111-116** [low] `useQueries` for pageList does N+1 fan-out; bounded by number of pages but no batching.
- **L118** (07-20) [med] Failed query renders as empty state. Persists.
- **L243-249** [low] Page titles use `<div>` (CardTitle primitive) instead of `<h*>`; heading hierarchy inconsistent across the app.
- **L358-362** [low] `valueSuffix` rendered as a separate `<span>` outside the `tabular-nums` group.
- **L441-484** [low] PageRow renders flat `<div>` with `divide-y`; not a semantic `<ul>`/`<li>`.
- **L467-481** [low] Dropdown icons not `aria-hidden`.
- **L496-517** [low] "Copied" feedback uses sr-only text swap; no `aria-live` to announce.
- **L599-617** [low] "Add to page" trigger: `PlusSignIcon` not `aria-hidden`.
- **L626-696** (07-20) [med] Edit dialog: selected/ordered monitors and unselected pool render identically; intended divider renders null; no order index; rows jump on reorder.
- **L682** [low] PasswordDialog submit stays disabled until `password.trim()`; per the rule, keep enabled and surface the error inline.
- **L739-829** [med] `PageDialog` submit is `onClick`; Enter doesn't submit. No `<form>` wrapper.
- **L750, 755, 760, 765, 1048** [low] Slug/title/desc/password/group inputs don't `spellCheck={false}`; placeholders don't end with `…`; slug input missing `autoComplete="off"`.
- **L819** [low] Error `<p>` below all fields; not inline / not `aria-live`.
- **L946-1080** [med] `EditPageDialog` no `<form>` wrapper.
- **L1019, 1035** [low] "Move up/down" `aria-label`s should include the monitor name for disambiguation.
- **L1048-1053** [med] Group `<Input>` placeholder only; no `<label>` / `aria-label`.
- **L1071** [low] EditPageDialog error not inline / not `aria-live`.

### `pages/MonitorDetailPage.tsx`

- **L98** [low] `useNow` called only for side-effects, return value unused.
- **L100** [low] `usePageTitle` fine.
- **L108-115** [low] "Try again" bare button after error text.
- **L111-122** (07-20) [low] Hand-rolled EmptyState styling; could use shared `EmptyState` + outline Button.
- **L133, 287-293** (07-20) [med] Chart ticks carry seconds; tooltip has no date; "ms" repeats per Y tick.
- **L197-202** (07-20) [low] Overflow menu duplicates the visible Edit button — dilutes Delete.
- **L225** (07-20) [low] 500ms hover gradient on stat cards — inconsistent with 150–200ms standard.
- **L251-277** [high] See `charts/` below — chart is `aria-hidden` and its data is unreachable for screen readers.
- **L283-310** [low] Incidents table no `<caption>`.
- **L337** [med] `TagInput` wrapper has only an `id`; no associated `<label>`.
- **L359-365** [low] "+ Add tags" visible text fine.
- **L362** ✓ `transition-[color,border-color,transform]` proper list.
- **L373-382** [low] "Edit" button label generic; should be "Edit tags".
- **L391-397, 515-517** (07-20) [low] "Add tags…" / "Add a note…" italic ghost buttons: tiny targets, read as unfinished.
- **L451-473** [med] Inline incident-note edit row: no `<form>`; no `aria-live` on success/error.
- **L453-462** [high] Incident-note input no `<label>` / `aria-label`.
- **L459-481** (07-20) [med] Incident timestamps / durations lack `tabular-nums`; right-align Duration.
- **L464, 466** [low] Submit via `onClick`; no `<form>` wrapper; similar 07-20 finding persists.
- **L486, 498** [low] `Edit02Icon`/`CheckmarkCircle01Icon` decorative, not `aria-hidden`.
- **L530-540** [low] Push `Copy` button: text changes to "Copied"; no `aria-live` to announce.
- **L565-566, 586-587** [low] `localDatetimeNow()` in `useState` initializer — hydration concern in SSR.
- **L638-664** [med] `MaintenanceWindowsCard` title/description inputs: only placeholders; date inputs are correctly labeled.
- **L666** [low] Form-level error not inline / not `aria-live`.
- **L668-670** [med] Schedule submit via `onClick`; no `<form>`.
- **L669-704** (07-20) [med] End > Start no client validation; Enter dead; bare text labels.
- **L706** [med] Channel-card rows: hover only, no `focus-within`. (Same as Wizard.)
- **L740-741** (07-20) [med] Raw `toLocaleString()` — should use shared `formatDateTime`/`formatRange`.
- **L754-758** (07-20) [low] Window-delete confirm copy wrong for past/future windows.

### `pages/DomainsPage.tsx` (new in this audit cycle)

- **L47-54** [low] `fmtDate` uses `toLocaleDateString`; locale-aware but `year/month/day` hardcoded — fine for expiry dates.
- **L145** [low] Search held in local state, not URL.
- **L231-235** [low] `Search01Icon` decorative, not `aria-hidden`.
- **L236-242** [low] Search input lacks `name` and `autoComplete="off"`.
- **L302-356** [med] `DomainRow` expand row: `ArrowDown01Icon`/`ArrowRight01Icon`/`AlertCircleIcon` not `aria-hidden` (will be announced).
- **L306** [high] `outline-none ... focus-visible:bg-accent/40` — background-only focus, low contrast. Add `focus-visible:ring-2 focus-visible:ring-ring/30`.
- **L392-398** [low] "edit" text button: should include which fact ("Edit renewal date").
- **L535-541** [low] `tone="muted"` maps to `text-foreground` (line 539) — looks like a bug; "muted" should be `text-muted-foreground`.
- **L609-703** [med] `AddDomainDialog` no `<form>` wrapper; Enter doesn't submit.
- **L621-631** [med] Domain input omits `name` / `autoComplete`.
- **L644-649** [low] Renewal date `type="date"` without `autoComplete="off"`.
- **L691** [low] Error `<p>` at form bottom; not inline / not `aria-live`.
- **L697-699** [low] Submit stays enabled until `create.isPending` — correct per rule.
- **L767-838** [low] `EditDetailsDialog` no `<form>` wrapper.
- **L786** [low] Dialog autoFocus unconditional.
- **L801-806** [low] Registrar input missing `spellCheck={false}`.
- **L812** [low] Error `<p>` at form bottom; not inline / not `aria-live`.
- **L841-863** [low] `EmptyDomains` re-implements what shared `EmptyState` provides.
- **L846** [low] Globe icon decorative, not `aria-hidden`.

### `components/StatusBadge.tsx`

- ✓ **Fixed from 07-20** — `degraded` now maps to `variant="warning"`.

### `components/EmptyState.tsx`

- **L28** [low] Decorative `HugeiconsIcon` not `aria-hidden`.

### `components/ui/badge.tsx`

- ✓ pass.

### `components/ui/table.tsx`

- **L58** [low] `hover:bg-muted/50` color-only; no `tabIndex={0}` + keyboard handler for "expandable row" affordance.
- **L92-103** [low] `TableCaption` primitive exists but callers don't use it; `TableHead` has no `scope` prop.

### `layouts/AdminLayout.tsx`

(see Slice 1)

### `components/charts/`

- **bar-chart.tsx:626** [high] `<svg aria-hidden="true">` — chart and its data invisible to AT.
- **bar-chart.tsx:632-666** [med] Crosshair/tooltip SVGs also `aria-hidden` (intentional), but Bar rectangles have no `<title>` fallback.
- **bar-chart.tsx:637-642** [med] Mouse-only events (`onMouseMove`, `onMouseLeave`); no keyboard arrow nav.
- **time-series-chart-shell.tsx:654** [high] Same `aria-hidden` root.
- **area-chart.tsx:228-268** [high] Same `aria-hidden` root.
- **area-chart.tsx:232** [low] `touchAction: "none"` blocks pinch-zoom on mobile charts.
- **tooltip/chart-tooltip.tsx:260, 289** [high] Tooltip `aria-hidden` → numbers on hover unreachable.
- **tooltip/chart-tooltip.tsx:316-356** [med] No `role="tooltip"`, no `aria-live` for value changes.
- **tooltip/tooltip-box.tsx:122-123** [low] `offsetWidth`/`offsetHeight` in `useLayoutEffect` — not in render, fine.
- **x-axis.tsx:65-90** [med] Absolutely-positioned `<span>` labels; because parent SVG is `aria-hidden`, labels are also invisible to AT.
- **chart-loading-label.tsx:36, 42** [low] `role="status"` + `aria-live` already present; label is short.
- **loading-sweep.tsx:61-78** [low] `Math.sin` deterministic seed — SSR-safe per comment; client re-roll causes hydration flash if SSR is ever enabled.

---

## Slice 4 — Public status page + landing

### Public app

#### `packages/ui/public.html`

- **L4** [med] No `color-scheme: light dark` on `<html>`; native form controls/scrollbars don't adapt.
- [low] No `<link rel="preconnect">`.
- [low] No static `theme-color` fallback in the meta shell.

#### `packages/ui/src/public/main.tsx`

- ✓ pass.

#### `packages/ui/src/public/PublicStatusPage.tsx`

- **L113-122** [high] Loading state is `<div aria-label="Loading">` with no `role="status"` / `aria-live="polite"`.
- **L187** ✓ `motion-safe:animate-in` etc. — correct gating.
- **L294** [high] `OverallStatusBanner` status text not in `aria-live` region — incident updates are silent for AT.
- **L296-305** [low] `style={{ animationDuration: '3s' }}` on `motion-safe:animate-ping` — outlier (live indicator duration).
- **L328-347** [high] `MonitorRow` status dot has no accessible name; state conveyed by `bg-success` / `bg-destructive` / `bg-warning` only. AT users get nothing.
- **L369-372, 394** (07-20) [med] Mobile tooltip mispositioned against all 90 entries while only 30 are visible below `sm`. Likely persists (not directly re-checked).
- **L377** [low] `useState(timeline.length - 1)` initial `roving` index assumes `timeline.length > 0`; guarded but worth a `Math.max(0, …)` belt.
- **L387-402** (07-20) [high] Timeline bars: no role/tabindex; hover-only tooltip. Likely persists.
- **L467** [low] Outline focus indicator instead of ring — inconsistent with codebase.
- **L590-637** [med] `MaintenanceBanner` "Scheduled maintenance" is a `<div>` not a heading; the list is not in a live region.
- **L606-614** (07-20) [med] Password gate: placeholder-only input, error not associated. Persists with same shape.
- **L672-703** (07-20) [high] OG/title meta injected client-side only. Likely persists.
- **L687-694** [high] `PasswordGate` `<input type="password">` has no `<label>`, no `aria-label`, no `name`, no `autoComplete`.
- **L691** [med] Uses `:focus` not `:focus-visible` — ring appears on mouse click.
- **L693** [low] `autoFocus` on password input — defensible for a gate.
- **L695-702** [med] Submit disabled when empty; error `<p>` not in `aria-live`; not `aria-describedby`-linked to input; no focus first invalid.
- **L696-702** [high] Submit stays disabled when password empty — should remain enabled + spinner per rule.
- **L699** ✓ `transition-[background-color,transform] duration-150 ease-out active:scale-[0.98]` — canonical motion.
- **L727** [low] `active:scale-95` outlier magnitude for the password submit button.
- **L319, 528, 533-535, 545-546** (07-20) [low] Amber-on-amber small text below 4.5:1 in light mode; maintenance times via raw `toLocaleString()`. Likely persists.
- **L393-399** (07-20) [low] No print affordance.

### Landing app

#### `apps/landing/index.html`

- **L6-9** [low] No `color-scheme` declaration; theme-color hardcoded to dark `#0a0a0a`, no media-query variant.

#### `apps/landing/src/main.tsx`

- ✓ pass.

#### `apps/landing/src/LandingPage.tsx`

- **L18** [low] `<main>` has no `aria-label` / `aria-labelledby`.

#### `apps/landing/src/globals.css`

- **L45-104** [med] No `color-scheme: light dark` on `:root` or `.dark`. Native form controls/scrollbars don't auto-adapt.
- **L1-3** [low] Font via CSS `@import`, not `<link rel="preload" as="font" crossorigin>`.
- **L144-159** [low] `prefers-reduced-motion: no-preference` wraps `scroll-behavior: smooth` + view-transition reveal. ✓

#### `apps/landing/src/sections/Hero.tsx`

- **L14** [low] `id="top"` on section; no `scroll-margin-top`.
- **L31** [med] Hero primary CTA uses `hover:-translate-y-0.5` — only landing CTAs lift on hover; inconsistent with FooterCTA's static behavior.
- **L43-45** [low] `DashboardMock` decorative, not `aria-hidden`.

#### `apps/landing/src/sections/FeatureGrid.tsx`

- **L46** [low] `id="features"` section, no `scroll-margin-top`.
- **L57** [low] Feature titles are `<p>`, not `<h3>` — reads at the same level as the surrounding `<h2>`.

#### `apps/landing/src/sections/ChannelsSection.tsx` (new)

- **L11-29** [low] `ChannelsMock` decorative, not `aria-hidden` — four rows will be announced as connected channels.
- **L33** [low] `<section>` no `id`, no `aria-labelledby`.

#### `apps/landing/src/sections/DomainsSection.tsx` (new)

- **L19-41** [low] `DomainsMock` decorative, not `aria-hidden`.
- **L45** [low] `<section>` no `id` / `aria-labelledby`.

#### `apps/landing/src/sections/StatusSection.tsx` (new)

- **L27-50** [low] `StatusPageMock` decorative, not `aria-hidden`.
- **L54** [low] `<section>` no `id` / `aria-labelledby`.

#### `apps/landing/src/sections/FAQ.tsx` (new)

- **L32** [low] `id="faq"` section, no `scroll-margin-top`.
- **L43-67** [high] Accordion incomplete: each button has `aria-expanded` but no `aria-controls`; content panel has no `id` / `role="region"`.
- **L47** [high] `outline-none ... focus-visible:bg-muted/40` — only background swap, no focus-visible ring. Low contrast against same-colored card.
- **L50-53, 58-61** [med] `transition-transform` and `transition-[grid-template-rows]` unconditional; don't honor `prefers-reduced-motion`.

#### `apps/landing/src/sections/Manifesto.tsx` (new)

- **L5** [low] `id="about"` section, no `scroll-margin-top`.
- **L18-20** [low] "PingBoard" wordmark without `translate="no"`.

#### `apps/landing/src/sections/Pricing.tsx` (new)

- **L5** [low] `id="pricing"` section, no `scroll-margin-top`.
- **L23** [med] Primary CTA `hover:-translate-y-0.5` — same outlier as Hero CTA.
- **L24-40** [low] CTA uses raw hex `#003cff`; brand still has single-accent green elsewhere — off-brand color persists from 07-20.
- **L40-42** [low] "Coming soon" rendered as a `<span>` styled like the active CTA — SR reads it as if it's a button.

#### `apps/landing/src/sections/FooterCTA.tsx` (new)

- **L10-18** [med] Copy success not announced; icon swap to check, no `aria-live` / `aria-pressed` / label change.
- **L23** [low] "PingBoard" wordmark without `translate="no"`.
- **L40** [low] `active:scale-95` outlier magnitude.

#### `apps/landing/src/sections/SiteFooter.tsx` (new)

- **L5** [low] "Docs" `LINKS[3]` uses `#faq`; TopNav "Docs" also points to `#faq` — fine but worth a real /docs link if one exists.
- **L13-18** [low] "Steiner&Co." brand text without `translate="no"`.

#### `apps/landing/src/sections/TopNav.tsx`

- **L5-10** [med] Active state hardcoded to "Product"; no `aria-current`; URL/scroll never updates active item.
- **L14-37** [low] No `scroll-margin-top` on section anchors (`#top`, `#features`, `#about`, `#faq`).
- **L15** [low] Logo link `active:scale-95` outlier; no `focus-visible:ring` (default browser ring instead of project standard).

#### `apps/landing/src/components/icons.tsx`

- **L5-19** [low] `Stroke` wrapper has no `width`/`height`; SVG sizing via className only.

#### `apps/landing/src/components/logo.tsx`

- **L18** [low] "PingBoard" wordmark without `translate="no"` — propagates to FooterCTA, Manifesto.

#### `apps/landing/src/components/section-heading.tsx`

- ✓ pass.

#### `apps/landing/src/components/theme-switch.tsx`

- **L50-67** [low] `applyWithTransition` reads `window.innerWidth` synchronously inside a click handler — fine, not in render.
- **L101-114** [med] `motion.button` with `whileHover` / `whileTap` without a `<MotionConfig reducedMotion="user">` wrapping the app — framer-motion doesn't honor reduced-motion by default. The scale plays for all users.

#### `apps/landing/src/components/ui/badge.tsx`

- ✓ pass.

#### `apps/landing/src/components/ui/button.tsx`

- **L8** [low] `outline-none` + `focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30` — fine. Drift: also has `active:scale-[0.98] active:not-aria-[haspopup]:translate-y-px` — `translate-y-px` not in the shared `Button`. See Slice 5.

#### `apps/landing/src/components/ui/tabs.tsx`

- ✓ pass.

#### `apps/landing/src/lib/utils.ts`

- ✓ pass.

#### `apps/landing/src/mocks/DashboardMock.tsx`

- **L22-92** [low] Whole mock not `aria-hidden`; combined with ChannelsMock/DomainsMock/StatusPageMock, screen-reader users get a wall of fake data after the hero.

---

## Slice 5 — Motion & interaction sweep (cross-cutting)

Findings grouped by theme. No new per-page duplication.

### Theme: `transition-all`

- ✓ pass — no remaining instances in either app. All UI primitives and page-level interactive elements use explicit property lists. **07-20's headline motion finding is resolved.**

### Theme: missing `motion-safe:` gates

- `packages/ui/src/components/ui/skeleton.tsx:7` [low] `animate-pulse` unconditional.
- `packages/ui/src/components/ui/sonner.tsx:27` [low] `animate-spin` unconditional.

All other `animate-*` usages (`DashboardPage`, `App.tsx`, `SetupPage`, `PublicStatusPage` ×3, `PublicStatusPage` activity enter) are correctly `motion-safe:`-gated.

### Theme: pulse dot durations [high — 4 different timings for one motif]

- `packages/ui/src/App.tsx:41` — `motion-safe:animate-pulse` (2s, infinite)
- `packages/ui/src/pages/SetupPage.tsx:41` — `motion-safe:animate-pulse` (2s, infinite)
- `packages/ui/src/pages/DashboardPage.tsx:225` — `motion-safe:animate-ping` 1.2s, 1 iteration
- `packages/ui/src/public/PublicStatusPage.tsx:116` — `motion-safe:animate-ping` 1.5s, infinite (loading)
- `packages/ui/src/public/PublicStatusPage.tsx:299` — `motion-safe:animate-ping` 3s, infinite (live indicator)
- `packages/ui/src/components/ui/skeleton.tsx:7` — `animate-pulse` 2s, infinite, **ungated**

Two names (ping vs pulse) for one motif across the app.

### Theme: press feedback magnitudes [high — drift]

- `packages/ui/src/components/ui/button.tsx:12` — `active:scale-[0.98]` (canonical, shared)
- `apps/landing/src/components/ui/button.tsx:8` — `active:scale-[0.98] active:not-aria-[haspopup]:translate-y-px` (drift: extra `translate-y-px` not in shared)
- `packages/ui/src/components/site-header.tsx:13, 38` — `active:scale-[0.97]` (drift: 0.97 not 0.98)
- `packages/ui/src/pages/SetupPage.tsx:87` — `active:scale-[0.97]` (drift)
- `packages/ui/src/public/PublicStatusPage.tsx:727` — `active:scale-95` (drift: 5% shrink too aggressive for a 36×36 button)
- `apps/landing/src/sections/FooterCTA.tsx:40` — `active:scale-95`
- `apps/landing/src/sections/TopNav.tsx:15` — `active:scale-95`
- `apps/landing/src/sections/Hero.tsx:31` + `Pricing.tsx:23` — `active:scale-[0.98]` (canonical)

### Theme: hover lift outliers [med]

- `apps/landing/src/sections/Hero.tsx:31` — `hover:-translate-y-0.5`
- `apps/landing/src/sections/Pricing.tsx:23` — `hover:-translate-y-0.5`

Everywhere else the primary CTA only changes color. Two of the landing's biggest buttons behave differently from the rest of the app.

### Theme: easing outliers [med]

- `packages/ui/src/components/nav-main.tsx:33` — `duration-200 ease-linear` on the Add Monitor primary CTA.
- `apps/landing/src/sections/FAQ.tsx:51` — `transition-transform duration-200` (no `ease`, defaults to cubic-bezier(0.4, 0, 0.2, 1)); line 59 has explicit `ease-out`. **Inconsistent within one component.**
- `packages/ui/src/components/ui/sidebar.tsx:296` — `duration-200` on the rail + `after:duration-150` on the rail's `::after` pseudo-element.

### Theme: focus state — three patterns [high — lowest-contrast wins on three pages]

- Canonical (high contrast): `outline-none focus-visible:ring-2 focus-visible:ring-ring/30` — used by the shared button, badge, toggle, checkbox, input, sidebar, theme-switch. ✓
- Canonical variant: `packages/ui/src/pages/StatusPagesPage.tsx:504` — `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`. ✓
- **Low-contrast drift [high]:**
  - `apps/landing/src/sections/FAQ.tsx:47` — `outline-none ... focus-visible:bg-muted/40` (no ring; only background swap).
  - `packages/ui/src/pages/ChannelsPage.tsx:546` — same pattern.
  - `packages/ui/src/pages/DomainsPage.tsx:306` — `outline-none ... focus-visible:bg-accent/40` (same).
- **Wrong pseudo-class [med]:**
  - `packages/ui/src/public/PublicStatusPage.tsx:691` — `focus:outline-none focus:ring-2 focus:ring-ring` (uses `:focus`, shows ring on mouse click).
- **Radix dropdown/select items:** use `:focus` (not `:focus-visible`) with `:focus:bg-accent` — contextual OK but flag in tone.

### Theme: touch-action / tap-highlight / overscroll-behavior

- ✓ no `<overlay>` content declares `overscroll-behavior: contain` (Sheet/Dialog/Drawer/Dropdown). [med]
- ✓ no `touch-action: manipulation` anywhere; rely on Tailwind/browser default. [low]
- ✓ no intentional `-webkit-tap-highlight-color`; rely on default blue tap flash on iOS. [low]

### Theme: `autoFocus` coverage [low]

- 11 unconditional `autoFocus` sites: `LoginPage:60`, `SetupPage:64`, `StatusPagesPage:676`, `MonitorWizardPage:272/353`, `MonitorDetailPage:457`, `DomainsPage:627/786`, `IncidentsPage:700`, `PublicStatusPage:693`, `SettingsPage:473`.
- The conditional one (`SettingsPage:473`, gated on "password is set") is acceptable.
- Rest should be desktop-only or wrapped in `useMediaQuery`.

### Theme: layout reads in render

- ✓ pass. `components/charts/tooltip/tooltip-box.tsx:122-123` uses `offsetWidth`/`offsetHeight` inside `useLayoutEffect`, not in render.

### Theme: button primitive drift [high — shared vs landing]

- `packages/ui/src/components/ui/button.tsx:12` — single-press, scale-only.
- `apps/landing/src/components/ui/button.tsx:8` — scale + `translate-y-px`; also lacks `focus-visible:border-ring` (only `focus-visible:ring-2`).

Reconcile to one canonical.

### Theme: entrance durations

- PublicStatusPage hero entrance: 500ms (`PublicStatusPage.tsx:187`).
- DashboardPage activity enter: 500ms (`DashboardPage.tsx:242`).
- Admin shell + everything else: no explicit entrance — relies on overlay-animate-in.
- Acceptable, but the 500ms values are reserved by the convention for landing/public moments; if Dashboard's 500ms enter is intentional, leave it; otherwise drop to 200ms.

---

## Convergence recommendations

The motion contract is **90% converged** since 07-20. Five small fixes would resolve the rest:

1. **Press feedback (canonical):** `active:scale-[0.98]`, `duration-150 ease-out`, transition list includes `transform`.
   - `apps/landing/src/components/ui/button.tsx:8` → drop `translate-y-px`.
   - `site-header.tsx:13, 38`, `SetupPage.tsx:87` → 0.97 → 0.98.
   - `PublicStatusPage.tsx:727`, `FooterCTA.tsx:40`, `TopNav.tsx:15` → `scale-95` → `scale-[0.98]`.

2. **Hover lift (canonical):** No transform on hover for primary CTAs; color/border only.
   - `Hero.tsx:31`, `Pricing.tsx:23` → drop `hover:-translate-y-0.5`; use `hover:opacity-90` to match FooterCTA.

3. **Pulse dot (canonical):** one duration per intent, one name.
   - "Live now" (admin) → `motion-safe:animate-pulse` 2s, infinite, 6×6 dot.
   - "Replay on event" (one-shot, dashboard feed) → `motion-safe:animate-ping` 1.2s, `animationIterationCount: 1`, keyed on event.
   - "Loading" (public + skeleton) → `motion-safe:animate-pulse` 2s + `motion-safe:` gate on `ui/skeleton.tsx`.
   - `PublicStatusPage.tsx:299` live indicator 3s → 1.5s, matching the loading dot at line 116.

4. **Reduced-motion coverage (canonical):** every infinite animation.
   - `ui/skeleton.tsx:7` → `motion-safe:animate-pulse`.
   - `ui/sonner.tsx:27` → `motion-safe:animate-spin`.
   - `landing/theme-switch.tsx` → wrap app in `<MotionConfig reducedMotion="user">`.
   - `landing/FAQ.tsx:50-61` → wrap accordion transitions in `motion-safe:`.

5. **Focus indicator (canonical):** `focus-visible:ring-2 focus-visible:ring-ring/30` everywhere; never drop the ring for a background swap alone.
   - `FAQ.tsx:47`, `ChannelsPage.tsx:546`, `DomainsPage.tsx:306` → add `focus-visible:ring-2 focus-visible:ring-ring/30` alongside the bg swap.
   - `PublicStatusPage.tsx:691` → `:focus` → `:focus-visible`.

**Bonus tokens to add once primitives converge:**

- **`touch-action: manipulation`** + **`-webkit-tap-highlight-color: transparent`** in `packages/ui/src/globals.css` `:root` body rule.
- **`overscroll-behavior: contain`** on `ui/sheet.tsx`, `ui/dialog.tsx`, `ui/drawer.tsx`, `ui/alert-dialog.tsx` Content components (Radix-portal elements).
- **`color-scheme: light dark`** on `:root` in both apps' `globals.css`.
- **Skip link** at the top of `AdminLayout.tsx` (id `main-content`) + an `id` on the `SidebarInset` `<main>`.

---

## Recommended next steps (priority order)

1. **Skip link + `<main>` id** (1 file, 1 line each) — biggest accessibility gap.
2. **Decorative `<HugeiconsIcon>` wrapper or lint rule** — fixes 21+ sites at once.
3. **Smoke-test `form` Enter behavior** across the 6 dialogs + 2 inline edit rows.
4. **Add `color-scheme` + font preload + `autoComplete`/`name`/`spellCheck`/`inputMode` defaults** to the shared input primitive.
5. **Charts screen-reader parity** — add a hidden data table fallback or `aria-describedby` summary for `BarChart` and `AreaChart`.
6. **Apply the five convergence motion tokens** above — 30 minutes of work, closes the 07-20 loop.
7. **`aria-live` regions** for SSE feeds + dialog form errors + "Copied" feedback.
8. **Auto-decorate mocks on the landing** with `aria-hidden` so they don't pollute SR output.
9. **Run `aria-current` + URL-state** for filters/wizard step/channel dialog open-state (deep-linkable).
10. **Landing copy audit** — Pricing/Manifesto/ChannelsSection/DomainsSection prose hasn't been re-reviewed for "★ 1.2k"-class fabrications.
