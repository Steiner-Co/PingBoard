import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, PauseIcon, PlayIcon, Delete02Icon } from '@hugeicons/core-free-icons'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/StatusBadge'
import { api } from '@/lib/api'
import { useSSE } from '@/lib/sse'
import { formatDuration, formatRelative } from '@/lib/utils'
import type { Heartbeat, Incident, Monitor } from '@/types'

interface DetailResponse {
  monitor: Monitor
  heartbeats: Heartbeat[]
  incidents: Incident[]
  channelIds: string[]
}

const chartConfig = {
  ms: {
    label: 'Response time',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

export function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['monitor', id],
    queryFn: () => api.get<DetailResponse>(`/api/admin/monitors/${id}`),
    enabled: !!id,
  })

  useSSE('/api/admin/sse', {
    heartbeat: (payload) => {
      if (payload.monitorId === id) {
        void queryClient.invalidateQueries({ queryKey: ['monitor', id] })
      }
    },
  })

  const togglePause = useMutation({
    mutationFn: (paused: boolean) =>
      api.patch(`/api/admin/monitors/${id}`, { paused }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monitor', id] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/admin/monitors/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      navigate('/admin')
    },
  })

  if (query.isLoading) return <div className="px-4 lg:px-6 text-muted-foreground">Loading…</div>
  if (query.isError) return <div className="px-4 lg:px-6 text-muted-foreground">Failed to load monitor.</div>
  if (!query.data) return null

  const { monitor, heartbeats, incidents } = query.data
  const latest = heartbeats[0] ?? null

  const chartData = [...heartbeats]
    .filter((h) => h.responseTimeMs != null)
    .reverse()
    .map((h) => ({
      time: new Date(h.checkedAt).toLocaleTimeString(),
      ms: h.responseTimeMs,
    }))

  const total = heartbeats.length
  const upCount = heartbeats.filter((h) => h.status === 'up').length
  const uptimePct = total === 0 ? null : ((upCount / total) * 100).toFixed(2)

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start -ml-3">
        <Link to="/admin" className="gap-2">
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
          Back to dashboard
        </Link>
      </Button>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{monitor.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="uppercase">{monitor.type}</span>
            <span>·</span>
            <span className="font-mono">{monitor.target}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => togglePause.mutate(!monitor.paused)}
            disabled={togglePause.isPending}
          >
            {monitor.paused ? (
              <HugeiconsIcon icon={PlayIcon} className="h-4 w-4" />
            ) : (
              <HugeiconsIcon icon={PauseIcon} className="h-4 w-4" />
            )}
            {monitor.paused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(`Delete monitor "${monitor.name}"? This cannot be undone.`)) {
                deleteMutation.mutate()
              }
            }}
            disabled={deleteMutation.isPending}
          >
            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-card *:data-[slot=card]:to-card *:data-[slot=card]:transition-colors *:data-[slot=card]:duration-500 *:data-[slot=card]:shadow-xs *:data-[slot=card]:hover:from-chart-1/15 md:grid-cols-3 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardDescription>Current status</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusBadge
              status={monitor.paused ? 'paused' : (latest?.status ?? 'unknown')}
              responseTimeMs={latest?.responseTimeMs}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Uptime (last 24h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {uptimePct === null ? '—' : `${uptimePct}%`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Last check</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {latest ? formatRelative(latest.checkedAt) : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response time</CardTitle>
          <CardDescription>Last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Waiting for the first successful check…
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
              <AreaChart data={chartData} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="fillResponseMs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-ms)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-ms)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  unit="ms"
                  width={56}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="ms"
                  type="monotone"
                  fill="url(#fillResponseMs)"
                  stroke="var(--color-ms)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Incidents</CardTitle>
          <CardDescription>
            {incidents.length === 0 ? 'No incidents yet.' : `${incidents.length} recent`}
          </CardDescription>
        </CardHeader>
        {incidents.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm">
                      {new Date(i.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {i.resolvedAt ? new Date(i.resolvedAt).toLocaleString() : (
                        <span className="text-destructive">Ongoing</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {i.resolvedAt
                        ? formatDuration(
                            new Date(i.resolvedAt).getTime() -
                              new Date(i.startedAt).getTime(),
                          )
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
