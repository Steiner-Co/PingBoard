import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelative(date: Date | string | number): string {
  const ms = Date.now() - new Date(date).getTime()
  const sec = Math.round(ms / 1000)
  if (sec < 10) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.round(hr / 24)
  return `${days}d ago`
}

export function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return sec % 60 === 0 ? `${min}m` : `${min}m ${sec % 60}s`
  const hr = Math.floor(min / 60)
  return min % 60 === 0 ? `${hr}h` : `${hr}h ${min % 60}m`
}

// Compact ("30s" / "5m" / "1h") — used in the dashboard table column.
export function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${seconds / 60}m`
  return `${seconds / 3600}h`
}

// Human-readable ("Every 30 seconds" / "Every 1 minute") — used in select
// dropdowns and form labels.
export function formatIntervalLabel(seconds: number): string {
  if (seconds < 60)
    return `Every ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`
  if (seconds < 3600) {
    const m = seconds / 60
    return `Every ${m} ${m === 1 ? 'minute' : 'minutes'}`
  }
  const h = seconds / 3600
  return `Every ${h} ${h === 1 ? 'hour' : 'hours'}`
}
