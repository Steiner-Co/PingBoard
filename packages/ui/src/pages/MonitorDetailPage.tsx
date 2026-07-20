import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  Edit02Icon,
  MoreVerticalCircle01Icon,
  PauseIcon,
  PlayIcon,
  Settings02Icon,
} from '@hugeicons/core-free-icons'
import { Input } from '@/components/ui/input'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TagInput } from '@/pages/MonitorWizardPage'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/confirm-provider'
import { api } from '@/lib/api'
import { useSSE } from '@/lib/sse'
import {
  formatDateTime,
  formatDateTimeRange,
  formatDuration,
  formatRelative,
  formatTime,
} from '@/lib/utils'
import { useNow } from '@/hooks/use-now'
import { usePageTitle } from '@/layouts/AdminLayout'
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
  const confirm = useConfirm()

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
    onSuccess: (_data, paused) => {
      queryClient.invalidateQueries({ queryKey: ['monitor', id] })
      queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success(paused ? 'Monitor paused' : 'Monitor resumed')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/admin/monitors/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success('Monitor deleted')
      navigate('/admin')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to delete'),
  })

  // Shared clock so "Last check … ago" keeps counting between heartbeats.
  useNow()
  // Name the tab and header after the monitor, not the generic route.
  usePageTitle(query.data?.monitor.name ?? null)

  if (query.isLoading) return <MonitorDetailSkeleton />
  if (query.isError)
    return (
      <div className="px-4 lg:px-6">
        <div className="rounded-none border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Couldn't load this monitor.{' '}
          <button
            type="button"
            onClick={() => query.refetch()}
            className="text-foreground underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      </div>
    )
  if (!query.data) return null

  const { monitor, heartbeats, incidents } = query.data
  const latest = heartbeats[0] ?? null

  const chartData = [...heartbeats]
    .filter((h) => h.responseTimeMs != null)
    .reverse()
    .map((h) => ({
      time: formatTime(h.checkedAt),
      at: h.checkedAt,
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

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight break-words">
            {monitor.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground min-w-0">
            <span className="uppercase shrink-0">{monitor.type}</span>
            <span className="shrink-0">·</span>
            <span className="font-mono truncate">{monitor.target}</span>
          </div>
          <TagsRow monitor={monitor} />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="default" asChild>
            <Link to={`/admin/monitors/${monitor.id}/edit`} className="gap-2">
              <HugeiconsIcon icon={Settings02Icon} className="h-4 w-4" />
              Edit
            </Link>
          </Button>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="More actions"
                disabled={deleteMutation.isPending}
              >
                <HugeiconsIcon
                  icon={MoreVerticalCircle01Icon}
                  className="h-4 w-4"
                  strokeWidth={2}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
                  const ok = await confirm({
                    title: `Delete "${monitor.name}"?`,
                    description:
                      'All heartbeats, incidents, and links to status pages will be removed. This cannot be undone.',
                    confirmLabel: 'Delete monitor',
                    destructive: true,
                  })
                  if (ok) deleteMutation.mutate()
                }}
              >
                <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                Delete monitor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

      {monitor.type === 'push' && <PushUrlCard monitor={monitor} />}

      <MaintenanceWindowsCard monitorId={monitor.id} />

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
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((i) => (
                  <IncidentRow key={i.id} incident={i} monitorId={monitor.id} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

function TagsRow({ monitor }: { monitor: Monitor }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>(monitor.tags)

  const save = useMutation({
    mutationFn: (tags: string[]) =>
      api.patch(`/api/admin/monitors/${monitor.id}`, { tags }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitor', monitor.id] })
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success('Tags updated')
      setEditing(false)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update tags'),
  })

  if (editing) {
    return (
      <div className="mt-3 flex items-start gap-2 max-w-xl">
        <div className="flex-1">
          <TagInput value={draft} onChange={setDraft} id={`tags-${monitor.id}`} />
        </div>
        <Button size="sm" onClick={() => save.mutate(draft)} disabled={save.isPending}>
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setDraft(monitor.tags)
            setEditing(false)
          }}
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {monitor.tags.length === 0 ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition-[color,border-color,transform] duration-150 ease-out hover:border-foreground/30 hover:text-foreground active:scale-[0.98]"
        >
          + Add tags
        </button>
      ) : (
        <>
          {monitor.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-mono text-xs">
              {tag}
            </Badge>
          ))}
          <button
            type="button"
            onClick={() => {
              setDraft(monitor.tags)
              setEditing(true)
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            Edit
          </button>
        </>
      )}
    </div>
  )
}

function IncidentRow({
  incident,
  monitorId,
}: {
  incident: Incident
  monitorId: string
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(incident.note ?? '')

  const saveNote = useMutation({
    mutationFn: (note: string | null) =>
      api.patch(`/api/admin/incidents/${incident.id}`, { note }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitor', monitorId] })
      void queryClient.invalidateQueries({ queryKey: ['incidents'] })
      setEditing(false)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to save note'),
  })

  const resolve = useMutation({
    mutationFn: () => api.post(`/api/admin/incidents/${incident.id}/resolve`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitor', monitorId] })
      void queryClient.invalidateQueries({ queryKey: ['incidents'] })
      toast.success('Incident resolved')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to resolve'),
  })

  const isOpen = !incident.resolvedAt

  return (
    <TableRow>
      <TableCell className="text-sm whitespace-nowrap tabular-nums">
        {formatDateTime(incident.startedAt)}
      </TableCell>
      <TableCell className="text-sm whitespace-nowrap">
        {incident.resolvedAt ? (
          <span>
            {formatDateTime(incident.resolvedAt)}
            {incident.cause === 'manual' && (
              <span className="ml-1 text-xs text-muted-foreground">(manual)</span>
            )}
          </span>
        ) : (
          <span className="text-destructive">Ongoing</span>
        )}
      </TableCell>
      <TableCell className="text-sm whitespace-nowrap">
        {incident.resolvedAt
          ? formatDuration(
              new Date(incident.resolvedAt).getTime() -
                new Date(incident.startedAt).getTime(),
            )
          : '—'}
      </TableCell>
      <TableCell className="text-sm w-full">
        {editing ? (
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. Cloudflare outage, not our fault"
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

function PushUrlCard({ monitor }: { monitor: Monitor }) {
  const token =
    typeof monitor.config.token === 'string' ? monitor.config.token : null
  const url = token ? `${window.location.origin}/api/push/${token}` : null
  const [copied, setCopied] = useState(false)

  if (!url) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push endpoint</CardTitle>
        <CardDescription>
          Have your job POST to this URL on every successful run. PingBoard
          marks the monitor down if it doesn't hear from you within the check
          interval (plus grace period).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
            {url}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(url)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <pre className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 overflow-x-auto">
          {`curl -X POST ${url}`}
        </pre>
      </CardContent>
    </Card>
  )
}

interface MaintenanceWindowRow {
  id: string
  monitorId: string
  title: string
  description: string | null
  startsAt: string
  endsAt: string
}

function MaintenanceWindowsCard({ monitorId }: { monitorId: string }) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState(localDatetimeNow())
  const [endsAt, setEndsAt] = useState(localDatetimePlus(60))
  const [error, setError] = useState<string | null>(null)

  const list = useQuery({
    queryKey: ['maintenance', monitorId],
    queryFn: () =>
      api.get<{ windows: MaintenanceWindowRow[] }>(
        `/api/admin/maintenance-windows?monitorId=${monitorId}`,
      ),
  })

  const create = useMutation({
    mutationFn: (payload: object) =>
      api.post('/api/admin/maintenance-windows', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance', monitorId] })
      toast.success('Maintenance window scheduled')
      setAdding(false)
      setTitle('')
      setDescription('')
      setStartsAt(localDatetimeNow())
      setEndsAt(localDatetimePlus(60))
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/maintenance-windows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', monitorId] })
      toast.success('Maintenance window removed')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to remove'),
  })

  const submit = () => {
    setError(null)
    if (!title.trim()) {
      setError('Title required')
      return
    }
    create.mutate({
      monitorId,
      title: title.trim(),
      description: description.trim() || null,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    })
  }

  const windows = list.data?.windows ?? []
  const now = useNow()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Maintenance windows</CardTitle>
          <CardDescription>
            Suppress alerts during scheduled downtime. The status page shows a
            banner; heartbeats are still recorded honestly.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Cancel' : 'Schedule'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <div className="rounded-md border bg-muted/30 p-4 space-y-3">
            <Input
              placeholder="Title (e.g. Database upgrade)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-muted-foreground space-y-1">
                Start
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </label>
              <label className="text-xs text-muted-foreground space-y-1">
                End
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </label>
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex justify-end">
              <Button size="sm" onClick={submit} disabled={create.isPending}>
                Save window
              </Button>
            </div>
          </div>
        )}

        {windows.length === 0 ? (
          !adding && (
            <div className="text-sm text-muted-foreground">
              No maintenance windows scheduled.
            </div>
          )
        ) : (
          <div className="divide-y">
            {windows.map((w) => {
              const start = new Date(w.startsAt).getTime()
              const end = new Date(w.endsAt).getTime()
              const isActive = start <= now && end >= now
              const isPast = end < now
              return (
                <div
                  key={w.id}
                  className="py-3 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {w.title}
                      {isActive && (
                        <span className="text-[10px] uppercase tracking-wide rounded-full bg-warning/15 text-warning px-2 py-0.5">
                          In progress
                        </span>
                      )}
                      {isPast && (
                        <span className="text-[10px] uppercase tracking-wide rounded-full bg-muted text-muted-foreground px-2 py-0.5">
                          Past
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTimeRange(w.startsAt, w.endsAt)}
                    </div>
                    {w.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {w.description}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${w.title}`}
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Delete "${w.title}"?`,
                        description:
                          'Alerts during this window will resume immediately.',
                        confirmLabel: 'Delete window',
                        destructive: true,
                      })
                      if (ok) remove.mutate(w.id)
                    }}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="h-3 w-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MonitorDetailSkeleton() {
  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6">
      <Skeleton className="h-7 w-32" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative rounded-none border bg-card p-6 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
      <Panel className="p-6 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[260px] w-full" />
      </Panel>
    </div>
  )
}

function localDatetimeNow(): string {
  return toLocalDatetime(new Date())
}

function localDatetimePlus(minutes: number): string {
  return toLocalDatetime(new Date(Date.now() + minutes * 60_000))
}

function toLocalDatetime(d: Date): string {
  // datetime-local expects "YYYY-MM-DDTHH:mm" in the browser's local zone.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
