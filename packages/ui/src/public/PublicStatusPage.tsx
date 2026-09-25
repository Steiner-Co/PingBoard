import { useEffect, useMemo, useRef, useState } from 'react'
import { humanDate, UptimeTimeline } from '@/components/uptime-timeline'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { Icon } from '@/components/ui/icon'
import { Sun } from "@phosphor-icons/react/dist/icons/Sun"
import { Moon } from "@phosphor-icons/react/dist/icons/Moon"
import { Desktop } from "@phosphor-icons/react/dist/icons/Desktop"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Panel } from '@/components/panel'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarBlank } from "@phosphor-icons/react/dist/icons/CalendarBlank"
import { useSSE } from '@/lib/sse'
import { useNow } from '@/hooks/use-now'
import {
  cn,
  formatDateTime,
  formatDateTimeRange,
  formatDuration,
  formatRelative,
  formatTime,
} from '@/lib/utils'
import {
  isRichTextBlank,
  richTextToPlainText,
  sanitizeRichText,
} from '@/lib/rich-text'
import { CaretDown } from "@phosphor-icons/react/dist/icons/CaretDown"

type AdminTheme = 'light' | 'dark' | 'auto'

export interface PublicData {
  page: {
    slug: string
    title: string
    description: string | null
    theme: AdminTheme
    logoUrl: string | null
    websiteUrl: string | null
    hideBranding: boolean
    customCss: string | null
  }
  monitors: PublicMonitor[]
  incidents: PublicIncident[]
  maintenance?: MaintenanceWindow[]
}

export interface PublicMonitor {
  id: string
  name: string
  group: string | null
  currentStatus: 'up' | 'down' | 'degraded' | 'unknown'
  uptimePct: number | null
  avgResponseMs: number | null
  timeline: Array<{ date: string; uptimePct: number | null }>
}

interface PublicIncident {
  id: string
  monitorId: string
  monitorName: string
  startedAt: string
  resolvedAt: string | null
  note: string | null
}

interface MaintenanceWindow {
  id: string
  monitorId: string
  title: string
  description: string | null
  startsAt: string
  endsAt: string
}

class GateError extends Error {
  constructor(public kind: 'password' | 'not-found' | 'other') {
    super(kind)
  }
}

async function fetchPublic(slug: string): Promise<PublicData> {
  const res = await fetch(`/api/public/${slug}`, { credentials: 'include' })
  if (res.status === 401) throw new GateError('password')
  if (res.status === 404) throw new GateError('not-found')
  if (!res.ok) throw new GateError('other')
  return (await res.json()) as PublicData
}

