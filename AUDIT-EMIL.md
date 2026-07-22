# PingBoard Emil-Kowalski Design Engineering Audit — 2026-07-21

Audit run through **Emil Kowalski's design engineering philosophy** (animations.dev). Lens:
**purpose, frequency, easing, perceived performance, cohesion, taste.** Findings only — fixes
tracked separately. Wherever a finding also surfaced in the parallel Vercel audit, it's framed
through Emil's lens (the *why* of motion), not as a compliance check.

## Summary

| Severity | Count | Notes |
|---|---:|---|
| `[high]` | 14 | Theme-switch overuse, dashboard live-feed entry delight, chart-layout animation, mixed motion systems, missing shared easing tokens, sidebar keyboard-animated, etc. |
| `[med]` | 38 | Animation duration mismatches with tier table, hover lifts without `(hover: hover)` gating, asymmetric enter/exit not implemented, popover origin oversight, structural cohesion gaps. |
| `[low]` | 24 | Local property lists that include `box-shadow` on flat buttons, redundant "always rendered" panel ticks, header slot reservations. |
| **Total** | **76** | (Emil-flavored — overlaps the Vercel audit's 174 in ~30 sites.) |

The dominant theme: **the product's motion is technically present but isn't authored as a system**.
Tailwind animation utilities, framer-motion springs, CSS view transitions, and Radix built-ins
all coexist without a shared vocabulary — a Sonner-cohesion #6 violation at the app level.

---

## Theme: Keyboard-initiated motion is animated (frequency rule violation)

| Before | After | Why |
|---|---|---|
| `sidebar.tsx:222, 234, 296, 426, 491` — Sidebar collapse/open animates `width`, `left/right`, `padding`, `margin`, and `height` over 200ms, fired by the `Cmd/Ctrl+B` keyboard shortcut (`sidebar.tsx:97-111`) and menu-button `width,height,padding` transitions. | Remove the animation for keyboard-initiated collapse; if motion remains for pointer/touch, restrict it to `transform` + `opacity` on the panel itself (no width/margin/padding). | Emil's first rule is absolute: keyboard-initiated actions never animate. Sidebar toggling is also a frequent action. Animating layout properties makes the toggle trigger text/icon reflow and burns frame time on each keystroke. `[high]` |
| `DashboardPage.tsx:223-227` — The "Live" indicator replays `animate-ping` every time a heartbeat arrives via SSE. | Static dot + status text; or one playback per state transition (connected → disconnected → connected), not per heartbeat. | Replaying a ring per event treats operational telemetry as decoration. Per Emil: heartbeats can arrive frequently; the visual feedback belongs to *state changes*, not to individual events. `[high]` |
| `PublicStatusPage.tsx:455-463, 415` — Timeline bar tooltip entry (`fade-in-0 + zoom-in-95 + duration-100`) fires on `onFocus` as well as `onPointerEnter`, so a keyboard user sweeping through 90 days retriggers 90 keyframes. | Show tooltip instantly for `focus-visible` (no animation); keep the 100ms entry only for `onPointerEnter`. | "Never animate keyboard-initiated actions." A focus sweep should be silent. `[high]` |
| `PublicStatusPage.tsx:187` — Whole status page slides in `slide-in-from-bottom-1 + fade-in-0` over 500ms on every visit. | No entrance animation; status pages are utilitarian — the user's job is "is it up?", not "be welcomed." | Status pages are revisited often; 500ms delays the answer. Emil: rare/first-time earns delight, frequent surfaces don't. `[high]` |

## Theme: Theme-switch is over-animated (single biggest Emil violation in the codebase)

| Before | After | Why |
|---|---|---|
| `globals.css:193-206` + `theme-switch.tsx:96-100` — Theme change triggers a full-screen circular view-transition wipe (450ms) **plus** an icon rotation/scale crossfade **plus** a framer-motion spring on the button (whileHover scale 1.08, whileTap scale 0.88), all layered. | Theme change: instant. Icon: opacity-only 100ms crossfade. No button scale animation, no scale-of-icon entry from `0.5`. | Theme switching is high-frequency and utilitarian. A wipe is the largest motion in the product and provides no spatial explanation (the new theme is already painted everywhere). Emil: theme motion is one of the celebrated "100+/day" anti-patterns. `[high]` |
| `theme-switch.tsx:119-141` — Icon swaps via `initial={{ rotate: -45, scale: 0.5, opacity: 0 }}` / `exit={{ rotate: 45, scale: 0.5, opacity: 0 }}` + spring bounce 0.3. | Single icon; opacity 0↔1, 100ms ease-out. No rotation, no scale. | The 45° rotation and `scale 0.5→1` on icon swap is decoration without purpose. The icon itself encodes the state. `[high]` |
| Landing `theme-switch.tsx:111-113` — `whileHover={{ scale: 1.08 }}`, `whileTap={{ scale: 0.88 }}` via framer-motion, **without** `<MotionConfig reducedMotion="user">` wrapping the app. | `hover:bg-accent active:scale-[0.97]` (CSS transitions only). Wrap the app in `<MotionConfig reducedMotion="user">` for residual framer-motion sites. | A 100+/day control that teaches the eye "PingBoard animates this" while the rest of the chrome doesn't. Framer-motion doesn't honor `prefers-reduced-motion` by default. `[high]` |

## Theme: Custom easing curves missing — built-ins used everywhere

| Before | After | Why |
|---|---|---|
| All `transition-*` utilities across `packages/ui/src/components/ui/button.tsx:12`, `badge.tsx:8`, `tabs.tsx:*`, `dropdown-menu.tsx:*`, `select.tsx:*`, `tooltip.tsx:*`, `sheet.tsx:*`, plus the landing Button — every use of `ease-out`, `ease-linear`, or no `ease` at all falls back to Tailwind's built-in curve (or browser default). | Define once in `:root` of each `globals.css` and reference via CSS variables / Tailwind theme.extend: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`. | Emil: built-in `ease-out` is the browser's legacy bezier; its end-of-curve plateau is visible at 150ms. Custom quart-out finishes decisively and matches press-feedback cadence. Token-based = cohesion. `[high]` |
| `nav-main.tsx:33` — Primary CTA uses `duration-200 ease-linear` on hover/background. | `transition-colors duration-150 var(--ease-out)`. | Linear is for **constant** motion (marquees, progress bars). Hover is entering-interaction territory; ease-out is the default and feels like instant acknowledgement. `[med]` |
| `x-axis.tsx:83` — `"opacity 0.4s ease-in-out"` on chart-axis label hover. | `opacity 200ms var(--ease-out)`; reserve `ease-in-out` only for intentional on-screen morphs. | Hover is tens/day; `ease-in-out` belongs to on-screen position morphs. `[med]` |

## Theme: Press-feedback magnitudes diverge (3–4 different scales in one product)

| Before | After | Why |
|---|---|---|
| Shared `button.tsx:12` — `active:not-aria-[haspopup]:scale-[0.98]`. Landing `button.tsx:8` — `active:scale-[0.98] active:not-aria-[haspopup]:translate-y-px`. `site-header.tsx:13, 38` — `active:scale-[0.97]`. `SetupPage.tsx:87` — `active:scale-[0.97]`. `PublicStatusPage.tsx:727` — `active:scale-95`. `TopNav.tsx:15`, `FooterCTA.tsx:40` — `active:scale-95`. Landing `theme-switch.tsx:111` — `whileTap={{ scale: 0.88 }}`. | Converge the **shared button** and **landing button** to `active:scale-[0.97]` at 150ms with `var(--ease-out)`. Landing drops `translate-y-px`. Site-header/SetupPage move to 0.97. PublicStatusPage/TopNav/FooterCTA move to 0.98. Theme switch moves to 0.97. | Emil: button responsiveness is a tactile language. The product has 4 scales in play (0.88/0.95/0.97/0.98) plus a translate-y layer. A 32–34px control with a 5% shrink reads as broken, not feedback. Cohesion at the press feedback. `[high]` |

## Theme: Asymmetric enter/exit timing is unimplemented

| Before | After | Why |
|---|---|---|
| `dialog.tsx:46, 68`; `alert-dialog.tsx:42, 60`; `tooltip.tsx:45`; `select.tsx:71`; `dropdown-menu.tsx:47, 246` — All primitives use the **same** declared duration for `data-open:fade-in-0` and `data-closed:fade-out-0` (typically 100ms both ways). | Two tokens: `--motion-overlay-in: 200ms`, `--motion-overlay-out: 120ms` (or `100→150ms`). Reference both in each primitive. | Emil's checklist: "Same enter/exit speed → Exit faster than enter." Exit that lingers reads as hesitation. The 100ms-everywhere pattern is the Shadcn default, not an authored choice. `[med]` |
| `sheet.tsx:44` (overlay `duration-100`) vs `sheet.tsx:69` (content `duration-200`) — overlay fades faster than content enters, so the modal finishes materialising under a faded overlay. | Single drawer curve (`--ease-drawer`) for both, 200ms in / 120ms out. | Mismatched speeds in the same component are visible; overlay should track content. `[med]` |

## Theme: Tooltip skip-delay is inverted (only the fast version kept)

| Before | After | Why |
|---|---|---|
| `tooltip.tsx:8-16` — `TooltipProvider delayDuration = 0` collapses both initial and subsequent hover delays to instant. | `TooltipProvider delayDuration = 400`; rely on Radix's default `skipDelayDuration` (~300ms) for subsequent opens. | Emil: tooltip skip-delay is **two different delays** — long initial (commit to hover), short subsequent (don't punish re-entry). `delayDuration = 0` collapses both, which removes the deferral that justifies a tooltip's existence. `[med]` |

