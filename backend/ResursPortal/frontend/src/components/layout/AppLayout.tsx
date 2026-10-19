import type { CSSProperties } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/Sidebar'
import { useAuth } from '../../auth/useAuth'
import { AccountBadge } from '../AccountBadge'
import { Logo } from '../Logo'
import { joinClassNames } from '../../lib/joinClassNames'
import styles from './AppLayout.module.css'
import { ROUTES } from '../../routes'

const SIDEBAR_SIZE = {
  '--sidebar-width': '0px',
  '--sidebar-width-icon': '4rem',
} as CSSProperties

/** Applicant portal chrome. Case workers use the separate backoffice shell. */
export function AppLayout() {
  const { pathname } = useLocation()
  const isWizard = pathname.startsWith(ROUTES.wizard)
  // An application's status page lives under Översikt (its breadcrumb says
  // so), so the nav marks Översikt as where the applicant is.
  const inOverview = pathname.startsWith(`${ROUTES.application}/`)
  const { user, logout } = useAuth()
  const displayName = user?.role === 'client' ? user.companyName : (user?.name ?? '')

  return (
    <SidebarProvider
      style={SIDEBAR_SIZE}
      className={styles.providerRoot}
    >
      <SidebarInset className={styles.inset}>
        {/* First tab stop: past the menu to the page itself. */}
        <a href="#main" className={styles.skipLink}>Hoppa till innehållet</a>
        <header className={styles.topBar}>
          <div className={styles.brand}>
            <Logo className={styles.logo} />
          </div>
          <nav className={styles.nav} aria-label="Huvudmeny">
            {inOverview ? <Link to={ROUTES.overview} aria-current="location">Översikt</Link> : <NavLink to={ROUTES.overview}>Översikt</NavLink>}
            <NavLink to={ROUTES.wizard}>Ny kreditansökan</NavLink>
            <NavLink to={ROUTES.documents}>Mina handlingar</NavLink>
          </nav>
          <div className={styles.account}>
            <AccountBadge companyDisplayName={displayName} onLogout={logout} />
          </div>
        </header>
        {/* SidebarInset already renders the page's <main>; this is only the
            skip link's target, so the page has one main landmark. */}
        <div id="main" tabIndex={-1} className={joinClassNames(styles.main, isWizard && styles.mainWizard)}>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
