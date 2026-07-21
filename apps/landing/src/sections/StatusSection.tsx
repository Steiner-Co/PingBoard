import { SectionHeading } from '@/components/section-heading'
import { cn } from '@/lib/utils'

const SERVICES = [
  { name: 'API', bars: 'up' },
  { name: 'Dashboard', bars: 'up' },
  { name: 'Webhooks', bars: 'blip' },
  { name: 'Status pages', bars: 'up' },
] as const

function UptimeBars({ variant }: { variant: 'up' | 'blip' }) {
  return (
    <div className="flex items-end gap-[2px]">
      {Array.from({ length: 30 }).map((_, i) => {
        const bad = variant === 'blip' && (i === 20 || i === 21)
        return (
          <span
            key={i}
            className={cn('h-4 w-[3px] rounded-full', bad ? 'bg-amber-500' : 'bg-success')}
          />
        )
      })}
    </div>
  )
}

function StatusPageMock() {
  return (
    <div className="w-[320px] max-w-full overflow-hidden rounded-[14px] border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[13px] font-semibold tracking-tight">Acme Status</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
          <span className="size-1.5 rounded-full bg-success" />
          All systems operational
        </span>
      </div>
      <div className="divide-y divide-border">
        {SERVICES.map((s) => (
          <div key={s.name} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-foreground/90">{s.name}</span>
              <span className="font-mono text-[10px] text-foreground/45">99.9%</span>
            </div>
            <UptimeBars variant={s.bars} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatusSection() {
  return (
    <section className="flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-6">
      <SectionHeading
        align="left"
        className="md:max-w-[240px]"
        lines={['Status pages', 'your users trust']}
        subtitle="Publish a branded page in a click. Incidents and maintenance windows appear automatically — fewer “is it down?” tickets."
      />
      <div className="shrink-0 md:-mr-5 md:rotate-[4deg] lg:-mr-14">
        <StatusPageMock />
      </div>
    </section>
  )
}