## Theme: Layout-property animation (Emil: never animate width/margin/padding/height)

| Before | After | Why |
|---|---|---|
| `bar.tsx:155-160` — Bar grow entry animates `width: 0 → width` and `height: 0 → height` (SVG rect attributes). | Animate `transform: scaleY(0 → 1)` from baseline, with `transform-origin: bottom` for vertical bars, `left` for horizontal. | Width/height trigger layout + paint + composite. On a chart with 30+ bars this janks on low-end hardware. `scale()` is GPU-only. `[high]` |
| `DashboardPage.tsx:239-243` — Activity feed row entry animates `grid-template-rows: 0fr → 1fr` + opacity. | Replace with `motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200 ease-out` (a transform/opacity motion). | Grid-template-rows is a layout animation, not GPU-safe. Activity feed inserts happen on every heartbeat. `[high]` |
| `MaintenancePage.tsx:382-419` — Timeline bars snap between data refresh with no tween (positions update without transition); adjacent rows in the list use `height` for collapse. | 250ms `cubic-bezier(0.85,0,0.15,1)` on `width`/`left` for the bar; use `grid-template-rows` with `interpolate-size: allow-keywords` or a height-safe alternative. | Snap-refresh reads as glitchy; user eye tracks positions during monitoring. Emil: "preventing jarring changes" is one of the named purposes. `[low]` |
| `DomainsPage.tsx:358` — Inline expand panel opens with no transition. | 200ms `var(--ease-out)` on `opacity` + `transform: translateY(-4px → 0)`. | Same as above — domain-list expansions are frequent; no-mutation looks unconsidered. `[med]` |
| `sidebar.tsx:219-238, 414-451, 490-492` — Sidebar collapse animates `width`, `padding`, `margin`, `height` via Tailwind utilities. | See Theme 1: drop entirely on keyboard; pointer-triggered motion uses `transform: translateX(-100%) ↔ 0`. | Layout-property animation on a 100+/day surface is the exact intersection of two Emil "don'ts". `[high]` |

