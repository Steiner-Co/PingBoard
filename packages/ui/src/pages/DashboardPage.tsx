import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Icon } from '@/components/ui/icon'
import Pulse from '@solar-icons/react/csr/medicine/Pulse'
import AddSquare from '@solar-icons/react/csr/ui/AddSquare'
import Magnifier from '@solar-icons/react/csr/search/Magnifier'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, schema as monitorRowSchema } from '@/components/data-table'
import { FleetChart } from '@/components/fleet-chart'
import { QueryError } from '@/components/QueryError'
import { Skeleton } from '@/components/ui/skeleton'
import { Panel } from '@/components/panel'
import { SectionCards } from '@/components/section-cards'
import { cn, formatDuration, formatInterval, formatRelative } from '@/lib/utils'
import { api } from '@/lib/api'
import { useSSE, type HeartbeatPayload } from '@/lib/sse'
import { useNow } from '@/hooks/use-now'
import type { MonitorWithLatest } from '@/types'

type MonitorRow = z.infer<typeof monitorRowSchema>

function rowStatus(monitor: MonitorWithLatest): string {
  if (monitor.paused) return 'PAUSED'
  if (!monitor.latest) return 'PENDING'
  return monitor.latest.status.toUpperCase()
}

function toRows(monitors: MonitorWithLatest[]): MonitorRow[] {
  return monitors.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type.toUpperCase(),
    status: rowStatus(m),
    target: m.target,
    interval: formatInterval(m.intervalSeconds),
    responseMs: m.latest?.responseTimeMs ?? null,
    lastCheck: m.latest ? formatRelative(m.latest.checkedAt) : null,
    tags: m.tags,
  }))
}

type StatusFilter = 'all' | 'down' | 'up' | 'paused' | 'pending'

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'down', label: 'Down' },
  { id: 'up', label: 'Up' },
  { id: 'pending', label: 'Pending' },
  { id: 'paused', label: 'Paused' },
]

interface FeedItem {
  key: string
  monitorId: string
  status: 'up' | 'down' | 'degraded'
  responseTimeMs: number | null
  at: number
}

interface IncidentRow {
  id: string
  monitorId: string
  monitorName: string
  startedAt: string
  resolvedAt: string | null
  cause: 'auto' | 'manual'
  note: string | null
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['monitors'],
    queryFn: () => api.get<{ monitors: MonitorWithLatest[] }>('/api/admin/monitors'),
  })

  const [feed, setFeed] = useState<FeedItem[]>([])

  // Live updates: any heartbeat/incident event invalidates the list; heartbeats
  // additionally stream into the activity rail.
  useSSE('/api/admin/sse', {
    heartbeat: (payload: HeartbeatPayload) => {
      setFeed((prev) =>
        [
          {
            key: `${payload.monitorId}-${payload.result.checkedAt}-${prev.length}`,
            monitorId: payload.monitorId,
            status: payload.result.status,
            responseTimeMs: payload.result.responseTimeMs,
            at: Date.now(),
          },
          ...prev,
        ].slice(0, 8),
      )
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
    },
    'incident.opened': () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      void queryClient.invalidateQueries({ queryKey: ['incidents'] })
    },
    'incident.resolved': () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      void queryClient.invalidateQueries({ queryKey: ['incidents'] })
    },
  })

  // Domains have their own portfolio screen — the uptime dashboard is about
  // up/down checks, and a domain's expiry isn't that signal.
  const monitors = (query.data?.monitors ?? []).filter((m) => m.type !== 'domain')
  // Re-derive on the shared clock so "last check" keeps counting between
  // heartbeats instead of freezing at first render.
  const now = useNow()
  const allRows = useMemo(() => toRows(monitors), [monitors, now])
  const nameById = useMemo(
    () => new Map(monitors.map((m) => [m.id, m.name])),
    [monitors],
  )

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRows.filter((r) => {
      if (statusFilter !== 'all' && r.status.toLowerCase() !== statusFilter) {
        return false
      }
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.target.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [allRows, search, statusFilter])

  if (query.isPending) return <DashboardSkeleton />
  if (query.isError) {
    return (
      <div className="px-4 lg:px-6">
        <QueryError subject="monitors" onRetry={() => void query.refetch()} />
      </div>
    )
  }
  if (query.isSuccess && monitors.length === 0) {
    return <EmptyDashboard />
  }

  return (
    <>
      <SectionCards monitors={monitors} />
      <div className="grid gap-6 px-4 lg:px-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <FleetChart />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Icon
                icon={Magnifier}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, target, or tag…"
                className="pl-7"
                aria-label="Search monitors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs font-medium outline-none',
                    'transition-[color,background-color,border-color,transform] duration-150 ease-out',
                    'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.98]',
                    statusFilter === f.id
                      ? 'border-foreground/20 bg-foreground text-background'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                  aria-pressed={statusFilter === f.id}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <DataTable data={rows} />
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <LiveActivity feed={feed} nameById={nameById} />
          <RecentIncidents nameById={nameById} />
        </aside>
      </div>
    </>
  )
}

