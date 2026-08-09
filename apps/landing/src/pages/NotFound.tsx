import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'

export function NotFound() {
  return (
    <>
      <Seo title="Page not found" description="This page does not exist." path="/404" />
      <div className="mx-auto flex w-full max-w-[768px] flex-col items-center gap-6 py-16 text-center">
        <p className="text-[12px] font-medium tracking-wide text-foreground/40">404</p>
        <h1 className="text-[28px] font-medium leading-[1.1] tracking-[-0.7px] text-balance text-foreground">
          This page doesn't exist
        </h1>
        <p className="max-w-[436px] text-[14px] leading-[1.35] tracking-[-0.35px] text-foreground/60">
          The link may be broken, or the page may have moved.
        </p>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-full bg-foreground px-[18px] py-3 text-[14px] font-medium leading-[0.96] tracking-[-0.35px] text-background outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.97]"
          >
            Back home
          </Link>
          <Link
            to="/docs"
            className="rounded-full bg-muted px-[18px] py-3 text-[14px] font-medium leading-[0.96] tracking-[-0.35px] text-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.97]"
          >
            Read the docs
          </Link>
        </div>
      </div>
    </>
  )
}
