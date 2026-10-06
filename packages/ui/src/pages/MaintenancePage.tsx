import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { Trash } from "@phosphor-icons/react/dist/icons/Trash"
import { LinkSimple } from "@phosphor-icons/react/dist/icons/LinkSimple"
import { CalendarBlank } from "@phosphor-icons/react/dist/icons/CalendarBlank"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { Panel } from '@/components/panel'
import { QueryError } from '@/components/QueryError'
import { ScreenHeader } from '@/components/screen'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/confirm-provider'
import { api } from '@/lib/api'
import { useNow } from '@/hooks/use-now'
import { cn, formatDateTimeRange, formatDuration, formatTime } from '@/lib/utils'

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
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
        <ScreenHeader title="Maintenance" description={INTRO} />
        <QueryError
          subject="maintenance windows"
          onRetry={() => void query.refetch()}
        />
      </div>
    )
  }

  if (query.isLoading) {
    return (
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
        <ScreenHeader title="Maintenance" description={INTRO} />
        <Panel className="overflow-hidden rounded-2xl">
          <div className="p-4">
            <Skeleton className="h-24 w-full" />
          </div>
        </Panel>
      </div>
    )
  }

  if (windows.length === 0) {
    return (
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
        <ScreenHeader title="Maintenance" description={INTRO} />
        <EmptyState
          icon={CalendarBlank}
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

  return (
    <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
      <ScreenHeader title="Maintenance" description={INTRO} />

      <Calendar windows={windows} now={now} />

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

// Monday of the week containing t — the calendar aligns to the real week,
// not a rolling 7-day window, so it reads like the calendar on the wall.
function mondayOf(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7
  return d.getTime() - dow * DAY_MS
}

function Calendar({
  windows,
  now,
}: {
  windows: MaintenanceWindow[]
  now: number
}) {
  const weekStart = mondayOf(now)
  const weekEnd = weekStart + 7 * DAY_MS
  const days = Array.from({ length: 7 }, (_, i) => weekStart + i * DAY_MS)
  const todayStart = startOfDay(now)

  const shown = windows.filter((w) => {
    const s = new Date(w.startsAt).getTime()
    const e = new Date(w.endsAt).getTime()
    return e > weekStart && s < weekEnd
  })

  return (
    <Panel className="overflow-hidden rounded-2xl">
      <header className="flex items-baseline justify-between gap-4 border-b border-border bg-muted px-4 py-3.5">
        <h2 className="text-base font-medium">This week</h2>
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {shown.length === 0
            ? 'Clear'
            : `${shown.length} ${shown.length === 1 ? 'window' : 'windows'}`}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-px bg-border/60 sm:grid-cols-7">
        {days.map((dayStart) => {
          const d = new Date(dayStart)
          const isToday = dayStart === todayStart
          const weekend = d.getDay() === 0 || d.getDay() === 6
          const dayEnd = dayStart + DAY_MS
          const dayWindows = shown
            .filter((w) => {
              const s = new Date(w.startsAt).getTime()
              const e = new Date(w.endsAt).getTime()
              return e > dayStart && s < dayEnd
            })
            .sort(
              (a, b) =>
                new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
            )
          const chips = dayWindows.slice(0, 3)
          const overflow = dayWindows.length - chips.length

          return (
            <div
              key={dayStart}
              className={cn(
                'flex min-h-[120px] flex-col gap-1 bg-card p-2',
                weekend && 'bg-muted/30',
              )}
            >
              <div
                className={cn(
                  'flex items-baseline gap-1 font-mono text-[10px]',
                  isToday ? 'font-semibold text-primary' : 'text-muted-foreground',
                )}
              >
                <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <span className="tabular-nums">{d.getDate()}</span>
                {isToday && (
                  <span aria-hidden className="ml-auto size-1.5 rounded-full bg-primary" />
                )}
              </div>

              {chips.map((w) => {
                const s = new Date(w.startsAt).getTime()
                const e = new Date(w.endsAt).getTime()
                const liveNow = s <= now && e >= now
                const segStart = Math.max(s, dayStart)
                const segEnd = Math.min(e, dayEnd)
                const timing =
                  segStart === dayStart && segEnd === dayEnd
                    ? 'all day'
                    : segStart === dayStart
                      ? `until ${formatTime(w.endsAt)}`
                      : segEnd === dayEnd
                        ? `from ${formatTime(w.startsAt)}`
                        : `${formatTime(w.startsAt)}–${formatTime(w.endsAt)}`
                const tooltip = `${w.title} · ${w.monitorName} · ${formatDateTimeRange(
                  w.startsAt,
                  w.endsAt,
                )}`
                return (
                  <Link
                    key={w.id}
                    to={`/admin/monitors/${w.monitorId}`}
                    title={tooltip}
                    className={cn(
                      'flex flex-col gap-px rounded-md border px-1.5 py-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30',
                      liveNow
                        ? 'border-transparent bg-[var(--nav-active)] text-white'
                        : 'border-border/70 bg-muted/60 text-foreground hover:bg-accent',
                    )}
                  >
                    <span className="truncate text-[11px] font-medium leading-tight">
                      {w.title}
                    </span>
                    <span
                      className={cn(
                        'font-mono text-[9px] tabular-nums',
                        liveNow ? 'text-white/70' : 'text-muted-foreground',
                      )}
                    >
                      {timing}
                    </span>
                  </Link>
                )
              })}
              {overflow > 0 && (
                <span className="px-1.5 text-[10px] tabular-nums text-muted-foreground">
                  +{overflow} more
                </span>
              )}
            </div>
          )
        })}
      </div>

      {shown.length === 0 && (
        <p className="border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
          No downtime scheduled this week.
        </p>
      )}
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
    <Panel className="overflow-hidden rounded-2xl">
      <header className="flex items-baseline justify-between gap-4 border-b border-border bg-muted px-4 py-3.5">
        <h2 className="text-base font-medium">{label}</h2>
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
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
        'flex items-start justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/40',
        active && 'border-l-2 border-l-warning bg-warning/5',
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[15px] font-medium tracking-tight">{w.title}</span>
          {active && <Badge variant="warning">In progress</Badge>}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-muted-foreground">
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
            icon={LinkSimple}
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
        <Icon icon={Trash} className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
