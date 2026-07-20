import type { ReactNode } from 'react'

const columns = [
  {
    label: 'Monitors',
    items: [
      'HTTP / TCP / Ping / DNS / Keyword',
      'SSL & domain expiry warnings',
      'Push / heartbeat for cron jobs',
      'Tagging, grouping, retries',
    ],
  },
  {
    label: 'Status pages',
    items: [
      'Multiple pages per instance',
      'Custom slugs & passwords',
      'Theme override per visitor',
      'Maintenance windows banner',
    ],
  },
  {
    label: 'Notifications',
    items: [
      'Email / webhook / Discord / Slack / ntfy',
      'Per-monitor channel routing',
      'Down + recovery events',
      'Suppressed during maintenance',
    ],
  },
]

/**
 * Local re-implementation of the dashboard's blueprint corner ticks. The real
 * one lives in @pingboard/ui (components/panel.tsx) but the landing app can't
 * import from it, so the marketing mock carries its own copy.
 */
function CornerTicks() {
  return (
    <>
      <Tick className="-top-[4.5px] -left-[4.5px]" />
      <Tick className="-top-[4.5px] -right-[4.5px]" />
      <Tick className="-bottom-[4.5px] -left-[4.5px]" />
      <Tick className="-bottom-[4.5px] -right-[4.5px]" />
    </>
  )
}

function Tick({ className }: { className: string }) {
  return (
    <svg
      aria-hidden
      className={'pointer-events-none absolute z-10 size-[9px] text-muted-foreground/40 ' + className}
      viewBox="0 0 9 9"
      fill="none"
    >
      <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={'relative border border-border/70 bg-card ' + (className ?? '')}>
      <CornerTicks />
      {children}
    </div>
  )
}

