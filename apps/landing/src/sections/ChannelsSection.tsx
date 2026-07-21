import { SectionHeading } from '@/components/section-heading'
import { BellIcon, CheckIcon, DiscordIcon, MailIcon, SlackIcon } from '@/components/icons'

const CHANNELS = [
  { Icon: DiscordIcon, name: 'Discord' },
  { Icon: SlackIcon, name: 'Slack' },
  { Icon: MailIcon, name: 'Email' },
  { Icon: BellIcon, name: 'ntfy' },
]

function ChannelsMock() {
  return (
    <div className="w-[300px] max-w-full space-y-2 rounded-[14px] border border-border bg-card p-3">
      {CHANNELS.map(({ Icon, name }) => (
        <div
          key={name}
          className="flex items-center gap-3 rounded-[10px] border border-border/70 bg-background/40 px-3 py-2.5"
        >
          <Icon className="size-[18px] text-foreground/80" />
          <span className="text-[13px] font-medium text-foreground">{name}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
            Connected
            <CheckIcon className="size-3.5" />
          </span>
        </div>
      ))}
    </div>
  )
}

export function ChannelsSection() {
  return (
    <section className="flex flex-col items-center gap-10 md:flex-row-reverse md:items-center md:justify-between md:gap-6">
      <SectionHeading
        align="left"
        className="md:max-w-[240px]"
        lines={['Alerts where your', 'team already is']}
        subtitle="Email, webhooks, Discord, Slack or ntfy — wired up in seconds, routed per monitor, and silenced during maintenance."
      />
      <div className="shrink-0 md:-ml-5 md:-rotate-[4deg] lg:-ml-14">
        <ChannelsMock />
      </div>
    </section>
  )
}
