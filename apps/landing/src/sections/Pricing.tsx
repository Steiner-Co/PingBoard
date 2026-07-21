import { CloudIcon, ServerIcon } from '@/components/icons'

export function Pricing() {
  return (
    <section id="pricing" className="flex flex-col items-center gap-10">
      <h2 className="text-[28px] font-medium leading-[0.96] tracking-[-0.7px] text-foreground">
        Pricing
      </h2>
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-between gap-10 rounded-[8px] border border-border bg-muted p-6">
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-4">
              <ServerIcon className="size-6 text-foreground" />
              <p className="text-[22px] font-medium text-foreground">Self-hosted</p>
            </div>
            <p className="text-[13px] leading-[1.6] text-foreground/60">
              Every feature, unlimited, on your own infrastructure. One container,
              MIT-licensed, free forever.
            </p>
          </div>
          <a
            href="https://github.com/steiner-co/pingboard"
            className="inline-flex w-fit items-center justify-center rounded-[12px] bg-[#003cff] px-5 py-3 text-[15px] font-medium text-white outline-none transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#003cff]/40 active:scale-[0.98]"
          >
            Free
          </a>
        </div>

        <div className="flex flex-col justify-between gap-10 rounded-[8px] border border-border bg-muted p-6">
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-4">
              <CloudIcon className="size-6 text-foreground" />
              <p className="text-[22px] font-medium text-foreground">Cloud</p>
            </div>
            <p className="text-[13px] leading-[1.6] text-foreground/60">
              Hosted and fully managed, with multi-region probing and zero ops. Same
              PingBoard — we run it for you.
            </p>
          </div>
          <span className="inline-flex w-fit items-center justify-center rounded-[12px] border border-border bg-card px-5 py-3 text-[15px] font-medium text-foreground/50">
            Coming soon
          </span>
        </div>
      </div>
    </section>
  )
}
