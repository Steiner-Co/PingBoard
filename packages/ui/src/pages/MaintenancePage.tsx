import { Fragment } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import TrashBinTrash from '@solar-icons/react/csr/ui/TrashBinTrash'
import LinkIcon from '@solar-icons/react/csr/text-formatting/Link'
import Calendar from '@solar-icons/react/csr/time/Calendar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { Panel } from '@/components/panel'
import { QueryError } from '@/components/QueryError'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/confirm-provider'
import { api } from '@/lib/api'
import { useNow } from '@/hooks/use-now'
import { cn, formatDateTime, formatDateTimeRange, formatDuration } from '@/lib/utils'

interface MaintenanceWindow {
  id: string
  monitorId: string
  monitorName: string
  title: string
  description: string | null
  startsAt: string
  endsAt: string
}

const DAY_MS = 86_400_000
const TIMELINE_DAYS = 14

const INTRO =
  "Suppress alerts during scheduled downtime. Windows still record real heartbeats — they just don't page you."

export function MaintenancePage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const query = useQuery({
    queryKey: ['maintenance-windows'],
    queryFn: () =>
      api.get<{ windows: MaintenanceWindow[] }>('/api/admin/maintenance-windows'),
  })

  const remove = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/admin/maintenance-windows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] })
      toast.success('Maintenance window removed')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to remove'),
  })

  const windows = query.data?.windows ?? []
  const now = useNow()

  const active = windows.filter((w) => {
    const start = new Date(w.startsAt).getTime()
    const end = new Date(w.endsAt).getTime()
    return start <= now && end >= now
  })
  const upcoming = windows
    .filter((w) => new Date(w.startsAt).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
  const past = windows
    .filter((w) => new Date(w.endsAt).getTime() < now)
    .sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime())

  if (query.isError) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <p className="text-muted-foreground">{INTRO}</p>
        <QueryError
          subject="maintenance windows"
          onRetry={() => void query.refetch()}
        />
      </div>
    )
  }

  if (query.isLoading) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <p className="text-muted-foreground">{INTRO}</p>
        <Panel className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-border/60">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2.5 p-4 sm:p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </Panel>
        <Panel>
          <div className="p-4">
            <Skeleton className="h-24 w-full" />
          </div>
        </Panel>
      </div>
    )
  }

  if (windows.length === 0) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <p className="text-muted-foreground">{INTRO}</p>
        <EmptyState
          icon={Calendar}
          title="No maintenance windows scheduled"
          description="Windows are scheduled from a monitor's detail page — open the monitor you're planning downtime for and add one under Maintenance windows."
          action={
            <Button asChild>
              <Link to="/admin/monitors">Go to monitors</Link>
            </Button>
          }
        />
      </div>
    )
  }

  // Total downtime already planned inside the timeline horizon — the number
  // that answers "how much am I signing up for this fortnight?".
  const t0 = startOfDay(now)
  const t1 = t0 + TIMELINE_DAYS * DAY_MS
  const plannedMs = windows.reduce((sum, w) => {
    const s = Math.max(new Date(w.startsAt).getTime(), t0)
    const e = Math.min(new Date(w.endsAt).getTime(), t1)
    return sum + Math.max(0, e - s)
  }, 0)

  const nextUp = upcoming[0]

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6">
      <p className="text-muted-foreground">{INTRO}</p>

      <Panel className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-border/60">
        <StatCell
          label="Active now"
          value={String(active.length)}
          tone={active.length > 0 ? 'warn' : 'muted'}
          sub={
            active.length === 0
              ? 'No alerts suppressed'
              : active.length === 1
                ? `${active[0]!.monitorName} — alerts muted`
                : 'Alerts muted on these monitors'
          }
          className="border-b border-border/60 lg:border-b-0 border-r lg:border-r-0"
        />
        <StatCell
          label="Scheduled ahead"
          value={String(upcoming.length)}
          sub={
            nextUp
              ? `Next: ${formatDateTime(nextUp.startsAt)}`
              : 'Nothing on the calendar'
          }
          className="border-b border-border/60 lg:border-b-0"
        />
        <StatCell
          label="Planned downtime"
          value={plannedMs === 0 ? '—' : formatDuration(plannedMs)}
          tone={plannedMs === 0 ? 'muted' : 'default'}
          sub={`Across the next ${TIMELINE_DAYS} days`}
          className="border-r border-border/60 lg:border-r-0"
        />
        <StatCell
          label="Completed"
          value={String(past.length)}
          tone="muted"
          sub={
            past.length === 0
              ? 'None on record yet'
              : `Last ended ${formatDateTime(past[0]!.endsAt)}`
          }
        />
      </Panel>

      <Timeline windows={windows} now={now} />

      {active.length > 0 && (
        <WindowList
          label="In progress"
          count={`${active.length} active`}
          windows={active}
          now={now}
          onDelete={(w) =>
            void confirm({
              title: `End "${w.title}" now?`,
              description: 'Alerts during this window will resume immediately.',
              confirmLabel: 'End window',
              destructive: true,
            }).then((ok) => ok && remove.mutate(w.id))
          }
        />
      )}

      <WindowList
        label="Upcoming"
        count={upcoming.length === 0 ? 'None scheduled' : `${upcoming.length} scheduled`}
        windows={upcoming}
        now={now}
        empty="Nothing scheduled ahead. Add a window from a monitor's detail page."
        onDelete={(w) =>
          void confirm({
            title: `Cancel "${w.title}"?`,
            description: 'You can always schedule another one later.',
            confirmLabel: 'Cancel window',
            destructive: true,
          }).then((ok) => ok && remove.mutate(w.id))
        }
      />

      {past.length > 0 && (
        <WindowList
          label="Past"
          count={`${past.length} completed${past.length > 50 ? ' · last 50 shown' : ''}`}
          windows={past.slice(0, 50)}
          now={now}
          onDelete={(w) =>
            void confirm({
              title: `Delete "${w.title}"?`,
              description: 'Past windows can be removed for cleanliness.',
              confirmLabel: 'Delete',
              destructive: true,
            }).then((ok) => ok && remove.mutate(w.id))
          }
        />
      )}
    </div>
  )
}

