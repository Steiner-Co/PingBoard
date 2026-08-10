# Audit Sweep — Slice 2: Admin forms + flows (2026-07-31)

> **2026-08-10 update:** the Persists/New tables below are as-written at sweep time.
> Several entries were closed by later commits (`c6e6028`, `d943daf`, `e4e2514`, `9162b30`,
> `58d4de7`, and the 08-10 data-router/field-wrapper work) — the commit-to-finding map
> lives in the root `AUDIT.md` 'Status 2026-08-10' section, which is the current truth.

Re-verification of AUDIT.md (2026-07-21) "Slice 2 — Admin forms + flows" and its Persists-table
rows against **current source**, plus a hunt for new form issues. Lenses: Vercel Web Interface
Guidelines + Emil Kowalski design-engineering skill. Paths relative to `packages/ui/src/` unless
noted. Severities: `high` = real-user impact, `med` = accessible-but-not-great, `low` = polish.

**Headline: 30 fixed, 34 persists (mostly downgraded low), 13 new. 0 remaining `high`.**
The two hand-verified fixes (headersText dirty comparison, QueryError error states) are confirmed
at line level below. The slice has been heavily reworked since 07-21: per-field `aria-invalid`/
`aria-describedby` + focus-first-invalid is now the dominant pattern, the dirty-guard context is
real and wired into the shell, and destructive actions (retention, SMTP password, token revoke,
channel delete) all confirm.

---

## Fixed (verified at line in current source)

### Cross-cutting / hand-verified confirmations

- **`headersText` dirty-comparison trap [was high] — FIXED.** Baseline now includes `headersText`
  (`pages/MonitorEditPage.tsx:105`, type at `:121`) and `isDirty` compares it (`:135`). Editing
  only HTTP headers now flips `isDirty`, enables Save, and arms the guard.
- **QueryError error states — FIXED.** Shared `components/QueryError.tsx:19-43` exists with
  `role="alert"` (:22) and a real `Button` retry (:38-40). Consumed by wizard
  (`pages/MonitorWizardPage.tsx:401-405`), edit page (`pages/MonitorEditPage.tsx:807-811`),
  settings SMTP (`pages/SettingsPage.tsx:395-406`) and channels (`pages/ChannelsPage.tsx:174-182`).
- **Decorative icons leak names to AT [was cross-cutting high] — FIXED for this slice.** New
  `components/ui/icon.tsx:48-50` defaults `aria-hidden="true"`; every former `HugeiconsIcon` site
  in this slice now routes through `Icon` (e.g. `pages/SetupPage.tsx:90-93`,
  `pages/ChannelsPage.tsx:147,370,374,383`, `components/ui/checkbox.tsx:25`,
  `components/ui/sonner.tsx:18-27`, `components/ui/select.tsx:56,124,161,179`).

### `pages/LoginPage.tsx`

- "Login failed" gave no corrective next step [low] — **FIXED.** Reset-password hint with the
  exact `docker exec` command at `LoginPage.tsx:87-93`.
- Error announcement [implicit in 07-21 ruleset] — **FIXED.** `role="alert"` error slot with
  `aria-invalid`/`aria-describedby` on both fields and focus returned to email on failure
  (`LoginPage.tsx:26-29, 55-56, 70-71, 77-83`). `autoComplete="username"/"current-password"`
  present (:54, :69).

### `pages/SetupPage.tsx`

- Visibility-toggle icon not `aria-hidden` [low] — **FIXED** via `Icon` (`SetupPage.tsx:90-93`).
- `active:scale-[0.97]` magnitude outlier [low] — **FIXED by convergence.** The shared Button base
  now uses `active:not-aria-[haspopup]:scale-[0.97]` (`components/ui/button.tsx:12`), so 0.97 is
  the product-wide press magnitude, not an outlier.
