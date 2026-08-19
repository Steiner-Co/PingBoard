import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CalloutVariant = 'info' | 'warn' | 'tip' | 'danger'

const variantStyles: Record<CalloutVariant, { border: string; bg: string; icon: string }> = {
  info: {
    border: 'border-blue-200 dark:border-blue-900/50',
    bg: 'bg-blue-50/60 dark:bg-blue-950/20',
    icon: 'text-blue-500',
  },
  warn: {
    border: 'border-amber-200 dark:border-amber-900/50',
    bg: 'bg-amber-50/60 dark:bg-amber-950/20',
    icon: 'text-amber-500',
  },
  tip: {
    border: 'border-emerald-200 dark:border-emerald-900/50',
    bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
    icon: 'text-emerald-500',
  },
  danger: {
    border: 'border-red-200 dark:border-red-900/50',
    bg: 'bg-red-50/60 dark:bg-red-950/20',
    icon: 'text-red-500',
  },
}

function CalloutIcon({ variant }: { variant: CalloutVariant }) {
  const cls = 'size-[18px] shrink-0'
  switch (variant) {
    case 'info':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={cls} aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
        </svg>
      )
    case 'warn':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={cls} aria-hidden>
          <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      )
    case 'tip':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={cls} aria-hidden>
          <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2Z" />
        </svg>
      )
    case 'danger':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={cls} aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
        </svg>
      )
  }
}

export function Callout({
  variant = 'info',
  title,
  children,
}: {
  variant?: CalloutVariant
  title?: string
  children: ReactNode
}) {
  const s = variantStyles[variant]
  return (
    <div className={cn('my-6 flex gap-3 rounded-xl border px-4 py-3.5 text-[13.5px] leading-[1.6]', s.border, s.bg)}>
      <span className={cn('mt-0.5', s.icon)}>
        <CalloutIcon variant={variant} />
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="mb-1 text-[13px] font-semibold tracking-[-0.2px] text-foreground">{title}</p>}
        <div className="[&>p]:m-0 [&>p+p]:mt-2 text-foreground/80 [&_a]:text-foreground [&_a]:underline [&_a]:decoration-foreground/20 [&_a]:underline-offset-2 hover:[&_a]:decoration-foreground/40 [&_code]:rounded [&_code]:bg-foreground/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12.5px] [&_code]:font-medium">
          {children}
        </div>
      </div>
    </div>
  )
}
