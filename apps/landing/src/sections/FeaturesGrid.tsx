import type { ReactNode } from 'react'

// Per-card mini-demos — each is a small, feature-specific visual.

function MethodPills() {
  const methods = [
    { label: 'GET', tone: 'success' },
    { label: 'POST', tone: 'chart-2' },
    { label: 'PUT', tone: 'chart-3' },
    { label: 'HEAD', tone: 'muted' },
    { label: '+5', tone: 'muted' },
  ] as const
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {methods.map((m) => (
        <span
          key={m.label}
          className={
            'rounded-sm border px-1.5 py-0.5 font-mono text-[0.625rem] tracking-wide ' +
            (m.tone === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : m.tone === 'chart-2'
                ? 'border-chart-2/40 bg-chart-2/10 text-chart-2'
                : m.tone === 'chart-3'
                  ? 'border-chart-3/40 bg-chart-3/10 text-chart-3'
                  : 'border-border/60 bg-muted/30 text-muted-foreground')
          }
        >
          {m.label}
        </span>
      ))}
    </div>
  )
}

function FakeTerminal() {
  return (
    <div className="rounded-sm border border-border/60 bg-background/40 px-2 py-1.5 font-mono text-[0.625rem] leading-relaxed text-muted-foreground">
      <div>
        <span className="text-success">$</span> ping api.example.com
      </div>
      <div className="text-foreground/70">64 bytes · time=12.4 ms</div>
    </div>
  )
}

function JsonAssertion() {
  return (
    <div className="rounded-sm border border-border/60 bg-background/40 px-2 py-1.5 font-mono text-[0.625rem] leading-relaxed">
      <span className="text-muted-foreground">{`{ "status": `}</span>
      <span className="rounded-sm bg-success/15 px-1 text-success">"ok"</span>
      <span className="text-muted-foreground">{` }`}</span>
    </div>
  )
}

function ChannelIcons() {
  const channels = [
    { name: 'Email', glyph: 'M2 4 L12 13 L22 4 M2 4 H22 V20 H2 z' },
    { name: 'Slack', glyph: 'M6 4 H10 V8 H6 z M14 4 H18 V8 H14 z M6 14 H10 V18 H6 z M14 14 H18 V18 H14 z' },
    { name: 'Discord', glyph: 'M4 6 Q12 2 20 6 L20 16 Q16 19 12 19 Q8 19 4 16 z M9 11 a1 1 0 1 0 0 1 M15 11 a1 1 0 1 0 0 1' },
    { name: 'Hook', glyph: 'M3 12 L9 12 M15 12 L21 12 M9 9 a3 3 0 1 1 0 6 M15 9 a3 3 0 1 0 0 6' },
    { name: 'ntfy', glyph: 'M5 9 L5 15 L9 15 L14 19 L14 5 L9 9 z M17 8 a5 5 0 0 1 0 8' },
  ]
  return (
    <div className="flex items-center gap-1.5">
      {channels.map((c) => (
        <span
          key={c.name}
          title={c.name}
          className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-border/60 bg-muted/30 text-muted-foreground"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d={c.glyph} />
          </svg>
        </span>
      ))}
    </div>
  )
}

function FakeUrlBar() {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-border/60 bg-background/40 px-2 py-1 font-mono text-[0.625rem]">
      <span className="text-success">●</span>
      <span className="text-muted-foreground">status.</span>
      <span className="text-foreground">acme.example</span>
      <span className="text-muted-foreground">/incidents</span>
    </div>
  )
}

function Sparkline() {
  return (
    <div className="rounded-sm border border-border/60 bg-background/40 p-1.5">
      <svg viewBox="0 0 120 24" className="h-6 w-full">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          className="text-success"
          points="0,18 8,16 16,17 24,12 32,14 40,10 48,12 56,7 64,9 72,5 80,8 88,4 96,6 104,3 112,5 120,2"
        />
        <circle cx="120" cy="2" r="2" className="fill-success" />
      </svg>
    </div>
  )
}

function ThemeChips() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="rounded-sm border border-border/60 bg-background px-2 py-0.5 text-[0.625rem]">
        Light
      </span>
      <span className="rounded-sm border border-foreground/30 bg-foreground/10 px-2 py-0.5 text-[0.625rem] font-medium text-foreground">
        Dark
      </span>
      <span className="rounded-sm border border-border/60 px-2 py-0.5 text-[0.625rem] text-muted-foreground">
        System
      </span>
    </div>
  )
}

function DockerLine() {
  return (
    <div className="rounded-sm border border-border/60 bg-background/40 px-2 py-1.5 font-mono text-[0.625rem] leading-relaxed">
      <span className="text-success">$</span>{' '}
      <span className="text-foreground">docker</span>
      <span className="text-muted-foreground"> run -d -p 3000:3000 …</span>
    </div>
  )
}

function MitBadge() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-sm border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground">
        license <span className="text-success">MIT</span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-sm border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground">
        source <span className="text-foreground/85">github</span>
      </span>
    </div>
  )
}

function ExpiryBadges() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[0.625rem] text-amber-700 dark:text-amber-400">
        SSL · 12 days
      </span>
      <span className="inline-flex items-center gap-1 rounded-sm border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-[0.625rem] text-success">
        Domain · 287 days
      </span>
    </div>
  )
}

