import { Hero } from './sections/Hero'
import { FeatureGrid } from './sections/FeatureGrid'
import { StatusSection } from './sections/StatusSection'
import { ChannelsSection } from './sections/ChannelsSection'
import { DomainsSection } from './sections/DomainsSection'
import { Manifesto } from './sections/Manifesto'
import { Pricing } from './sections/Pricing'
import { FAQ } from './sections/FAQ'
import { FooterCTA } from './sections/FooterCTA'
import { SiteFooter } from './sections/SiteFooter'

export function LandingPage() {
  return (
    <div className="page-dots min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/15">
      <div className="px-4 py-6 sm:py-10">
        {/* The white content panel floats on the grey, dotted page; product
            mocks break out past its edges onto the grey. */}
        <main aria-labelledby="hero-heading" className="mx-auto max-w-[596px] rounded-[28px] border border-border/70 bg-card p-6">
          <div className="flex flex-col gap-[92px] md:gap-[120px]">
            <Hero />
            <FeatureGrid />
            <StatusSection />
            <ChannelsSection />
            <DomainsSection />
            <Manifesto />
            <Pricing />
            <FAQ />
            <FooterCTA />
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  )
}
