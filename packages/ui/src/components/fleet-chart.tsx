import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Panel } from "@/components/panel"
import { api } from "@/lib/api"

interface SummaryBucket {
  bucket: number
  avgMs: number | null
  checks: number
  down: number
}

const chartConfig = {
  ms: { label: "Avg response", color: "var(--success)" },
} satisfies ChartConfig

export function FleetChart() {
  const query = useQuery({
    queryKey: ["heartbeat-summary"],
    queryFn: () =>
      api.get<{ buckets: SummaryBucket[] }>("/api/admin/heartbeats/summary"),
    refetchInterval: 60_000,
  })

  const data = useMemo(
    () =>
      (query.data?.buckets ?? [])
        .filter((b) => b.avgMs != null)
        .map((b) => ({
          time: new Date(b.bucket).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }),
          ms: Math.round(b.avgMs!),
          down: b.down,
        })),
    [query.data],
  )

  return (
    <Panel>
      <header className="flex items-baseline justify-between border-b border-border/60 px-4 py-2.5">
        <h2 className="text-sm font-medium">Response time</h2>
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Fleet avg · 24h
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
          <ChartContainer config={chartConfig} className="aspect-auto h-[150px] w-full">
            <AreaChart data={data} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="fillFleetMs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-ms)" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="var(--color-ms)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={48}
                fontSize={10}
                className="font-mono"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                unit="ms"
                width={44}
                className="font-mono"
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                dataKey="ms"
                type="monotone"
                fill="url(#fillFleetMs)"
                stroke="var(--color-ms)"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </Panel>
  )
}