// Countdowns re-render on the shared 30s clock, so second-level precision
// would visibly flicker; and at the far end "95h 59m" is harder to read at a
// glance than "4d". Window *lengths* keep using formatDuration, matching how
// incident durations are rendered elsewhere.
function formatCountdown(ms: number): string {
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'under a minute'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 48) {
    const rem = min % 60
    return rem === 0 ? `${hr}h` : `${hr}h ${rem}m`
  }
  return `${Math.round(hr / 24)}d`
}

function startOfDay(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

interface Bar {
  window: MaintenanceWindow
  lane: number
  leftPct: number
  widthPct: number
  active: boolean
}

// Places each window on the 14-day track and packs overlapping ones into
// stacked lanes, so two windows on the same afternoon stay readable.
function buildBars(
  windows: MaintenanceWindow[],
  t0: number,
  t1: number,
  now: number,
): { bars: Bar[]; lanes: number } {
  const span = t1 - t0
  const items = windows
    .map((w) => ({
      window: w,
      start: Math.max(new Date(w.startsAt).getTime(), t0),
      end: Math.min(new Date(w.endsAt).getTime(), t1),
      rawStart: new Date(w.startsAt).getTime(),
      rawEnd: new Date(w.endsAt).getTime(),
    }))
    .filter((x) => x.rawEnd > t0 && x.rawStart < t1)
    .sort((a, b) => a.start - b.start)

  // A 30-minute window is a sliver; reserve a minimum slot when packing so a
  // neighbouring window doesn't get placed visually on top of it.
  const minSlotMs = span * 0.03
  const laneEnds: number[] = []
  const bars: Bar[] = items.map((item) => {
    const slotEnd = Math.max(item.end, item.start + minSlotMs)
    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(slotEnd)
    } else {
      laneEnds[lane] = slotEnd
    }
    return {
      window: item.window,
      lane,
      leftPct: ((item.start - t0) / span) * 100,
      widthPct: Math.max(((item.end - item.start) / span) * 100, 1.5),
      active: item.rawStart <= now && item.rawEnd >= now,
    }
  })

  return { bars, lanes: Math.max(laneEnds.length, 1) }
}

