import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { Activity03Icon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/StatusBadge'
import { api } from '@/lib/api'
import { useSSE } from '@/lib/sse'
import { formatRelative } from '@/lib/utils'
import type { MonitorWithLatest } from '@/types'

export function DashboardPage() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['monitors'],
    queryFn: () => api.get<{ monitors: MonitorWithLatest[] }>('/api/admin/monitors'),
  })

  useSSE('/api/admin/sse', {
    heartbeat: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
    },
    'incident.opened': () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
    },
    'incident.resolved': () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
    },
  })

  const monitors = query.data?.monitors ?? []
  const upCount = monitors.filter((m) => m.latest?.status === 'up').length
  const downCount = monitors.filter((m) => m.latest?.status === 'down').length
  const noDataCount = monitors.filter((m) => !m.latest).length

  return (
    <div className="p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Live status across all monitors.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/monitors/new">
            <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" />
            Add monitor
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Up" value={upCount} tone="success" />
        <SummaryCard label="Down" value={downCount} tone="destructive" />
        <SummaryCard label="No data" value={noDataCount} tone="muted" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monitors</CardTitle>
          <CardDescription>
            {monitors.length === 0
              ? "You haven't added any monitors yet."
              : `${monitors.length} monitor${monitors.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monitors.length === 0 ? (
            <EmptyMonitors />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Last check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monitors.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link
                        to={`/admin/monitors/${m.id}`}
                        className="font-medium hover:underline"
                      >
                        {m.name}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate max-w-md">
                        {m.target}
                      </div>
                    </TableCell>
                    <TableCell className="uppercase text-xs text-muted-foreground">
                      {m.type}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={m.paused ? 'paused' : (m.latest?.status ?? 'unknown')}
                        responseTimeMs={m.latest?.responseTimeMs}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatInterval(m.intervalSeconds)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.latest ? formatRelative(m.latest.checkedAt) : '—'}
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

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'success' | 'destructive' | 'muted'
}) {
  const colors = {
    success: 'text-success',
    destructive: 'text-destructive',
    muted: 'text-muted-foreground',
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-semibold ${colors[tone]}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function EmptyMonitors() {
  return (
    <div className="text-center py-12 space-y-3">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <HugeiconsIcon icon={Activity03Icon} className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-sm text-muted-foreground">
        No monitors yet. Add one to start tracking uptime.
      </div>
      <Button asChild>
        <Link to="/admin/monitors/new">
          <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" />
          Add your first monitor
        </Link>
      </Button>
    </div>
  )
}

function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${seconds / 60}m`
  return `${seconds / 3600}h`
}
