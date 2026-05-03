import { PUBLIC_RATE_LIMIT_PER_MINUTE } from '@pingboard/shared'

interface Bucket {
  tokens: number
  refilledAt: number
}

const buckets = new Map<string, Bucket>()

export function checkRateLimit(
  ip: string,
  capacity = PUBLIC_RATE_LIMIT_PER_MINUTE,
): boolean {
  const now = Date.now()
  const refillRatePerMs = capacity / (60 * 1000)
  const bucket = buckets.get(ip) ?? { tokens: capacity, refilledAt: now }

  const elapsed = now - bucket.refilledAt
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRatePerMs)
  bucket.refilledAt = now

  if (bucket.tokens < 1) {
    buckets.set(ip, bucket)
    return false
  }
  bucket.tokens -= 1
  buckets.set(ip, bucket)
  return true
}

// Periodic cleanup so bucket map doesn't grow unbounded.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [ip, bucket] of buckets) {
    if (bucket.refilledAt < cutoff) buckets.delete(ip)
  }
}, CLEANUP_INTERVAL_MS).unref?.()
