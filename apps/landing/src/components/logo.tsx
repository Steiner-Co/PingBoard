import { cn } from '@/lib/utils'

/** PingBoard brand mark — a green tile with a signal dot and base bar. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 34" className={cn('block', className)} aria-hidden>
      <rect width="34" height="34" rx="9" className="fill-primary" />
      <circle cx="17" cy="14" r="5.4" className="fill-background" />
      <rect x="7" y="24.5" width="20" height="4" rx="2" className="fill-background" opacity="0.9" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Logo className="size-5" />
      <span className="text-[15px] font-semibold tracking-tight text-foreground">PingBoard</span>
    </span>
  )
}
