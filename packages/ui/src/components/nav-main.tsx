import { useLocation } from "react-router-dom"
import type { ComponentType } from "react"
import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react"

import { Link } from "react-router-dom"
import { Icon } from "@/components/ui/icon"
import { PlusCircle } from "@phosphor-icons/react/dist/icons/PlusCircle"

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
  items: { title: string; url: string; icon: ComponentType<PhosphorIconProps> }[]
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
                <Link to="/admin/monitors/new">
                  <Icon icon={PlusCircle} stateful />
                  <span>Add monitor</span>
                </Link>
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
                      <Link to={item.url}>
                        <Icon icon={item.icon} stateful active={isActive} />
                        <span>{item.title}</span>
                      </Link>
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