function LiveActivity({
  feed,
  nameById,
}: {
  feed: FeedItem[]
  nameById: Map<string, string>
}) {
  return (
    <Panel>
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <h2 className="text-sm font-medium">Activity</h2>
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-success">
          <span className="relative inline-flex size-1.5">
            {/* Keyed on the newest item so the ring replays once per arrival
                instead of looping forever. */}
            <span
              key={feed[0]?.key ?? 'idle'}
              className="absolute inset-0 rounded-full bg-success opacity-50 motion-safe:animate-ping"
              style={{ animationDuration: '1.2s', animationIterationCount: 1 }}
            />
            <span className="relative inline-block size-1.5 rounded-full bg-success" />
          </span>
          Live
        </span>
      </header>
      {feed.length === 0 ? (
        <p className="px-4 py-5 text-xs text-muted-foreground">
          Waiting for the next heartbeat — checks stream in here as they land.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {feed.map((item) => (
            <li
              key={item.key}
              className="grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-200 ease-out motion-safe:starting:grid-rows-[0fr] motion-safe:starting:opacity-0"
            >
              <div className="flex items-center gap-2.5 overflow-hidden px-4 py-2">
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  item.status === 'up'
                    ? 'bg-success'
                    : item.status === 'down'
                      ? 'bg-destructive'
                      : 'bg-warning',
                )}
              />
              <span className="min-w-0 flex-1 truncate text-xs">
                {nameById.get(item.monitorId) ?? 'Monitor'}
              </span>
              <span
                className={cn(
                  'shrink-0 font-mono text-[11px] tabular-nums',
                  item.status === 'up'
                    ? 'text-muted-foreground'
                    : item.status === 'down'
                      ? 'text-destructive'
                      : 'text-warning',
                )}
              >
                {item.responseTimeMs == null
                  ? item.status.toUpperCase()
                  : `${item.responseTimeMs} ms`}
              </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function RecentIncidents({ nameById }: { nameById: Map<string, string> }) {
  const query = useQuery({
    queryKey: ['incidents'],
    queryFn: () => api.get<{ incidents: IncidentRow[] }>('/api/admin/incidents'),
  })
  const incidents = (query.data?.incidents ?? []).slice(0, 4)
  const now = useNow()

  return (
    <Panel>
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <h2 className="text-sm font-medium">Recent incidents</h2>
        <Link
          to="/admin/incidents"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all →
        </Link>
      </header>
      {query.isError ? (
        <p className="px-4 py-5 text-xs text-destructive">
          Couldn't load incidents.{' '}
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="underline underline-offset-4"
          >
            Retry
          </button>
        </p>
      ) : incidents.length === 0 ? (
        <p className="px-4 py-5 text-xs text-muted-foreground">
          No incidents on record. Quiet is good.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {incidents.map((i) => {
            const open = !i.resolvedAt
            const started = new Date(i.startedAt)
            const durationMs = open
              ? now - started.getTime()
              : new Date(i.resolvedAt!).getTime() - started.getTime()
            return (
              <li key={i.id} className="space-y-0.5 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      open ? 'bg-destructive' : 'bg-muted-foreground/50',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {i.monitorName || nameById.get(i.monitorId) || 'Monitor'}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {formatRelative(i.startedAt)}
                  </span>
                </div>
                <div className="pl-3.5 text-[11px] text-muted-foreground">
                  {open ? 'Ongoing' : `Lasted ${formatDuration(durationMs)}`}
                  {i.note ? ` — ${i.note}` : ''}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="px-4 lg:px-6">
        <Panel className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-border/60">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2.5 p-4 sm:p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </Panel>
      </div>
      <div className="grid gap-6 px-4 lg:px-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel className="p-4">
            <Skeleton className="h-[150px] w-full" />
          </Panel>
          <Panel className="divide-y divide-border/60">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            ))}
          </Panel>
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <Panel className="p-4">
            <Skeleton className="h-24 w-full" />
          </Panel>
          <Panel className="p-4">
            <Skeleton className="h-24 w-full" />
          </Panel>
        </aside>
      </div>
    </>
  )
}

function EmptyDashboard() {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 rounded-none border border-dashed bg-card/50 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon icon={Pulse} className="h-6 w-6" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight">No monitors yet</h2>
          <p className="text-muted-foreground text-sm">
            Add your first check to start tracking uptime. The dashboard will
            light up as soon as the first heartbeat lands — usually within a
            couple of seconds.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/monitors/new" className="gap-2">
            <Icon icon={AddSquare} className="h-4 w-4" />
            Add your first check
          </Link>
        </Button>
      </div>
    </div>
  )
}
