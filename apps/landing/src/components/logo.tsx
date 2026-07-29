import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logomark.png"
      alt="PingBoard"
      className={cn('block', className)}
      aria-hidden
    />
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Logo className="size-5" />
      <span translate="no" className="text-[15px] font-semibold tracking-tight text-foreground">PingBoard</span>
    </span>
  )
}
