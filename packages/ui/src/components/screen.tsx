import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Icon } from '@/components/ui/icon'
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle"
import { XCircle } from "@phosphor-icons/react/dist/icons/XCircle"
import { PauseCircle } from "@phosphor-icons/react/dist/icons/PauseCircle"
import { MinusCircle } from "@phosphor-icons/react/dist/icons/MinusCircle"
import { cn } from '@/lib/utils'

/**
 * Shared admin-screen primitives — the Figma-driven list language:
 * 28px mast, dark-pill segments, circular refresh, pill search,
 * tinted table card. Built once so every screen reads as one product.
 */

export function ScreenHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
        <p className="text-base font-medium">{description}</p>
      </div>
      {actions && <div className="ml-auto flex items-center gap-2.5">{actions}</div>}
    </header>
  )
}

export interface SegmentOption<T extends string> {
  id: T
  label: string
  count: number
}

/** Check-state cell shared by the Monitors and Domains tables. */
export function StatusCell({
  status,
}: {
  status: 'up' | 'down' | 'disabled' | 'pending'
}) {
  if (status === 'up') {
    return (
      <span className="inline-flex items-center gap-[7px] text-lg font-medium">
        <Icon icon={CheckCircle} weight="fill" className="size-5 shrink-0 text-success" />
        Up
      </span>
    )
  }
  if (status === 'down') {
    return (
      <span className="inline-flex items-center gap-[7px] text-lg font-medium text-destructive">
        <Icon icon={XCircle} weight="fill" className="size-5 shrink-0" />
        Down
      </span>
    )
  }
  if (status === 'disabled') {
    return (
      <span className="inline-flex items-center gap-[7px] text-lg font-medium text-muted-foreground">
        <Icon icon={PauseCircle} weight="fill" className="size-5 shrink-0" />
        Disabled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-[7px] text-lg font-medium text-muted-foreground">
      <Icon icon={MinusCircle} weight="fill" className="size-5 shrink-0" />
      Pending
    </span>
  )
}

export function SegmentFilter<T extends string>({
  label,
  options,
  value,
  onChange,
  reduceMotion,
  layoutId,
}: {
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (next: T) => void
  reduceMotion: boolean
  /** Unique per screen so pills don't migrate across pages. */
  layoutId: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-full bg-muted"
    >
      {options.map((f) => {
        const active = value === f.id
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            aria-pressed={active}
            className={cn(
              'relative inline-flex items-center gap-1 rounded-full px-[18px] py-[10px] text-base font-medium leading-4 outline-none transition-[color,transform] duration-150 ease-out',
              'focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.97]',
              active ? 'text-background' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className="absolute inset-0 rounded-full bg-foreground"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 550, damping: 40 }
                }
              />
            )}
            <span className="relative">{f.label}</span>
            <span className="relative font-mono text-[10px] opacity-60 tabular-nums">
              {f.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
