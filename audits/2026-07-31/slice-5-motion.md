# Slice 5 — Motion sweep (cross-cutting) — 2026-07-31

> **2026-08-10 update:** the Persists/New tables below are as-written at sweep time.
> Several entries were closed by later commits (`c6e6028`, `d943daf`, `e4e2514`, `9162b30`,
> `58d4de7`, and the 08-10 data-router/field-wrapper work) — the commit-to-finding map
> lives in the root `AUDIT.md` 'Status 2026-08-10' section, which is the current truth.

Re-verification of **AUDIT-EMIL.md** (2026-07-21) and the motion rows of **AUDIT.md**'s persists
table against CURRENT source in `packages/ui/src` and `apps/landing/src`. Commits `c639bec`
("Motion: press feedback at 0.97, asymmetric overlay timing, GPU-only chart grow") and `351be41`
("Landing: close out audit findings") landed after the audit; most Emil findings are confirmed
FIXED at line level. Lenses: Vercel Web Interface Guidelines + Emil Kowalski (animations.dev).

**Headline: 27 FIXED · 15 PERSIST · 5 NEW.**

Every entry cites current `path:line`. Severities follow the original audit unless re-graded.

---

## Fixed

### Keyboard-initiated motion

| # | Original finding | Verification | Severity |
|---|---|---|---|
| F1 | Sidebar `Cmd/Ctrl+B` collapse animated layout properties [high] | **FIXED.** `sidebar.tsx:108-114` sets `instant` on the keyboard flip and clears it after two frames; `data-instant` is emitted at `sidebar.tsx:227` and every transition utility carries `group-data-[instant]:transition-none` (`sidebar.tsx:233, 245, 307, 434, 499`). Keyboard toggles snap. Pointer toggles still animate — see P4. | high |
| F2 | Dashboard "Live" replayed `animate-ping` per SSE heartbeat [high] | **FIXED.** `DashboardPage.tsx:212-220` renders a static `bg-success` dot with an explicit comment citing the Emil rationale ("pulse must encode new state, not restate the resting state"). No `animate-ping` remains in `DashboardPage.tsx`. | high |
| F3 | Timeline tooltip replayed keyframes on keyboard focus sweeps [high] | **FIXED.** Moved to `uptime-timeline.tsx`; keyboard focus sets `hovered` without animation — the entry animation (`fade-in-0 zoom-in-95 duration-100`) is gated behind `viaPointer` (`uptime-timeline.tsx:22-24, 68-69`), set only from `onPointerEnter` (`uptime-timeline.tsx:120-124`). | high |
| F4 | Tooltip zoomed from center, not from the bar [med] | **FIXED.** Custom timeline tooltip uses `origin-bottom` (`uptime-timeline.tsx:67`) so it scales up from the bar. Radix primitives use the origin variable: `tooltip.tsx:45`, `select.tsx:74`, `dropdown-menu.tsx:48, 247`. | med |

### Theme switch (both apps)

| # | Original finding | Verification | Severity |
|---|---|---|---|
| F5 | Admin theme switch: 450ms wipe + icon rotation/scale + framer spring, all layered [high] | **FIXED.** Switch moved to `packages/ui/src/components/unlumen-ui/theme-switch.tsx`: plain `<button>` (`:82-94`), theme applied directly with no view transition (`:69-72` + comment at `:65-68` explaining the wipe was dropped), icon swap is opacity-only 150ms (`:97-108`), press is CSS `active:scale-[0.97]` (`:89`). No `startViewTransition` remains in `packages/ui/src`. | high |
| F6 | Landing icon swap `rotate ±45, scale 0.5` + spring bounce [high] | **FIXED.** `apps/landing/src/components/theme-switch.tsx:117-133` — both icons use `initial/animate/exit: opacity` only, `transition: duration 0.15, easeOut`. No rotation, no scale, no spring. | high |
| F7 | Landing `whileHover scale 1.08` / `whileTap scale 0.88` [high] | **FIXED.** `theme-switch.tsx:102-112` — no motion props on the button; CSS `transition-[background-color,transform] duration-150 ease-out` + `active:scale-[0.97]` (`:108-109`). | high |
| F8 | Landing framer-motion without `<MotionConfig reducedMotion="user">` [high] | **FIXED.** `apps/landing/src/App.tsx:77-81` wraps the app in `<MotionConfig reducedMotion="user">` (imported at `App.tsx:4`). | high |

### Reduced-motion coverage

