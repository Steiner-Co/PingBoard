import { SectionHeading } from '@/components/section-heading'
import { ThemeScreenshot } from '@/components/theme-screenshot'

export function DomainsSection() {
  return (
    <section aria-labelledby="domains-heading" className="flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-6">
      <SectionHeading
        id="domains-heading"
        align="left"
        className="md:max-w-[240px]"
        lines={['Every domain and', 'cert in one place']}
        subtitle="Expiry, registrar, nameservers and SSL for your whole portfolio — auto-detected via RDAP, or added by hand. Alerts before anything lapses."
      />
      <div className="shrink-0 md:-mr-5 md:rotate-[4deg] lg:-mr-14">
        <ThemeScreenshot
          name="domains-card"
          alt="The Domains portfolio — one card per domain with renewal countdown, registrar, nameservers and SSL runway"
          className="w-[400px] max-w-full shadow-[0_18px_50px_-20px_rgba(0,0,0,0.35)]"
        />
      </div>
    </section>
  )
}
