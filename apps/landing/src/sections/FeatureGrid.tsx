import { SectionHeading } from '@/components/section-heading'
import {
  BellIcon,
  BoxIcon,
  GlobeIcon,
  PulseIcon,
  ShieldIcon,
  TerminalIcon,
} from '@/components/icons'

const FEATURES = [
  {
    Icon: PulseIcon,
    title: '7 monitor types',
    body: 'HTTP, TCP, ping, DNS, SSL, domain expiry and push/heartbeat — with keyword and JSON assertions on responses.',
  },
  {
    Icon: GlobeIcon,
    title: 'Status pages',
    body: 'Branded, shareable pages with custom slugs, passwords and a theme that follows each visitor.',
  },
  {
    Icon: BellIcon,
    title: 'Alerts that route',
    body: 'Email, webhook, Discord, Slack and ntfy — per monitor, on both down and recovery events.',
  },
  {
    Icon: ShieldIcon,
    title: 'Domain & SSL tracking',
    body: 'Registrar, expiry, nameservers and certificates in one place — with warnings before anything lapses.',
  },
  {
    Icon: BoxIcon,
    title: 'One container',
    body: 'SQLite, no Redis, no queue. A single `docker run` and you’re live in under a minute.',
  },
  {
    Icon: TerminalIcon,
    title: 'API & MCP',
    body: 'Drive everything from scripts with API tokens, or ask your AI assistant what’s down over MCP.',
  },
]

export function FeatureGrid() {
  return (
    <section id="features" className="flex scroll-mt-8 flex-col items-center gap-10">
      <SectionHeading
        lines={['Everything you need', 'to know it’s up']}
        subtitle="A complete monitoring stack — not a checkbox on someone else’s roadmap."
      />
      <div className="w-full overflow-hidden rounded-[16px] border border-border">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-[18px] bg-card p-[18px]">
              <Icon className="size-5 text-foreground" />
              <div className="flex flex-col gap-2">
                <h3 className="text-[15px] font-medium leading-tight text-foreground">{title}</h3>
                <p className="text-[12px] leading-[1.45] text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