## Theme: Hover transforms without `(hover: hover) and (pointer: fine)` gating

| Before | After | Why |
|---|---|---|
| `Hero.tsx:31` — `hover:-translate-y-0.5` on Hero GitHub CTA. | Drop the lift, or wrap in `@media (hover: hover) and (pointer: fine) { &:hover { transform: translateY(-2px); } }`. | Touch users feel the hover state stick after a tap. Glow only applies on devices that benefit. `[med]` |
| `Pricing.tsx:23` — Same pattern on the "Free" CTA. | Same fix. | `[med]` |
| `TopNav.tsx:15`, `FooterCTA.tsx:40` — Logo link + copy button sit above hover-only transforms. | Same fix. | `[med]` |
| `section-cards.tsx:145` — Stat cell click target transitions `colors` without media-query gating. | Add `(hover: hover)` gate or rely on Tailwind's auto-gating (already in use elsewhere). | `[low]` |

## Theme: Skeleton/Sonner/landing theme-switch ignore reduced-motion

| Before | After | Why |
|---|---|---|
| `ui/skeleton.tsx:7` — `animate-pulse` unconditional. | `motion-safe:animate-pulse`. | Loop animations should be gated everywhere; this one slipped. `[high]` |
| `ui/sonner.tsx:27` — `animate-spin` unconditional on the loading icon. | `motion-safe:animate-spin`; static fallback for reduced-motion users. | Toasts can sit on screen for arbitrary durations; the spinner must not be mandatory. `[high]` |
| Landing `theme-switch.tsx:*` — framer-motion `whileHover`/`whileTap` without `<MotionConfig reducedMotion="user">` anywhere in the app. | Wrap the landing app root in `<MotionConfig reducedMotion="user">`. | Reduced-motion framer users currently see full motion. `[high]` |
| `FAQ.tsx:51-61` — `transition-transform duration-200` (icon rotation) and `transition-[grid-template-rows] duration-200 ease-out` (answer panel) are unconditional. | Wrap transforms in `motion-safe:`; the grid-template-rows gets a faster exit (120ms) and a slower entry (200ms) using `[data-state]` attributes. | FAQ animations should respect motion preference. `[med]` |
| `PublicStatusPage.tsx:113-122, 296-305` — Pulse dots correctly `motion-safe:`-gated, but `style={{ animationDuration: '3s' }}` on the live indicator is the wrong cadence, and there are two different pings on the same page (1.5s loading, 3s live). | Pick one cadence (e.g., 1.5s) and apply app-wide; or drop the live ping entirely (the static green dot already communicates the state). | Two different "I'm alive" timings on one page teach the visitor that this codebase doesn't know its own symbols. Emil: constants load-bear cohesion. `[med]` |

