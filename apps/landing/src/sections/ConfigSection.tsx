import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type SnippetKey = 'monitor' | 'expiry' | 'push' | 'maintenance' | 'channel' | 'page' | 'realtime'

const snippets: Record<SnippetKey, { label: string; body: string; code: string }> = {
  monitor: {
    label: 'Monitors',
    body: 'Eight built-in check types — HTTP, TCP, ping, DNS, keyword, SSL, domain, push. Each version-controllable as JSON.',
    code: `import { createMonitor } from '@pingboard/core'

await createMonitor({
  name: 'API health',
  type: 'http',
  url: 'https://api.example.com/_health',
  intervalSeconds: 30,
  timeoutSeconds: 5,
  expect: { status: 200, keyword: '"ok":true' },
  channels: ['ops-discord', 'pager-webhook'],
})`,
  },
  expiry: {
    label: 'SSL & domain',
    body: 'Catch expiring certs and domains before they bite. Configurable warning thresholds, no third party in the path.',
    code: `await createMonitor({
  name: 'example.com cert',
  type: 'ssl',
  url: 'https://example.com',
  config: { warningDays: 14, criticalDays: 3 },
})

await createMonitor({
  name: 'example.com domain',
  type: 'domain',
  target: 'example.com',
  config: { warningDays: 30, criticalDays: 7 },
})`,
  },
  push: {
    label: 'Push / heartbeat',
    body: 'Cron jobs and workers ping PingBoard. Miss the deadline (interval + grace) and an incident opens automatically.',
    code: `await createMonitor({
  name: 'nightly-backup',
  type: 'push',
  intervalSeconds: 3600,
  config: { graceSeconds: 300 },
})

// In your job:
// curl -X POST https://status.acme.dev/api/push/<token>`,
  },
  maintenance: {
    label: 'Maintenance',
    body: 'Plan downtime ahead of time — alerts stay silent, the public status page shows a banner so customers see it coming.',
    code: `await scheduleMaintenanceWindow({
  monitorId: 'db-primary',
  title: 'Database upgrade',
  description: 'Routine version bump',
  startsAt: '2026-05-09T02:00:00Z',
  endsAt:   '2026-05-09T04:00:00Z',
})`,
  },
  channel: {
    label: 'Channels',
    body: 'Five notification channels with per-monitor routing, retries, and quiet hours.',
    code: `import { createChannel } from '@pingboard/core'

await createChannel({
  id: 'ops-discord',
  type: 'discord',
  webhook: process.env.DISCORD_WEBHOOK!,
  events: ['down', 'recovered'],
})`,
  },
  page: {
    label: 'Status pages',
    body: 'Spin up branded status pages without leaving the dashboard. Custom slugs, themeable.',
    code: `import { createStatusPage } from '@pingboard/core'

await createStatusPage({
  slug: 'status',
  title: 'Acme — Status',
  monitors: ['api-health', 'web-app', 'cdn'],
  theme: 'auto',
})`,
  },
  realtime: {
    label: 'Real-time',
    body: 'Heartbeats stream over SSE — the dashboard updates the moment a check resolves.',
    code: `const es = new EventSource('/api/events')

es.addEventListener('heartbeat', (e) => {
  const beat = JSON.parse(e.data)
  // { monitorId, status, latencyMs, at }
  updateChart(beat)
})`,
  },
}

export function ConfigSection() {
  return (
    <section id="docs" className="scroll-mt-12 border-b border-border/60 px-8 py-14 sm:px-12 lg:px-16">
      <div className="mb-3 text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
        Framework
      </div>
      <h2 className="mb-10 max-w-2xl text-xl font-semibold tracking-tight sm:text-2xl">
        Declarative config for every check.
      </h2>

      <Tabs defaultValue="monitor" orientation="vertical">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {(Object.keys(snippets) as SnippetKey[]).map((key) => (
              <TabsContent key={key} value={key} className="m-0">
                <div className="overflow-hidden rounded-md border border-border/60 bg-card">
                  <div className="flex items-center gap-1.5 border-b border-border/60 px-3 py-2 font-mono text-[0.625rem] text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full bg-destructive/60" />
                    <span className="inline-block h-2 w-2 rounded-full bg-chart-2/60" />
                    <span className="inline-block h-2 w-2 rounded-full bg-success/60" />
                    <span className="ml-2">pingboard.config.ts</span>
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed text-foreground/90">
                    {snippets[key].code}
                  </pre>
                </div>
              </TabsContent>
            ))}
          </div>

          <div className="lg:col-span-4">
            <TabsList variant="line" className="flex w-full flex-col items-stretch gap-0 border-l border-border/60 pl-3">
              {(Object.keys(snippets) as SnippetKey[]).map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="justify-start py-2 text-[0.6875rem] uppercase tracking-[0.14em]"
                >
                  {snippets[key].label}
                </TabsTrigger>
              ))}
            </TabsList>

            {(Object.keys(snippets) as SnippetKey[]).map((key) => (
              <TabsContent key={key} value={key} className="mt-5">
                <p className="text-xs leading-relaxed text-muted-foreground">{snippets[key].body}</p>
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>
    </section>
  )
}