- "Setup failed" fallback had no next step [low] — **FIXED.** Recovery hint ("recovery needs
  shell access to the container") at `SetupPage.tsx:112-115`; `role="alert"` + `aria-invalid`/
  `aria-describedby` at `:60-61, 117-123`.

### `pages/MonitorWizardPage.tsx`

- Wizard step held only in local state [low] — **FIXED.** Step is a `?step=` search param with
  clamping (`MonitorWizardPage.tsx:49-58`); deep-linkable.
- Enter key dead on single-input step, no `<form>` [med] — **FIXED.** Whole wizard is a
  `<form onSubmit={handleFormSubmit}>` (:237); Enter advances/validates like the footer button
  (:192-209).
- Loose heading hierarchy [low] — **FIXED.** Real page `<h1>` (:239), per-step `<h2>` (:256),
  plus an sr-only `aria-live` step announcer (:249-251).
- No dirty guard on Cancel/Back [med] — **FIXED.** `useUnsavedGuard(isDirty, confirmDiscard)`
  (:155) + `beforeunload` (:156-164) + `guardedNavigate` for in-app exits (:231-234, :465).
  Shell side is real: `components/guarded-link.tsx:31-49` intercepts sidebar nav and is used by
  `components/nav-main.tsx:68` and `components/app-sidebar.tsx:58`.
- TagInput silently swallowed invalid/17th tag [med] — **FIXED.** `rejected` state with
  `role="alert"`, `aria-invalid`, red ring, auto-clear timer (:534-616); 16-tag cap with a spoken
  message (:555-558).
- Failed `channelsQuery` rendered a misleading empty step [med] — **FIXED** via `QueryError`
  (:401-405) plus an explicit empty branch with an "Add a channel" escape (:406-417).

### `pages/MonitorEditPage.tsx`

- Dirty guard referenced-but-not-invoked [med] — **FIXED.** `useUnsavedGuard` + `beforeunload`
  (:163-177); Cancel/Back route through `guardedNavigate` (:303-306, :314, :461).
- Submit validation as one bottom paragraph, no `aria-invalid`/`aria-describedby`, no focus [med]
  — **FIXED.** `errorField` state drives per-field `aria-invalid`/`aria-describedby`
  (:342-343, :354-355, :397-398, :570-571) and focuses the first invalid field (:208-231, :245).
- HTTP-headers parse error not associated with the textarea [med] — **FIXED**
  (`aria-describedby="http-headers-error"`, `role="alert"`, focus on failure :570-583, :241-247).
- Failed channels query rendered "No channels yet" [med] — **FIXED** (`ChannelsCard` error branch
  :807-811).
- Initial loading text without `role="status"` [low] — **FIXED** (skeleton placeholder :264-281).

### `pages/SettingsPage.tsx`

- **Destructive retention dropdown auto-saved [was high] — FIXED.** Lowering retention now opens
  a destructive confirm explaining aggregation/deletion (`SettingsPage.tsx:286-297`); raising
  stays instant by design (:283-285).
- SMTP query failure left a blank editable form [med] — **FIXED** (`QueryError` branch :395-406).
- Retention query failure unrepresented [med] — **FIXED** (select disabled + "Unavailable"
  placeholder + Try again :316-319, :333-344).
- SMTP password wipe trap / sentinel detail [from Persists table] — **FIXED.** Sentinel
  `__set__` (:41), save-never-wipes logic (:439-449), explicit confirmed "Remove saved password"
  (:516-534).
- SMTP password auto-focus on reveal [low] — **FIXED by flow.** Reveal now requires an explicit
  "Change" click (:549-552), so the autoFocus (:501) follows a user action.
- Validation as plain paragraphs [med] — **FIXED for errors.** `role="alert"` on Account (:235),
  SMTP (:576), tokens (:716); token name has `aria-invalid`/`aria-describedby` (:704-705).
- Manual numeric formats [low] — **Mostly FIXED** (`toLocaleString()` for heartbeats :106).
- `Date.now()` during render [low] — **FIXED/moot.** `useNow()` (:97) ticks the uptime row; the
  app is client-rendered, so the SSR-hydration concern doesn't apply.

### `pages/ChannelsPage.tsx`

- Footer Cancel skipped `reset()`, drafts reappeared [med] — **FIXED.** `cancel()` resets and
  every exit path (Esc/overlay/X/Cancel) routes through it (`ChannelsPage.tsx:772-778, 858`).
- Server errors rendered without `aria-live` [low] — **FIXED** (`role="alert"` :852-855) and
  per-field errors get `role="alert"` + focus (:755-765, 806-810, 897-906).
- Dialog submits via `onClick`, Enter dead [med, cross-cutting] — **FIXED.** Dialog body is a
  real `<form onSubmit={handleSubmit}>` (:792).

### Primitives

- `components/ui/skeleton.tsx` unconditional `animate-pulse` [low] — **FIXED**
  (`motion-safe:animate-pulse`, skeleton.tsx:7).
- `components/ui/sonner.tsx` decorative icons + unconditional spin [low×2] — **FIXED**
  (`Icon` aria-hidden :18-21; `motion-safe:animate-spin` :25).
- `components/ui/dialog.tsx` icon-only close had no accessible name [low] — **FIXED**
  (`sr-only` "Close" inside the button, dialog.tsx:82 — a valid accessible name).
- `components/ui/tooltip.tsx` 150ms duration outlier [low] — **FIXED by tokens** (now
  `--motion-overlay-in/out`, tooltip.tsx:45).
- `components/ui/checkbox.tsx` check icon not `aria-hidden` [low] — **FIXED** (checkbox.tsx:25).
- `components/ui/select.tsx` scroll-button icons not `aria-hidden` [low] — **FIXED**
  (select.tsx:161, 179 via `Icon`).
- `components/ui/input.tsx` ref swallowing (blocked programmatic focus) — **FIXED.** `Input` and
  `Textarea` are `forwardRef` now (input.tsx:8, textarea.tsx:8) — used by Login/Setup/Edit.

---

## Persists (verified still present; severities re-scored where the ground shifted)

### `pages/LoginPage.tsx` / `pages/SetupPage.tsx`

- **P1 [med]** No semantic `<h1>` on the standalone auth pages. `CardTitle` still renders a
  `<div>` (`components/ui/card.tsx:40-48`), so Login (`LoginPage.tsx:41`) and Setup
  (`SetupPage.tsx:43`) have no heading at all. `CardTitle` needs an `as` prop or these pages a
  real `<h1>`.
- **P2 [low]** Email inputs don't disable spellcheck (`LoginPage.tsx:49-61`,
  `SetupPage.tsx:54-66`). `spellCheck={false}` still absent.