## Theme: Charts over-animate for a frequently-visited surface

| Before | After | Why |
|---|---|---|
| `bar-chart.tsx:676`, `area-chart.tsx:190`, `time-series-chart-shell.tsx:602` — Default chart reveal `animationDuration = 1100ms`. | Default 800ms; expose 1100ms as an opt-in for first-ever visit only. | Admin charts are visited tens/day (per Emil, that's "reduce or remove" frequency), not rare/first-time. `[high]` |
| `bar-chart.tsx:381` + `bar.tsx:215-217` — Stagger formula `0.4 * animationDuration / data.length` spreads 40% of total duration across all bars: a 5-bar chart gets 88ms stagger (above Emil's 80ms upper bound), a 36-bar chart gets 13ms (below the readable minimum). | Per-item stagger 50ms (within Emil's 30–80ms range). `style={{ transitionDelay: `${i*50}ms` }}` per bar. | Stagger should be **per item**, not scaled by total duration. `[med]` |
| `tooltip-box.tsx:218-225` — Tooltip enters with `transition={{ type: "spring", stiffness: 300, damping: 25 }}`. | Replace spring with 150ms tween on `opacity` + `transform: scale(0.95 → 1)` with `var(--ease-out)`. | Spring on a data tooltip reads as imprecise; data UIs should be crisp. `[med]` |
| `tooltip/date-ticker.tsx:81-82` — Spring on the date ticker's month/day transition (`stiffness: 400, damping: 35`); honors no reduced-motion. | Reduced-motion users get instant updates; full-motion users keep the spring (it's a decorative seasonal element). | `[med]` |

## Theme: Press feedback on non-button interactive elements

| Before | After | Why |
|---|---|---|
| `FAQ.tsx:47`, `ChannelsPage.tsx:546`, `DomainsPage.tsx:306` — Row toggles and accordion triggers rely on `focus-visible:bg-muted/40` / `bg-accent/40` only — background swap, no press feedback. | Add `active:scale-[0.99]` on the row's button surface alongside the bg-swap; gate `(hover: hover)`. | Tapping is intentional; the row should briefly acknowledge. `[med]` |
| `MonitorDetailPage.tsx:631-633` — "Schedule" maintenance button toggles the inline form via `onClick` with no enter animation. | 150ms `var(--ease-out)` on `opacity` + `translateY(8px → 0)`. | State indication is one of Emil's named purposes. `[med]` |

