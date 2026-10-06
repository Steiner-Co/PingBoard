import { SectionHeading } from '@/components/section-heading'
import { ThemeScreenshot } from '@/components/theme-screenshot'

export function ChannelsSection() {
  return (
    <section aria-labelledby="channels-heading" className="flex flex-col items-center gap-10 md:flex-row-reverse md:items-center md:justify-between md:gap-6">
      <SectionHeading
        id="channels-heading"
        align="left"
        className="md:max-w-[240px]"
        lines={['Alerts where your', 'team already is']}
        subtitle="Email, webhooks, Discord, Slack or ntfy — wired up in seconds, routed per monitor, and silenced during maintenance."
      />
      <div className="shrink-0 md:-ml-5 md:-rotate-[4deg] lg:-ml-14">
        <ThemeScreenshot
          name="channels-card"
          alt="The Channels screen — connected notification channels with the monitors each one alerts for"
          className="w-[400px] max-w-full shadow-[0_18px_50px_-20px_rgba(0,0,0,0.35)]"
        />
      </div>
    </section>
  )
}