export function PublicStatusPage({ slug }: { slug: string }) {
  const queryClient = useQueryClient()
  const { setTheme } = useTheme()
  const query = useQuery({
    queryKey: ['public', slug],
    queryFn: () => fetchPublic(slug),
    refetchInterval: 30_000,
    retry: (count, err) => !(err instanceof GateError) && count < 2,
  })

  useSSE(`/api/public/${slug}/sse`, {
    heartbeat: () => {
      void queryClient.invalidateQueries({ queryKey: ['public', slug] })
    },
  })

  // Apply the admin's stored theme as the default — but only if the visitor
  // hasn't already picked one (i.e. nothing in localStorage yet). 'auto'
  // means follow the system, which is already next-themes' default.
  const adminTheme = query.data?.page.theme
  useEffect(() => {
    if (!adminTheme || adminTheme === 'auto') return
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem('theme')) return
    setTheme(adminTheme)
  }, [adminTheme, setTheme])

  // Drive <title>, <meta description>, and OG/Twitter tags from the page's
  // own content. Status pages are explicitly meant to be shared, so this
  // affects the link previews everywhere.
  const page = query.data?.page
  useDocumentMeta(page, query.data?.monitors)

  if (query.isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-app flex items-center justify-center"
      >
        <span aria-hidden className="relative inline-flex h-2.5 w-2.5">
          <span
            className="absolute inset-0 rounded-full bg-success opacity-40 motion-safe:animate-ping"
            style={{ animationDuration: '1s' }}
          />
          <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-success" />
        </span>
        <span className="sr-only">Loading status…</span>
      </div>
    )
  }
  if (query.error instanceof GateError && query.error.kind === 'password') {
    return (
      <PasswordGate
        slug={slug}
        onAuthenticated={() =>
          queryClient.invalidateQueries({ queryKey: ['public', slug] })
        }
      />
    )
  }
  if (query.isError) {
    // Only a real 404 is "not found" — a network blip or 500 must not
    // masquerade as one. Everything else gets an honest failure + retry.
    if (query.error instanceof GateError && query.error.kind === 'not-found') {
      return (
        <div className="min-h-app flex flex-col items-center justify-center gap-3 px-6 text-center">
          <img src="/logomark.png" alt="" className="size-8 rounded-md" />
          <p className="text-sm font-medium">Status page not found</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            The link may be wrong, or the page was removed.
          </p>
        </div>
      )
    }
    return (
      <div
        role="alert"
        className="min-h-app flex flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <p className="text-sm font-medium">Couldn't load this status page</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          That's on us, not you — the status data didn't load. It retries
          automatically every 30 seconds.
        </p>
        <Button
          variant="outline"
          className="mt-1 h-9 px-4 text-sm"
          onClick={() => void query.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  }
  if (!query.data) return null

  return (
    <PublicStatusView
      data={query.data}
      dataUpdatedAt={query.dataUpdatedAt}
      stale={query.isRefetchError || query.failureCount > 0}
    />
  )
}

/**
 * The status page itself, presentation only. PublicStatusPage wraps this with
 * fetching/SSE/meta side effects; the admin live editor feeds it draft state
 * directly (`preview` hides the visitor-facing theme toggle, `forcedTheme`
 * overrides which accent variant applies).
 */
export function PublicStatusView({
  data,
  dataUpdatedAt,
  stale = false,
  forcedTheme,
  preview = false,
}: {
  data: PublicData
  dataUpdatedAt: number
  stale?: boolean
  forcedTheme?: 'light' | 'dark'
  preview?: boolean
}) {
  const { resolvedTheme } = useTheme()
  const { page, monitors, incidents, maintenance = [] } = data
  const now = Date.now()
  const activeMaintenance = maintenance.filter((w) => {
    const start = new Date(w.startsAt).getTime()
    const end = new Date(w.endsAt).getTime()
    return start <= now && end >= now
  })
  const upcomingMaintenance = maintenance.filter(
    (w) => new Date(w.startsAt).getTime() > now,
  )
  const inMaintenance = new Set(activeMaintenance.map((w) => w.monitorId))
  const allUp = monitors.length > 0 && monitors.every((m) => m.currentStatus === 'up')
  const downCount = monitors.filter(
    (m) => m.currentStatus === 'down' && !inMaintenance.has(m.id),
  ).length
  const anyDegraded = monitors.some(
    (m) => m.currentStatus === 'degraded' && !inMaintenance.has(m.id),
  )

  const overallText = allUp
    ? 'All systems operational'
    : downCount > 0
      ? 'Some systems are down'
      : anyDegraded
        ? 'Some systems are degraded'
        : 'Status unknown'
  const overallTone: 'up' | 'down' | 'degraded' | 'unknown' = allUp
    ? 'up'
    : downCount > 0
      ? 'down'
      : anyDegraded
        ? 'degraded'
        : 'unknown'
  const overallDetail =
    downCount > 0
      ? `${downCount} of ${monitors.length} ${monitors.length === 1 ? 'system' : 'systems'} affected`
      : null

  // Group monitors
  const grouped = monitors.reduce<Record<string, PublicMonitor[]>>((acc, m) => {
    const key = m.group ?? '__ungrouped'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const headerTitle = (
    <div className="flex items-center gap-3.5 min-w-0">
      {page?.logoUrl && (
        <img
          src={page.logoUrl}
          alt=""
          className="size-9 sm:size-10 shrink-0 rounded-md object-contain"
        />
      )}
      <div className="space-y-1.5 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {page.title}
        </h1>
        <RichDescription html={page.description} />
      </div>
    </div>
  )

  return (
    <div
      className={cn('bg-background text-foreground', preview ? 'min-h-full' : 'min-h-app')}
    >
      {page?.customCss && (
        <style data-pb-custom>{page.customCss}</style>
      )}
      <div className="max-w-3xl mx-auto px-5 py-10 sm:px-6 sm:py-14 space-y-8">
        <header className="flex items-start justify-between gap-3 sm:gap-4">
          {page?.websiteUrl ? (
            <a
              href={page.websiteUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="min-w-0 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {headerTitle}
            </a>
          ) : (
            headerTitle
          )}
          {!preview && <ThemeToggle />}
        </header>

        <OverallStatusBanner
          tone={overallTone}
          text={overallText}
          detail={overallDetail}
          updatedAt={dataUpdatedAt}
          stale={stale}
        />

        {(activeMaintenance.length > 0 || upcomingMaintenance.length > 0) && (
          <MaintenanceBanner
            active={activeMaintenance}
            upcoming={upcomingMaintenance}
            monitors={monitors}
          />
        )}

        <div className="space-y-8">
          {Object.entries(grouped).map(([group, list]) => (
            <section key={group} className="space-y-3">
              {group !== '__ungrouped' && (
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </h2>
              )}
              <Panel className="divide-y">
                {list.map((m) => (
                  <MonitorRow
                    key={m.id}
                    monitor={m}
                    inMaintenance={inMaintenance.has(m.id)}
                  />
                ))}
              </Panel>
            </section>
          ))}
        </div>

        <PastEventsPanel
          incidents={incidents}
          maintenance={maintenance}
          monitors={monitors}
        />

        {!page?.hideBranding && (
          <footer className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-8">
            <img src="/logomark.png" alt="" className="size-3.5 rounded-sm" />
            <span>
              Powered by{' '}
              <a
                href="https://github.com/steiner-co/pingboard"
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-foreground hover:underline underline-offset-4"
              >
                <span translate="no">PingBoard</span>
              </a>
            </span>
          </footer>
        )}
      </div>
    </div>
  )
}

/**
 * Page description, rendered as sanitized rich text. The editor stores a small
 * HTML subset (bold/italic/underline/strike/link/colors); older pages hold
 * plain text, which passes through the sanitizer as escaped text. Blank
 * markup renders nothing.
 */
function RichDescription({ html }: { html: string | null }) {
  const clean = useMemo(
    () => (html && !isRichTextBlank(html) ? sanitizeRichText(html) : ''),
    [html],
  )
  if (!clean) return null
  return (
    <p className="rich-text text-muted-foreground text-sm sm:text-base">
      <span dangerouslySetInnerHTML={{ __html: clean }} />
    </p>
  )
}
/**
 * Status dot. Down states get a gentle ping — an outage is a rare,
 * high-attention moment on an otherwise static page, so the motion earns its
 * place as state indication. Everything else stays still.
 */
function StatusDot({
  color,
  pulse = false,
  label,
}: {
  color: string
  pulse?: boolean
  label?: string
}) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="relative inline-flex h-2.5 w-2.5 shrink-0"
    >
      {pulse && (
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 rounded-full opacity-40 motion-safe:animate-ping',
            color,
          )}
          style={{ animationDuration: '1.5s' }}
        />
      )}
      <span
        aria-hidden
        className={cn(
          'relative inline-block h-2.5 w-2.5 rounded-full transition-colors duration-300',
          color,
        )}
      />
    </span>
  )
}

