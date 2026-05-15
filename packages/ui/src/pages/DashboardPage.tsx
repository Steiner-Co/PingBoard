import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Activity03Icon,
  PlusSignCircleIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, schema as monitorRowSchema } from '@/components/data-table'
import { SectionCards } from '@/components/section-cards'
import { cn, formatInterval } from '@/lib/utils'
import { api } from '@/lib/api'
import { useSSE } from '@/lib/sse'
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

export function DashboardPage() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['monitors'],
    queryFn: () => api.get<{ monitors: MonitorWithLatest[] }>('/api/admin/monitors'),
  })

  // Live updates: any heartbeat/incident event invalidates the list.
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
  const allRows = useMemo(() => toRows(monitors), [monitors])

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

  if (query.isSuccess && monitors.length === 0) {
    return <EmptyDashboard />
  }

  return (
    <>
      <SectionCards monitors={monitors} />
      <div className="px-4 lg:px-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            strokeWidth={2}
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
                'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
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
    </>
  )
}

function EmptyDashboard() {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 rounded-xl border border-dashed bg-card/50 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon icon={Activity03Icon} className="h-6 w-6" strokeWidth={1.75} />
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
            <HugeiconsIcon icon={PlusSignCircleIcon} className="h-4 w-4" />
            Add your first check
          </Link>
        </Button>
      </div>
    </div>
  )
}
