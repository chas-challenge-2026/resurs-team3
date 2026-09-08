import { useState } from 'react'
import type { CSSProperties } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import type { SidebarItem } from '../../components/layout/AppSidebar'
import { Icon } from '../../components/Icon'
import { BackofficeTopBar } from './BackofficeTopBar'
import { DashboardView } from './DashboardView'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/Sidebar'

type BackofficeView = 'dashboard' | 'cases' | 'aviseringar'

// TODO: replace with the real CasesView (searchable case list) once built.
function CasesPlaceholder() {
  return <h2 className="text-xl font-extrabold text-white">Ärenden</h2>
}

// TODO: replace with the real AviseringarView (notifications list) once built.
function AviseringarPlaceholder() {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-white">Aviseringar</h2>
      <div className="mt-4 rounded-md bg-resurs-card p-5">
        <p className="text-sm text-resurs-muted">Inga aviseringar ännu.</p>
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
 * Case-worker backoffice shell: sidebar nav + top bar + whichever section is
 * active. Mirrors AppLayout's shell but manages its own view state instead
 * of nested routes, since the backoffice sections aren't separate URLs yet —
 * App.tsx renders this in place of AppLayout for handlaggare logins, so it
 * intentionally doesn't render an <Outlet />.
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
    <SidebarProvider style={SIDEBAR_SIZE} className="overflow-x-hidden bg-resurs-bg">
      <AppSidebar items={NAV_ITEMS} activeKey={view} onSelect={handleSelectNav} />
      <SidebarInset className="min-w-0 bg-resurs-bg">
        <div className="flex min-w-0 items-center gap-2 p-4 pb-0 sm:p-6 sm:pb-0 lg:p-8 lg:pb-0">
          <SidebarTrigger className="shrink-0 text-white/70 hover:bg-white/10 hover:text-white" />
          <div className="min-w-0 flex-1">
            <BackofficeTopBar search={search} onSearchChange={setSearch} />
          </div>
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
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