function OverallStatusBanner({
  tone,
  text,
  detail,
  updatedAt,
  stale,
}: {
  tone: 'up' | 'down' | 'degraded' | 'unknown'
  text: string
  detail: string | null
  updatedAt: number
  stale: boolean
}) {
  // Tick so the age keeps counting up if refetches start failing — a status
  // page that always claims "just now" is worse than one admitting it's stale.
  useNow()
  const dot =
    tone === 'up'
      ? 'bg-success'
      : tone === 'down'
        ? 'bg-destructive'
        : tone === 'degraded'
          ? 'bg-warning'
          : 'bg-muted-foreground'
  const surface =
    tone === 'up'
      ? 'border-success/30 bg-success/5'
      : tone === 'down'
        ? 'border-destructive/30 bg-destructive/5'
        : tone === 'degraded'
          ? 'border-warning/30 bg-warning/5'
          : 'border-border bg-muted/40'

  const dotLabel =
    tone === 'up'
      ? 'All systems operational'
      : tone === 'down'
        ? 'Some systems are down'
        : tone === 'degraded'
          ? 'Some systems are degraded'
          : 'Status unknown'

  return (
    <Panel
      // SSE updates flip the surface tint in place — crossfade it instead of
      // snapping, so a status change reads as a transition, not a glitch.
      className={cn('p-5 sm:p-6 transition-colors duration-300', surface)}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex items-center gap-3"
      >
        <StatusDot color={dot} pulse={tone === 'down'} />
        <div className="text-xl sm:text-2xl font-semibold tracking-tight">
          <span className="sr-only">{dotLabel}.</span>
          <span aria-hidden>{text}</span>
        </div>
      </div>
      <div
        // Ticks independently via the parent's formatRelative(updatedAt) so
        // the age keeps counting up if refetches start failing. aria-live=off
        // so we don't spam screen readers with every 30s refresh.
        aria-live="off"
        className="text-xs sm:text-sm text-muted-foreground mt-2 ml-5"
      >
        {detail && <>{detail} · </>}
        Updated {formatRelative(updatedAt)}
        {stale && (
          <span className="text-warning"> · reconnecting…</span>
        )}
      </div>
    </Panel>
  )
}

