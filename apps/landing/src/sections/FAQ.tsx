import { useState } from 'react'
import { SectionHeading } from '@/components/section-heading'
import { PlusIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const FAQS = [
  {
    q: 'Is PingBoard really free?',
    a: 'Yes. Self-host it and every feature is unlimited, forever — it’s MIT-licensed. A hosted cloud option is coming later for teams that’d rather not run it themselves.',
  },
  {
    q: 'How do I install it?',
    a: 'One `docker run`, or a Compose file. It’s a single container with a SQLite file — no external database, Redis or queue to manage.',
  },
  {
    q: 'What can it monitor?',
    a: 'HTTP(S), TCP, ping, DNS, SSL-certificate and domain expiry, and push/heartbeat for cron jobs — plus keyword and JSON assertions on response bodies.',
  },
  {
    q: 'Can it alert me on Slack or Discord?',
    a: 'Email, webhook, Discord, Slack and ntfy — routed per monitor, on both down and recovery, and silenced during maintenance windows.',
  },
  {
    q: 'Do you see my data?',
    a: 'No. You host it; everything lives in your SQLite file on your server. There’s nothing to phone home.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="flex flex-col items-center gap-9">
      <SectionHeading
        lines={['Frequently asked', 'questions']}
        subtitle="Quick answers on pricing, licensing, privacy and setup."
      />
      <div className="w-full overflow-hidden rounded-[12px] border border-border">
        <div className="divide-y divide-border">
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40"
                >
                  <PlusIcon
                    className={cn(
                      'size-4 shrink-0 text-foreground/50 transition-transform duration-200',
                      isOpen && 'rotate-45',
                    )}
                  />
                  <span className="text-[14px] font-medium text-foreground">{f.q}</span>
                </button>
                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-200 ease-out',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 pl-11 text-[13px] leading-[1.6] text-foreground/60">
                      {f.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
