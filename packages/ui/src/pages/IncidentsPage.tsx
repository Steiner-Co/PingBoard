import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import DangerCircle from '@solar-icons/react/csr/ui/DangerCircle'
import Pen from '@solar-icons/react/csr/messages/Pen'
import CheckCircle from '@solar-icons/react/csr/ui/CheckCircle'
import { Bar, BarChart, BarXAxis, ChartTooltip, Grid } from '@/components/charts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { Panel } from '@/components/panel'
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
import { cn, formatDateTime, formatDuration, formatTime } from '@/lib/utils'
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

// The endpoint returns the most recent 200 incidents. When we get exactly that
// many the history is clipped, so "last 30 days" would be a lie — every
// aggregate below is scoped to the range we can actually see and labelled with
// it. See `coverageStart` / `truncated`.
const RECORD_CAP = 200
const WINDOW_DAYS = 30
const MIN_MS = 60_000
const HOUR_MS = 60 * MIN_MS
const DAY_MS = 24 * HOUR_MS

// Bucket widths we're willing to draw, smallest first. We take the smallest one
// that keeps the bar count under MAX_BARS across the span we actually hold
// records for — so a two-hour flap storm gets five-minute bars instead of two
// fat hourly ones, and a full month still gets readable daily bars.
const GRANULARITIES = [
  5 * MIN_MS,
  10 * MIN_MS,
  30 * MIN_MS,
  HOUR_MS,
  3 * HOUR_MS,
  6 * HOUR_MS,
  DAY_MS,
]
const MAX_BARS = 36

// A monitor that fails this often, this briefly, isn't having outages — it's
// flapping. Surfacing that stops one unstable check from reading as a fleet
// on fire, and points at the real fix (thresholds/timeouts, not the service).
const FLAP_MIN_COUNT = 5
const FLAP_MAX_MEDIAN_MS = 120_000

interface Bucket extends Record<string, unknown> {
  label: string
  full: string
  count: number
}

interface Offender {
  monitorId: string
  monitorName: string
  monitorType: string
  count: number
  downtimeMs: number
  medianMs: number | null
  openNow: boolean
  flapping: boolean
}

interface Analytics {
  openCount: number
  windowCount: number
  resolvedCount: number
  medianMs: number | null
  meanMs: number | null
  longest: { ms: number; monitorName: string; monitorId: string; startedAt: string } | null
  buckets: Bucket[]
  granularityMs: number
  spanMs: number
  truncated: boolean
  coverageStart: number
  offenders: Offender[]
  maxOffenderCount: number
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  const hi = sorted[mid] ?? 0
  if (sorted.length % 2 !== 0) return hi
  const lo = sorted[mid - 1] ?? hi
  return Math.round((lo + hi) / 2)
}

const fmtDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

