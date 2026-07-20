const monitors = [
  'HTTP(S)',
  'TCP',
  'Ping',
  'DNS',
  'Keyword',
  'JSON-path',
  'SSL expiry',
  'Domain expiry',
  'Push / heartbeat',
]
const channels = ['Email / SMTP', 'Webhook', 'Discord', 'Slack', 'ntfy']

function Pill({ label, badge }: { label: string; badge: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-border/60 bg-card px-2 py-1 text-[0.6875rem] font-medium tracking-wide">
      {label}
      <span className="text-[0.5625rem] uppercase tracking-[0.18em] text-muted-foreground/70">
        {badge}
      </span>
    </span>
  )
}

export function PluginStrip() {
  return (
    <section id="plugins" className="scroll-mt-12 border-b border-border/60 px-8 py-14 sm:px-12 lg:px-16">
      <div className="mb-6 flex items-end justify-between">
        <div className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
          Built-in checks &amp; channels
        </div>
        <a
          href="https://github.com/steiner-co/pingboard#what-it-does"
          className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground transition-[color,transform] duration-150 ease-out hover:text-foreground active:scale-[0.98]"
        >
          Browse all <span aria-hidden>↗</span>
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {monitors.map((m) => (
          <Pill key={m} label={m} badge="check" />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {channels.map((c) => (
          <Pill key={c} label={c} badge="alert" />
        ))}
      </div>
    </section>
  )
}
