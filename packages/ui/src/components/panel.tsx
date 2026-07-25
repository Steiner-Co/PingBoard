import type * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Bordered surface. The dashboard's framing primitive — use instead of Card
 * there.
 */
export function Panel({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("relative rounded-lg border border-border bg-card", className)}
      {...props}
    >
      {children}
    </section>
  )
}