## Theme: Hover-color-bg-only elements

| Before | After | Why |
|---|---|---|
| `site-header.tsx:13, 38` — Header links transition `color,background-color,transform` even though only color/background change on hover and scale changes on press. | Split: hover uses `transition-colors`, press uses `transition-transform`. Combined lists force the runtime to interpolate properties that don't change. | Run-time interpolating untouched properties is wasted work. `[low]` |
| `data-table.tsx:58` — `TableRow` `hover:bg-muted/50` with broad transition. | `transition-colors duration-150 var(--ease-out)`. | Same. `[low]` |

## Theme: Stagger missing on first-time reveals (where it would actually help)

| Before | After | Why |
|---|---|---|
| `FeatureGrid.tsx:51-63` — Six feature cards render synchronously, no per-item entrance. | Wrap in `opacity 0→1` at parent level, with `style={{ transitionDelay: `${i*50}ms` }}` per child on first paint only (one-shot flag). | Emil: "Rare/first-time → CAN add delight." This is the one surface that earns stagger; six identical cards landing together reads unconsidered. `[med]` |
| `PublicStatusPage.tsx:218-237, 540-585` — Grouped monitor rows + incident rows paint synchronously. | Per-row `transition-[opacity,transform] duration-200` with 40ms index-based delay on first paint only; honor `motion-reduce`. | Same logic — the status page's first reveal is the moment where taste shows. `[med]` |
| `IncidentsPage.tsx:441-444` — Offender rows render synchronously when data arrives. | 40ms per-row `var(--ease-out)` fade-up on initial load. | Less critical than the public surface (admin revisits), but still first-paint-of-data in many flows. `[low]` |

## Theme: Popover origin / tooltip zoom-in from center

| Before | After | Why |
|---|---|---|
| `PublicStatusPage.tsx:415-422` — Timeline tooltip uses default `zoom-in-95` with `transform-origin: center`, so it scales from its own middle rather than the bar below it. | `transform-origin: var(--radix-tooltip-content-transform-origin)` (origin at the bar). | Emil: popovers should scale from their trigger — modals stay centered. A tooltip zoomed from center reads as "swimming up to meet the bar." `[med]` |
| `PublicStatusPage.tsx:114-119` — Loading ping has no inline duration override; 1.5s feels slow for a status page whose primary purpose is "I'm here while you wait." | Replace ping with a CSS spinner ~700ms/rev, or `motion-safe:animate-ping` at 1.0s. | Emil: fast spinner = perceived speed. `[med]` |

## Theme: Empty/dashboard first-paint composition

| Before | After | Why |
|---|---|---|
| `DashboardPage.tsx:394-415` + `EmptyState.tsx:21-37` — Dashboard empty state uses fixed `min-h-[420px]`; the shared `EmptyState` uses `min-h-[320px]`. Two near-identical empty states with different heights. | Consolidate on the shared `EmptyState` with one height. | Cohesion: the dashboard skips the shared primitive for no reason. `[med]` |
| `DashboardPage.tsx:352-389` — Skeleton doesn't reserve the loaded composition — search/filter row + side-rail blocks differ from the loaded layout. | Match loaded structure: same regions, same density. | Spatial-consistency purpose: skeleton should preview the layout so loading reads as "filling in." `[low]` |

## Theme: Layout-level cohesion

| Before | After | Why |
|---|---|---|
| `IncidentsPage.tsx:504-566`, `MaintenancePage.tsx:586-627`, `StatusPagesPage.tsx:318-367`, `DomainsPage.tsx:524-552` — Each page defines its own `StatCell`/`Stat` component. | One shared `StatCell` in `components/`. | Tone drift is already real (Domains `'muted'` → `text-foreground` looks like a bug); motion differs (only IncidentsPage adds `transition-colors`). `[med]` |
| Shared `button.tsx:12` includes `box-shadow` in the transition list for every button, even flat ones. | Drop `box-shadow` from the base; only include `transform`. Variants that *do* show shadows list them in their variant recipe. | Cheap to fix, removes idle interpolation. `[med]` |
| `panel.tsx:5-29, 44-47` — Every `Panel` adds four blueprint crosshair ticks including small utility rails and error/empty states. | Reserve the ticks for primary framing surfaces (page-level panels). | Strong visual signature applied widely becomes ubiquitous ornament. Emil's "beauty is leverage" applies to the inverse: leverage is lost when every panel shouts. `[low]` |
| `site-header.tsx:54-62` — Status-page link slot is reserved (invisible placeholder) so it doesn't shift; creates a blank area when the feature is absent. | Drop the slot when no status page exists; reserve only when the product has a stable affordance. | `[low]` |