function MonitorRow({
  monitor,
  inMaintenance,
}: {
  monitor: PublicMonitor
  inMaintenance: boolean
}) {
  const dotColor =
    monitor.currentStatus === 'up'
      ? 'bg-success'
      : monitor.currentStatus === 'down'
        ? 'bg-destructive'
        : monitor.currentStatus === 'degraded'
          ? 'bg-warning'
          : 'bg-muted-foreground'
  const statusLabel =
    monitor.currentStatus === 'up'
      ? 'Operational'
      : monitor.currentStatus === 'down'
        ? 'Down'
        : monitor.currentStatus === 'degraded'
          ? 'Degraded'
          : 'Unknown'

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {inMaintenance ? (
            <span className="text-[10px] font-medium uppercase tracking-wide rounded-full bg-warning/10 text-warning px-2 py-0.5 shrink-0">
              Maintenance
            </span>
          ) : (
            <StatusDot
              color={dotColor}
              pulse={monitor.currentStatus === 'down'}
              label={`${monitor.name} status: ${statusLabel}`}
            />
          )}
          <span className="font-medium truncate">{monitor.name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground shrink-0">
          {monitor.avgResponseMs != null && (
            <span className="tabular-nums">{Math.round(monitor.avgResponseMs)} ms</span>
          )}
          <span className="tabular-nums">
            {monitor.uptimePct == null
              ? '—'
              : `${monitor.uptimePct.toFixed(2)}% uptime`}
          </span>
        </div>
      </div>
      <UptimeTimeline timeline={monitor.timeline} monitorName={monitor.name} />
    </div>
  )
}

// A monitor that fails this often, this briefly, isn't having outages — it's
// flapping. Listing every two-minute blip drowns the page (and the real
// incidents) in noise, so a day showing this many consecutive incidents from
// one monitor collapses into a single summary row, expandable for the detail.
const FLAP_CLUSTER_MIN = 3
// After clustering, a day renders at most this many entries; older ones hide
// behind a "Show earlier" toggle so one chaotic day can't stretch the page.
const MAX_DAY_ENTRIES = 8
// Keep in sync with the public payload's incident cap (buildPublicPayload).
const PUBLIC_INCIDENT_CAP = 50

type DayEntry =
  | { kind: 'single'; incident: PublicIncident }
  | {
      kind: 'cluster'
      key: string
      monitorName: string
      incidents: PublicIncident[]
      spanStartMs: number
      spanEndMs: number
      downMs: number
      openNow: boolean
    }

