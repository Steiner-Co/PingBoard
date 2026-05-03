import { Button } from '@/components/ui/button'

function NoiseLogo() {
  return (
    <div
      aria-hidden
      className="relative h-56 w-56 overflow-hidden rounded-md border border-border/60 bg-card sm:h-64 sm:w-64"
    >
      <svg className="absolute inset-0 h-full w-full opacity-[0.55] mix-blend-screen dark:opacity-[0.45]" xmlns="http://www.w3.org/2000/svg">
        <filter id="hero-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" seed="7" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.4" intercept="-0.2" />
            <feFuncG type="linear" slope="1.4" intercept="-0.2" />
            <feFuncB type="linear" slope="1.4" intercept="-0.2" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-noise)" />
      </svg>

      {/* Sculpted P glyph cut from the noise */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full text-background"
        aria-hidden
      >
        <defs>
          <mask id="p-mask">
            <rect width="100" height="100" fill="white" />
            <rect x="32" y="22" width="11" height="58" fill="black" />
            <path d="M43 22 H58 a14 14 0 0 1 0 28 H43 z" fill="black" />
          </mask>
        </defs>
        <rect width="100" height="100" fill="currentColor" mask="url(#p-mask)" opacity="0.92" />
      </svg>

      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-background/85 px-2 py-1 backdrop-blur">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-success/70" />
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        <span className="font-mono text-[0.625rem] uppercase tracking-widest text-muted-foreground">live</span>
      </div>
    </div>
  )
}

function FooterLinks() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 px-8 py-5 text-[0.6875rem] text-muted-foreground sm:px-10">
      <nav className="flex items-center gap-5">
        <a href="#docs" className="transition-colors hover:text-foreground">
          Community
        </a>
        <a href="#changelog" className="transition-colors hover:text-foreground">
          Changelog
        </a>
        <a href="#license" className="transition-colors hover:text-foreground">
          License
        </a>
        <a href="#docs" className="transition-colors hover:text-foreground">
          Docs
        </a>
      </nav>
      <div className="flex items-center gap-3">
        <a href="https://github.com/" aria-label="GitHub" className="transition-colors hover:text-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.18-.02-2.13-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.79.55A10.55 10.55 0 0 0 23.5 12.02C23.5 5.66 18.35.5 12 .5z" />
          </svg>
        </a>
        <a href="https://x.com/" aria-label="X" className="transition-colors hover:text-foreground">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-8 py-6 sm:px-10">
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
          <span className="relative inline-block h-2 w-2 rounded-full bg-success" />
        </span>
        <span className="text-sm font-semibold tracking-tight">PINGBOARD.</span>
      </div>

      <div className="flex flex-1 flex-col justify-center px-8 py-10 sm:px-10 lg:py-0">
        <NoiseLogo />

        <a
          href="#features"
          className="mt-10 inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[0.6875rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          <span>Introducing</span>
          <span className="text-border">|</span>
          <span className="text-foreground/80">Real-time uptime monitoring</span>
          <span className="text-foreground/60">→</span>
        </a>

        <h1 className="mt-6 max-w-md text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[2.75rem] lg:text-[3rem]">
          Dead-simple,
          <br />
          self-hosted uptime
          <br />
          monitoring.
        </h1>

        <div className="mt-8 flex items-center gap-2">
          <Button asChild className="h-9 rounded-sm bg-foreground px-4 text-sm text-background hover:bg-foreground/90">
            <a href="/login">Get Started</a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-9 rounded-sm border-border/80 px-4 text-sm hover:bg-muted/40"
          >
            <a href="/login">Sign In</a>
          </Button>
        </div>
      </div>

      <FooterLinks />
    </div>
  )
}
