import { useLocation } from "react-router-dom"
import type { ComponentType } from "react"
import type { IconProps as SolarIconProps } from "@solar-icons/react"

import { GuardedLink } from "@/components/guarded-link"
import { Icon } from "@/components/ui/icon"
import AddSquare from "@solar-icons/react/csr/ui/AddSquare"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export interface NavGroup {
  label: string | null
  items: { title: string; url: string; icon: ComponentType<SolarIconProps> }[]
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const { pathname } = useLocation()

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Add monitor"
                className="min-w-8 bg-primary text-primary-foreground duration-150 ease-out hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground active:scale-[0.97]"
              >
                <GuardedLink to="/admin/monitors/new">
                  <Icon icon={AddSquare} />
                  <span>Add monitor</span>
                </GuardedLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {groups.map((group) => (
        <SidebarGroup key={group.label ?? "main"} className="py-1">
          {group.label && (
            <SidebarGroupLabel className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  item.url === "/admin"
                    ? pathname === "/admin" || pathname.startsWith("/admin/monitors")
                    : pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                      className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium"
                    >
                      <GuardedLink to={item.url}>
                        <Icon icon={item.icon} />
                        <span>{item.title}</span>
                      </GuardedLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
