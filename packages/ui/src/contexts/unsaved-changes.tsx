import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

/** Resolves true when it's OK to navigate away. */
export type Guard = () => Promise<boolean>

/**
 * Blocks navigation while `active`; `guard` decides whether to proceed.
 *
 * Covers every in-app escape — sidebar links, imperative `navigate()`,
 * browser Back/Forward — because the app mounts a data router (see
 * App.tsx). Navigations that stay on the same path pass through so
 * param-driven state (the wizard's `?step=`) doesn't trip the guard.
 *
 * Tab close and reload can't be intercepted here — pair with a
 * `beforeunload` listener for those.
 */
export function useUnsavedGuard(active: boolean, guard: Guard): void {
  const guardRef = useRef(guard)
  guardRef.current = guard
  const activeRef = useRef(active)
  activeRef.current = active

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      activeRef.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    let settled = false
    void guardRef.current().then((ok) => {
      if (settled) return
      settled = true
      if (ok) blocker.proceed?.()
      else blocker.reset?.()
    })
    return () => {
      settled = true
    }
  }, [blocker])
}