const navGroups = [
  {
    label: 'Monitor',
    items: [
      { title: 'Dashboard', glyph: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
      { title: 'Incidents', glyph: 'M12 3l9 16H3z M12 10v4 M12 17h.01' },
      { title: 'Maintenance', glyph: 'M4 6h16v14H4z M8 3v4 M16 3v4 M4 10h16' },
    ],
  },
  {
    label: 'Configure',
    items: [
      { title: 'Channels', glyph: 'M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8 M13.7 21a2 2 0 0 1-3.4 0' },
      { title: 'Status pages', glyph: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M3 12h18 M12 3c2.5 3 2.5 15 0 18 M12 3c-2.5 3-2.5 15 0 18' },
      { title: 'Settings', glyph: 'M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9L7 7 M17 17l2.1 2.1 M19.1 4.9L17 7 M7 17l-2.1 2.1' },
    ],
  },
]

const stats = [
  { label: 'Active monitors', value: '12', suffix: '/ 12', sub: 'All scheduled', tone: 'default' },
  { label: 'Uptime', value: '99.98%', sub: '12 of 12 reporting healthy', tone: 'success' },
  { label: 'Down', value: '0', sub: 'Nothing failing right now', tone: 'muted' },
  { label: 'Avg response', value: '128', suffix: 'ms', sub: 'Latest heartbeat per monitor', tone: 'default' },
] as const

const rows = [
  { name: 'api-gateway', target: 'https://api.example.com/health', type: 'HTTP', ms: '128 ms', status: 'up' },
  { name: 'marketing-site', target: 'https://example.com', type: 'HTTP', ms: '84 ms', status: 'up' },
  { name: 'db-primary', target: '10.0.0.4:5432', type: 'TCP', ms: '12 ms', status: 'up' },
  { name: 'edge-cache', target: 'https://cdn.example.com', type: 'HTTP', ms: '812 ms', status: 'degraded' },
  { name: 'nightly-backup', target: '/api/push/k7…b3', type: 'PUSH', ms: '23m ago', status: 'up' },
]

// Response-time series for the mock area chart. Static by design.
const chartPoints =
  '0,52 20,48 40,55 60,44 80,50 100,38 120,46 140,34 160,40 180,30 200,36 220,26 240,33 260,22 280,28 300,20'

const chartArea =
  'M0,80 ' +
  chartPoints
    .split(' ')
    .map((p) => `L${p}`)
    .join(' ') +
  ' L300,80 Z'

function MockDashboard() {
  return (
    <div className="flex w-full bg-background">
      {/* Sidebar — grouped nav, mirrors the real AppSidebar */}
      <aside className="hidden w-44 shrink-0 flex-col border-r border-border/70 sm:flex lg:w-48">
        <div className="flex items-center gap-2 border-b border-border/70 px-3 py-3">
          <span className="inline-block size-1.5 rounded-full bg-success" />
          <span className="text-[0.6875rem] font-semibold tracking-tight">PingBoard</span>
        </div>

        <div className="flex-1 space-y-4 px-2 py-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-2 pb-1.5 font-mono text-[0.5625rem] font-medium uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </div>
              <div className="space-y-px">
                {group.items.map((item) => {
                  const active = item.title === 'Dashboard'
                  return (
                    <div
                      key={item.title}
                      className={
                        'flex items-center gap-2 px-2 py-1.5 text-[0.625rem] ' +
                        (active
                          ? 'bg-muted/60 font-medium text-foreground'
                          : 'text-muted-foreground')
                      }
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={active ? 'text-success' : 'text-muted-foreground/70'}
                        aria-hidden
                      >
                        <path d={item.glyph} />
                      </svg>
                      <span>{item.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-border/70 px-3 py-2.5">
          <span className="inline-flex size-5 items-center justify-center border border-border/70 font-mono text-[0.5625rem] text-muted-foreground">
            AK
          </span>
          <span className="truncate text-[0.5625rem] text-muted-foreground">admin@example.com</span>
        </div>
      </aside>

      {/* Main column */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
          <span className="font-mono text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
            Dashboard
          </span>
          <div className="flex items-center gap-1">
            {['24h', '7d', '30d'].map((r) => (
              <span
                key={r}
                className={
                  'border px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-wider ' +
                  (r === '24h'
                    ? 'border-border/70 bg-muted/50 text-foreground'
                    : 'border-transparent text-muted-foreground')
                }
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
          {/* Stat band */}
          <Panel className="grid grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={
                  'flex flex-col gap-1 p-2.5 sm:p-3 ' +
                  (i < 2 ? 'border-b border-border/60 lg:border-b-0 ' : '') +
                  (i % 2 === 0 ? 'border-r border-border/60 ' : 'lg:border-r lg:border-border/60 ') +
                  (i === 3 ? 'lg:border-r-0 ' : '')
                }
              >
                <div className="font-mono text-[0.5625rem] font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={
                      'text-base font-semibold tabular-nums tracking-tight sm:text-lg ' +
                      (s.tone === 'success'
                        ? 'text-success'
                        : s.tone === 'muted'
                          ? 'text-muted-foreground'
                          : 'text-foreground')
                    }
                  >
                    {s.value}
                  </span>
                  {'suffix' in s && s.suffix && (
                    <span className="text-[0.625rem] font-medium tabular-nums text-muted-foreground">
                      {s.suffix}
                    </span>
                  )}
                </div>
                <div className="truncate text-[0.5625rem] text-muted-foreground">{s.sub}</div>
              </div>
            ))}
          </Panel>

          {/* Response time chart */}
          <Panel>
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <span className="font-mono text-[0.5625rem] font-medium uppercase tracking-wider text-muted-foreground">
                Response time
              </span>
              <span className="font-mono text-[0.5625rem] tabular-nums text-muted-foreground">
                avg 128 ms · last 24h
              </span>
            </div>
            <div className="px-3 py-2.5">
              <div className="relative h-16 w-full sm:h-20">
                {/* Gridlines live in CSS so the dash pattern stays even — the
                    chart SVG stretches, which would smear an SVG dasharray. */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  {[25, 50, 75].map((t) => (
                    <div
                      key={t}
                      className="absolute inset-x-0 border-t border-dashed border-border"
                      style={{ top: `${t}%` }}
                    />
                  ))}
                </div>
                <svg
                  viewBox="0 0 300 80"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="pb-mock-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--success)" stopOpacity="0.45" />
                      <stop offset="95%" stopColor="var(--success)" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={chartArea} fill="url(#pb-mock-area)" />
                  <polyline
                    points={chartPoints}
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>
          </Panel>

          {/* Monitor table */}
          <Panel>
            <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-3 border-b border-border/60 px-3 py-1.5 font-mono text-[0.5625rem] font-medium uppercase tracking-wider text-muted-foreground sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_3rem_4.5rem]">
              <span>Monitor</span>
              <span className="hidden sm:block">Target</span>
              <span className="hidden sm:block">Type</span>
              <span className="text-right">Response</span>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.name}
                className={
                  'grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-3 px-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_3rem_4.5rem] ' +
                  (i < rows.length - 1 ? 'border-b border-border/40' : '')
                }
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={
                      'size-1.5 shrink-0 rounded-full ' +
                      (r.status === 'degraded' ? 'bg-amber-500' : 'bg-success')
                    }
                  />
                  <span className="truncate text-[0.625rem] text-foreground/85">{r.name}</span>
                </div>
                <span className="hidden truncate font-mono text-[0.5625rem] text-muted-foreground sm:block">
                  {r.target}
                </span>
                <span className="hidden font-mono text-[0.5625rem] uppercase tracking-wider text-muted-foreground sm:block">
                  {r.type}
                </span>
                <span className="text-right font-mono text-[0.5625rem] tabular-nums text-muted-foreground">
                  {r.ms}
                </span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  )
}

export function DashboardPreview() {
  return (
    <section id="dashboard" className="scroll-mt-12 border-b border-border/60 px-8 py-14 sm:px-12 lg:px-16">
      <div className="mb-3 text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
        Dashboard
      </div>
      <h2 className="mb-3 max-w-2xl text-xl font-semibold tracking-tight sm:text-2xl">
        See every check in real time.
      </h2>
      <p className="mb-8 max-w-2xl text-[0.875rem] leading-relaxed text-muted-foreground">
        A live, SSE-streamed dashboard with monitors, incidents, and per-channel routing — plus a public
        status page for your users, baked in.
      </p>

      <div className="relative border border-border/70 bg-background">
        <CornerTicks />
        <MockDashboard />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {columns.map((col) => (
          <div key={col.label}>
            <div className="mb-3 text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
              {col.label}
            </div>
            <ul className="space-y-2 text-[0.8125rem]">
              {col.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-foreground/85">
                  <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
