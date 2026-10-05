import { cn } from "@/lib/utils"
import type { MonitorUptime } from "@/types"

/**
 * Segmented 30-day uptime strip — one slim bar per day, Pangolin-style.
 * `slim` fits dense tables; `chunky` is the monitors-table treatment
 * (taller, wider bars, no pct label — the bars carry the story).
 * Static render (30 bars × N rows must not animate); per-day detail rides
 * on the native title tooltip, like the reference.
 */
export function UptimeBars({
  uptime,
  variant = 'slim',
}: {
  uptime: MonitorUptime | undefined
  variant?: 'slim' | 'chunky'
}) {
  if (!uptime) {
    return (
      <span className="font-mono text-[11px] text-muted-foreground">—</span>
    )
  }
  if (variant === 'chunky') {
    return (
      <div
        className="flex h-9 w-full items-end gap-[2px]"
        role="img"
        aria-label={
          uptime.pct == null
            ? "No uptime data yet"
            : `${uptime.pct.toFixed(1)}% uptime over the last 30 days`
        }
      >
        {uptime.days.map((d) => (
          <span
            key={d.date}
            title={
              d.uptimePct == null
                ? `${d.date}: no data`
                : `${d.date}: ${d.uptimePct.toFixed(2)}% uptime`
            }
            className={cn(
              "min-w-[3px] max-w-[10px] flex-1 rounded",
              d.uptimePct == null && "h-[5px] bg-border",
              d.uptimePct != null && "h-9",
              d.uptimePct != null && d.uptimePct >= 99 && "bg-success",
              d.uptimePct != null &&
                d.uptimePct >= 80 &&
                d.uptimePct < 99 &&
                "bg-warning",
              d.uptimePct != null && d.uptimePct < 80 && "bg-destructive",
            )}
          />
        ))}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-4 items-stretch gap-[2px]"
        role="img"
        aria-label={
          uptime.pct == null
            ? "No uptime data yet"
            : `${uptime.pct.toFixed(1)}% uptime over the last 30 days`
        }
      >
        {uptime.days.map((d) => (
          <span
            key={d.date}
            title={
              d.uptimePct == null
                ? `${d.date}: no data`
                : `${d.date}: ${d.uptimePct.toFixed(2)}% uptime`
            }
            className={cn(
              "w-[3px] rounded-full",
              d.uptimePct == null && "bg-muted-foreground/20",
              d.uptimePct != null && d.uptimePct >= 99 && "bg-success",
              d.uptimePct != null &&
                d.uptimePct >= 80 &&
                d.uptimePct < 99 &&
                "bg-warning",
              d.uptimePct != null && d.uptimePct < 80 && "bg-destructive",
            )}
          />
        ))}
      </div>
      {/* The pct label yields below ~1400px — the bars carry the story; the
          number is on the detail page. */}
      <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground min-[1400px]:inline">
        {uptime.pct == null ? "—" : `${uptime.pct.toFixed(1)}%`}
      </span>
    </div>
  )
}
