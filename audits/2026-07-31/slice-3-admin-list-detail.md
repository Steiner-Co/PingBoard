# Audit Sweep — Slice 3: Admin list + detail pages — 2026-07-31

Re-verification of the Slice 3 section of `AUDIT.md` (2026-07-21 refresh) and the
Slice-3-relevant `AUDIT-EMIL.md` themes against **current source**, plus a new-issue
hunt (loading-vs-empty conflation, relative-time ticking, table a11y, chart
a11y/responsiveness). Lenses: Vercel Web Interface Guidelines + Emil Kowalski design
engineering. Every entry verified at line level today.

Files covered: `packages/ui/src/pages/IncidentsPage.tsx`, `MaintenancePage.tsx`,
`StatusPagesPage.tsx`, `DomainsPage.tsx`, `MonitorDetailPage.tsx`,
`packages/ui/src/components/data-table.tsx`, `packages/ui/src/components/EmptyState.tsx`,
`packages/ui/src/components/QueryError.tsx`, `packages/ui/src/components/ui/table.tsx`,
`packages/ui/src/components/uptime-timeline.tsx`,
`packages/ui/src/components/charts/` (bar-chart, area-chart, time-series-chart-shell,
chart-data-table, chart-formatters, tooltip/chart-tooltip, x-axis),
`packages/ui/src/hooks/use-now.ts`, `packages/ui/src/components/ui/icon.tsx`,
`packages/ui/src/lib/utils.ts`.

Headline: the slice has been **substantially reworked since 07-21** — query-error
states, `<form>` wrappers, icon `aria-hidden` (via a new `Icon` wrapper), ticking
relative time (`useNow`), and a screen-reader chart fallback (`ChartDataTable`) all
landed. Remaining pain concentrates in: chart interaction still mouse-only, the new
`ChartDataTable` having a self-defeating `role="img"`, three loading-vs-empty
conflations, and unlabeled inline note inputs.

Counts: **Fixed 34 · Persists 27 · New 12**

---

## Fixed (verified at line in current source)

### Pre-confirmed by hand today — re-confirmed