function Timeline({
  windows,
  now,
}: {
  windows: MaintenanceWindow[]
  now: number
}) {
  const t0 = startOfDay(now)
  const t1 = t0 + TIMELINE_DAYS * DAY_MS
  const { bars, lanes } = buildBars(windows, t0, t1, now)
  const days = Array.from({ length: TIMELINE_DAYS }, (_, i) => new Date(t0 + i * DAY_MS))
  const nowPct = ((now - t0) / (t1 - t0)) * 100
  const laneH = 22
  // Floor the track height so a single window doesn't leave the band looking
  // like a collapsed strip.
  const trackH = Math.max(lanes * laneH + 6, 56)

  return (
    <Panel>
      <header className="flex items-baseline justify-between gap-4 border-b border-border/60 px-4 py-2.5">
        <h2 className="text-sm font-medium">Next {TIMELINE_DAYS} days</h2>
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground tabular-nums">
          {bars.length === 0
            ? 'Clear'
            : `${bars.length} ${bars.length === 1 ? 'window' : 'windows'}`}
        </span>
      </header>

      <div className="p-4">
        <div className="relative" style={{ height: trackH }}>
          {/* Day gridlines — the calendar the bars are read against. */}
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${TIMELINE_DAYS}, minmax(0, 1fr))` }}
            aria-hidden
          >
            {days.map((d, i) => (
              <div
                key={i}
                className={cn(
                  'border-l border-border/40 first:border-l-0',
                  // Weekends read as slightly recessed, which makes "is this
                  // downtime on a Saturday?" answerable without counting.
                  (d.getDay() === 0 || d.getDay() === 6) && 'bg-muted/30',
                )}
              />
            ))}
          </div>

          {bars.map((b) => {
            // A 2h window inside a 14-day span is under 1% wide — far too
            // narrow for text. Those get the label set beside the bar
            // instead, flipped to the left half once the bar sits late in
            // the fortnight so it never runs off the track.
            const labelInside = b.widthPct >= 9
            const flip = b.leftPct > 55
            const tooltip = `${b.window.title} · ${b.window.monitorName} · ${formatDateTimeRange(
              b.window.startsAt,
              b.window.endsAt,
            )}`
            return (
              <Fragment key={b.window.id}>
                <div
                  title={tooltip}
                  className={cn(
                    'absolute overflow-hidden border',
                    b.active
                      ? 'border-warning/70 bg-warning/35'
                      : 'border-warning/50 bg-warning/15',
                  )}
                  style={{
                    left: `${b.leftPct}%`,
                    width: `${b.widthPct}%`,
                    minWidth: 6,
                    top: b.lane * laneH + 3,
                    height: 18,
                  }}
                >
                  {labelInside && (
                    <span className="block truncate px-1.5 text-[10px] font-medium leading-[16px] text-warning">
                      {b.window.title}
                    </span>
                  )}
                </div>
                {!labelInside && (
                  <span
                    title={tooltip}
                    className="pointer-events-none absolute max-w-[60%] truncate text-[10px] leading-[18px] text-muted-foreground"
                    style={{
                      top: b.lane * laneH + 3,
                      ...(flip
                        ? { right: `calc(${100 - b.leftPct}% + 6px)` }
                        : { left: `calc(${b.leftPct + b.widthPct}% + 6px)` }),
                    }}
                  >
                    {b.window.title}
                  </span>
                )}
              </Fragment>
            )
          })}

          {/* "Now" hairline. */}
          {nowPct >= 0 && nowPct <= 100 && (
            <div
              className="pointer-events-none absolute -top-1 bottom-0 w-px bg-primary"
              style={{ left: `${nowPct}%` }}
              aria-hidden
            >
              <div className="absolute -left-[2px] -top-[3px] h-[5px] w-[5px] rounded-full bg-primary" />
            </div>
          )}

          {bars.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">
                No downtime scheduled in the next {TIMELINE_DAYS} days.
              </span>
            </div>
          )}
        </div>

        <div
          className="mt-2 grid border-t border-border/40 pt-1.5"
          style={{ gridTemplateColumns: `repeat(${TIMELINE_DAYS}, minmax(0, 1fr))` }}
        >
          {days.map((d, i) => (
            <div
              key={i}
              className={cn(
                'text-center font-mono text-[10px] tabular-nums',
                i === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              <span className="hidden sm:inline">
                {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
              </span>
              <span className="sm:ml-1">{d.getDate()}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function WindowList({
  label,
  count,
  windows,
  now,
  empty,
  onDelete,
}: {
  label: string
  count: string
  windows: MaintenanceWindow[]
  now: number
  empty?: string
  onDelete: (w: MaintenanceWindow) => void
}) {
  return (
    <Panel>
      <header className="flex items-baseline justify-between gap-4 border-b border-border/60 px-4 py-2.5">
        <h2 className="text-sm font-medium">{label}</h2>
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground tabular-nums">
          {count}
        </span>
      </header>

      {windows.length === 0 ? (
        <p className="px-4 py-3.5 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-border/60">
          {windows.map((w) => (
            <WindowRow key={w.id} window={w} now={now} onDelete={onDelete} />
          ))}
        </div>
      )}
    </Panel>
  )
}

function WindowRow({
  window: w,
  now,
  onDelete,
}: {
  window: MaintenanceWindow
  now: number
  onDelete: (w: MaintenanceWindow) => void
}) {
  const start = new Date(w.startsAt).getTime()
  const end = new Date(w.endsAt).getTime()
  const active = start <= now && end >= now
  const future = start > now

  // Relative timing is what you actually want here — "starts in 11h" beats
  // re-reading a date you just read on the line above.
  const countdown = active
    ? `Ends in ${formatCountdown(end - now)}`
    : future
      ? `Starts in ${formatCountdown(start - now)}`
      : null

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 p-4',
        active && 'border-l-2 border-l-warning bg-warning/5',
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{w.title}</span>
          {active && <Badge variant="warning">In progress</Badge>}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="tabular-nums">
            {formatDateTimeRange(w.startsAt, w.endsAt)}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{formatDuration(end - start)}</span>
          {countdown && (
            <>
              <span aria-hidden>·</span>
              <span className={cn('tabular-nums', active && 'text-warning')}>
                {countdown}
              </span>
            </>
          )}
        </div>

        <Link
          to={`/admin/monitors/${w.monitorId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
        >
          <Icon
            icon={LinkIcon}
            className="h-3.5 w-3.5"
          />
          {w.monitorName}
        </Link>

        {w.description && (
          <p className="text-xs text-muted-foreground">{w.description}</p>
        )}
      </div>

      <Button
        size="sm"
        variant="ghost"
        aria-label={`Delete ${w.title}`}
        className="shrink-0 self-start"
        onClick={() => onDelete(w)}
      >
        <Icon icon={TrashBinTrash} className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function StatCell({
  label,
  value,
  sub,
  tone = 'default',
  className,
}: {
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

  return (
    <div className={cn('flex flex-col gap-2.5 p-4 sm:p-5', className)}>
      <div className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-2xl font-semibold tracking-tight tabular-nums',
            valueTone,
          )}
        >
          {value}
        </span>
      </div>
      <div className="text-xs text-muted-foreground line-clamp-1">{sub}</div>
    </div>
  )
}
