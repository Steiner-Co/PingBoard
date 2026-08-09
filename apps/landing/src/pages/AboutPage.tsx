import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'

function GitHubIcon() {
  return (
    <svg viewBox="0 0 1024 1024" fill="currentColor" className="size-5" aria-hidden>
      <path fillRule="evenodd" d="M512 0C229.12 0 0 229.12 0 512c0 226.56 146.56 417.92 350.08 485.76 25.6 4.48 35.2-10.88 35.2-24.32 0-12.16-.64-52.48-.64-95.36-128.64 23.68-161.92-31.36-172.16-60.16-5.76-14.72-30.72-60.16-52.48-72.32-17.92-9.6-43.52-33.28-.64-33.92 40.32-.64 69.12 37.12 78.72 52.48 46.08 77.44 119.68 55.68 149.12 42.24 4.48-33.28 17.92-55.68 32.64-68.48-113.92-12.8-232.96-56.96-232.96-252.8 0-55.68 19.84-101.76 52.48-137.6-5.12-12.8-23.04-65.28 5.12-135.68 0 0 42.88-13.44 140.8 52.48 40.96-11.52 84.48-17.28 128-17.28s87.04 5.76 128 17.28c97.92-66.56 140.8-52.48 140.8-52.48 28.16 70.4 10.24 122.88 5.12 135.68 32.64 35.84 52.48 81.28 52.48 137.6 0 196.48-119.68 240-233.6 252.8 18.56 16 34.56 46.72 34.56 94.72 0 68.48-.64 123.52-.64 140.8 0 13.44 9.6 29.44 35.2 24.32C877.44 929.92 1024 737.92 1024 512 1024 229.12 794.88 0 512 0" clipRule="evenodd" />
    </svg>
  )
}

const PRINCIPLES = [
  {
    title: 'Self-host means unlimited',
    body: 'No per-monitor pricing, no seat plans, no feature gates. Every monitor type, every channel, every status page — included, forever, on hardware you already own.',
  },
  {
    title: 'Setup is the product',
    body: 'One container, one volume, one port. If a feature adds friction between `docker run` and the first check, it doesn\u2019t ship. The target is under a minute, and the whole product is judged against it.',
  },
  {
    title: 'Boring technology, on purpose',
    body: 'A Bun server, an embedded SQLite database, Server-Sent Events, an in-process scheduler. No Redis, no queue, no external services to babysit at 2am — and backups are copying one file.',
  },
  {
    title: 'The UI is the only configuration',
    body: 'No YAML, no config files to reconcile, no CLI for daily operations. If you can\u2019t do it from the dashboard, it\u2019s a bug in the dashboard.',
  },
] as const

export function AboutPage() {
  return (
    <>
      <Seo
        title="About"
        description="Why PingBoard exists: unlimited, self-hosted uptime monitoring that costs nothing and answers to no one."
        path="/about"
      />
      <div className="flex w-full flex-col gap-12">
        <header className="flex flex-col gap-3">
          <h1 className="text-[28px] font-medium leading-[1.02] tracking-[-0.7px] text-foreground">
            About
          </h1>
          <p className="max-w-[440px] text-[14px] leading-[1.5] tracking-[-0.35px] text-foreground/60">
            PingBoard is open-source uptime monitoring, built for developers —
            self-hosted in one container, unlimited and free, forever.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-[20px] font-medium leading-[1.2] tracking-[-0.5px] text-foreground">
            Why it exists
          </h2>
          <div className="flex flex-col gap-4 text-[14px] leading-[1.7] tracking-[-0.3px] text-foreground/70">
            <p>
              Uptime monitoring is a solved problem that&apos;s somehow still
              expensive. The hosted tools charge per monitor, per status page,
              per seat — the meter runs on things that cost them nearly
              nothing. The serious self-hosted options ask you to run a small
              datacenter: an app server, a database, a cache, a queue, four
              containers before you&apos;ve checked a single URL. And the
              lightweight classics work, but their interfaces haven&apos;t
              moved in a decade.
            </p>
            <p>
              PingBoard is the boring middle: a monitor you&apos;d actually
              enjoy opening, running as one container on the box you already
              have. Watch your whole stack — endpoints, certificates, domains,
              cron jobs — from a single screen. No account, no limits, no
              lock-in. Your monitoring, your data, your box.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[20px] font-medium leading-[1.2] tracking-[-0.5px] text-foreground">
            Principles
          </h2>
          <ul className="flex flex-col">
            {PRINCIPLES.map((p) => (
              <li key={p.title} className="flex flex-col gap-1.5 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
                <h3 className="text-[14px] font-medium tracking-[-0.35px] text-foreground">
                  {p.title}
                </h3>
                <p className="text-[13px] leading-[1.65] tracking-[-0.3px] text-foreground/60">
                  {p.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[20px] font-medium leading-[1.2] tracking-[-0.5px] text-foreground">
            Who builds it
          </h2>
          <div className="flex flex-col gap-4 text-[14px] leading-[1.7] tracking-[-0.3px] text-foreground/70">
            <p>
              PingBoard is built by{' '}
              <span translate="no" className="font-medium text-foreground">Steiner&amp;Co.</span>{' '}
              and released under the MIT license — every line of it, including
              the code a future hosted version will run on. The roadmap is
              public, the issues are public, and contributions are welcome.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium">
            <a
              href="https://github.com/steiner-co/pingboard"
              className="rounded-[4px] text-foreground/70 outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              GitHub
            </a>
            <a
              href="https://github.com/steiner-co/pingboard/discussions"
              className="rounded-[4px] text-foreground/70 outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              Community
            </a>
            <Link
              to="/blog"
              className="rounded-[4px] text-foreground/70 outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              Blog
            </Link>
            <Link
              to="/docs"
              className="rounded-[4px] text-foreground/70 outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              Docs
            </Link>
          </div>
        </section>

        <a
          href="https://github.com/steiner-co/pingboard"
          className="group inline-flex w-fit items-center gap-3 rounded-full bg-foreground py-2 pl-2 pr-4 text-[14px] text-background shadow-[inset_0_2px_4px_rgba(255,255,255,0.28),inset_0_-2px_4px_rgba(0,0,0,0.2)] outline-none transition-[transform,opacity] duration-150 ease-out hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.97]"
        >
          <span className="flex size-6 items-center justify-center">
            <GitHubIcon />
          </span>
          Star us on GitHub
        </a>
      </div>
    </>
  )
}