/**
 * Folds a day's incidents (newest first) into renderable entries: consecutive
 * same-monitor runs at or above FLAP_CLUSTER_MIN become one cluster, everything
 * else stays an individual row.
 */
function buildDayEntries(list: PublicIncident[]): DayEntry[] {
  const sorted = [...list].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )
  const entries: DayEntry[] = []
  let run: PublicIncident[] = []

  const flushRun = () => {
    const first = run[0]
    if (!first) return
    if (run.length >= FLAP_CLUSTER_MIN) {
      let spanStartMs = Infinity
      let spanEndMs = 0
      let downMs = 0
      let openNow = false
      for (const i of run) {
        const start = new Date(i.startedAt).getTime()
        spanStartMs = Math.min(spanStartMs, start)
        spanEndMs = Math.max(spanEndMs, start)
        if (i.resolvedAt) {
          const ms = new Date(i.resolvedAt).getTime() - start
          if (ms > 0) downMs += ms
        } else {
          openNow = true
          downMs += Math.max(0, Date.now() - start)
        }
      }
      entries.push({
        kind: 'cluster',
        key: first.id,
        monitorName: first.monitorName,
        incidents: run,
        spanStartMs,
        spanEndMs,
        downMs,
        openNow,
      })
    } else {
      for (const i of run) entries.push({ kind: 'single', incident: i })
    }
    run = []
  }

  for (const i of sorted) {
    const prev = run[run.length - 1]
    if (prev && prev.monitorId !== i.monitorId) flushRun()
    run.push(i)
  }
  flushRun()
  return entries
}

