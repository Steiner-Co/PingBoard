import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ComputerIcon,
  Moon02Icon,
  Sun02Icon,
} from '@hugeicons/core-free-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSSE } from '@/lib/sse'
import { cn, formatDuration, formatRelative } from '@/lib/utils'

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
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>
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
  const anyDown = monitors.some(
    (m) => m.currentStatus === 'down' && !inMaintenance.has(m.id),
  )

  const overallText = allUp
    ? 'All systems operational'
    : anyDown
      ? 'Some systems are degraded'
      : 'Status unknown'
  const overallTone: 'up' | 'down' | 'unknown' = allUp
    ? 'up'
    : anyDown
      ? 'down'
      : 'unknown'

  // Group monitors
  const grouped = monitors.reduce<Record<string, PublicMonitor[]>>((acc, m) => {
    const key = m.group ?? '__ungrouped'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-5 py-10 sm:px-6 sm:py-14 space-y-8">
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

        <OverallStatusBanner tone={overallTone} text={overallText} />

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
              <div className="rounded-xl border bg-card divide-y">
                {list.map((m) => (
                  <MonitorRow
                    key={m.id}
                    monitor={m}
                    inMaintenance={inMaintenance.has(m.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <IncidentHistory incidents={incidents} />

        <footer className="text-center text-xs text-muted-foreground pt-8">
          Powered by{' '}
          <a
            href="https://github.com/steiner-co/pingboard"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-foreground hover:underline underline-offset-4"
          >
            PingBoard
          </a>
        </footer>
      </div>
    </div>
  )
}

function OverallStatusBanner({
  tone,
  text,
}: {
  tone: 'up' | 'down' | 'unknown'
  text: string
}) {
  const dot =
    tone === 'up'
      ? 'bg-success'
      : tone === 'down'
        ? 'bg-destructive'
        : 'bg-muted-foreground'
  const surface =
    tone === 'up'
      ? 'border-success/30 bg-success/5'
      : tone === 'down'
        ? 'border-destructive/30 bg-destructive/5'
        : 'border-border bg-muted/40'

  return (
    <div className={cn('rounded-xl border p-5 sm:p-6', surface)}>
      <div className="flex items-center gap-3">
        <span className={cn('inline-block h-2.5 w-2.5 rounded-full', dot)} />
        <div className="text-xl sm:text-2xl font-semibold tracking-tight">
          {text}
        </div>
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground mt-2 ml-5">
        Updated {formatRelative(new Date())}
      </div>
    </div>
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
        : 'bg-muted-foreground'

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {inMaintenance ? (
            <span className="text-[10px] font-medium uppercase tracking-wide rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 shrink-0">
              Maintenance
            </span>
          ) : (
            <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', dotColor)} />
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
      <UptimeTimeline timeline={monitor.timeline} />
    </div>
  )
}

function UptimeTimeline({
  timeline,
}: {
  timeline: PublicMonitor['timeline']
}) {
  if (timeline.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Gathering data…
      </div>
    )
  }
  const first = timeline[0]
  const last = timeline[timeline.length - 1]
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-px h-6">
        {timeline.map((d) => (
          <div
            key={d.date}
            title={titleFor(d)}
            className={cn(
              'flex-1 h-full rounded-sm',
              d.uptimePct == null && 'bg-muted',
              d.uptimePct != null && d.uptimePct >= 99 && 'bg-success/90',
              d.uptimePct != null && d.uptimePct >= 80 && d.uptimePct < 99 &&
                'bg-amber-500/80',
              d.uptimePct != null && d.uptimePct < 80 && 'bg-destructive/90',
            )}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{first?.date && humanDate(first.date)}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

function titleFor(d: { date: string; uptimePct: number | null }): string {
  if (d.uptimePct == null) return `${d.date} — no data`
  return `${d.date} — ${d.uptimePct.toFixed(2)}% uptime`
}

function humanDate(iso: string): string {
  // YYYY-MM-DD → "Feb 14"
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function IncidentHistory({ incidents }: { incidents: PublicIncident[] }) {
  if (incidents.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Past incidents
        </h2>
        <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          No incidents in the last 30 days. Quiet is good.
        </div>
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
      <div className="rounded-xl border bg-card divide-y">
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
      </div>
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
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
      <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">
        Scheduled maintenance
      </div>
      <ul className="space-y-2 text-sm">
        {active.map((w) => (
          <li key={w.id} className="space-y-0.5">
            <div className="font-medium">
              {w.title}{' '}
              <span className="text-xs font-normal uppercase tracking-wide text-amber-600 dark:text-amber-400">
                · in progress
              </span>
            </div>
            <div className="text-muted-foreground text-xs">
              {monitorName(w.monitorId)} — until{' '}
              {new Date(w.endsAt).toLocaleString()}
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
              {monitorName(w.monitorId)} — {new Date(w.startsAt).toLocaleString()}{' '}
              → {new Date(w.endsAt).toLocaleString()}
            </div>
            {w.description && (
              <div className="text-muted-foreground text-xs">{w.description}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
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
        setError('Incorrect password')
        return
      }
      if (!res.ok) {
        setError('Something went wrong. Try again.')
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
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm space-y-4"
      >
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Protected status page</h1>
          <p className="text-sm text-muted-foreground">
            Enter the password to view this page.
          </p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Password"
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={!password || submitting}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? 'Checking…' : 'Continue'}
        </button>
      </form>
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

  const Icon = resolvedTheme === 'dark' ? Moon02Icon : Sun02Icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Theme"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
        >
          <HugeiconsIcon icon={Icon} strokeWidth={2} className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setTheme('light')}>
          <HugeiconsIcon icon={Sun02Icon} className="h-3.5 w-3.5" />
          Light
          {theme === 'light' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme('dark')}>
          <HugeiconsIcon icon={Moon02Icon} className="h-3.5 w-3.5" />
          Dark
          {theme === 'dark' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme('system')}>
          <HugeiconsIcon icon={ComputerIcon} className="h-3.5 w-3.5" />
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
      const color = anyDown ? '#dc2626' : allUp ? '#16a34a' : '#71717a'
      setMeta('theme-color', color)
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