function computeAnalytics(all: IncidentRow[], now: number): Analytics {
  const windowStart = now - WINDOW_DAYS * 24 * HOUR_MS
  const truncated = all.length >= RECORD_CAP
  let oldest = now
  for (const i of all) {
    const t = new Date(i.startedAt).getTime()
    if (t < oldest) oldest = t
  }
  // Clipped history: only claim the span we actually hold records for.
  const coverageStart = truncated ? Math.max(windowStart, oldest) : windowStart

  const inWindow = all.filter((i) => new Date(i.startedAt).getTime() >= coverageStart)

  const durations: number[] = []
  let longest: Analytics['longest'] = null
  for (const i of inWindow) {
    if (!i.resolvedAt) continue
    const ms = new Date(i.resolvedAt).getTime() - new Date(i.startedAt).getTime()
    if (ms <= 0) continue
    durations.push(ms)
    if (!longest || ms > longest.ms) {
      longest = {
        ms,
        monitorName: i.monitorName,
        monitorId: i.monitorId,
        startedAt: i.startedAt,
      }
    }
  }
  durations.sort((a, b) => a - b)
  const meanMs =
    durations.length === 0
      ? null
      : Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)

  // The chart spans only what we hold records for. Padding a clipped history
  // back out to 30 days would draw empty columns for days we know nothing
  // about — a chart that says "quiet" when it means "unknown". With a full
  // history the 30-day axis is real, and its zero days are genuinely quiet
  // ones, which is the context that keeps a lone bar from floating unanchored.
  const spanMs = Math.max(HOUR_MS, now - coverageStart)
  const granularityMs = GRANULARITIES.find((g) => spanMs / g <= MAX_BARS) ?? DAY_MS
  const bucketCount = Math.max(2, Math.ceil(spanMs / granularityMs) + 1)

  const starts: number[] = []
  if (granularityMs >= DAY_MS) {
    // Walk calendar days rather than adding 86.4e6 so DST can't drift a bucket
    // boundary off local midnight.
    const cursor = new Date(now)
    cursor.setHours(0, 0, 0, 0)
    for (let i = 0; i < bucketCount; i++) {
      starts.unshift(cursor.getTime())
      cursor.setDate(cursor.getDate() - 1)
    }
  } else {
    // Sub-day buckets anchor to local midnight so a 30m bucket lands on :00/:30
    // of the wall clock even in a half-hour-offset timezone.
    const midnight = new Date(now)
    midnight.setHours(0, 0, 0, 0)
    const base = midnight.getTime()
    const lastStart = base + Math.floor((now - base) / granularityMs) * granularityMs
    for (let i = 0; i < bucketCount; i++) starts.unshift(lastStart - i * granularityMs)
  }

  const firstStart = starts[0] ?? now
  const counts = new Array<number>(bucketCount).fill(0)
  for (const i of all) {
    const t = new Date(i.startedAt).getTime()
    if (t < firstStart) continue
    let idx = bucketCount - 1
    while (idx > 0 && t < (starts[idx] ?? 0)) idx--
    counts[idx] = (counts[idx] ?? 0) + 1
  }
  const intraday = granularityMs < DAY_MS
  const buckets: Bucket[] = starts.map((start, idx) => ({
    label: intraday ? formatTime(start) : fmtDay.format(start),
    full: intraday ? formatDateTime(start) : fmtDay.format(start),
    count: counts[idx] ?? 0,
  }))

  // Most affected monitors — counted over the same visible window.
  const byMonitor = new Map<
    string,
    { row: IncidentRow; count: number; downtimeMs: number; durations: number[]; openNow: boolean }
  >()
  for (const i of inWindow) {
    let entry = byMonitor.get(i.monitorId)
    if (!entry) {
      entry = { row: i, count: 0, downtimeMs: 0, durations: [], openNow: false }
      byMonitor.set(i.monitorId, entry)
    }
    entry.count++
    if (i.resolvedAt) {
      const ms = new Date(i.resolvedAt).getTime() - new Date(i.startedAt).getTime()
      if (ms > 0) {
        entry.downtimeMs += ms
        entry.durations.push(ms)
      }
    } else {
      entry.openNow = true
      entry.downtimeMs += Math.max(0, now - new Date(i.startedAt).getTime())
    }
  }
  const offenders: Offender[] = [...byMonitor.values()]
    .map((e) => {
      e.durations.sort((a, b) => a - b)
      const med = median(e.durations)
      return {
        monitorId: e.row.monitorId,
        monitorName: e.row.monitorName,
        monitorType: e.row.monitorType,
        count: e.count,
        downtimeMs: e.downtimeMs,
        medianMs: med,
        openNow: e.openNow,
        flapping: e.count >= FLAP_MIN_COUNT && med != null && med < FLAP_MAX_MEDIAN_MS,
      }
    })
    .sort((a, b) => b.count - a.count || b.downtimeMs - a.downtimeMs)

  return {
    openCount: all.filter((i) => !i.resolvedAt).length,
    windowCount: inWindow.length,
    resolvedCount: durations.length,
    medianMs: median(durations),
    meanMs,
    longest,
    buckets,
    granularityMs,
    spanMs,
    truncated,
    coverageStart,
    offenders: offenders.slice(0, 5),
    maxOffenderCount: offenders[0]?.count ?? 0,
  }
}

