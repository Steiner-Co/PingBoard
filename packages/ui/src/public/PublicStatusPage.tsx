import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSSE } from '@/lib/sse'
import { cn, formatRelative } from '@/lib/utils'

interface PublicData {
  page: { slug: string; title: string; description: string | null; theme: string }
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

export function PublicStatusPage({ slug }: { slug: string }) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['public', slug],
    queryFn: () => fetch(`/api/public/${slug}`).then((r) => {
      if (!r.ok) throw new Error('Not found')
      return r.json() as Promise<PublicData>
    }),
    refetchInterval: 30_000,
  })

  useSSE(`/api/public/${slug}/sse`, {
    heartbeat: () => {
      void queryClient.invalidateQueries({ queryKey: ['public', slug] })
    },
  })

  if (query.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>
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
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
          {page.description && <p className="text-muted-foreground">{page.description}</p>}
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

  return (
    <div className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={cn('h-2.5 w-2.5 rounded-full', dotColor)} />
          <span className="font-medium">{monitor.name}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {monitor.uptimePct == null ? '—' : `${monitor.uptimePct.toFixed(2)}% uptime`}
        </div>
      </div>
      <UptimeBar recent={monitor.recent} />
    </div>
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
