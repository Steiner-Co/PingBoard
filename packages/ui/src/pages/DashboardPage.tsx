import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { HugeiconsIcon } from '@hugeicons/react'
import { Activity03Icon, PlusSignCircleIcon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { DataTable, schema as monitorRowSchema } from '@/components/data-table'
import { SectionCards } from '@/components/section-cards'
import { api } from '@/lib/api'
import { useSSE } from '@/lib/sse'
import type { MonitorWithLatest } from '@/types'

type MonitorRow = z.infer<typeof monitorRowSchema>

function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${seconds / 60}m`
  return `${seconds / 3600}h`
}

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
    channel: 'Assign channel',
    tags: m.tags,
  }))
}

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
  const rows = useMemo(() => toRows(monitors), [monitors])

  if (query.isSuccess && monitors.length === 0) {
    return <EmptyDashboard />
  }

  return (
    <>
      <SectionCards monitors={monitors} />
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