| # | Original finding | Verification | Severity |
|---|---|---|---|
| F9 | `ui/skeleton.tsx:7` unconditional `animate-pulse` [high] | **FIXED.** `skeleton.tsx:7` → `motion-safe:animate-pulse`. | high |
| F10 | `ui/sonner.tsx:27` unconditional `animate-spin` [high] | **FIXED.** `sonner.tsx:25` → `motion-safe:animate-spin`. | high |
| F11 | `FAQ.tsx:51, 61` transitions unconditional [med] | **FIXED.** `apps/landing/src/sections/FAQ.tsx:53` (`motion-safe:transition-transform`) and `:64` (`motion-safe:transition-[grid-template-rows]`). | med |
| F12 | Ungated infinite animations anywhere | **FIXED.** `grep animate-ping/pulse/spin/bounce` across both apps returns **zero** ungated instances; every match carries `motion-safe:`. | — |

### Easing & duration tokens

| # | Original finding | Verification | Severity |
|---|---|---|---|
| F13 | No custom easing tokens; built-ins everywhere [high] | **FIXED.** Both apps define tokens: `packages/ui/src/globals.css:191-200` and `apps/landing/src/globals.css:147-156` — `--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1)`, `--ease-in-out-quart`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`, `--motion-overlay-in: 200ms`, `--motion-overlay-out: 120ms` (curve values differ slightly from Emil's `(0.23,1,0.32,1)` but are the same family — acceptable). | high |
| F14 | Asymmetric enter/exit unimplemented [med] | **FIXED.** Every overlay primitive splits durations via the tokens: `dialog.tsx:46, 68`, `alert-dialog.tsx:42, 60`, `sheet.tsx:44, 69`, `select.tsx:74`, `dropdown-menu.tsx:48, 247`, `drawer.tsx:38`, `tooltip.tsx:45` — `data-open:duration-[var(--motion-overlay-in)]` (200ms) vs `data-closed:duration-[var(--motion-overlay-out)]` (120ms). | med |
| F15 | Sheet overlay (100ms) vs content (200ms) mismatch [med] | **FIXED.** `sheet.tsx:44` and `:69` both use the overlay tokens; content adds `ease-[var(--ease-drawer)]`. | med |
| F16 | `nav-main.tsx:33` primary CTA `duration-200 ease-linear` [med] | **FIXED.** `nav-main.tsx:35` now `duration-150 ease-out` (plus `active:scale-[0.97]`). | med |

### Charts

| # | Original finding | Verification | Severity |
|---|---|---|---|
| F17 | Bar grow animated `width`/`height` [high] | **FIXED.** `bar.tsx:153-172` — comment at `:153` ("animating width/height triggers layout + paint"); grow is `scaleY/scaleX 0→1` with `transformBox: fill-box` and `transformOrigin: bottom/left` (`:154-155, 171-172`). | high |
| F18 | Stagger scaled by total duration (0.4 × duration / n) [med] | **FIXED.** `bar.tsx:215-219` — flat 50ms per item (`staggerDelay ?? 0.05`), comment cites Emil's 30–80ms window. | med |
| F19 | Chart reveal default 1100ms [high] | **FIXED.** `bar-chart.tsx:677` and `area-chart.tsx:191` default `animationDuration = 800`. | high |
| F20 | Chart tooltip entry spring (stiffness 300 / damping 25) [med] | **FIXED.** `tooltip-box.tsx:223-224` — `transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}` with comment "Data UI stays crisp: a short quart-out tween, not a spring." | med |
| F21 | Date ticker spring ignored reduced-motion [med] | **FIXED.** `date-ticker.tsx:82, 87, 98` — `useReducedMotion()`; reduced-motion users get an instant `spring.set()` without playback. | med |

### Press feedback & hovers

| # | Original finding | Verification | Severity |
|---|---|---|---|
| F22 | Landing button `translate-y-px` layer; 4 magnitudes in play (0.88/0.95/0.97/0.98) [high] | **MOSTLY FIXED.** `translate-y-px` gone from `apps/landing/src/components/ui/button.tsx:8`; the 0.88 (theme switch) and 0.95 (PublicStatusPage:615, TopNav, FooterCTA) outliers are gone. Two neighboring magnitudes remain — see P5. | high → residual low |
| F23 | Shared button at 0.98 [high] | **FIXED.** `packages/ui/src/components/ui/button.tsx:12` — `active:not-aria-[haspopup]:scale-[0.97]`. | high |
| F24 | Landing hover lifts ungated (`Hero.tsx:31`, `Pricing.tsx:23`, `TopNav.tsx:15`, `FooterCTA.tsx:40`) [med] | **FIXED by removal.** Lifts dropped: `Hero.tsx:31` → `hover:opacity-90`; `Pricing.tsx:23` → `hover:opacity-90`; `TopNav.tsx:29, 37` and `FooterCTA.tsx:40` → colors/transform-for-press only. Nothing to gate anymore. | med |
| F25 | `MonitorDetailPage.tsx:631-633` schedule toggle had no enter animation [med] | **FIXED (obviated).** "Schedule" now opens a `Dialog` (`MonitorDetailPage.tsx:665, 740`), which enters via the asymmetric overlay tokens (F14). | med |
| F26 | `data-table.tsx:58` broad row transition [low] | **FIXED.** `packages/ui/src/components/ui/table.tsx:58` — `transition-colors` only. | low |
| F27 | SetupPage 2s logomark pulse (pulse-dot family) [med] | **FIXED.** `SetupPage.tsx:41-43` — the logomark renders with no animation; `grep animate-pulse` in `SetupPage.tsx` returns nothing. | med |

---

## Persists

| # | Finding (original ref) | Current evidence | Severity |
|---|---|---|---|
| P1 | Whole status page slides in `slide-in-from-bottom-1 + fade-in-0` over 500ms on every visit (AUDIT-EMIL Theme 1). Status pages are revisited often; the answer "is it up?" waits 500ms. | `packages/ui/src/public/PublicStatusPage.tsx:192` — `motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-500` unchanged. | high |
| P2 | Landing theme change still triggers the 450ms full-screen circular clip-path wipe — the largest motion in the product on a high-frequency control (AUDIT-EMIL Theme 2; recommendation was "theme change: instant"). | `apps/landing/src/globals.css:173-186` — `theme-reveal 0.45s ease-out` inside `prefers-reduced-motion: no-preference`; driven by `apps/landing/src/components/theme-switch.tsx:50-66, 81-85`. Reduced-motion gating is correct, but 450ms is 1.5× Emil's 300ms UI cap even for full-motion users, and the wipe explains nothing spatially. Downgraded from the original [high] only because the admin half (F5) is fixed and gating landed. | high |
| P3 | Tooltip skip-delay inverted: `delayDuration = 0` collapses both initial and subsequent delays (AUDIT-EMIL Theme 6). | `packages/ui/src/components/ui/tooltip.tsx:9` — `delayDuration = 0` unchanged. Should be 400 with Radix's default ~300ms skip-delay. | med |
| P4 | Sidebar pointer-initiated collapse still animates layout properties: `width` (`sidebar.tsx:233, 245`), `left/right` (`:245, 307`), `margin` (`:434`), `width,height,padding` (`:499`). Keyboard path snaps (F1), but Emil's "never animate width/margin/padding" still applies to pointer toggles — `transform: translateX` on the panel would be GPU-only. | `packages/ui/src/components/ui/sidebar.tsx:233, 245, 307, 434, 499`. | high |
| P5 | Press feedback converged from 4 magnitudes to 2, but the split remains and now crosses app boundaries: admin primitives 0.97 (`button.tsx:12`, `site-header.tsx:13, 38`, `nav-main.tsx:35`, `theme-switch.tsx:89`, `PublicStatusPage.tsx:643`, `SetupPage.tsx:88`, landing `theme-switch.tsx:109`) vs 0.98 (`apps/landing/src/components/ui/button.tsx:8`, `Hero.tsx:31`, `Pricing.tsx:23`, `TopNav.tsx:29, 37`, `FooterCTA.tsx:40`, `PublicStatusPage.tsx:615`, `DashboardPage.tsx:180`, `MonitorDetailPage.tsx:387`, `ChannelsPage.tsx:435`). One product, one tactile language — pick one. | see citations | low |
| P6 | Pulse-dot durations still diverge: admin "loading" pulse is Tailwind's 2s (`packages/ui/src/App.tsx:41`), public loading ping is 1.5s (`packages/ui/src/public/PublicStatusPage.tsx:120-121`). Down from 4 timings to 2 (3s live ping and SetupPage pulse removed), but no shared `--pulse-duration` token exists in either `globals.css`. | see citations | low |
| P7 | Public loading ping cadence: 1.5s ring reads slow for "I'm here while you wait" (Emil: fast spinner = perceived speed). Recommendation was a ~700ms spinner or 1.0s ping. | `PublicStatusPage.tsx:120-121` unchanged. | low |
| P8 | Chart axis label hover fade: `opacity 0.4s ease-in-out` — 400ms is over the 300ms UI cap and `ease-in-out` is for on-screen morphs, not hover fades (should be ~150–200ms ease-out). | `packages/ui/src/components/charts/x-axis.tsx:83`. | med |
| P9 | Row toggles / accordion triggers still give background-swap only, no press feedback: `apps/landing/src/sections/FAQ.tsx:49`, `packages/ui/src/pages/ChannelsPage.tsx:544`, `packages/ui/src/pages/DomainsPage.tsx:369`. Recommendation was `active:scale-[0.99]`. | see citations | med |
| P10 | Domains inline expand panel opens with no transition. | `packages/ui/src/pages/DomainsPage.tsx:420` — `{open && <DomainDetail … />}`, no enter animation. | med |
| P11 | Maintenance timeline bars snap between SSE refreshes with no tween; `grep transition|animate` in `MaintenancePage.tsx` returns zero matches. | `packages/ui/src/pages/MaintenancePage.tsx` (file-wide). | low |
| P12 | First-paint stagger still absent where the audit said it would earn its keep: `apps/landing/src/sections/FeatureGrid.tsx` (no transitions at all), `PublicStatusPage.tsx:230-244` monitor-group rows paint synchronously, `IncidentsPage.tsx` has no `transitionDelay`/stagger. | see citations | med / med / low |
| P13 | `box-shadow` in the base button transition list for every button, flat ones included — idle interpolation of an untouched property. | `packages/ui/src/components/ui/button.tsx:12` and `apps/landing/src/components/ui/button.tsx:8` — both still list `box-shadow`. | low |
| P14 | Site-header links use the combined `transition-[color,background-color,transform]` list (hover interpolates `transform` that never changes; press interpolates colors that don't change). Recommendation was to split hover/press transition lists. | `packages/ui/src/components/site-header.tsx:13, 38`. | low |
| P15 | Dashboard empty state bypasses the shared `EmptyState` and uses a different height: `min-h-[420px]` vs `min-h-[320px]`. | `packages/ui/src/pages/DashboardPage.tsx:387` vs `packages/ui/src/components/EmptyState.tsx:24`. | med |

---

## New (introduced or first observed since 2026-07-21)

| # | Finding | Evidence | Severity |
|---|---|---|---|
| N1 | **`transition-all` regression.** The 07-20 headline fix (zero `transition-all`) held until the Docs/Blog commit `e5f0259`: the blog index arrow uses `transition-all duration-150 ease-out`. Should be `transition-[color,transform]` (it also mixes the gated translate with the color fade). | `apps/landing/src/pages/BlogIndex.tsx:72` | low |
| N2 | **Admin app has no reduced-motion path for JS-driven chart animation.** `packages/ui/src/globals.css` contains **zero** `prefers-reduced-motion` queries; there is no `MotionConfig` anywhere in `packages/ui/src` and no `useReducedMotion` in the chart primitives. The 800ms framer-motion bar grow (`bar.tsx:129-133, 154-175`, driven by `bar-chart.tsx:677` / `area-chart.tsx:191`) plays at full length for reduced-motion users — the largest admin animation is ungated. Landing is covered (F8); admin is not. | `bar.tsx:129-133, 154-175`; absence verified by repo-wide grep | med |
| N3 | **Chart hover fades use `ease-in-out`** — `"opacity 0.15s ease-in-out"` in four chart files. Duration is fine; the curve is for on-screen morphs, not hover fades (should be the `--ease-out-quart` token, per the same reasoning as P8). | `packages/ui/src/components/charts/bar.tsx:160, 435`, `bar-squares.tsx:474`, `series-markers.tsx:249` | low |
| N4 | **Viewport-dependent theme motion.** The landing wipe silently disables itself above 1800px viewport width — two users on different monitors get different theme-switch behavior with no design rationale (motion should be a preference decision, not a screen-size accident). | `apps/landing/src/components/theme-switch.tsx:54` (`window.innerWidth > 1800`) | low |
| N5 | **Landing wipe animation uses built-in `ease-out`** while the same file defines `--ease-out-quart` — the largest motion in the product doesn't use the token system introduced to unify it. | `apps/landing/src/globals.css:179` vs tokens at `:152-154` | low |

---

## Remaining highest-leverage fixes (updated from AUDIT-EMIL §"Highest-leverage")

1. **P2** — Drop (or shorten to ≤150ms) the landing `theme-reveal` wipe; the admin app already proved instant theme swap works (F5).
2. **P1** — Remove the 500ms PublicStatusPage entrance slide; status pages are utilitarian.
3. **P4** — Sidebar pointer toggle: swap `width/left/right/margin/padding` transitions for `transform: translateX`.
4. **N2** — Gate the chart grow behind reduced-motion (either a `MotionConfig reducedMotion="user"` at the admin app root, or `useReducedMotion` in `bar.tsx`).
5. **P3** — `TooltipProvider delayDuration={400}` to restore two-stage tooltip timing.
