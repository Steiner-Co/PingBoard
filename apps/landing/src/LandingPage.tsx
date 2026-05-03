import { Hero } from './sections/Hero'
import { RightColumnNav } from './sections/RightColumnNav'
import { Readme } from './sections/Readme'
import { FeaturesGrid } from './sections/FeaturesGrid'
import { ConfigSection } from './sections/ConfigSection'
import { PluginStrip } from './sections/PluginStrip'
import { DashboardPreview } from './sections/DashboardPreview'
import { FooterCTA } from './sections/FooterCTA'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground/10">
      <div className="lg:grid lg:grid-cols-[36%_1fr]">
        <aside className="border-b border-border/60 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <Hero />
        </aside>
        <main className="min-w-0">
          <RightColumnNav />
          <Readme />
          <FeaturesGrid />
          <ConfigSection />
          <PluginStrip />
          <DashboardPreview />
          <FooterCTA />
        </main>
      </div>
    </div>
  )
}