## Theme: Typography as structure

| Before | After | Why |
|---|---|---|
| `site-header.tsx:31` + `AdminLayout.tsx:14-23` — Page titles all render at `text-base font-medium` regardless of context. | Distinguish shell section title from contextual page titles (detail/edit/empty). | Hierarchy is information; identical treatment makes the route context feel interchangeable. `[med]` |
| `data-table.tsx:118-121, 146-148` — Numbers and status strings use small uppercase/monospace; names use proportional text. Headers beyond alignment have no typographic distinction. | One monospace treatment for operational data, proportional for human labels; make header labels deliberate. | `[low]` |

---

## Convergence recommendations (concrete adoption list)

Adopt these once and the codebase's motion language falls in line.

### 1. Establish shared motion tokens (both apps' `globals.css`)

```css
:root {
  /* Easings — Emil's preferred curves, not built-ins */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);

  /* Durations */
  --motion-press: 150ms;
  --motion-popover: 180ms;
  --motion-dropdown: 200ms;
  --motion-modal: 240ms;
  --motion-overlay-in: 200ms;
  --motion-overlay-out: 120ms;

  /* Pulse dot */
  --pulse-duration: 1500ms;
}
```

### 2. Converge press feedback (apply to both primitives)

- Shared `button.tsx`: keep `active:not-aria-[haspopup]:scale-[0.97]` — change 0.98 → 0.97.
- Landing `button.tsx`: drop `active:not-aria-[haspopup]:translate-y-px`, adopt the shared recipe.
- `site-header.tsx:13, 38`, `SetupPage.tsx:87`: `active:scale-[0.97]` (was 0.97 — already correct, but use the shared value).
- `PublicStatusPage.tsx:727`, `FooterCTA.tsx:40`, `TopNav.tsx:15`: `active:scale-[0.97]` (was 0.95).
- Landing `theme-switch.tsx:111`: `whileTap={{ scale: 0.97 }}`, remove `whileHover={{ scale: 1.08 }}`.

### 3. Theme switch: one opacity crossfade, no wipe, no spring

- `globals.css`: remove the `theme-reveal` keyframe (or move it to `prefers-reduced-motion: no-preference` + drop to 100ms).
- Landing `theme-switch.tsx`: opacity-only icon swap, no rotation, no `scale: 0.5`.

### 4. Asymmetric enter/exit per overlay primitive

In every Radix-based overlay (Dialog, AlertDialog, Sheet, Drawer, Tooltip, Select, DropdownMenu, Popover), split the timing:

```html
data-open:animate-in data-open:fade-in-0 data-open:motion-safe:zoom-in-95
data-closed:animate-out data-closed:fade-out-0 data-closed:motion-safe:zoom-out-95
style="animation-duration: var(--motion-overlay-in)"  <!-- open -->
```

For exit, drive a slightly faster duration via `[data-state=closed]` selectors or a second variable.

### 5. Tooltip skip-delay

```tsx
<TooltipProvider delayDuration={400} />  {/* default Radix skipDelayDuration = 300 */}
```

### 6. Reduced-motion coverage (close the four leaks)

- `ui/skeleton.tsx:7` → `motion-safe:animate-pulse`
- `ui/sonner.tsx:27` → `motion-safe:animate-spin`
- Landing app root → `<MotionConfig reducedMotion="user">`
- `FAQ.tsx:51, 61` → `motion-safe:` prefixes on the icon rotation + grid-rows transition

### 7. Charts

