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

function MockDashboard() {
  return (
    <div className="aspect-[16/9] w-full bg-gradient-to-br from-muted/40 via-background to-muted/20">
      <div className="flex h-full w-full">
        <div className="hidden w-44 border-r border-border/60 bg-background/40 p-4 sm:block">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-success" />
            <span className="text-[0.6875rem] font-semibold tracking-tight">PingBoard</span>
          </div>
          <div className="mt-6 space-y-1.5">
            {['Dashboard', 'Monitors', 'Channels', 'Incidents', 'Status pages', 'Settings'].map((label, i) => (
              <div
                key={label}
                className={`rounded-md px-2 py-1.5 text-[0.625rem] ${
                  i === 0 ? 'bg-muted/60 text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[0.625rem] uppercase tracking-widest text-muted-foreground">
                Last 24 hours
              </div>
              <div className="text-sm font-semibold">12 monitors · 99.98% uptime</div>
            </div>
            <div className="hidden gap-2 sm:flex">
              <div className="rounded-md border border-border/60 px-2 py-1 text-[0.625rem] text-muted-foreground">
                30d
              </div>
              <div className="rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-[0.625rem]">
                24h
              </div>
            </div>
          </div>

          <div className="mt-4 h-24 rounded-md border border-border/60 bg-background/40 p-2">
            <svg viewBox="0 0 200 60" className="h-full w-full">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                className="text-success/70"
                points="0,40 12,38 24,42 36,30 48,32 60,28 72,34 84,22 96,24 108,18 120,20 132,15 144,18 156,12 168,16 180,10 192,12 200,8"
              />
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                className="text-chart-2/60"
                points="0,48 12,46 24,50 36,42 48,44 60,40 72,46 84,38 96,40 108,36 120,38 132,34 144,36 156,30 168,32 180,28 192,30 200,26"
              />
            </svg>
          </div>

          <div className="mt-3 space-y-1.5">
            {[
              ['api.example.com', 'up', '128ms'],
              ['nightly-backup', 'push', 'last 23m ago'],
              ['db-primary', 'maintenance', '—'],
              ['example.com cert', 'expiry', '12 days'],
            ].map(([name, status, latency]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-1.5 text-[0.6875rem]"
              >
                <div className="flex items-center gap-2">
                  {status === 'maintenance' ? (
                    <span className="rounded-sm bg-amber-500/15 px-1.5 py-px text-[0.5625rem] uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Maint
                    </span>
                  ) : status === 'expiry' ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  ) : (
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        status === 'up' || status === 'push' ? 'bg-success' : 'bg-chart-2'
                      }`}
                    />
                  )}
                  <span className="text-foreground/80">{name}</span>
                </div>
                <div className="text-muted-foreground">{latency}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardPreview() {
  return (
    <section id="dashboard" className="border-b border-border/60 px-8 py-14 sm:px-12 lg:px-16">
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

      <div className="overflow-hidden rounded-md border border-border/60 bg-card">
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
