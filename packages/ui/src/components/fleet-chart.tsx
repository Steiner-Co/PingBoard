import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { curveMonotoneX } from "@visx/curve"

import { Area, AreaChart, ChartTooltip, Grid, XAxis } from "@/components/charts"
import { Panel } from "@/components/panel"
import { api } from "@/lib/api"

interface SummaryBucket {
  bucket: number
  avgMs: number | null
  checks: number
  down: number
}

export function FleetChart() {
  const query = useQuery({
    queryKey: ["heartbeat-summary"],
    queryFn: () =>
      api.get<{ buckets: SummaryBucket[] }>("/api/admin/heartbeats/summary"),
    refetchInterval: 60_000,
  })

  // Bklit is time-series native: it wants real Dates on the x key and derives
  // its own ticks, so no pre-formatted label column.
  const data = useMemo(
    () =>
      (query.data?.buckets ?? [])
        .filter((b) => b.avgMs != null)
        .map((b) => ({
          date: new Date(b.bucket),
          ms: Math.round(b.avgMs!),
        })),
    [query.data],
  )

  // Bklit's charts are deliberately axis-light — exact values come from the
  // tooltip. Surfacing the range in the header keeps the line readable at a
  // glance without reintroducing a y-axis that fights that aesthetic.
  const range = useMemo(() => {
    if (data.length === 0) return null
    const values = data.map((d) => d.ms)
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [data])

  return (
    <Panel>
      <header className="flex items-baseline justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <h2 className="text-sm font-medium">Response time</h2>
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {range ? `${range.min}–${range.max} ms · ` : ''}Fleet avg · 24h
        </span>
      </header>
      <div className="px-2 pt-3 pb-1">
        {query.isError ? (
          <div className="flex h-[150px] flex-col items-center justify-center gap-2 text-xs text-destructive">
            Couldn't load response times.
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Retry
            </button>
          </div>
        ) : data.length < 2 ? (
          <div className="flex h-[150px] items-center justify-center text-xs text-muted-foreground">
            Not enough data yet — the chart fills in as checks land.
          </div>
        ) : (
          <AreaChart
            data={data}
            aspectRatio="6 / 1"
            className="min-h-[150px]"
            status={query.isPending ? "loading" : "ready"}
            loadingLabel="Reading heartbeats"
          >
            <Grid horizontal />
            <Area
              dataKey="ms"
              curve={curveMonotoneX}
              strokeWidth={1.5}
              fillOpacity={0.35}
            />
            <XAxis numTicks={5} />
            <ChartTooltip />
          </AreaChart>
        )}
      </div>
    </Panel>
  )
}
