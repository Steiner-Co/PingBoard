# PingBoard UI/UX Audit — 2026-07-31 (refresh)

Re-run of the full-product design-engineering audit against the **Vercel Web Interface
Guidelines** and **Emil Kowalski's design philosophy**, verified line-by-line against
current source. This document is the index — **detail lives in the slice files**:

| Slice | File | Fixed since 07-21 | Persists | New |
|---|---|---:|---:|---:|
| 1. Admin shell + dashboard | `audits/2026-07-31/slice-1-admin-shell-dashboard.md` | 22 | 25 | 13 |
| 2. Admin forms + flows | `audits/2026-07-31/slice-2-admin-forms-flows.md` | 30 | 34 | 13 |
| 3. Admin list + detail pages | `audits/2026-07-31/slice-3-admin-list-detail.md` | 34 | 27 | 12 |
| 4. Public status page + landing | `audits/2026-07-31/slice-4-public-and-landing.md` | 42 | 8 | 10 |
| 5. Motion sweep (cross-cutting) | `audits/2026-07-31/slice-5-motion.md` | 27 | 15 | 5 |
| **Total** | | **155** | **109** | **53** |

Severities: `high` = real-user impact / blocks launch, `med` = accessible-but-not-great,
`low` = polish / consistency.

> **Status 2026-08-10 — this index is current; the slice tables are not.** All three
> remaining highs and most med clusters below are closed by commits that landed after
> the sweep: `c6e6028`, `d943daf`, `e4e2514`, `9162b30`, `58d4de7`, plus the
> data-router/field-wrapper work of 08-10. See the rewritten lists below; the slice
> files' Persists/New tables are kept as-written for line-level detail.

> **Supersedes:** the 2026-07-21 `AUDIT.md` and `AUDIT-EMIL.md` (both kept in git
> history). The Emil-lens motion audit is now Slice 5; the Emil lens is also applied
> inside every slice. The 07-21 docs proved largely stale — most of their "persists"
> tables were fixed in commits `31f9e55`, `c639bec`, `351be41` and later.

---

## Where the product stands

The structural highs from 07-21 are closed: accessible table rows (stretched link),
skip link, `aria-hidden` icon system, `QueryError` failure states on all list/form
pages, dirty-guard coverage (incl. `headersText`), SSR-injected OG meta on public
status pages, keyboard-instant sidebar, opacity-only theme switch, reduced-motion
gating repo-wide (zero ungated infinite animations).

As of 2026-08-10 the three highs this sweep left open are also closed or
deliberately reworked (below), and the biggest med clusters (dialog draft loss,
browser-Back draft loss, form-field attributes, error-masquerading) are fixed.
What remains is the long tail of med/low polish in the slice tables, plus the two
landing-side med clusters listed at the bottom.

## Remaining highs — closed

| # | Finding | Resolution |
|---|---|---|
| H1 | Public status page 500ms entrance on every visit | Fixed `c6e6028` — paints instantly |
| H2 | Landing 450ms full-screen theme wipe | Fixed `c6e6028` — instant swap, opacity-only icon crossfade |
| H3 | Sidebar pointer toggles animate layout properties | Reworked (08-09, committed `d794c0b`) — the panel now animates **transform only** (GPU); the gap sibling still transitions `width` (one layout property, synchronized tokens), and keyboard toggles snap via `data-instant` suppression. Left/right/margin/padding animation is gone. |

## Med clusters — status

- **Dialog draft loss — FIXED `e4e2514`.** ChannelDialog routes every exit (Esc,
  overlay, X, Cancel) through a guarded cancel that confirms when the form differs
  from its hydration baseline; `DialogContent`/`AlertDialogContent` cap at
  `max-h-[85vh]` with scroll.
- **Browser Back bypassing dirty guards — FIXED 2026-08-10.** The app now mounts a
  data router (`createBrowserRouter`), and `useUnsavedGuard` is built on
  `useBlocker`: sidebar links, imperative `navigate()`, and browser Back/Forward all
  confirm against a dirty form (wizard, monitor edit, status-page editor).
  Same-path navigations (wizard `?step=`) pass through; tab close/reload remains on
  `beforeunload`. The old guarded-link context machinery is deleted.
- **Form-attribute cluster — FIXED 2026-08-10.** New `FieldInput`/`FieldTextarea`
  wrappers (`components/ui/field.tsx`) default `autoComplete="off"`,
  `spellCheck={false}`, and `name` from `id` across the wizard, monitor edit,
  settings, and channel dialog — closes Slice-2 P5/P16/P22/P31/N6. N7 (SMTP port
  `NaN`) closed with `min`/`max`/`inputMode` plus a `buildConfig` range check.
- **Error masquerading as empty/not-found — FIXED `d943daf`.** Public status page
  only renders "not found" on a real 404; EditPageDialog hard-returns unless the
  form hydrated; IncidentsPage shows skeletons during initial fetch.
- **Overlay/popover clipping under root zoom — FIXED `58d4de7`.** Root `zoom: 1.1`
  double-scaled floating-ui's translate px, pushing dropdowns/selects off-screen
  near viewport edges; the popper wrapper is counter-zoomed. (Found 08-09 via QA
  sweep; not in the slice tables.)
- **Contrast regressions in landing prose — OPEN.** `text-foreground/40` at 12px
  across blog/docs (~2.3:1) and `text-foreground/50` in FeatureGrid fail 4.5:1.
- **`transition-all` regression — OPEN.** `apps/landing/src/pages/BlogIndex.tsx:72`.

### Closed by `9162b30` (slice lows/meds)

Tooltip two-stage timing restored (400ms delay), chart axis hover fade 150ms
ease-out, mobile Sheet close button, `aria-live` on the dashboard activity feed,
`Intl.RelativeTimeFormat` for relative times, press feedback unified at 0.97,
public-page loading ping 1s, FooterCTA copy-button aria-label.

## Method note

Findings only — fixes tracked in commits. Each slice file has three sections
(Fixed / Persists / New) with `path:line` and severity on every entry. Competitor
context for prioritization lives in `research/competitors/`.
