import { useQuery } from "@tanstack/react-query"

import { Link } from "react-router-dom"
import { api } from "@/lib/api"

interface InstanceUpdate {
  version: string
  update?: {
    state: "up-to-date" | "update-available" | "unknown" | "disabled"
    latest?: string
    url?: string
  }
}

/**
 * Version + update nudge above NavUser in the sidebar footer. Shares the
 * ['instance'] query key with the Settings Instance card, so react-query
 * dedupes the fetch. Renders nothing until loaded — the footer shouldn't
 * shift under the user's cursor.
 */
export function VersionBadge() {
  const query = useQuery({
    queryKey: ["instance"],
    queryFn: () => api.get<InstanceUpdate>("/api/admin/instance"),
    staleTime: 30_000,
  })
  const info = query.data
  if (!info) return null

  const update = info.update
  if (update?.state === "update-available" && update.latest && update.url) {
    return (
      <div className="flex items-center gap-1.5 px-2 pb-1 text-[11px] text-sidebar-foreground/70">
        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
        <a
          href={update.url}
          target="_blank"
          rel="noreferrer"
          className="transition-colors duration-150 ease-out hover:text-sidebar-accent-foreground"
        >
          v{update.latest} available
        </a>
      </div>
    )
  }

  return (
    <div className="px-2 pb-1 text-[11px] text-sidebar-foreground/70">
      <Link
        to="/admin/settings"
        className="transition-colors duration-150 ease-out hover:text-sidebar-accent-foreground"
      >
        v{info.version}
      </Link>
    </div>
  )
}