- **P3 [med]** Setup password-strength hint has no `aria-live`; the "N more characters needed"
  countdown (`SetupPage.tsx:96-111`) changes on every keystroke but is only exposed via
  `aria-describedby` (:76), which isn't re-announced while typing.

### `pages/MonitorWizardPage.tsx`

- **P4 [low]** Focus moved to `<h2 className="outline-none">` on step 2 (:170, :256) with no
  focus-visible replacement. Mitigated by the sr-only step announcer (:249-251) — downgraded
  from med.
- **P5 [med]** Wizard inputs omit `name`/`autoComplete="off"`: target (:271-282), display name
  (:352-363), tag draft input (:587-610). Password-manager/autofill heuristics will misfire on
  "Display name" especially.
- **P6 [low]** Placeholders don't end with `…`: every `targetPlaceholder` variant (:725-743),
  monitor-name fallback `'My monitor'` (:354).
- **P7 [low]** Async test result inserted without a live region: `TestResultRow` (:343, :621-646)
  appears silently. Failure path is toasted (sonner announces), success path is not. Downgraded
  from med.
- **P8 [low]** Channel-picker rows are hover-only, no `focus-within` on the compound `<label>`
  hit target (:423-428). Same pattern duplicated on the edit page (`MonitorEditPage.tsx:823-828`).
- **P9 [low]** Long channel names: `flex-1` without `min-w-0`/`truncate` (:440-442).
- **P10 [low]** Cancel/Back still button-onclick-navigate (:460-472) — no middle-click/open-in-
  new-tab. Mitigated: it's now dirty-guarded.
- **P11 [low]** Per-tag length still unbounded; `Badge` clips with `overflow-hidden` +
  `whitespace-nowrap` (`components/ui/badge.tsx:8`). A 200-char tag is accepted and silently
  clipped. (Count cap fixed; length cap not.)
- **P12 [low]** Tag draft input omits `spellCheck={false}` (:587-610).

### `pages/MonitorEditPage.tsx`

- **P13 [low]** Detail-load failure block has no `role="alert"` and its "Try again" is a bare
  underlined text button with no hover/active styling (:285-294) — inconsistent with the
  `QueryError` component used everywhere else on this very page (:807-811).
- **P14 [low]** Back/Cancel still button-onclick-navigate (:310-319, :458-464). Guarded now, but
  not links.
- **P15 [low]** `<h1>Edit {monitor.name}</h1>` (:322) — unbounded user string, no
  truncation/`text-wrap`.
- **P16 [med]** Form fields omit `name`/`autoComplete`/`spellCheck={false}` throughout: general
  (:337-413), HTTP config incl. JSON textareas (:544-648), TCP (:693-705), DNS (:759-774). The
  headers/body JSON textareas will get browser spellcheck squiggles.
- **P17 [med]** Save still hard-disabled when `!isDirty` (:465: `disabled={save.isPending ||
  !isDirty}`). The 07-21 rule was "stay enabled, rely on the spinner". (Defensible either way —
  but unchanged since flagged.)
- **P18 [low]** Placeholders not in `…` form: :554, :591, :602, :622, :646, :763, :773.
- **P19 [low]** Channel rows: unbounded `.map()` (:820-846), hover-only rows (:823-828).

### `pages/SettingsPage.tsx`

