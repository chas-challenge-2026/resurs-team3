import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import type { SidebarItem } from './AppSidebar'
import { Icon } from '../Icon'

const NAV_ITEMS: SidebarItem[] = [{ key: 'home', label: 'Översikt', icon: <Icon name="home" /> }]

/** Shared authenticated-area chrome: the sidebar nav + whatever the current route renders. */
export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-resurs-bg">
      <AppSidebar items={NAV_ITEMS} activeKey="home" />
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <Outlet />
      </main>
    </div>
  )
}
