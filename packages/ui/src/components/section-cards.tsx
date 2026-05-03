import { useMemo } from "react"

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

export function SectionCards({ monitors }: { monitors: MonitorWithLatest[] }) {
  const stats = useMemo(() => computeStats(monitors), [monitors])

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-card *:data-[slot=card]:to-card *:data-[slot=card]:transition-colors *:data-[slot=card]:duration-500 *:data-[slot=card]:shadow-xs *:data-[slot=card]:hover:from-chart-1/15 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active monitors</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.active} / {stats.total}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.total === 0 ? "No monitors yet" : "Currently scheduled"}{" "}
            <HugeiconsIcon icon={Activity03Icon} strokeWidth={2} className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {stats.paused} paused, {stats.pending} awaiting first check
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Currently up</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.active === 0 ? "—" : `${Math.round((stats.up / stats.active) * 100)}%`}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.up} of {stats.active} reporting healthy{" "}
            <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Based on the latest heartbeat per monitor
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Currently down</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.down}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.down === 0 ? "Nothing failing right now" : "Failing checks"}{" "}
            <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Paused monitors are excluded
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Avg response time</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.avgResponseMs == null ? "—" : `${stats.avgResponseMs} ms`}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.avgResponseMs == null
              ? "No successful checks yet"
              : "Mean across healthy monitors"}{" "}
            <HugeiconsIcon icon={Timer01Icon} strokeWidth={2} className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Latest heartbeat per monitor
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
