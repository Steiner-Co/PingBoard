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
import ChartSquare from "@solar-icons/react/csr/business/ChartSquare"
import Global from "@solar-icons/react/csr/map/Global"
import DangerCircle from "@solar-icons/react/csr/ui/DangerCircle"
import Calendar from "@solar-icons/react/csr/time/Calendar"
import Bell from "@solar-icons/react/csr/notifications/Bell"
import Settings from "@solar-icons/react/csr/settings/Settings"

const navGroups = [
  {
    label: "Monitor",
    items: [
      { title: "Dashboard", url: "/admin", icon: ChartSquare },
      { title: "Domains", url: "/admin/domains", icon: Global },
      { title: "Incidents", url: "/admin/incidents", icon: DangerCircle },
      { title: "Maintenance", url: "/admin/maintenance", icon: Calendar },
    ],
  },
  {
    label: "Configure",
    items: [
      { title: "Channels", url: "/admin/channels", icon: Bell },
      { title: "Status pages", url: "/admin/pages", icon: Global },
      { title: "Settings", url: "/admin/settings", icon: Settings },
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
