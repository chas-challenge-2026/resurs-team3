import { useState } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import type { SidebarItem } from '../../components/layout/AppSidebar'
import { Icon } from '../../components/Icon'
import { BackofficeTopBar } from './BackofficeTopBar'

type BackofficeView = 'dashboard' | 'cases' | 'aviseringar'

// TODO: replace with the real DashboardView (stat tiles + queue) once built.
function DashboardPlaceholder() {
  return <p className="text-white">Dashboard</p>
}

// TODO: replace with the real CasesView (searchable case list) once built.
function CasesPlaceholder() {
  return <p className="text-white">Cases</p>
}

// TODO: replace with the real AviseringarView (notifications list) once built.
function AviseringarPlaceholder() {
  return <p className="text-white">Aviseringar</p>
}

const NAV_ITEMS: SidebarItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <Icon name="home" /> },
  { key: 'cases', label: 'Cases', icon: <Icon name="folder" /> },
  { key: 'aviseringar', label: 'Aviseringar', icon: <Icon name="bell" /> },
]

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
    <div className="flex min-h-screen overflow-x-hidden bg-resurs-bg">
      <AppSidebar items={NAV_ITEMS} activeKey={view} onSelect={handleSelectNav} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <BackofficeTopBar search={search} onSearchChange={setSearch} />
        <div className="mt-6">
          {view === 'dashboard' ? (
            <DashboardPlaceholder />
          ) : view === 'cases' ? (
            <CasesPlaceholder />
          ) : (
            <AviseringarPlaceholder />
          )}
        </div>
      </main>
    </div>
  )
}
