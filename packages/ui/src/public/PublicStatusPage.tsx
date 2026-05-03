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
import { cn, formatRelative } from '@/lib/utils'

type AdminTheme = 'light' | 'dark' | 'auto'

interface PublicData {
  page: { slug: string; title: string; description: string | null; theme: AdminTheme }
  monitors: PublicMonitor[]
}

interface PublicMonitor {
  id: string
  name: string
  group: string | null
  currentStatus: 'up' | 'down' | 'degraded' | 'unknown'
  uptimePct: number | null
  recent: Array<{ checkedAt: string; status: 'up' | 'down' | 'degraded'; responseTimeMs: number | null }>
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

  const { page, monitors } = query.data
  const allUp = monitors.length > 0 && monitors.every((m) => m.currentStatus === 'up')
  const anyDown = monitors.some((m) => m.currentStatus === 'down')

  const overallText = allUp
    ? 'All systems operational'
    : anyDown
      ? 'Degraded service'
      : 'Status unknown'
  const overallColor = allUp
    ? 'bg-success'
    : anyDown
      ? 'bg-destructive'
      : 'bg-muted-foreground'

  // Group monitors
  const grouped = monitors.reduce<Record<string, PublicMonitor[]>>((acc, m) => {
    const key = m.group ?? '__ungrouped'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
            {page.description && <p className="text-muted-foreground">{page.description}</p>}
          </div>
          <ThemeToggle />
        </header>

        <div className={cn('rounded-xl p-6 text-white shadow-sm', overallColor)}>
          <div className="text-2xl font-semibold">{overallText}</div>
          <div className="text-sm opacity-90 mt-1">Updated {formatRelative(new Date())}</div>
        </div>

        <div className="space-y-8">
          {Object.entries(grouped).map(([group, list]) => (
            <section key={group} className="space-y-3">
              {group !== '__ungrouped' && (
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </h2>
              )}
              <div className="rounded-xl border bg-card divide-y">
                {list.map((m) => (
                  <MonitorRow key={m.id} monitor={m} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="text-center text-xs text-muted-foreground pt-8">
          Powered by{' '}
          <a href="https://github.com" className="hover:underline">
            PingBoard
          </a>
        </footer>
      </div>
    </div>
  )
}

function MonitorRow({ monitor }: { monitor: PublicMonitor }) {
  const dotColor =
    monitor.currentStatus === 'up'
      ? 'bg-success'
      : monitor.currentStatus === 'down'
        ? 'bg-destructive'
        : 'bg-muted-foreground'

  const successful = monitor.recent.filter(
    (h) => h.status === 'up' && h.responseTimeMs != null,
  )
  const avgMs = successful.length
    ? Math.round(
        successful.reduce((sum, h) => sum + (h.responseTimeMs ?? 0), 0) /
          successful.length,
      )
    : null

  return (
    <div className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={cn('h-2.5 w-2.5 rounded-full', dotColor)} />
          <span className="font-medium">{monitor.name}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {avgMs != null && (
            <span className="tabular-nums">{avgMs} ms avg</span>
          )}
          <span className="tabular-nums">
            {monitor.uptimePct == null ? '—' : `${monitor.uptimePct.toFixed(2)}% uptime`}
          </span>
        </div>
      </div>
      <UptimeBar recent={monitor.recent} />
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
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
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

function UptimeBar({ recent }: { recent: PublicMonitor['recent'] }) {
  // Show last ~90 datapoints as colored ticks.
  const slots = recent.slice(-90)
  return (
    <div className="flex items-end gap-px h-6">
      {slots.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">No data yet</div>
      ) : (
        slots.map((h, i) => (
          <div
            key={i}
            title={`${new Date(h.checkedAt).toLocaleString()} — ${h.status}${h.responseTimeMs ? ` (${h.responseTimeMs}ms)` : ''}`}
            className={cn(
              'flex-1 h-full rounded-sm',
              h.status === 'up' && 'bg-success',
              h.status === 'down' && 'bg-destructive',
              h.status === 'degraded' && 'bg-yellow-500',
            )}
          />
        ))
      )}
    </div>
  )
}
