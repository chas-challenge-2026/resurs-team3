import type { ReactNode } from 'react'
import { Logo } from '../Logo'
import { Symbol } from '../Symbol'
import { BrandBlob } from '../BrandBlob'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/Sidebar'
import { useSidebar } from '@/components/ui/sidebar-context'

export interface SidebarItem {
  key: string
  label: string
  icon: ReactNode
  /** Unread/pending count shown as a small badge on the icon. Omit or 0 to hide it. */
  badge?: number
}

interface AppSidebarProps {
  items: SidebarItem[]
  activeKey: string
  onSelect?: (key: string) => void
}

/**
 * Shared sidebar shell used by both the applicant wizard and the caseworker
 * backoffice — built on shadcn's Sidebar primitive (SidebarProvider wraps it
 * one level up, in AppLayout/BackofficeLayout) so it gets real collapse-to-
 * icons on desktop and an off-canvas drawer on mobile, instead of the old
 * fixed icon-strip/full-panel breakpoint.
 */
export function AppSidebar({ items, activeKey, onSelect }: AppSidebarProps) {
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  return (
    <Sidebar collapsible="icon" className="border-none">
      <BrandBlob width={300} color="rgba(255,255,255,0.05)" />
      <SidebarHeader className="relative z-10 p-3 lg:p-6">
        {collapsed ? (
          <div className="flex justify-center">
            <Symbol size={28} />
          </div>
        ) : (
          <div className="w-full" style={{ maxWidth: 332, aspectRatio: '332 / 177' }}>
            <Logo width="100%" height="100%" />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="relative z-10 px-3 pb-3 lg:px-6">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={item.key === activeKey}
                    tooltip={item.label}
                    onClick={onSelect ? () => onSelect(item.key) : undefined}
                    className="min-h-[44px] justify-center gap-3 px-2 text-white/80 hover:bg-white/5 hover:text-white data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-white lg:justify-start lg:px-3"
                  >
                    <span className="shrink-0 text-base" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {item.badge ? (
                      <SidebarMenuBadge className="static ml-auto rounded-full bg-resurs-orange px-1.5 py-0.5 text-[10px] font-bold text-resurs-onOrange group-data-[collapsible=icon]:hidden">
                        {item.badge > 9 ? '9+' : item.badge}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
