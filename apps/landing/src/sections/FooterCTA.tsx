import { Button } from '@/components/ui/button'

export function FooterCTA() {
  return (
    <section className="px-8 py-20 text-center sm:px-12 lg:px-16 lg:py-24">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Spin it up in sixty seconds.
      </h2>
      <div className="mt-5 flex items-center justify-center gap-5 text-[0.75rem] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1 w-1 rounded-full bg-success" /> One container
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1 w-1 rounded-full bg-success" /> One SQLite file
        </span>
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <span className="inline-block h-1 w-1 rounded-full bg-success" /> Zero external services
        </span>
      </div>
      <div className="mt-7 flex items-center justify-center gap-2">
        <Button asChild className="h-9 rounded-sm bg-foreground px-4 text-sm text-background hover:bg-foreground/90">
          <a href="/login">Get Started</a>
        </Button>
        <Button asChild variant="outline" className="h-9 rounded-sm border-border/80 px-4 text-sm hover:bg-muted/40">
          <a href="/login">Sign In</a>
        </Button>
      </div>
    </section>
  )
}
