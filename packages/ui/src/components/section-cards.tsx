import { useMemo } from "react"
import { Link } from "react-router-dom"

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Activity03Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  Timer01Icon,
} from "@hugeicons/core-free-icons"
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

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <KpiCard
        to="/admin"
        description="Active monitors"
        value={`${stats.active} / ${stats.total}`}
        line={stats.total === 0 ? 'No monitors yet' : 'Currently scheduled'}
        sub={`${stats.paused} paused, ${stats.pending} awaiting first check`}
        icon={Activity03Icon}
      />
      <KpiCard
        description="Currently up"
        value={
          reporting === 0
            ? '—'
            : `${Math.round((stats.up / reporting) * 100)}%`
        }
        line={
          reporting === 0
            ? 'Waiting for first heartbeats'
            : `${stats.up} of ${reporting} reporting healthy`
        }
        sub="Pending monitors are excluded until they report"
        icon={CheckmarkCircle01Icon}
      />
      <KpiCard
        to={stats.down > 0 ? '/admin/incidents' : undefined}
        description="Currently down"
        value={String(stats.down)}
        line={stats.down === 0 ? 'Nothing failing right now' : 'Failing checks'}
        sub="Paused monitors are excluded"
        icon={AlertCircleIcon}
        tone={stats.down > 0 ? 'destructive' : 'default'}
      />
      <KpiCard
        description="Avg response time"
        value={stats.avgResponseMs == null ? '—' : `${stats.avgResponseMs} ms`}
        line={
          stats.avgResponseMs == null
            ? 'No successful checks yet'
            : 'Mean across healthy monitors'
        }
        sub="Latest heartbeat per monitor"
        icon={Timer01Icon}
      />
    </div>
  )
}

function KpiCard({
  to,
  description,
  value,
  line,
  sub,
  icon,
  tone = 'default',
}: {
  to?: string
  description: string
  value: string
  line: string
  sub: string
  icon: typeof Activity03Icon
  tone?: 'default' | 'destructive'
}) {
  // Cards with a destination become hover-elevated buttons. Cards without one
  // stay static — no fake hover affordance.
  const tint =
    tone === 'destructive'
      ? 'data-[link=true]:hover:border-destructive/30 data-[link=true]:hover:bg-destructive/5'
      : 'data-[link=true]:hover:border-primary/30 data-[link=true]:hover:bg-primary/5'

  const body = (
    <Card
      className={`@container/card transition-colors ${tint}`}
      data-link={to ? 'true' : 'false'}
    >
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {line}{' '}
          <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
        </div>
        <div className="text-muted-foreground">{sub}</div>
      </CardFooter>
    </Card>
  )

  if (!to) return body
  return <Link to={to}>{body}</Link>
}
