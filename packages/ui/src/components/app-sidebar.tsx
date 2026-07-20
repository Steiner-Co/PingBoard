import * as React from "react"
import { GuardedLink } from "@/components/guarded-link"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  AlertCircleIcon,
  Calendar03Icon,
  Notification03Icon,
  GlobeIcon,
  DashboardSquare01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"

const navGroups = [
  {
    label: "Monitor",
    items: [
      { title: "Dashboard", url: "/admin", icon: DashboardSquare01Icon },
      { title: "Incidents", url: "/admin/incidents", icon: AlertCircleIcon },
      { title: "Maintenance", url: "/admin/maintenance", icon: Calendar03Icon },
    ],
  },
  {
    label: "Configure",
    items: [
      { title: "Channels", url: "/admin/channels", icon: Notification03Icon },
      { title: "Status pages", url: "/admin/pages", icon: GlobeIcon },
      { title: "Settings", url: "/admin/settings", icon: Settings02Icon },
    ],
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: { name: string; email: string }
  onLogout: () => void | Promise<void>
}

export function AppSidebar({ user, onLogout, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <GuardedLink to="/admin">
                {/* No pulse: constant motion in a dashboard fatigues. The dot
                    is still the brand mark; quiet is part of "all good". */}
                <span className="inline-block size-2.5 rounded-full bg-success" />
                <span className="text-base font-semibold">PingBoard</span>
              </GuardedLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={onLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
