import { useQuery } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { LinkSquare02Icon } from "@hugeicons/core-free-icons"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeSwitch } from "@/components/unlumen-ui/theme-switch"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { StatusPage } from "@/types"

const statusLinkClass =
  "hidden items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-[color,background-color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground active:scale-[0.97] sm:flex"

export function SiteHeader({ title = "Dashboard" }: { title?: string }) {
  const pages = useQuery({
    queryKey: ["pages"],
    queryFn: () => api.get<{ pages: StatusPage[] }>("/api/admin/pages"),
    staleTime: 60_000,
  })
  const firstPage = pages.data?.pages[0]

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-1.5">
          <a
            href="https://github.com/steiner-co/pingboard"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub repository"
            className="hidden size-7 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground active:scale-[0.97] sm:flex"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.18-.02-2.13-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.79.55A10.55 10.55 0 0 0 23.5 12.02C23.5 5.66 18.35.5 12 .5z" />
            </svg>
          </a>
          {firstPage ? (
            <a
              href={`/${firstPage.slug}`}
              target="_blank"
              rel="noreferrer noopener"
              className={statusLinkClass}
            >
              <HugeiconsIcon icon={LinkSquare02Icon} className="size-3.5" strokeWidth={2} />
              Status page
            </a>
          ) : pages.isPending ? (
            // The link can only mount once the query resolves; without an
            // identically-sized slot held open meanwhile, the whole right-hand
            // cluster shifts ~90px on every page load.
            <span aria-hidden className={cn(statusLinkClass, "invisible")}>
              <span className="size-3.5" />
              Status page
            </span>
          ) : null}
          <ThemeSwitch />
        </div>
      </div>
    </header>
  )
}
