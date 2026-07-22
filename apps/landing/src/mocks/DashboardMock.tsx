import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'

const MONITORS = [
  { name: 'api.pingboard.dev', status: 'up', ms: '142 ms' },
  { name: 'app.steinerandco.site', status: 'up', ms: '88 ms' },
  { name: 'checkout.acme.net', status: 'down', ms: 'DOWN' },
  { name: 'cdn.something.ai', status: 'up', ms: '51 ms' },
  { name: 'status.cooldomain.so', status: 'degraded', ms: '420 ms' },
] as const

const STATS = [
  ['Monitors', '24'],
  ['Up', '22'],
  ['Down', '1'],
  ['Avg', '131 ms'],
] as const

/** A live, theme-aware mock of the PingBoard dashboard for the hero. */
export function DashboardMock() {
  return (
    <div className="w-full overflow-hidden rounded-[14px] border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Logo className="size-4 rounded-[4px]" />
        <span className="text-[12px] font-semibold tracking-tight">PingBoard</span>
        <div className="ml-4 hidden items-center gap-1 text-[11px] sm:flex">
          <span className="rounded-full bg-muted px-2 py-0.5 text-foreground">Monitors</span>
          <span className="px-2 py-0.5 text-foreground/45">Incidents</span>
          <span className="px-2 py-0.5 text-foreground/45">Status pages</span>
        </div>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">live</span>
        </span>
      </div>

      <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
        {STATS.map(([label, value]) => (
          <div key={label} className="px-4 py-3">
            <div className="font-mono text-[9px] uppercase tracking-wider text-foreground/40">{label}</div>
            <div className="mt-1 text-[15px] font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <div className="border-b border-border px-4 py-3">
        <svg viewBox="0 0 400 56" preserveAspectRatio="none" className="h-14 w-full" aria-hidden>
          <defs>
            <linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="[stop-color:var(--primary)]" stopOpacity="0.22" />
              <stop offset="100%" className="[stop-color:var(--primary)]" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,42 C40,38 60,18 100,24 C140,30 165,9 200,17 C240,26 262,34 300,21 C340,10 362,27 400,19 L400,56 L0,56 Z"
            fill="url(#dash-area)"
          />
          <path
            d="M0,42 C40,38 60,18 100,24 C140,30 165,9 200,17 C240,26 262,34 300,21 C340,10 362,27 400,19"
            fill="none"
            className="stroke-primary"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="divide-y divide-border">
        {MONITORS.map((m) => (
          <div key={m.name} className="flex items-center gap-3 px-4 py-2.5">
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                m.status === 'up' && 'bg-success',
                m.status === 'down' && 'bg-destructive',
                m.status === 'degraded' && 'bg-amber-500',
              )}
            />
            <span className="truncate text-[12px] text-foreground/90">{m.name}</span>
            <span
              className={cn(
                'ml-auto font-mono text-[11px] tabular-nums',
                m.status === 'down' ? 'text-destructive' : 'text-foreground/45',
              )}
            >
              {m.ms}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