- Default `animationDuration` 1100 → 800 across `bar-chart`, `area-chart`, `time-series-chart-shell`.
- Stagger: `style={{ transitionDelay: `${i*50}ms` }}` per bar.
- `bar.tsx:155-160`: replace `width/height` with `transform: scaleY(0 → 1)` from `transform-origin: bottom`.
- `tooltip-box.tsx:218-225`: replace spring with `cubic-bezier(0.23, 1, 0.32, 1)` 150ms tween.

### 8. Stagger on first-paint reveals

- `FeatureGrid.tsx:51-63`: per-card 50ms transition-delay on first paint only.
- `PublicStatusPage.tsx:218-237, 540-585`: per-row 40ms transition-delay on initial mount.

### 9. Hover-touch gating

- `Hero.tsx:31`, `Pricing.tsx:23`, `TopNav.tsx:15`, `FooterCTA.tsx:40`, `FAQ.tsx:47`, `section-cards.tsx:145`: wrap transform hover states in `@media (hover: hover) and (pointer: fine)`.

### 10. Layout-property animation → `transform` + `opacity` only

- `sidebar.tsx:222, 234, 491`: drop width/margin/padding transition. Replace with `transform: translateX`.
- `bar.tsx:155-160`: `scaleY(0 → 1)`, not `width/height`.
- `DashboardPage.tsx:239-243`: `slide-in-from-top-1 + opacity`, not `grid-template-rows`.

### 11. Popover origin (modals stay centered)

- PublicStatusPage timeline tooltip: `transform-origin: var(--radix-tooltip-content-transform-origin)`.
- Add a missing `popover.tsx` primitive that respects the Radix content variable, used everywhere a popover currently invents its own origin.

### 12. Live-feed entry delight on heartbeat

- DashboardPage live indicator: dot is the state; do not replay `animate-ping` per heartbeat. If a brief acknowledgement is required, switch to a single fade of the dot color on connected → disconnected, not a ring per event.

### 13. Pulse-dot family (consolidate)

- Live indicators (admin): `motion-safe:animate-pulse`, `2s`, infinite, 6×6 dot (App.tsx, SetupPage, Sidebar).
- Replay on event (dashboard feed one-shot): `motion-safe:animate-ping`, `1.2s`, `animation-iteration-count: 1` keyed on event (DashboardPage:225).
- Loading (public + skeleton + sonner): `motion-safe:animate-pulse` `1.5s` (matches DashboardPage cadence); or Sonner spinner ~700ms/rev (Emil: "fast spinner = perceived speed").
- Drop PublicStatusPage live ping 3s entirely.

### 14. Structural cohesion

- One shared `StatCell` (used by 4 pages today with drift).
- One shared `EmptyState` (DashboardPage bypasses it).
- Reconcile `panel.tsx` ticks: only primary framing surfaces get them.
- Site-header: drop the reserved status-page slot when no status page exists.

### 15. Per-page motion contracts (do not let pages invent their own)

- Dashboard live feed: no entry delight on heartbeat (Theme 12).
- MonitorDetail schedule toggle: 150ms `var(--ease-out)` opacity + translateY.
- Domains expand row: 200ms `var(--ease-out)` opacity + translateY(-4 → 0).
- Maintenance timeline bars: 250ms ease-out on `transform: translateX` for SSE refreshes.
- ChannelsPage/FAQ/DomainsPage row toggles: shared `active:scale-[0.99]` press feedback.

### 16. Reduced-motion as a product policy, not a media query

State in CONTRIBUTING/design-engineering.md: any new animation must (a) have a clear purpose in the comment, (b) use one of the four custom easing tokens, (c) stay under 300ms for UI surfaces, (d) be gated by `motion-safe:` or `prefers-reduced-motion`, and (e) animate only `transform` + `opacity` unless an exception is documented.

---

## Highest-leverage fixes first

If only three of the above can land, these:

1. **Theme switch:** drop the wipe + spring + rotation. Theme change should be near-instant with an opacity crossfade.
2. **Shared `Button` + landing `Button` press feedback:** converge to `scale-[0.97]`, drop `translate-y-px`. (Single largest cohesion break.)
3. **Easing tokens in both `globals.css`:** `--ease-out`, `--ease-in-out`, `--ease-drawer`. (Single largest unifying change.)

After those, the codebase has a motion language. Everything else is local cleanup within that language.
