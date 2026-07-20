import { useSyncExternalStore } from 'react'

const TICK_MS = 30_000

// One shared ticker drives every relative timestamp in the app. Without it,
// "3m ago" and open-incident durations freeze at render time — a monitoring
// UI that silently stops counting reads as broken.
const listeners = new Set<() => void>()
let now = Date.now()
let handle: ReturnType<typeof setInterval> | null = null

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  if (handle === null) {
    // The interval is torn down with the last subscriber, so `now` is frozen
    // at that moment. Without this refresh the first render after remounting
    // reports a timestamp stale by however long the user was elsewhere.
    now = Date.now()
    handle = setInterval(() => {
      now = Date.now()
      for (const listener of listeners) listener()
    }, TICK_MS)
  }
  return () => {
    listeners.delete(onChange)
    if (listeners.size === 0 && handle !== null) {
      clearInterval(handle)
      handle = null
    }
  }
}

const getSnapshot = () => now

/** Milliseconds since epoch, re-rendering the caller every 30 seconds. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
