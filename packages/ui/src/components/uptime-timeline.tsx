import { useRef, useState } from "react"

import { cn } from "@/lib/utils"

export interface TimelineDay {
  date: string
  uptimePct: number | null
}

/**
 * 90-day uptime strip — one bar per day, green/amber/red by uptime. Shared by
 * the public status page and the admin monitor detail page.
 */
export function UptimeTimeline({
  timeline,
  monitorName,
}: {
  timeline: TimelineDay[]
  monitorName: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  // Roving tabindex: the strip is one tab stop and arrows walk the days.
  // 90 individually-tabbable bars per monitor would bury every control
  // below the timeline.
  const [roving, setRoving] = useState(timeline.length - 1)
  const groupRef = useRef<HTMLDivElement>(null)

  const focusBar = (from: number, dir: -1 | 1) => {
    for (let i = from; i >= 0 && i < timeline.length; i += dir) {
      const el = groupRef.current?.querySelector<HTMLButtonElement>(
        `[data-idx="${i}"]`,
      )
      // Bars hidden below `sm` are display:none and can't take focus.
      if (el && el.offsetParent !== null) {
        setRoving(i)
        el.focus()
        return
      }
    }
  }

  if (timeline.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Gathering data…
      </div>
    )
  }
  // Mobile shows the most recent 30 days; 90 bars under ~400px are sub-3px
  // slivers that can't be read or touched.
  const mobileStart = Math.max(0, timeline.length - 30)
  const first = timeline[0]
  const mobileFirst = timeline[mobileStart]
  const active = hovered != null ? timeline[hovered] : null

  return (
    <div className="space-y-1">
      <div className="relative">
        {active && (
          <div
            // Purely visual — each bar's accessible name already says the same.
            aria-hidden
            className="pointer-events-none absolute -top-8 z-10 left-[var(--tip-left-mobile)] sm:left-[var(--tip-left)] -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-[11px] whitespace-nowrap text-popover-foreground shadow-sm tabular-nums motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-100"
            style={
              {
                // Two offsets: below `sm` only the last 30 bars render, so the
                // percentage has to be measured against the visible window.
                '--tip-left': tipLeft(hovered!, 0, timeline.length),
                '--tip-left-mobile': tipLeft(hovered!, mobileStart, timeline.length),
              } as React.CSSProperties
            }
          >
            <span className="font-medium">{humanDate(active.date)}</span>
            <span className="text-muted-foreground">
              {' · '}
              {active.uptimePct == null
                ? 'no data'
                : `${active.uptimePct.toFixed(2)}% uptime`}
            </span>
          </div>
        )}
        <div
          ref={groupRef}
          role="group"
          aria-label={`${monitorName} — daily uptime, ${timeline.length} days. Use arrow keys to review days.`}
          className="flex h-6 items-end gap-px"
          onPointerLeave={() => setHovered(null)}
          onKeyDown={(e) => {
            const step =
              e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
            if (step !== 0) {
              e.preventDefault()
              focusBar(roving + step, step)
            } else if (e.key === 'Home') {
              e.preventDefault()
              focusBar(0, 1)
            } else if (e.key === 'End') {
              e.preventDefault()
              focusBar(timeline.length - 1, -1)
            }
          }}
        >
          {timeline.map((d, i) => (
            <button
              key={d.date}
              type="button"
              data-idx={i}
              tabIndex={i === Math.min(roving, timeline.length - 1) ? 0 : -1}
              aria-label={barLabel(d)}
              onPointerEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              className={cn(
                'h-full flex-1 cursor-default rounded-sm transition-[filter] duration-100',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                // display:none also drops these from tab order and the a11y tree.
                i < mobileStart && 'max-sm:hidden',
                d.uptimePct == null && 'bg-muted-foreground/15',
                d.uptimePct != null && d.uptimePct >= 99 && 'bg-success/90',
                d.uptimePct != null && d.uptimePct >= 80 && d.uptimePct < 99 &&
                  'bg-warning/80',
                d.uptimePct != null && d.uptimePct < 80 && 'bg-destructive/90',
                hovered === i && 'brightness-125 dark:brightness-150',
              )}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span className="sm:hidden">{mobileFirst?.date && humanDate(mobileFirst.date)}</span>
        <span className="hidden sm:inline">{first?.date && humanDate(first.date)}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

function barLabel(d: TimelineDay): string {
  const day = humanDate(d.date)
  if (d.uptimePct == null) return `${day}: no data`
  return `${day}: ${d.uptimePct.toFixed(2)}% uptime`
}

// Centre of bar `index` as a percentage of the window starting at `start`,
// clamped so the tooltip never overhangs either edge of the strip.
function tipLeft(index: number, start: number, total: number): string {
  const pct = ((index - start + 0.5) / (total - start)) * 100
  return `clamp(3.5rem, ${pct}%, calc(100% - 3.5rem))`
}

export function humanDate(iso: string): string {
  // YYYY-MM-DD → "Feb 14"
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