- **P20 [med]** No dirty guard on Account / SMTP / API-token forms — `useUnsavedGuard` is never
  imported here; a half-typed SMTP form is lost on sidebar nav. The infrastructure exists
  (`contexts/unsaved-changes.tsx`) but this page never opts in.
- **P21 [low]** Manual byte formatting instead of `Intl.NumberFormat` (:75-85).
- **P22 [med→low]** Field attributes still missing: `smtp-from` lacks `type="email"` (:561-566);
  `smtp-host`/`smtp-user` lack `spellCheck={false}` (:465-489); account password inputs lack
  `name` (:206-232). autoComplete is otherwise in good shape (:209, :219, :229, :488, :500).
- **P23 [low]** Submit buttons still pre-disabled: Account requires all three fields filled
  (:242); SMTP requires `touched` (:581) — instead of submit-time validation messaging.
- **P24 [low]** SMTP placeholders without `…` (:469, :479, :565).
- **P25 [low]** `Label htmlFor="smtp-pass"` (:492) dangles in the saved-password branch — the
  rendered readOnly input has `aria-label` but no `id` (:539-544), so the visible label isn't
  clickable there.
- **P26 [low]** API-token list still an unbounded `.map()` (:737).

### `pages/ChannelsPage.tsx`

- **P27 [low]** Dialog open/edit state is local (`useState`, :106-107) — not deep-linkable.
- **P28 [med]** Closing the dialog (Esc / overlay / X / Cancel) discards a filled form with **no
  draft confirmation** (:772-778). The draft now resets cleanly (that half is fixed), but a
  10-field email-channel form can still be lost to a stray Esc. `useConfirm` is already in scope
  on this page.
- **P29 [low]** "Couldn't load monitors… Retry" bare underlined button, no hover/active (:475).
- **P30 [low]** Edit-dialog title interpolates an unbounded channel name without truncation
  (:782: `Edit ${editing!.name}`).
- **P31 [med]** Channel fields omit `type`/`autoComplete`/`name`: `ch-url` no `type="url"`
  (:912-918), `ch-to` no `type="email"` (:970-976), `ch-server` (:943-949), no `name` anywhere in
  `ConfigFields` (:908-1011).
- **P32 [low]** Placeholder `…` drift remains: :804, :947, :974, :990, :1005. (Webhook
  placeholders :916, :931 now comply.)
- **P33 [med]** Channel-type `<Label>` has no `htmlFor` and the `SelectTrigger` has no `id`
  (:813, :822) — the label is decorative text, not an association.
- **P34 [low]** Unbounded `.map()`s for channel list and routing gaps (:275, :540).

### Primitives

- **P35 [med]** `DialogContent` and `AlertDialogContent` have no viewport-height limit, vertical
  scroll, or `overscroll-behavior: contain` (`components/ui/dialog.tsx:68`,
  `components/ui/alert-dialog.tsx:60`). The email-variant channel dialog has ~10 fields — on a
  short viewport the footer submit can render off-screen with no way to reach it.
- **P36 [med]** `CardTitle` always renders a `<div>` (card.tsx:40-48) — root cause of P1; no `as`
  prop.
- **P37 [low]** Overlay/content **fade** animations not motion-gated (only zoom/slide are):
  dialog.tsx:46,68; alert-dialog.tsx:42,60; select.tsx:74; tooltip.tsx:45.
- **P38 [low]** No `touch-action: manipulation` on Button (button.tsx:12), Input (input.tsx:16),
  Checkbox (checkbox.tsx:16); no intentional `-webkit-tap-highlight-color` anywhere.
- **P39 [low]** `SelectTrigger` has a dark-mode hover but no light-mode hover (select.tsx:49).
- **P40 [low]** `TooltipProvider` defaults `delayDuration={0}` (tooltip.tsx:9) — Emil's
  "skip-delay is inverted" theme persists: every tooltip is instant, so stray hover sweeps fire
  tooltips. (Flagged for Slice 5; recorded here because tooltip.tsx sits in this slice's scope.)

---

## New (not in any prior audit)

- **N1 [med]** Browser Back bypasses every dirty guard. The guard stack covers shell nav
  (`GuardedLink`) and tab close (`beforeunload`), but React Router POP navigations are
  uninterceptable without a data router — acknowledged in `contexts/unsaved-changes.tsx:23-27`
  and `MonitorEditPage.tsx:163-166`. The wizard makes it worse: `setStep` uses
  `setSearchParams(next, { replace: true })` (`MonitorWizardPage.tsx:57`), so Back from step 2
  leaves the wizard entirely (no intermediate step entries) and three steps of input vanish with
  no confirm. Either `push` step history or migrate to `createBrowserRouter` + `useBlocker`.
- **N2 [med]** Success feedback is invisible to screen readers on Settings: "Password updated."
  (`SettingsPage.tsx:236-238`) and "SMTP defaults saved." (:577-579) render as plain paragraphs
  with no `role="status"`. The error siblings have `role="alert"`; success should match.
- **N3 [low]** "Copied" state on the token-secret Copy button (`SettingsPage.tsx:683`) is a
  silent text swap — no live region, no toast. Same class of miss as N2.
- **N4 [low]** `CheckboxField` on the edit page is a raw `<input type="checkbox">`
  (`MonitorEditPage.tsx:854-877`) while the rest of the app uses the Radix `Checkbox` primitive —
  two visually/behaviorally different checkboxes on one page (compare `ChannelsCard` rows :830).
  Also misses the primitive's focus-ring and expanded hit area (`after:-inset-*`,
  checkbox.tsx:16).