/** Local calendar day as YYYY-MM-DD — the key incidents are grouped by. */
function localDayKey(d: Date): string {
  return (
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getDate()).padStart(2, '0')}`
  )
}

type PanelTab = 'incidents' | 'maintenance'

/**
 * The tabbed "history" panel: incidents log + maintenance schedule. The
 * calendar that filters the log lives in a popover off the header — it's a
 * navigation aid, not content, so it doesn't earn permanent space on the page.
 */
function PastEventsPanel({
  incidents,
  maintenance,
  monitors,
}: {
  incidents: PublicIncident[]
  maintenance: MaintenanceWindow[]
  monitors: PublicMonitor[]
}) {
  const [tab, setTab] = useState<PanelTab>('incidents')
  // Which day's incidents the log is filtered to; undefined shows every day.
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const now = new Date()
  const DAY_MS = 24 * 60 * 60 * 1000
  // Matches the server's 30-day incident window; floored to the day so the
  // oldest window day is fully clickable on the calendar.
  const windowStart = new Date(now.getTime() - 30 * DAY_MS)
  windowStart.setHours(0, 0, 0, 0)

  // Group by the visitor's local calendar day — the header and the times
  // inside a group have to agree, and UTC-day keys didn't (anyone outside UTC
  // got times that shuffled across a day boundary that wasn't theirs).
  const groups = new Map<string, PublicIncident[]>()
  let oldestMs = Infinity
  for (const i of incidents) {
    const key = localDayKey(new Date(i.startedAt))
    const arr = groups.get(key) ?? []
    arr.push(i)
    groups.set(key, arr)
    oldestMs = Math.min(oldestMs, new Date(i.startedAt).getTime())
  }

  // Calendar overview: one dot per day that had incidents, navigation bounded
  // to the span we can actually show (the server's 30-day window, or less if
  // history is shorter than that).
  const incidentDates = [...groups.keys()].map((k) => new Date(`${k}T00:00:00`))
  const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
  const startMonth = firstOfMonth(new Date(Math.min(oldestMs, windowStart.getTime())))
  const endMonth = firstOfMonth(now)

  // Default view: the last 7 calendar days only. Older incidents stay
  // reachable through the calendar (their dots still show) — they just don't
  // earn space by default.
  const weekStart = new Date(now.getTime() - 6 * DAY_MS)
  weekStart.setHours(0, 0, 0, 0)

  const visibleGroups = selectedDay
    ? [...groups.entries()].filter(([day]) => day === localDayKey(selectedDay))
    : [...groups.entries()].filter(([day]) => day >= localDayKey(weekStart))

  const activeMaintenance = maintenance.filter((w) => {
    return (
      new Date(w.startsAt).getTime() <= now.getTime() &&
      new Date(w.endsAt).getTime() >= now.getTime()
    )
  })
  const upcomingMaintenance = maintenance.filter(
    (w) => new Date(w.startsAt).getTime() > now.getTime(),
  )
  const monitorName = (id: string) =>
    monitors.find((m) => m.id === id)?.name ?? 'a monitor'

  return (
    <section>
      <Panel className="p-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as PanelTab)} className="gap-0">
          <header className="flex items-center justify-between gap-3 border-b border-border/60 pr-2 pl-2 sm:pr-3 sm:pl-4">
            <TabsList variant="line" aria-label="Past incidents and maintenance">
              <TabsTrigger value="incidents">Incidents</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>
            {incidents.length > 0 && (
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={selectedDay ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground data-[state=open]:bg-muted"
                  >
                    <Icon icon={CalendarBlank} className="h-3.5 w-3.5" />
                    {selectedDay ? humanDate(localDayKey(selectedDay)) : 'Calendar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-3">
                  <Calendar
                    mode="single"
                    selected={selectedDay}
                    onSelect={(d) => {
                      setSelectedDay(d ?? undefined)
                      setCalendarOpen(false)
                    }}
                    defaultMonth={firstOfMonth(new Date(incidents[0]!.startedAt))}
                    startMonth={startMonth}
                    endMonth={endMonth}
                    disabled={[{ before: windowStart }, { after: now }]}
                    modifiers={{ hasIncidents: incidentDates }}
                    modifiersClassNames={{
                      hasIncidents:
                        'after:pointer-events-none after:absolute after:bottom-[3px] after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-destructive after:content-[""]',
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}
          </header>

          {/* ── Incidents ── */}
          <TabsContent value="incidents" className="text-sm">
            {incidents.length === 0 ? (
              <div className="p-5 text-muted-foreground">
                No incidents in the last 30 days. Quiet is good.
              </div>
            ) : (
              <div className="divide-y">
                {selectedDay && (
                  <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
                    <span>
                      Showing{' '}
                      <span className="font-medium text-foreground">
                        {humanDate(localDayKey(selectedDay))}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDay(undefined)}
                      className="rounded-sm font-medium underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Show last 7 days
                    </button>
                  </div>
                )}
                {visibleGroups.length === 0 ? (
                  <div className="p-5 text-muted-foreground">
                    {selectedDay
                      ? 'No incidents on this day.'
                      : 'No incidents in the last 7 days.'}
                  </div>
                ) : (
                  visibleGroups.map(([day, list]) => (
                    <IncidentDay key={day} day={day} list={list} />
                  ))
                )}
                {incidents.length >= PUBLIC_INCIDENT_CAP && (
                  <p className="px-4 py-2.5 text-[11px] text-muted-foreground sm:px-5">
                    Showing the {PUBLIC_INCIDENT_CAP} most recent incidents.
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Maintenance ── */}
          <TabsContent value="maintenance" className="text-sm">
            {maintenance.length === 0 ? (
              <div className="p-5 text-muted-foreground">
                No maintenance scheduled. All clear.
              </div>
            ) : (
              <div className="divide-y">
                {activeMaintenance.map((w) => (
                  <MaintenanceRow
                    key={w.id}
                    window={w}
                    monitorName={monitorName(w.monitorId)}
                    inProgress
                  />
                ))}
                {upcomingMaintenance.map((w) => (
                  <MaintenanceRow
                    key={w.id}
                    window={w}
                    monitorName={monitorName(w.monitorId)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Panel>
    </section>
  )
}

function MaintenanceRow({
  window: w,
  monitorName,
  inProgress = false,
}: {
  window: MaintenanceWindow
  monitorName: string
  inProgress?: boolean
}) {
  return (
    <div className="space-y-1 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{w.title}</span>
        {inProgress && <Badge variant="warning">In progress</Badge>}
      </div>
      <div className="text-xs text-muted-foreground">
        {monitorName} —{' '}
        {inProgress ? `until ${formatDateTime(w.endsAt)}` : formatDateTimeRange(w.startsAt, w.endsAt)}
      </div>
      {w.description && (
        <div className="text-xs text-muted-foreground">{w.description}</div>
      )}
    </div>
  )
}

function IncidentDay({ day, list }: { day: string; list: PublicIncident[] }) {
  const [showAll, setShowAll] = useState(false)
  const entries = buildDayEntries(list)
  const visible = showAll ? entries : entries.slice(0, MAX_DAY_ENTRIES)
  const hiddenCount = entries.length - visible.length

  return (
    <div className="p-4 sm:p-5 space-y-3">
      <div className="text-sm font-medium">{humanDate(day)}</div>
      <ul className="space-y-2">
        {visible.map((e) =>
          e.kind === 'single' ? (
            <IncidentItem key={e.incident.id} incident={e.incident} />
          ) : (
            <IncidentCluster key={e.key} cluster={e} />
          ),
        )}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll
            ? 'Show fewer'
            : `Show ${hiddenCount} earlier ${hiddenCount === 1 ? 'incident' : 'incidents'}`}
        </button>
      )}
    </div>
  )
}

function IncidentItem({ incident }: { incident: PublicIncident }) {
  const startedAt = new Date(incident.startedAt)
  const isOpen = !incident.resolvedAt
  const durationMs = isOpen
    ? Date.now() - startedAt.getTime()
    : new Date(incident.resolvedAt!).getTime() - startedAt.getTime()
  return (
    <li className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 text-sm">
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            isOpen ? 'bg-destructive' : 'bg-muted-foreground',
          )}
        />
        <span className="font-medium">{incident.monitorName}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatTime(startedAt)} · {formatDuration(durationMs)}
          {isOpen && ' (ongoing)'}
        </span>
      </div>
      {incident.note && (
        <div className="text-muted-foreground sm:ml-auto sm:text-right">
          {incident.note}
        </div>
      )}
    </li>
  )
}

function IncidentCluster({ cluster }: { cluster: Extract<DayEntry, { kind: 'cluster' }> }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full flex-col gap-1 rounded-md text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-baseline sm:gap-3"
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full shrink-0',
              cluster.openNow ? 'bg-destructive' : 'bg-muted-foreground',
            )}
          />
          <span className="font-medium">{cluster.monitorName}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {cluster.incidents.length} incidents ·{' '}
            {formatTime(cluster.spanStartMs)} – {formatTime(cluster.spanEndMs)}{' '}
            · {formatDuration(cluster.downMs)} down
            {cluster.openNow && ' (ongoing)'}
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground sm:ml-auto shrink-0">
          {open ? 'Hide' : 'Show each'}
          <Icon
            icon={CaretDown}
            className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
          />
        </span>
      </button>
      {open && (
        <ul className="space-y-2 ml-[3px] border-l border-border/60 pl-4">
          {cluster.incidents.map((i) => (
            <IncidentItem key={i.id} incident={i} />
          ))}
        </ul>
      )}
    </li>
  )
}

function MaintenanceBanner({
  active,
  upcoming,
  monitors,
}: {
  active: MaintenanceWindow[]
  upcoming: MaintenanceWindow[]
  monitors: PublicMonitor[]
}) {
  const monitorName = (id: string) =>
    monitors.find((m) => m.id === id)?.name ?? 'a monitor'
  return (
    <Panel
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="border-warning/30 bg-warning/5 p-5 space-y-3"
    >
      <h2 className="text-sm font-semibold text-warning">
        Scheduled maintenance
      </h2>
      <ul className="space-y-2 text-sm">
        {active.map((w) => (
          <li key={w.id} className="space-y-0.5">
            <div className="font-medium">
              {w.title}{' '}
              <span className="text-xs font-normal uppercase tracking-wide text-warning">
                · in progress
              </span>
            </div>
            <div className="text-muted-foreground text-xs">
              {monitorName(w.monitorId)} — until {formatDateTime(w.endsAt)}
            </div>
            {w.description && (
              <div className="text-muted-foreground text-xs">{w.description}</div>
            )}
          </li>
        ))}
        {upcoming.map((w) => (
          <li key={w.id} className="space-y-0.5">
            <div className="font-medium">{w.title}</div>
            <div className="text-muted-foreground text-xs">
              {monitorName(w.monitorId)} — {formatDateTimeRange(w.startsAt, w.endsAt)}
            </div>
            {w.description && (
              <div className="text-muted-foreground text-xs">{w.description}</div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function PasswordGate({
  slug,
  onAuthenticated,
}: {
  slug: string
  onAuthenticated: () => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError('Enter the password to continue.')
      inputRef.current?.focus()
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/${slug}/auth`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.status === 401) {
        setError('Incorrect password. Try again.')
        inputRef.current?.focus()
        return
      }
      if (!res.ok) {
        setError('Something went wrong. Try again.')
        inputRef.current?.focus()
        return
      }
      setPassword('')
      onAuthenticated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-app flex items-center justify-center bg-background px-6">
      <Panel className="w-full max-w-sm shadow-sm">
      <form onSubmit={submit} className="p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Protected status page</h1>
          <p className="text-sm text-muted-foreground">
            Enter the password to view this page.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="gate-password" className="text-xs font-medium">
            Password
          </label>
          <Input
            ref={inputRef}
            id="gate-password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'gate-error' : undefined}
            className="h-9 px-3 text-sm"
            autoFocus
          />
        </div>
        {error && (
          <p
            id="gate-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          aria-busy={submitting}
          disabled={submitting}
          className="h-9 w-full text-sm"
        >
          {submitting ? 'Checking…' : 'Continue'}
        </Button>
      </form>
      </Panel>
    </div>
  )
}

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Avoid SSR/CSR mismatch flash; render a sized placeholder until mounted.
  if (!mounted) {
    return <div aria-hidden className="h-9 w-9 rounded-full border border-border" />
  }

  const ThemeIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Theme"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97]"
        >
          <Icon icon={ThemeIcon} className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Radio semantics so AT announces which theme is active. */}
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Icon icon={Sun} className="h-3.5 w-3.5" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Icon icon={Moon} className="h-3.5 w-3.5" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Icon icon={Desktop} className="h-3.5 w-3.5" />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function useDocumentMeta(
  page: { title: string; description: string | null } | undefined,
  monitors: PublicMonitor[] | undefined,
) {
  useEffect(() => {
    if (!page) return
    const fallback = 'Status'
    // Meta/OG tags are plain text — strip the description's formatting.
    const plainDesc =
      page.description && !isRichTextBlank(page.description)
        ? richTextToPlainText(page.description)
        : `Live service status for ${page.title}.`
    document.title = `${page.title} — ${fallback}`
    setMeta('description', plainDesc)
    setMeta('og:title', page.title, true)
    setMeta('og:description', plainDesc, true)
    setMeta('og:type', 'website', true)
    setMeta('twitter:card', 'summary')
    setMeta('twitter:title', page.title)
    setMeta('twitter:description', plainDesc)

    // Theme-color tints the mobile browser chrome to reflect status.
    if (monitors && monitors.length > 0) {
      const anyDown = monitors.some((m) => m.currentStatus === 'down')
      const allUp = monitors.every((m) => m.currentStatus === 'up')
      // Resolve from CSS tokens so the tint follows the active theme.
      const css = getComputedStyle(document.documentElement)
      const token = anyDown ? '--destructive' : allUp ? '--success' : '--muted-foreground'
      const color = css.getPropertyValue(token).trim()
      // public.html ships light/dark media-variant fallbacks — update all of
      // them; the browser applies whichever matches the visitor's scheme.
      if (color) {
        document.head
          .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
          .forEach((el) => el.setAttribute('content', color))
      }
    }
  }, [page, monitors])
}

function setMeta(name: string, content: string, ogStyle = false) {
  const attr = ogStyle || name.startsWith('og:') ? 'property' : 'name'
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}
