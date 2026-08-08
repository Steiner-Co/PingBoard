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

What remains is a long tail of med/low polish plus a **small set of highs**, below.

## Remaining highs (the fix list)

| # | Finding | Where | Slice |
|---|---|---|---|
| H1 | Public status page plays a 500ms slide-in entrance on **every** visit — a frequently revisited, utilitarian surface should paint instantly | `packages/ui/src/public/PublicStatusPage.tsx:192` | 4, 5 |
| H2 | Landing still runs a 450ms full-screen theme wipe — the product's largest motion on a high-frequency control | `apps/landing/src/globals.css:173-186` | 5 |
| H3 | Sidebar **pointer** toggles still animate width/left/right/margin/padding (keyboard path is already instant) | `packages/ui/src/components/ui/sidebar.tsx:233,245,307,434,499` | 1, 5 |

## Highest-leverage med clusters

- **Dialog draft loss** — Channels dialog Esc/overlay/X discards a filled form with no
  confirm (`ChannelsPage.tsx:772-778`); `DialogContent` has no viewport cap/scroll, so
  the ~10-field email channel form can push submit off-screen (`dialog.tsx:68`).
- **Browser Back bypasses all dirty guards** (no data router); the wizard's
  `replace: true` step history makes Back from step 2 silently lose the whole form
  (`MonitorWizardPage.tsx:57`).
- **Error masquerading as empty/not-found** — public status page renders "Status page
  not found" on *any* fetch failure (`PublicStatusPage.tsx:139-141`); EditPageDialog
  would PATCH blank fields if its detail query failed (`StatusPagesPage.tsx:965-967`);
  "No incidents match this filter" shows during initial fetch (`IncidentsPage.tsx:463-467`).
- **Contrast regressions in new prose** — `text-foreground/40` at 12px across
  blog/docs (~2.3:1) and `text-foreground/50` in FeatureGrid fail 4.5:1.
- **Form-attribute cluster** — one shared input wrapper would close the recurring
  missing `name`/`autoComplete`/`type`/`spellCheck` findings (Slice 2: P5/P16/P22/P31/N6/N7).
- **`transition-all` regression** — crept back into `apps/landing/src/components/blog/BlogIndex.tsx:72`.

## Method note

Findings only — fixes tracked in commits. Each slice file has three sections
(Fixed / Persists / New) with `path:line` and severity on every entry. Competitor
context for prioritization lives in `research/competitors/`.
