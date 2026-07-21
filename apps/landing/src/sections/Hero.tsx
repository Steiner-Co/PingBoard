import { TopNav } from './TopNav'
import { DashboardMock } from '@/mocks/DashboardMock'

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.18-.02-2.13-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.79.55A10.55 10.55 0 0 0 23.5 12.02C23.5 5.66 18.35.5 12 .5z" />
    </svg>
  )
}

export function Hero() {
  return (
    <section id="top" className="flex flex-col items-center gap-16">
      <TopNav />

      <div className="flex flex-col items-center gap-9">
        <div className="flex flex-col items-center gap-[18px] text-center">
          <h1 className="text-[28px] font-medium leading-[0.96] tracking-[-0.7px] text-balance text-foreground">
            <span className="block">Open-source uptime monitoring,</span>
            <span className="block">built for developers</span>
          </h1>
          <p className="max-w-[436px] text-[14px] leading-[1.35] tracking-[-0.35px] text-foreground/60">
            Monitors, status pages, alerts and domain tracking — the whole stack,
            self-hosted in one container. Unlimited and free, forever.
          </p>
        </div>

        <a
          href="https://github.com/steiner-co/pingboard"
          className="group inline-flex items-center gap-3 rounded-full bg-foreground py-2 pl-2 pr-4 text-[14px] text-background shadow-[inset_0_2px_4px_rgba(255,255,255,0.28),inset_0_-2px_4px_rgba(0,0,0,0.2)] outline-none transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.98]"
        >
          <span className="flex size-6 items-center justify-center">
            <GitHubIcon />
          </span>
          Get started
        </a>
      </div>

      {/* Wider than the panel so it breaks out onto the grey on both sides;
          the parent's items-center keeps the overflow symmetric (no mx-auto,
          which would collapse to 0 and pin it left). */}
      <div className="w-full md:w-[696px] md:max-w-none">
        <DashboardMock />
      </div>
    </section>
  )
}
