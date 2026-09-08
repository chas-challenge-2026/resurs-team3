import type { CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import type { SidebarItem } from './AppSidebar'
import { Icon } from '../Icon'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/Sidebar'

const NAV_ITEMS: SidebarItem[] = [
  { key: 'kreditansokan', label: 'Kreditansökan', icon: <Icon name="edit" /> },
  { key: 'portal', label: 'Portal', icon: <Icon name="grid" /> },
  { key: 'aviseringar', label: 'Aviseringar', icon: <Icon name="bell" /> },
  { key: 'installningar', label: 'Inställningar', icon: <Icon name="settings" /> },
]

const SIDEBAR_SIZE = {
  '--sidebar-width': '450px',
  '--sidebar-width-icon': '4rem',
} as CSSProperties

/** Shared authenticated-area chrome: the sidebar nav + whatever the current route renders. */
export function AppLayout() {
  return (
    <SidebarProvider style={SIDEBAR_SIZE} className="bg-resurs-bg">
      <AppSidebar items={NAV_ITEMS} activeKey="kreditansokan" />
      <SidebarInset className="bg-resurs-bg">
        <div className="flex items-center border-b border-white/5 px-4 py-2">
          <SidebarTrigger className="text-white/70 hover:bg-white/10 hover:text-white" />
        </div>
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