1. **`<TableRow onClick={navigate}>` anti-pattern — FIXED.** `components/data-table.tsx:299-301`
   renders a plain `TableRow` with no `onClick`; navigation is a stretched link
   (`after:absolute after:inset-0`) in `TableCellViewer` at `data-table.tsx:426-431`.
   Keyboard-focusable, right-clickable, no nested-interactive conflict. The actions
   cell `stopPropagation` at `data-table.tsx:306-310` is now harmless dead code (see New #12).
2. **Query errors rendered as empty states — FIXED on all four flagged pages.** All
   now render the shared `QueryError` (`components/QueryError.tsx:19-43`, with
   `role="alert"` + retry): `IncidentsPage.tsx:297-306`, `MaintenancePage.tsx:75-85`,
   `StatusPagesPage.tsx:198-199`, `DomainsPage.tsx:201-207`.

### IncidentsPage.tsx

3. Inline note-edit row is now a real `<form onSubmit>` with `type="submit"` Save —
   `IncidentsPage.tsx:687-714` (was onClick-only; Enter now saves).
4. Decorative dot separators are `aria-hidden` — `IncidentsPage.tsx:587,593`.
5. All decorative icons go through the new `Icon` wrapper
   (`components/ui/icon.tsx:38-60`), which sets `aria-hidden="true"` by default —
   e.g. filter-empty Magnifier `IncidentsPage.tsx:465`, Pen `IncidentsPage.tsx:727`,
   Resolve CheckCircle `IncidentsPage.tsx:739`. (Was 21+ un-hidden Hugeicons instances.)
6. Relative durations/buckets now tick: page-level `useNow()` (`IncidentsPage.tsx:271`)
   feeds `computeAnalytics(all, now)` (`:295`), and each row re-derives open-incident
   duration from a per-row `useNow()` (`:621,651`). Shared 30s ticker in
   `hooks/use-now.ts:1-38`. Was "snapshot render".
7. `valueSuffix`-style drift — n/a here, but the duplicated StatCell now documents its
   divergence deliberately (`IncidentsPage.tsx:492-495`).

### MaintenancePage.tsx

8. Window-row delete button: icon via `Icon` (aria-hidden) **and** an explicit
   `aria-label={`Delete ${w.title}`}` — `MaintenancePage.tsx:566-574`. (Was announced
   icon, no name.)
9. Proper `isLoading` skeleton branch added, distinct from both error and empty —
   `MaintenancePage.tsx:87-107`. (Was loading → flashed empty state.)
10. Active/upcoming bucketing now ticks via `useNow()` — `MaintenancePage.tsx:58-73`;
    countdowns re-render on the shared clock (`:241-255` comment, `:515-519`).

### StatusPagesPage.tsx

11. Loading skeleton distinct from error/empty — `StatusPagesPage.tsx:200-201,362-387`.
12. All three dialogs are now `<form onSubmit>` with labeled fields — PasswordDialog
    `:636-659`, PageDialog `:723-835`, EditPageDialog `:968-1104`. Enter submits
    everywhere. (Was six onClick-submit surfaces.)
13. Form errors are `role="alert"`/`aria-live` and associated via
    `aria-invalid`/`aria-describedby` — `StatusPagesPage.tsx:740-741,822-826` and
    `:1086-1095`. (Was bottom-of-form `<p>`, silent.)
14. Dropdown/menu icons all via `Icon` (aria-hidden) — e.g. `:462,467,477-481,485,495`.
15. `valueSuffix` now inside the `tabular-nums` group — `StatusPagesPage.tsx:351-355`.
16. Coverage banner list is semantic `<ul>/<li>` — `StatusPagesPage.tsx:561-596`.

### DomainsPage.tsx

17. Expand-row focus: `focus-visible:ring-2 focus-visible:ring-ring/30` added on top of
    the background change — `DomainsPage.tsx:369`. (Was `outline-none` + bg-only.)
18. Expand-row uses a real `<button aria-expanded>` — `DomainsPage.tsx:365-369`, and
    all row icons via `Icon` (`:371-374,380`).
19. AddDomainDialog: `<form>` + `name`/`autoComplete="off"`/`autoCapitalize="none"`/
    `spellCheck={false}`/`aria-invalid`/`aria-describedby` on the domain input —
    `DomainsPage.tsx:684-706`; error is `role="alert" aria-live` — `:765-774`.
20. EditDetailsDialog: `<form>`, labeled `DatePicker`s, error `role="alert"
    aria-live`, unconditional autoFocus removed — `DomainsPage.tsx:871-943`.
21. Query-error and skeleton states — `DomainsPage.tsx:200-207,973-1003`.

### MonitorDetailPage.tsx

22. Overflow menu no longer duplicates the visible Edit button — only Delete remains,
    `MonitorDetailPage.tsx:193-222`.
23. 500ms hover-gradient stat cards gone; stat panel is static —
    `MonitorDetailPage.tsx:226-254`.
24. Incident-note inline edit is a `<form>` with `type="submit"` —
    `MonitorDetailPage.tsx:477-504`.
25. Maintenance schedule dialog: labeled title/description/start/end fields, `<form>`,
    `role="alert"` error — `MonitorDetailPage.tsx:745-826`. The old "Schedule toggles
    an un-animated inline form" (AUDIT-EMIL) is moot — it's a Dialog now.
26. Window rows use shared `formatDateTimeRange` (was raw `toLocaleString()`) —
    `MonitorDetailPage.tsx:700`; delete button has `aria-label={`Delete ${w.title}`}`
    — `:711`.
27. `useNow()` + `formatRelative` drive a ticking "Last check … ago" —
    `MonitorDetailPage.tsx:111,251`; maintenance active/past bucketing ticks (`:652,678-679`).
28. Loading skeleton + error-with-retry states exist — `MonitorDetailPage.tsx:115-130,833-861`.
29. 90-day `UptimeTimeline` (used at `MonitorDetailPage.tsx:264-268`) is now fully
    keyboard-accessible: `role="group"` with instructions, roving tabindex, arrow/Home/End
    nav, per-bar `aria-label` — `components/uptime-timeline.tsx:89-119`.

### Charts

30. **Screen-reader fallback landed.** New `components/charts/chart-data-table.tsx`
    renders an sr-only `<table>` with `<caption>`; wired into both chart roots —
    `bar-chart.tsx:702-714`, `area-chart.tsx:235-247` (AreaChart covers
    `time-series-chart-shell.tsx`, whose svg stays `aria-hidden` at `:654`). The 07-21
    [high] "chart data unreachable" is closed. (But see New #1 — the fallback has a
    `role="img"` bug, and Persists #25-27 for interaction.)
31. Axis ticks no longer carry seconds: span-aware `formatAxisDate` (HH:MM for ≤24h) —
    `charts/chart-formatters.ts:10-30`, consumed at `time-series-chart-shell.tsx:401-407`.
32. Tooltip now has a date title (`weekdayDateFmt`) — `charts/tooltip/chart-tooltip.tsx:243-253`;
    the date-pill tracker carries the HH:MM label.

### Cross-cutting

33. **All decorative icons hidden app-wide** via `components/ui/icon.tsx:48-50`
    (default `decorative=true` → `aria-hidden`). Closes the Slice-3 instances of the
    07-21 cross-cutting [high].
34. `EmptyState` icon wrapper is `aria-hidden` — `components/EmptyState.tsx:28-33`.
    (Was flagged at `:28`.)

---

## Persists (still present, verified at line today)

### IncidentsPage.tsx

1. [low] Literal `→` (U+2192) in prose — `:301,312,329` ("Every down → up") and
   `:344` ("Filter the table →"). Typography drift; use an arrow icon or `&rarr;` consistently.
2. [low] Filter held in local state, not URL — `:270`. Back/forward and refresh lose it.
3. [low] Incidents `<Table>` has no `<TableCaption>` — `:469-485` (`TableCaption`
   exists, `ui/table.tsx:89-100`, unused everywhere).
4. [med] Inline note `<Input>` has no `<label>`/`aria-label` — placeholder
   "Add a note…" only, `:694-702`. (Rated [high] 07-21; the surrounding `<form>` +
   context mitigate, keeping [med].)
5. [low] Flapping badge tooltip is `title`-only — no keyboard/touch path, `:605-613`.
6. [low] "(manual)" parens inside the Resolved badge — `:672-674`. Scannability nit.
7. [low] "Open now" StatCell toggle is a `<button>` (:551-556) but doesn't expose its
   pressed state (`aria-pressed`); the sub-text change ("Showing open only") partially
   conveys it — `:339-350`.

### MaintenancePage.tsx

8. [med] Timeline bars are still `<div title={…}>` — not focusable, no `role`/`aria-label`;
   the tooltip (window + monitor + range) is hover-only, `:378-399`. Adjacent label
   spans (`:400-413`) carry the title text but not the date range. AT gets almost
   nothing from the visualization.
9. [low] (Emil) Bars snap between data refreshes — `left`/`width` update with no
   transition, `:386-392`. "Preventing jarring changes" is a named animation purpose.

### StatusPagesPage.tsx

10. [low] N+1 `useQueries` fan-out per page — `:119-124`. Now commented as deliberate
    (doubles as edit-dialog cache warm); bounded by page count. Acceptable, still unbatched.
11. [low] PageRow list is a flat `<div className="divide-y">`, not `<ul>/<li>` — `:253-286,407`.
    (CoverageBanner got `<ul>`; the main list didn't.)
12. [low] "Copied" feedback swaps sr-only text but has no `aria-live` — `:518,532`.
    The button's `aria-label` is static, so the state change is never announced.
13. [low] "Move up"/"Move down" `aria-label`s lack the monitor name — `:1034,1050`.
    N identical pairs in one dialog.
14. [med] Group `<Input>` is placeholder-only, no `<label>`/`aria-label` — `:1063-1068`.
15. [low] PasswordDialog submit stays `disabled` until `password.trim()` — `:655`.
    Vercel rule: keep enabled, surface the error inline.
16. [low] Slug input missing `autoComplete="off"`/`spellCheck={false}` — `:733-742`.
17. [low] Page row titles are `<span>`, not headings — `:410`; heading outline skips
    from panel `<h2>`s straight to nothing.

### DomainsPage.tsx

18. [low] Search input has `aria-label` but no `type="search"`, `name`, or
    `autoComplete="off"` — `:257-263`; search state not in URL — `:146`.
19. [low] `Stat` `tone="muted"` maps to `text-foreground` — both branches identical at
    `:597-602`. Reads as a real bug (muted never mutes), and it's the drift the
    duplicated-StatCell theme predicted.
20. [low] `EditableFact` "edit" button doesn't name which fact it edits — `:454-460`.
21. [low] Registrar input missing `spellCheck={false}` — `:898-904`.
22. [low] `EmptyDomains` still re-implements shared `EmptyState` — `:949-971`.

### MonitorDetailPage.tsx

23. [med] Inline incident-note `<Input>`: no `<label>`/`aria-label`, placeholder only —
    `:484-492`. Same gap as IncidentsPage #4.
24. [med] `TagInput` wrapper has an `id` but no associated `<label>` — `:362`.
25. [med] Schedule-window submit has **no End > Start client validation** and force-
    unwraps `startsAt!.toISOString()`/`endsAt!.toISOString()` — `:636-649`. If a
    `DateTimePicker` is cleared to `undefined`, submit throws instead of showing an error.
26. [low] Generic "Edit" label for tags (should be "Edit tags") — `:404-407`; italic
    ghost "Add a note…" affordance — `:514-515`; Resolved/Duration cells lack
    `tabular-nums` (Started has it) — `:455,467`.
27. [low] Hand-rolled error block instead of shared `QueryError` — `:116-130`
    (functional, inconsistent; also the only page whose error UI differs).

### Charts (post-ChartDataTable)

25–27 renumber: continuing.

28. [med] Chart interaction is mouse-only — `onMouseMove`/`onMouseLeave` on the `<g>`,
    `bar-chart.tsx:637-641`; no keyboard way to inspect a single bar/point. The sr-only
    table helps AT but sighted keyboard users still can't read exact values.
29. [low] Tooltip/crosshair SVGs remain `aria-hidden` with no `role="tooltip"` —
    `tooltip/chart-tooltip.tsx:260,289,316-341`. Mitigated by #30-fixed, not closed.
30. [low] `touchAction: "none"` on the AreaChart root blocks pinch-zoom on mobile —
    `area-chart.tsx:233`.

### Table primitives

31. [low] `TableHead` renders `<th>` without `scope="col"` — `ui/table.tsx:66-77`.

### AUDIT-EMIL themes (slice-3 instances)

32. [med] Four near-identical `StatCell`/`Stat` copies — `IncidentsPage.tsx:496-558`,
    `MaintenancePage.tsx:579-621`, `StatusPagesPage.tsx:311-360`,
    `DomainsPage.tsx:586-614`. DomainsPage #19 is the concrete damage.
33. [low] Offender rows render synchronously on data arrival; no stagger/fade —
    `IncidentsPage.tsx:435-437`. (First-paint-of-data moment per Emil.)

---

## New (not in either prior audit)

1. [med] **`ChartDataTable` defeats itself with `role="img"`.** The sr-only wrapper is
   `<div role="img" aria-label={caption}>` — `charts/chart-data-table.tsx:28`. Per ARIA,
   children of `role="img"` are presentational, so many screen readers will announce
   only the caption ("Bar chart data") and flatten/skip the actual `<table>` inside.
   Fix: drop `role="img"`, keep the sr-only table + caption (optionally `role="figure"`).
2. [med] **IncidentsPage conflates loading with "no matches".** Only `isError` and
   `(!isLoading && empty)` short-circuit (`IncidentsPage.tsx:297-321`); during the
   initial fetch the table panel renders "No incidents match this filter." with a
   search icon (`:463-467`) and "0 open · 0 total" (`:449`) — on an uptime product,
   a transient lie. Add a skeleton branch like MaintenancePage's.
3. [med] **MonitorDetailPage maintenance list conflates error/loading with empty.**
   `windows = list.data?.windows ?? []` (`:651`) → a failed or in-flight
   `['maintenance', id]` query renders "No maintenance windows scheduled." (`:669-672`)
    — no skeleton, no `QueryError`.
4. [med] **EditPageDialog ignores detail-query failure.** `detail.isLoading` shows
   "Loading…" but `detail.isError` falls through to the form with empty/blank fields
   (`StatusPagesPage.tsx:965-967`); saving would PATCH a title of `page.slug` over
   the real one (`:912`).
5. [low] **timelineQuery error = perpetual skeleton.** If
   `/timeline` fails, `timelineQuery.data` stays undefined and the `Skeleton` renders
   forever — `MonitorDetailPage.tsx:264-271`.
6. [med] **ChartDataTable stringifies raw values.** `String(v)` over
   `Object.entries(row)` — `area-chart.tsx:239-245`, `bar-chart.tsx:706-712` — turns
   `Date` x-values into "Mon Jul 21 2026 02:00:00 GMT+0200 (Central European Summer
   Time)" read aloud per row, and IncidentsPage rows carry both `label` and `full`
   (redundant columns). Format values before handing them over.
7. [low] **Hardcoded/generic chart captions.** BarChart captions everything "Bar chart
   data" (`bar-chart.tsx:704`); AreaChart hardcodes "Response time chart"
   (`area-chart.tsx:237`) regardless of caller (fleet-chart on the dashboard is not
   necessarily response time). Take `caption`/`summary` as props.
8. [low] **data-table row affordance lie.** Rows keep `cursor-pointer`
   (`data-table.tsx:301`) but only the stretched name link is clickable; clicking
   other cells does nothing. Either drop the cursor or keep the pointer only via the link.
9. [low] **Dead stopPropagation.** `data-table.tsx:306-310` guards against a row
   `onClick` that no longer exists — remove.
10. [low] **ExpiryValue absolute date is hover-only.** The "N days" label carries the
    real date only in `title` — `DomainsPage.tsx:119-124`. Keyboard/touch users can't
    reach it; the same pattern the Flapping badge was flagged for.
11. [low] **`useNow()` called for side effects** — `MonitorDetailPage.tsx:111` (return
    value unused; it works because it forces the 30s re-render that re-evaluates
    `formatRelative` at `:251`, but nothing in the call site says so beyond the
    comment; a `useNowTick()`-style named export would make the intent type-check).
12. [low] **MonitorDetailPage is the only slice page without `QueryError`** (see
    Persists #27) — listed here as the consistency gap: five pages, four patterns
    converged, one hand-rolled (`:116-130`).

---

## Notes on the 07-21 persists table (AUDIT.md:41-56), slice-3 rows

- Row 41 (`<TableRow onClick>`): **now FIXED** — see Fixed #1. Slice 1 should re-verify its [high].
- Row 43/51 (errors as empty states): **now FIXED** for Incidents/Maintenance/StatusPages
  (and Domains); MonitorDetail has its own error block. MonitorWizard/MonitorEdit/
  SettingsPage are other slices' to confirm.
- Row 44 (relative times don't tick): **converged for this slice** — `useNow` ticks
  IncidentsPage, MaintenancePage, DomainsPage, MonitorDetailPage. The "Improved, not
  converged" verdict no longer applies here.
