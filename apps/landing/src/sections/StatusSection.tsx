import { SectionHeading } from '@/components/section-heading'
import { ThemeScreenshot } from '@/components/theme-screenshot'

export function StatusSection() {
  return (
    <section aria-labelledby="status-heading" className="flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-6">
      <SectionHeading
        id="status-heading"
        align="left"
        className="md:max-w-[240px]"
        lines={['Status pages', 'your users trust']}
        subtitle="Publish a branded page in a click. Incidents and maintenance windows appear automatically — fewer “is it down?” tickets."
      />
      <div className="shrink-0 md:-mr-5 md:rotate-[4deg] lg:-mr-14">
        <ThemeScreenshot
          name="status-page-card"
          alt="A public PingBoard status page — overall status banner, scheduled maintenance, and per-service 90-day uptime strips"
          className="w-[340px] max-w-full shadow-[0_18px_50px_-20px_rgba(0,0,0,0.35)]"
        />
      </div>
    </section>
  )
}
