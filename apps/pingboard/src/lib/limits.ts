import type { Mode } from '../config'

/**
 * The single enforcement seam for the open-core boundary.
 *
 * Self-hosted PingBoard is unlimited, forever — that is the whole promise of
 * the free product, so it is a structural guarantee here, not a config value
 * a mistake could flip: `limitFor` returns `Infinity` for every self-host
 * resource, and the call sites short-circuit on `isUnlimited` before they even
 * count, so self-host pays nothing.
 *
 * When the hosted arm ships, plan caps wire in at exactly one place — the
 * `cloud` branch of `limitFor` — reading the workspace's plan. Nothing else
 * in the codebase needs to know limits exist. Until then, cloud is also
 * unlimited (there are no plans or workspaces yet).
 */

export type LimitedResource = 'monitor' | 'status_page'

function limitFor(mode: Mode, _resource: LimitedResource): number {
  if (mode === 'selfhost') return Infinity
  // cloud: plan lookup goes here once workspaces + plans exist. Unlimited
  // until then — PINGBOARD_MODE=cloud does nothing without the SaaS.
  return Infinity
}

/**
 * True when a resource has no cap, so the caller can skip counting entirely.
 * In self-host this is always true.
 */
export function isUnlimited(mode: Mode, resource: LimitedResource): boolean {
  return limitFor(mode, resource) === Infinity
}

export type LimitCheck = { ok: true } | { ok: false; reason: string }

/** Whether one more of `resource` is allowed given how many already exist. */
export function checkLimit(
  mode: Mode,
  resource: LimitedResource,
  currentCount: number,
): LimitCheck {
  return withinCap(currentCount, limitFor(mode, resource), resource)
}

/**
 * The pure comparison behind `checkLimit`, exported so the enforcement path can
 * be tested against a finite cap — `limitFor` never produces one until cloud
 * plans ship, so testing through `checkLimit` alone can't prove it blocks.
 */
export function withinCap(
  currentCount: number,
  cap: number,
  resource: LimitedResource,
): LimitCheck {
  if (currentCount < cap) return { ok: true }
  const label = resource === 'status_page' ? 'status page' : resource
  return {
    ok: false,
    reason: `Plan limit reached: this workspace allows ${cap} ${label}${cap === 1 ? '' : 's'}.`,
  }
}
