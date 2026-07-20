import { useMemo } from "react"
import { Link } from "react-router-dom"

import { Panel } from "@/components/panel"
import { cn } from "@/lib/utils"
import type { MonitorWithLatest } from "@/types"

interface Stats {
  total: number
  paused: number
  active: number
  up: number
  down: number
  pending: number
  avgResponseMs: number | null
}

function computeStats(monitors: MonitorWithLatest[]): Stats {
  let paused = 0
  let up = 0
  let down = 0
  let pending = 0
  let responseSum = 0
  let responseCount = 0

  for (const m of monitors) {
    if (m.paused) {
      paused++
      continue
    }
    if (!m.latest) {
      pending++
      continue
    }
    if (m.latest.status === "up") up++
    else if (m.latest.status === "down") down++
    if (m.latest.status === "up" && m.latest.responseTimeMs != null) {
      responseSum += m.latest.responseTimeMs
      responseCount++
    }
  }

  return {
    total: monitors.length,
    paused,
    active: monitors.length - paused,
    up,
    down,
    pending,
    avgResponseMs: responseCount === 0 ? null : Math.round(responseSum / responseCount),
  }
}

// Monitors that have reported at least once and aren't paused. Used as the
// uptime-percentage denominator so we don't show "0% up" while pending.
function reportingCount(stats: Stats): number {
  return stats.up + stats.down
}

export function SectionCards({ monitors }: { monitors: MonitorWithLatest[] }) {
  const stats = useMemo(() => computeStats(monitors), [monitors])
  const reporting = reportingCount(stats)
  const uptimePct =
    reporting === 0 ? null : Math.round((stats.up / reporting) * 100)

  return (
    <div className="px-4 lg:px-6">
      <Panel className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-border/60">
        <StatCell
          label="Active monitors"
          value={`${stats.active}`}
          valueSuffix={`/ ${stats.total}`}
          sub={
            stats.total === 0
              ? "No monitors yet"
              : stats.paused > 0 || stats.pending > 0
                ? `${stats.paused} paused · ${stats.pending} pending`
                : "All scheduled"
          }
          className="border-b border-border/60 lg:border-b-0 border-r lg:border-r-0"
        />
        <StatCell
          label="Uptime"
          value={uptimePct == null ? "—" : `${uptimePct}%`}
          tone={
            uptimePct == null ? "muted" : uptimePct === 100 ? "success" : "warn"
          }
          sub={
            reporting === 0
              ? "Waiting for heartbeats"
              : `${stats.up} of ${reporting} reporting healthy`
          }
          className="border-b border-border/60 lg:border-b-0"
        />
        <StatCell
          to={stats.down > 0 ? "/admin/incidents" : undefined}
          label="Down"
          value={String(stats.down)}
          tone={stats.down > 0 ? "destructive" : "muted"}
          sub={stats.down === 0 ? "Nothing failing right now" : "Open incidents →"}
          className="border-r border-border/60 lg:border-r-0"
        />
        <StatCell
          label="Avg response"
          value={stats.avgResponseMs == null ? "—" : String(stats.avgResponseMs)}
          valueSuffix={stats.avgResponseMs == null ? undefined : "ms"}
          sub="Latest heartbeat per healthy monitor"
        />
      </Panel>
    </div>
  )
}

function StatCell({
  to,
  label,
  value,
  valueSuffix,
  sub,
  tone = "default",
  className,
}: {
  to?: string
  label: string
  value: string
  valueSuffix?: string
  sub: string
  tone?: "default" | "success" | "destructive" | "warn" | "muted"
  className?: string
}) {
  const valueTone =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "warn"
          ? "text-warning"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground"

  const body = (
    <div
      className={cn(
        "flex flex-col gap-2.5 p-4 sm:p-5 transition-colors",
        to && "cursor-pointer hover:bg-muted/40",
        className,
      )}
    >
      <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-3xl font-semibold tracking-tight tabular-nums", valueTone)}>
          {value}
        </span>
        {valueSuffix && (
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {valueSuffix}
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground line-clamp-1">{sub}</div>
    </div>
  )

  if (!to) return body
  return <Link to={to}>{body}</Link>
}
