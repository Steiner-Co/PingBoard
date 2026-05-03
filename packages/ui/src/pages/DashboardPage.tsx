import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

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

  return (
    <>
      <SectionCards monitors={monitors} />
      <DataTable data={rows} />
    </>
  )
}
