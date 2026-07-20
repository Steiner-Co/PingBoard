import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { CheckmarkCircle01Icon, Edit02Icon, AlertCircleIcon } from '@hugeicons/core-free-icons'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { QueryError } from '@/components/QueryError'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { useSSE } from '@/lib/sse'
import { formatDateTime, formatDuration } from '@/lib/utils'
import { useNow } from '@/hooks/use-now'

interface IncidentRow {
  id: string
  monitorId: string
  monitorName: string
  monitorType: string
  monitorTarget: string
  startedAt: string
  resolvedAt: string | null
  cause: 'auto' | 'manual'
  note: string | null
}

type FilterValue = 'all' | 'open' | 'resolved'

export function IncidentsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterValue>('all')

  const query = useQuery({
    queryKey: ['incidents'],
    queryFn: () => api.get<{ incidents: IncidentRow[] }>('/api/admin/incidents'),
  })

  useSSE('/api/admin/sse', {
    'incident.opened': () => {
      void queryClient.invalidateQueries({ queryKey: ['incidents'] })
    },
    'incident.resolved': () => {
      void queryClient.invalidateQueries({ queryKey: ['incidents'] })
    },
  })

  const all = query.data?.incidents ?? []
  const filtered = all.filter((i) => {
    if (filter === 'open') return !i.resolvedAt
    if (filter === 'resolved') return !!i.resolvedAt
    return true
  })
  const openCount = all.filter((i) => !i.resolvedAt).length

  if (query.isError) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <p className="text-muted-foreground">
          Every down → up transition across all monitors.
        </p>
        <QueryError subject="incidents" onRetry={() => void query.refetch()} />
      </div>
    )
  }

  if (!query.isLoading && all.length === 0) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <p className="text-muted-foreground">
          Every down → up transition across all monitors.
        </p>
        <EmptyState
          icon={CheckmarkCircle01Icon}
          title="No incidents on record"
          description="Quiet is good. When a monitor flips down, it'll appear here with start time, duration, and any notes you add."
        />
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground">
          Every down → up transition across all monitors.
        </p>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open only</SelectItem>
            <SelectItem value="resolved">Resolved only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incidents</CardTitle>
          <CardDescription>
            {openCount} open · {all.length} total (showing last 200)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <HugeiconsIcon icon={AlertCircleIcon} className="h-5 w-5 opacity-50" />
              No incidents match this filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Monitor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i) => (
                  <Row key={i.id} incident={i} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ incident }: { incident: IncidentRow }) {
  const now = useNow()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(incident.note ?? '')

  const saveNote = useMutation({
    mutationFn: (note: string | null) =>
      api.patch(`/api/admin/incidents/${incident.id}`, { note }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incidents'] })
      setEditing(false)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to save note'),
  })

  const resolve = useMutation({
    mutationFn: () => api.post(`/api/admin/incidents/${incident.id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success(`Resolved "${incident.monitorName}"`)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to resolve'),
  })

  const isOpen = !incident.resolvedAt
  const durationMs = incident.resolvedAt
    ? new Date(incident.resolvedAt).getTime() -
      new Date(incident.startedAt).getTime()
    : now - new Date(incident.startedAt).getTime()

  return (
    <TableRow>
      <TableCell>
        <Link
          to={`/admin/monitors/${incident.monitorId}`}
          className="font-medium hover:underline underline-offset-4"
        >
          {incident.monitorName}
        </Link>
        <div className="text-xs text-muted-foreground uppercase">
          {incident.monitorType}
        </div>
      </TableCell>
      <TableCell>
        {isOpen ? (
          <Badge variant="destructive">Open</Badge>
        ) : (
          <Badge variant="secondary">
            Resolved
            {incident.cause === 'manual' && (
              <span className="ml-1 opacity-70">(manual)</span>
            )}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm whitespace-nowrap tabular-nums">
        {formatDateTime(incident.startedAt)}
      </TableCell>
      <TableCell className="text-sm whitespace-nowrap tabular-nums">
        {formatDuration(durationMs)}
        {isOpen && <span className="text-muted-foreground"> (so far)</span>}
      </TableCell>
      <TableCell className="text-sm w-full">
        {editing ? (
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note…"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveNote.mutate(draft.trim() || null)
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <Button
              size="sm"
              onClick={() => saveNote.mutate(draft.trim() || null)}
              disabled={saveNote.isPending}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(incident.note ?? '')
              setEditing(true)
            }}
            className="text-left w-full hover:text-foreground transition-colors flex items-center gap-2"
          >
            <span className={incident.note ? '' : 'text-muted-foreground italic'}>
              {incident.note ?? 'Add a note…'}
            </span>
            <HugeiconsIcon icon={Edit02Icon} className="h-3 w-3 opacity-40" />
          </button>
        )}
      </TableCell>
      <TableCell className="text-right">
        {isOpen && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => resolve.mutate()}
            disabled={resolve.isPending}
          >
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3 w-3" />
            Resolve
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
