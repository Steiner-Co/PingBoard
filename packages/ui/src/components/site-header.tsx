import { useQuery } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { LinkSquare02Icon } from "@hugeicons/core-free-icons"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeSwitch } from "@/components/unlumen-ui/theme-switch"
import { api } from "@/lib/api"
import type { StatusPage } from "@/types"

export function SiteHeader({ title = "Dashboard" }: { title?: string }) {
  const pages = useQuery({
    queryKey: ["pages"],
    queryFn: () => api.get<{ pages: StatusPage[] }>("/api/admin/pages"),
    staleTime: 60_000,
  })
  const firstPage = pages.data?.pages[0]

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-1.5">
          {firstPage && (
            <a
              href={`/${firstPage.slug}`}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
            >
              <HugeiconsIcon icon={LinkSquare02Icon} className="size-3.5" strokeWidth={2} />
              Status page
            </a>
          )}
          <ThemeSwitch />
        </div>
      </div>
    </header>
  )
}
