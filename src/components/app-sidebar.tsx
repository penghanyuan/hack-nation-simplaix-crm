"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Users, CheckSquare, TestTube2 } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { GmailConnectButton } from "@/components/gmail-connect-button"

const navigation = [
  {
    title: "People",
    icon: Users,
    href: "/people",
  },
  {
    title: "Tasks",
    icon: CheckSquare,
    href: "/tasks",
  },
  {
    title: "Test Email",
    icon: TestTube2,
    href: "/test-email",
  },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const pathname = usePathname()
  
  return (
    <Sidebar collapsible="icon" className="bg-neutral-50 border-r-0 shadow-md">
      <SidebarHeader className="p-4">
        {state === "expanded" ? (
          <h2 className="text-lg font-semibold text-neutral-900">Simplaix CRM</h2>
        ) : (
          <div className="flex items-center justify-center">
            <span className="text-2xl font-bold text-neutral-900">S</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    className="text-neutral-700 hover:bg-neutral-100 data-[active=true]:bg-neutral-100 data-[active=true]:text-neutral-900"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {state === "expanded" ? (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-neutral-500">Integrations</SidebarGroupLabel>
            <SidebarGroupContent className="px-2 space-y-2">
              <GmailConnectButton />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
    </Sidebar>
  )
}

