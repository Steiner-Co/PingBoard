import { useEffect, useRef, useState } from 'react'
import { humanDate, UptimeTimeline } from '@/components/uptime-timeline'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { Icon } from '@/components/ui/icon'
import Sun from '@solar-icons/react/csr/weather/Sun'
import Moon from '@solar-icons/react/csr/weather/Moon'
import Display from '@solar-icons/react/csr/devices/Display'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Panel } from '@/components/panel'
import { useSSE } from '@/lib/sse'
import { useNow } from '@/hooks/use-now'
import {
  cn,
  formatDateTime,
  formatDateTimeRange,
  formatDuration,
  formatRelative,
} from '@/lib/utils'

type AdminTheme = 'light' | 'dark' | 'auto'

interface PublicData {
  page: { slug: string; title: string; description: string | null; theme: AdminTheme }
  monitors: PublicMonitor[]
  incidents: PublicIncident[]
  maintenance?: MaintenanceWindow[]
}

interface PublicMonitor {
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
        className="min-h-screen flex items-center justify-center"
      >
        <span aria-hidden className="relative inline-flex h-2.5 w-2.5">
          <span
            className="absolute inset-0 rounded-full bg-success opacity-40 motion-safe:animate-ping"
            style={{ animationDuration: '1.5s' }}
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
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Status page not found.</div>
  }
  if (!query.data) return null

  const { monitors, incidents, maintenance = [] } = query.data
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-5 py-10 sm:px-6 sm:py-14 space-y-8 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-500">
        <header className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {query.data.page.title}
            </h1>
            {query.data.page.description && (
              <p className="text-muted-foreground text-sm sm:text-base">
                {query.data.page.description}
              </p>
            )}
          </div>
          <ThemeToggle />
        </header>

        <OverallStatusBanner
          tone={overallTone}
          text={overallText}
          detail={overallDetail}
          updatedAt={query.dataUpdatedAt}
          stale={query.isRefetchError || query.failureCount > 0}
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

        <IncidentHistory incidents={incidents} />

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
      </div>
    </div>
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
    <Panel className={cn('p-5 sm:p-6', surface)}>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex items-center gap-3"
      >
        <span
          aria-hidden
          className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dot)}
        />
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
            <span
              role="img"
              aria-label={`${monitor.name} status: ${statusLabel}`}
              className={cn('h-2.5 w-2.5 rounded-full shrink-0', dotColor)}
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

function IncidentHistory({ incidents }: { incidents: PublicIncident[] }) {
  if (incidents.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Past incidents
        </h2>
        <Panel className="p-5 text-sm text-muted-foreground">
          No incidents in the last 30 days. Quiet is good.
        </Panel>
      </section>
    )
  }

  // Group incidents by day for a compact log-style display.
  const groups = new Map<string, PublicIncident[]>()
  for (const i of incidents) {
    const key = new Date(i.startedAt).toISOString().slice(0, 10)
    const arr = groups.get(key) ?? []
    arr.push(i)
    groups.set(key, arr)
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Past incidents
      </h2>
      <Panel className="divide-y">
        {[...groups.entries()].map(([day, list]) => (
          <div key={day} className="p-4 sm:p-5 space-y-3">
            <div className="text-sm font-medium">{humanDate(day)}</div>
            <ul className="space-y-2">
              {list.map((i) => {
                const startedAt = new Date(i.startedAt)
                const isOpen = !i.resolvedAt
                const durationMs = isOpen
                  ? Date.now() - startedAt.getTime()
                  : new Date(i.resolvedAt!).getTime() - startedAt.getTime()
                return (
                  <li
                    key={i.id}
                    className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          isOpen ? 'bg-destructive' : 'bg-muted-foreground',
                        )}
                      />
                      <span className="font-medium">{i.monitorName}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {startedAt.toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {formatDuration(durationMs)}
                        {isOpen && ' (ongoing)'}
                      </span>
                    </div>
                    {i.note && (
                      <div className="text-muted-foreground sm:ml-auto sm:text-right">
                        {i.note}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </Panel>
    </section>
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
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
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
          <input
            ref={inputRef}
            id="gate-password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'gate-error' : undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <button
          type="submit"
          aria-busy={submitting}
          disabled={submitting}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-[background-color,transform] duration-150 ease-out active:scale-[0.98]"
        >
          {submitting ? 'Checking…' : 'Continue'}
        </button>
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
        <DropdownMenuItem onSelect={() => setTheme('light')}>
          <Icon icon={Sun} className="h-3.5 w-3.5" />
          Light
          {theme === 'light' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme('dark')}>
          <Icon icon={Moon} className="h-3.5 w-3.5" />
          Dark
          {theme === 'dark' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme('system')}>
          <Icon icon={Display} className="h-3.5 w-3.5" />
          System
          {theme === 'system' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
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
    document.title = `${page.title} — ${fallback}`
    setMeta('description', page.description ?? `Live service status for ${page.title}.`)
    setMeta('og:title', page.title, true)
    setMeta(
      'og:description',
      page.description ?? `Live service status for ${page.title}.`,
      true,
    )
    setMeta('og:type', 'website', true)
    setMeta('twitter:card', 'summary')
    setMeta('twitter:title', page.title)
    setMeta(
      'twitter:description',
      page.description ?? `Live service status for ${page.title}.`,
    )

    // Theme-color tints the mobile browser chrome to reflect status.
    if (monitors && monitors.length > 0) {
      const anyDown = monitors.some((m) => m.currentStatus === 'down')
      const allUp = monitors.every((m) => m.currentStatus === 'up')
      // Resolve from CSS tokens so the tint follows the active theme.
      const css = getComputedStyle(document.documentElement)
      const token = anyDown ? '--destructive' : allUp ? '--success' : '--muted-foreground'
      const color = css.getPropertyValue(token).trim()
      if (color) setMeta('theme-color', color)
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
