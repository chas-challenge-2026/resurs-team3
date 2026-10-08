import { useState } from 'react'
import type { CSSProperties } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import type { SidebarItem } from '../../components/layout/AppSidebar'
import { Icon } from '../../components/Icon'
import { BackofficeTopBar } from './BackofficeTopBar'
import { DashboardView } from './DashboardView'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/Sidebar'
import styles from './BackofficeLayout.module.css'

type BackofficeView = 'dashboard' | 'cases' | 'aviseringar'

// TODO: replace with the real CasesView (searchable case list) once built.
function CasesPlaceholder() {
  return <h2 className={styles.placeholderHeading}>Ärenden</h2>
}

// TODO: replace with the real AviseringarView (notifications list) once built.
function AviseringarPlaceholder() {
  return (
    <div>
      <h2 className={styles.placeholderHeading}>Aviseringar</h2>
      <div className={styles.placeholderCard}>
        <p className={styles.placeholderCardText}>Inga aviseringar ännu.</p>
      </div>
    </div>
  )
}

const NAV_ITEMS: SidebarItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <Icon name="home" /> },
  { key: 'cases', label: 'Ärenden', icon: <Icon name="folder" /> },
  { key: 'aviseringar', label: 'Aviseringar', icon: <Icon name="bell" /> },
]

const SIDEBAR_SIZE = {
  '--sidebar-width': '450px',
  '--sidebar-width-icon': '4rem',
} as CSSProperties

/**
 * Caseworker backoffice layout with sidebar navigation and local view state.
 */
export function BackofficeLayout() {
  const [view, setView] = useState<BackofficeView>('dashboard')
  const [search, setSearch] = useState('')

  function handleSelectNav(key: string) {
    if (key === 'dashboard' || key === 'cases' || key === 'aviseringar') {
      setView(key)
    }
  }

  return (
    <SidebarProvider style={SIDEBAR_SIZE} className={styles.providerRoot}>
      <AppSidebar items={NAV_ITEMS} activeKey={view} onSelect={handleSelectNav} />
      <SidebarInset className={styles.inset}>
        <div className={styles.topBarRow}>
          <SidebarTrigger className={styles.trigger} />
          <div className={styles.topBarContent}>
            <BackofficeTopBar search={search} onSearchChange={setSearch} />
          </div>
        </div>
        <div className={styles.content}>
          {view === 'dashboard' ? (
            <DashboardView />
          ) : view === 'cases' ? (
            <CasesPlaceholder />
          ) : (
            <AviseringarPlaceholder />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
