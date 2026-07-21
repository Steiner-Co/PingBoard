import { SectionHeading } from '@/components/section-heading'
import { GlobeIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const DOMAINS = [
  { name: 'pingboard.dev', days: 283 },
  { name: 'steinerandco.site', days: 67 },
  { name: 'acme.net', days: 127 },
  { name: 'cooldomain.so', days: 333 },
  { name: 'something.ai', days: 21 },
]

function dayTone(days: number) {
  if (days <= 30) return 'bg-destructive/10 text-destructive'
  if (days <= 90) return 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
  return 'bg-success/10 text-success'
}

function DomainsMock() {
  return (
    <div className="w-[300px] max-w-full space-y-2 rounded-[14px] border border-border bg-card p-3">
      {DOMAINS.map((d) => (
        <div
          key={d.name}
          className="flex items-center gap-3 rounded-[10px] border border-border/70 bg-background/40 px-3 py-2.5"
        >
          <GlobeIcon className="size-[18px] text-foreground/70" />
          <span className="truncate text-[13px] font-medium text-foreground">{d.name}</span>
          <span
            className={cn(
              'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
              dayTone(d.days),
            )}
          >
            {d.days} days
          </span>
        </div>
      ))}
    </div>
  )
}

export function DomainsSection() {
  return (
    <section className="flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-6">
      <SectionHeading
        align="left"
        className="md:max-w-[240px]"
        lines={['Every domain and', 'cert in one place']}
        subtitle="Expiry, registrar, nameservers and SSL for your whole portfolio — auto-detected via RDAP, or added by hand. Alerts before anything lapses."
      />
      <div className="shrink-0 md:-mr-5 md:rotate-[4deg] lg:-mr-14">
        <DomainsMock />
      </div>
    </section>
  )
}
