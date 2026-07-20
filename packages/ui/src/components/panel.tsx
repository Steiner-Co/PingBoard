import type * as React from "react"

import { cn } from "@/lib/utils"

function Tick({ className }: { className: string }) {
  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-10 size-[9px] text-muted-foreground/40",
        className,
      )}
      viewBox="0 0 9 9"
      fill="none"
    >
      <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/**
 * Sharp-cornered bordered surface with blueprint-style crosshair ticks at the
 * corners. The dashboard's framing primitive — use instead of Card there.
 */
export function Panel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("relative border border-border/70 bg-card", className)}>
      <Tick className="-top-[4.5px] -left-[4.5px]" />
      <Tick className="-top-[4.5px] -right-[4.5px]" />
      <Tick className="-bottom-[4.5px] -left-[4.5px]" />
      <Tick className="-bottom-[4.5px] -right-[4.5px]" />
      {children}
    </section>
  )
}
