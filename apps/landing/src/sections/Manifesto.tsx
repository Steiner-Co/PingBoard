import { Wordmark } from '@/components/logo'

export function Manifesto() {
  return (
    <section id="about" className="rounded-[16px] border border-border bg-muted p-8 sm:p-10">
      <h2 className="max-w-[440px] text-[26px] font-medium leading-[1.12] tracking-[-0.6px] text-balance text-foreground">
        Monitoring shouldn’t cost more than your servers.
      </h2>
      <p className="mt-6 max-w-[470px] text-[13px] leading-[1.75] text-foreground/60">
        Uptime monitoring got bloated and expensive — per-monitor pricing, per-seat
        plans, and your data living on someone else’s dashboard. PingBoard is the
        opposite: one small binary, one SQLite file, every feature included.
        Self-host it on a $5 VPS and watch your whole stack — endpoints,
        certificates, domains, cron jobs — from a single screen. No account, no
        limits, no lock-in. Your monitoring, your data, your box.
      </p>
      <div className="mt-8 flex flex-col gap-2">
        <span className="text-[12px] text-foreground/50">Introducing,</span>
        <Wordmark />
      </div>
    </section>
  )
}