function PushSnippet() {
  return (
    <div className="rounded-sm border border-border/60 bg-background/40 px-2 py-1.5 font-mono text-[0.625rem] leading-relaxed">
      <div>
        <span className="text-success">$</span>{' '}
        <span className="text-foreground">curl</span>
        <span className="text-muted-foreground"> -X POST </span>
        <span className="text-foreground/85">/api/push/</span>
        <span className="text-muted-foreground">k7…b3</span>
      </div>
      <div className="text-muted-foreground">→ heartbeat received · 10s grace</div>
    </div>
  )
}

function MaintenanceBar() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[0.625rem] font-mono text-muted-foreground">
        <span>Sat 02:00</span>
        <span>04:00</span>
      </div>
      <div className="relative h-2 rounded-sm border border-amber-500/40 bg-amber-500/10 overflow-hidden">
        <div className="absolute inset-y-0 left-1/3 right-1/3 bg-amber-500/30" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[0.625rem] uppercase tracking-wide text-amber-700 dark:text-amber-400">
          In progress
        </span>
        <span className="text-[0.625rem] text-muted-foreground">alerts suppressed</span>
      </div>
    </div>
  )
}

const features: Array<{ n: string; title: string; body: string; demo: ReactNode }> = [
  {
    n: '01',
    title: 'HTTP & HTTPS monitors.',
    body: 'Watch any URL. Status codes, response time, redirects, headers — checked from your own infra.',
    demo: <MethodPills />,
  },
  {
    n: '02',
    title: 'TCP, ping, DNS.',
    body: 'Reach beyond the web. Catch socket failures, latency spikes, DNS drift.',
    demo: <FakeTerminal />,
  },
  {
    n: '03',
    title: 'Keyword & JSON checks.',
    body: 'Verify what comes back, not just that something does. Substrings, regex, JSON-path.',
    demo: <JsonAssertion />,
  },
  {
    n: '04',
    title: 'SSL & domain expiry.',
    body: 'Get warned 14 days before a cert lapses, 30 before a domain. Connects directly, parses the truth — no third party.',
    demo: <ExpiryBadges />,
  },
  {
    n: '05',
    title: 'Push / heartbeat monitors.',
    body: 'Cron jobs and queue workers ping PingBoard. Miss the deadline, page on-call. Zero polling, zero infra.',
    demo: <PushSnippet />,
  },
  {
    n: '06',
    title: 'Maintenance windows.',
    body: 'Schedule downtime in advance — alerts stay silent, the public page shows a banner so customers see it coming.',
    demo: <MaintenanceBar />,
  },
  {
    n: '07',
    title: 'Five notification channels.',
    body: 'Email, webhook, Discord, Slack, ntfy. Per-monitor routing with quiet hours.',
    demo: <ChannelIcons />,
  },
  {
    n: '08',
    title: 'Public status pages.',
    body: 'Multiple pages per instance. Custom slugs, optional passwords, themeable per visitor.',
    demo: <FakeUrlBar />,
  },
  {
    n: '09',
    title: 'Real-time dashboard.',
    body: 'No polling. Heartbeats stream over SSE — the dashboard updates the moment a check resolves.',
    demo: <Sparkline />,
  },
  {
    n: '10',
    title: 'Themeable everywhere.',
    body: 'Light, dark, and system themes — for the dashboard and every public status page.',
    demo: <ThemeChips />,
  },
  {
    n: '11',
    title: 'Single binary, single file.',
    body: 'One container, one SQLite file, one port. No Redis, no queue, no external services.',
    demo: <DockerLine />,
  },
  {
    n: '12',
    title: 'Self-hosted, MIT.',
    body: 'Your data, your infra, your terms. Open source — fork it, ship it, run it forever.',
    demo: <MitBadge />,
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="border-b border-border/60 px-8 py-14 sm:px-12 lg:px-16">
      <div className="mb-8 text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
        Features
      </div>
      <div className="grid grid-cols-1 border border-border/60 sm:grid-cols-2 xl:grid-cols-3">
        {features.map((f, i) => (
          <article
            key={f.n}
            className={
              'flex flex-col gap-3 p-5 ' +
              // right border on all but last column
              ((i + 1) % 3 === 0
                ? 'xl:border-r-0 '
                : 'xl:border-r xl:border-border/60 ') +
              ((i + 1) % 2 === 0
                ? 'sm:border-r-0 xl:border-r '
                : 'sm:border-r sm:border-border/60 ') +
              // bottom border on all but last row
              (i < features.length - 3 ? 'xl:border-b xl:border-border/60 ' : '') +
              (i < features.length - 2 ? 'sm:border-b sm:border-border/60 xl:border-b ' : '') +
              (i < features.length - 1 ? 'border-b border-border/60 sm:border-b ' : '')
            }
          >
            <span className="font-mono text-[0.625rem] tracking-widest text-muted-foreground">
              {f.n}
            </span>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{f.title}</h3>
            <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">{f.body}</p>
            <div className="mt-auto pt-3">{f.demo}</div>
          </article>
        ))}
      </div>
    </section>
  )
}
