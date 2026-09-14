import type { CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import type { SidebarItem } from './AppSidebar'
import { Icon } from '../Icon'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/Sidebar'
import styles from './AppLayout.module.css'

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
    <SidebarProvider style={SIDEBAR_SIZE} className={styles.providerRoot}>
      <AppSidebar items={NAV_ITEMS} activeKey="kreditansokan" />
      <SidebarInset className={styles.inset}>
        <div className={styles.topBar}>
          <SidebarTrigger className={styles.trigger} />
        </div>
        <main className={styles.main}>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