- **N5 [low]** Stale comment, wrong workaround: `MonitorWizardPage.tsx:198-199` claims "`Input`
  isn't forwardRef-wrapped" and focuses via `document.getElementById` (:200). `Input` has been
  forwardRef since input.tsx:8 — the same pattern is duplicated in `ChannelsPage.tsx:757,763`.
  Harmless at runtime, misleading to the next editor.
- **N6 [low]** `ch-pass` SMTP password input in the channel dialog has no `autoComplete`
  (`ChannelsPage.tsx:1000`) — password managers may offer to save an SMTP credential as a site
  login. `autoComplete="off"` (or `"new-password"`) needed.
- **N7 [low]** `buildConfig` email branch: `Number(config.smtpPort)` (`ChannelsPage.tsx:1044`)
  can persist `NaN` — `type="number"` inputs still admit `e`/`+`/`-` in most browsers, and the
  value is sent unvalidated. No `min`/`max` on the input either (:990).
- **N8 [low]** Login/Setup mark **both** fields `aria-invalid` on any failure
  (`LoginPage.tsx:55,70`; Setup has it on email only :60 but describes password via hint) —
  form-level "wrong password" errors flag the email field as invalid too. Minor over-announcement;
  a single form-level `role="alert"` (which exists) would suffice.
- **N9 [low]** Wizard step transitions replace history (`MonitorWizardPage.tsx:57`), so there's
  no Back-to-previous-step; combined with autofocus on steps 0/1 (:281, :362) vs heading-focus on
  step 2 (:170), keyboard users get an inconsistent re-entry point per step. Cosmetic next to N1.
- **N10 [low]** Retention "Saving…" indicator (`SettingsPage.tsx:329-331`) has no `aria-live`;
  covered by the success toast, so low — noted for completeness.
- **N11 [low]** `channelsQuery.data?.channels.map` rows in wizard/edit don't associate the
  channel name with the checkbox beyond wrapping `<label>` — fine — but the checkbox itself has
  no `aria-label`, so AT users navigating by control hear an unlabeled checkbox if they land on
  it out of label context (`MonitorWizardPage.tsx:430-439`, `MonitorEditPage.tsx:830-839`).
- **N12 [low]** `MonitorEditPage` error paragraph carries both `role="alert"` and
  `aria-live="polite"` (:447-450) — redundant dual announcement semantics; pick `role="alert"`.
- **N13 [low]** `LoginPage`/`SetupPage` `<img src="/logomark.png" alt="">` inside the card header
  is fine (empty alt), but both pages render the brand as "PingBoard" in copy without
  `translate="no"` (`SetupPage.tsx:43`, `LoginPage.tsx:43`) — the brand-token rule from the
  cross-cutting list still isn't applied on these two pages.

---

## Notes for the convergence pass

1. **One shared field-attributes pass** closes P5/P16/P22/P31/N6/N7 at once: a thin wrapper that
   defaults `autoComplete="off" spellCheck={false}` (opt-out, not opt-in) plus per-call-site
   `type="email"|"url"` and `inputMode`. The 07-21 audit already recommended this; it's now the
   single biggest remaining cluster.
2. **`CardTitle as` prop** (or `<h1>` on Login/Setup) closes P1/P36 — one primitive change.
3. **Dialog draft guard**: `ChannelsPage` already imports `useConfirm`; wrapping `cancel()` when
   the form is dirty closes P28 in ~10 lines.
4. **Viewport-capped dialog** (`max-h-[85vh] overflow-y-auto overscroll-contain` on
   `DialogContent`/`AlertDialogContent`) closes P35 once, app-wide.
5. **Data-router migration** is the only real fix for N1; everything else in the guard stack is
   already in place.
