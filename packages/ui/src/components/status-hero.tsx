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

/**
 * Full-width fleet answer to "is everything ok?" — the first thing on the
 * dashboard. Status headline on the left, key numbers on the right.
 */
export function StatusHero({ monitors }: { monitors: MonitorWithLatest[] }) {
  const stats = useMemo(() => computeStats(monitors), [monitors])
  // Monitors that have reported at least once and aren't paused — the
  // uptime-percentage denominator, so we don't show "0% up" while pending.
  const reporting = stats.up + stats.down
  const uptimePct =
    reporting === 0 ? null : Math.round((stats.up / reporting) * 100)

  const state = stats.down > 0 ? "down" : reporting === 0 ? "pending" : "ok"

  return (
    <Panel className="px-5 py-6 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden
            className={cn(
              "size-3 shrink-0 rounded-full",
              state === "down"
                ? "bg-destructive"
                : state === "ok"
                  ? "bg-success"
                  : "bg-warning",
            )}
          />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {state === "down"
                ? `${stats.down} ${stats.down === 1 ? "monitor" : "monitors"} down`
                : state === "ok"
                  ? "All systems operational"
                  : "Waiting for first heartbeats"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {state === "down" ? (
                <Link
                  to="/admin/incidents"
                  className="underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  View open incidents →
                </Link>
              ) : state === "ok" ? (
                `${reporting} ${reporting === 1 ? "monitor" : "monitors"} reporting healthy`
              ) : (
                "Checks appear here as soon as the first one lands."
              )}
            </p>
          </div>
        </div>
        <dl className="flex items-center gap-8 pl-7 sm:gap-10 lg:pl-0">
          <Metric
            label="Uptime"
            value={uptimePct == null ? "—" : `${uptimePct}%`}
            tone={
              uptimePct == null
                ? "muted"
                : uptimePct === 100
                  ? "success"
                  : "warn"
            }
          />
          <Metric
            label="Avg response"
            value={stats.avgResponseMs == null ? "—" : String(stats.avgResponseMs)}
            suffix={stats.avgResponseMs == null ? undefined : "ms"}
          />
          <Metric
            label="Active"
            value={String(stats.active)}
            suffix={`/ ${stats.total}`}
          />
        </dl>
      </div>
    </Panel>
  )
}

function Metric({
  label,
  value,
  suffix,
  tone = "default",
}: {
  label: string
  value: string
  suffix?: string
  tone?: "default" | "success" | "warn" | "muted"
}) {
  const valueTone =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warning"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground"

  return (
    <div className="flex flex-col gap-1.5">
      <dt className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums",
            valueTone,
          )}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {suffix}
          </span>
        )}
      </dd>
    </div>
  )
}
