import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pause, Play, Trash2 } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

  if (query.isLoading) return <div className="p-8">Loading…</div>
  if (query.isError) return <div className="p-8">Failed to load monitor.</div>
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
    <div className="p-8 space-y-6 max-w-6xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </Button>

      <header className="flex items-start justify-between">
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
            {monitor.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
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
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
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
          <CardHeader className="pb-2">
            <CardDescription>Uptime (last 24h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {uptimePct === null ? '—' : `${uptimePct}%`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last check</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
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
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="ms" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ms"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
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
        <CardContent>
          {incidents.length > 0 && (
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
