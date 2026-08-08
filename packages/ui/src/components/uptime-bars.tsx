import { cn } from "@/lib/utils"
import type { MonitorUptime } from "@/types"

/**
 * Segmented 30-day uptime strip for the dashboard table — one slim bar per
 * day, Pangolin-style. Static render (30 bars × N rows must not animate);
 * per-day detail rides on the native title tooltip, like the reference.
 */
export function UptimeBars({ uptime }: { uptime: MonitorUptime | undefined }) {
  if (!uptime) {
    return (
      <span className="font-mono text-[11px] text-muted-foreground">—</span>
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
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {uptime.pct == null ? "—" : `${uptime.pct.toFixed(1)}%`}
      </span>
    </div>
  )
}