function granularityLabel(g: number): string {
  if (g >= DAY_MS) return 'Per day'
  if (g >= HOUR_MS) return `Per ${g / HOUR_MS}h`
  return `Per ${g / MIN_MS}m`
}

function spanLabel(ms: number): string {
  if (ms >= DAY_MS) return `${Math.round(ms / DAY_MS)}d`
  if (ms >= HOUR_MS) return `${Math.round(ms / HOUR_MS)}h`
  return `${Math.round(ms / MIN_MS)}m`
}

export function IncidentsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterValue>('all')
  const now = useNow()

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

  const stats = useMemo(() => computeAnalytics(all, now), [all, now])

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
          icon={CheckCircle}
          title="No incidents on record"
          description="Quiet is good. When a monitor flips down, it'll appear here with start time, duration, and any notes you add."
        />
      </div>
    )
  }

  const chartWindowLabel = `${granularityLabel(stats.granularityMs)} · ${spanLabel(stats.spanMs)}`
  const maxBucket = stats.buckets.reduce((m, b) => Math.max(m, b.count), 0)

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6">
      <p className="text-muted-foreground">
        Every down → up transition across all monitors.
      </p>

      {all.length > 0 && (
        <>
          <Panel className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-border/60">
            <StatCell
              label="Open now"
              value={String(stats.openCount)}
              tone={stats.openCount > 0 ? 'destructive' : 'success'}
              sub={
                stats.openCount === 0
                  ? 'Everything has recovered'
                  : filter === 'open'
                    ? 'Showing open only'
                    : 'Filter the table →'
              }
              onClick={
                stats.openCount > 0
                  ? () => setFilter(filter === 'open' ? 'all' : 'open')
                  : undefined
              }
              className="border-b border-border/60 lg:border-b-0 border-r lg:border-r-0"
            />
            <StatCell
              label="Incidents"
              value={String(stats.windowCount)}
              sub={
                stats.truncated
                  ? `Since ${formatDateTime(stats.coverageStart)}`
                  : `In the last ${WINDOW_DAYS} days`
              }
              className="border-b border-border/60 lg:border-b-0"
            />
            <StatCell
              label="Median recovery"
              value={stats.medianMs == null ? '—' : formatDuration(stats.medianMs)}
              tone="default"
              sub={
                stats.medianMs == null
                  ? 'Nothing resolved yet'
                  : `Mean ${formatDuration(stats.meanMs ?? 0)} · ${stats.resolvedCount} resolved`
              }
              className="border-r border-border/60 lg:border-r-0"
            />
            <StatCell
              label="Longest outage"
              value={stats.longest == null ? '—' : formatDuration(stats.longest.ms)}
              tone={stats.longest == null ? 'muted' : 'warn'}
              sub={stats.longest == null ? 'No resolved outages' : stats.longest.monitorName}
              to={
                stats.longest == null
                  ? undefined
                  : `/admin/monitors/${stats.longest.monitorId}`
              }
            />
          </Panel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Panel className="flex flex-col lg:col-span-3">
              <header className="flex items-baseline justify-between gap-3 border-b border-border/60 px-4 py-2.5">
                <h2 className="text-sm font-medium">Incident frequency</h2>
                <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                  {chartWindowLabel}
                </span>
              </header>
              {/* Grows to match the breakdown beside it, so a tall offender
                  list can't leave a dead void under a fixed-height chart. */}
              <div className="min-h-[170px] flex-1 px-2 pt-3 pb-1">
                {stats.windowCount === 0 ? (
                  <div className="flex h-full min-h-[160px] items-center justify-center px-4 text-center text-xs text-muted-foreground">
                    No incidents in this window — nothing to plot.
                  </div>
                ) : (
                  <BarChart
                    data={stats.buckets}
                    xDataKey="label"
                    aspectRatio="3 / 1"
                    className="min-h-[160px]"
                  >
                    <Grid horizontal />
                    <Bar dataKey="count" fill="var(--destructive)" />
                    <BarXAxis maxLabels={8} />
                    <ChartTooltip />
                  </BarChart>
                )}
              </div>
              {stats.truncated && (
                <p className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
                  History is capped at {RECORD_CAP} records — anything before{' '}
                  <span className="tabular-nums">
                    {formatDateTime(stats.coverageStart)}
                  </span>{' '}
                  isn't charted.
                </p>
              )}
            </Panel>

            <Panel className="lg:col-span-2">
              <header className="flex items-baseline justify-between gap-3 border-b border-border/60 px-4 py-2.5">
                <h2 className="text-sm font-medium">Most affected</h2>
                <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                  By incidents
                </span>
              </header>
              <div className="divide-y divide-border/60">
                {stats.offenders.map((o) => (
                  <OffenderRow key={o.monitorId} offender={o} max={stats.maxOffenderCount} />
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Incidents</CardTitle>
          <CardDescription>
            {openCount} open · {all.length} total (showing last {RECORD_CAP})
          </CardDescription>
          <CardAction>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
              <SelectTrigger className="w-[140px]" aria-label="Filter incidents">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open only</SelectItem>
                <SelectItem value="resolved">Resolved only</SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Icon icon={DangerCircle} className="h-5 w-5 opacity-50" />
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

// Mirrors the dashboard's SectionCards stat cell. Duplicated rather than
// imported because that component owns its own props shape (monitor stats);
// the visual contract — mono micro-label, tabular value, tone ramp — is kept
// identical on purpose.
function StatCell({
  to,
  onClick,
  label,
  value,
  sub,
  tone = 'default',
  className,
}: {
  to?: string
  onClick?: () => void
  label: string
  value: string
  sub: string
  tone?: 'default' | 'success' | 'destructive' | 'warn' | 'muted'
  className?: string
}) {
  const valueTone =
    tone === 'success'
      ? 'text-success'
      : tone === 'destructive'
        ? 'text-destructive'
        : tone === 'warn'
          ? 'text-warning'
          : tone === 'muted'
            ? 'text-muted-foreground'
            : 'text-foreground'

  const interactive = Boolean(to || onClick)
  const body = (
    <div
      className={cn(
        'flex flex-col gap-2.5 p-4 sm:p-5 text-left transition-colors',
        interactive && 'cursor-pointer hover:bg-muted/40',
        className,
      )}
    >
      <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-3xl font-semibold tracking-tight tabular-nums',
            valueTone,
          )}
        >
          {value}
        </span>
      </div>
      <div className="text-xs text-muted-foreground line-clamp-1">{sub}</div>
    </div>
  )

  if (to) return <Link to={to}>{body}</Link>
  if (onClick)
    return (
      <button type="button" onClick={onClick} className="block w-full">
        {body}
      </button>
    )
  return body
}

function OffenderRow({ offender, max }: { offender: Offender; max: number }) {
  const share = max > 0 ? Math.max(4, Math.round((offender.count / max) * 100)) : 0

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <Link
          to={`/admin/monitors/${offender.monitorId}`}
          className="truncate text-sm font-medium hover:underline underline-offset-4"
        >
          {offender.monitorName}
        </Link>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {offender.count}
        </span>
      </div>

      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-destructive/70"
          style={{ width: `${share}%` }}
          aria-hidden
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{offender.monitorType}</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums normal-case">
          {formatDuration(offender.downtimeMs)} down
        </span>
        {offender.medianMs != null && (
          <>
            <span aria-hidden>·</span>
            <span className="tabular-nums normal-case">
              med {formatDuration(offender.medianMs)}
            </span>
          </>
        )}
        {offender.openNow && (
          <Badge variant="destructive" className="ml-auto">
            Open
          </Badge>
        )}
        {offender.flapping && (
          <Badge
            variant="warning"
            className={offender.openNow ? undefined : 'ml-auto'}
            title={`${offender.count} short failures (median ${formatDuration(
              offender.medianMs ?? 0,
            )}) — likely an unstable check, not ${offender.count} distinct outages.`}
          >
            Flapping
          </Badge>
        )}
      </div>
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
            <Icon icon={Pen} className="h-3 w-3 opacity-40" />
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
            <Icon icon={CheckCircle} className="h-3 w-3" />
            Resolve
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
