import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useCases } from '../../context/useCases'
import { useAuth } from '../../auth/useAuth'
import type { Decision } from '../../context/cases-context'
import { Logo } from '../../components/Logo'
import { BackofficeTopBar } from './BackofficeTopBar'
import { DashboardView } from './DashboardView'
import { CasesView, type CasesListView } from './CasesView'
import { NotificationsView } from './NotificationsView'
import { joinClassNames } from '../../lib/joinClassNames'
import styles from './BackofficeLayout.module.css'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { ViewErrorBoundary } from './ViewErrorBoundary'

type BackofficeView = 'dashboard' | 'cases' | 'aviseringar'

const TABS: Array<{ id: BackofficeView; label: string }> = [
  { id: 'dashboard', label: 'Översikt' },
  { id: 'cases', label: 'Ärenden' },
  { id: 'aviseringar', label: 'Aviseringar' },
]

export function BackofficeLayout() {
  const [view, setView] = useState<BackofficeView>('dashboard')
  useDocumentTitle(TABS.find((tab) => tab.id === view)?.label, 'Handläggarportal')
  const [search, setSearch] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [casesInitialView, setCasesInitialView] = useState<CasesListView | undefined>()

  function goTo(next: BackofficeView, casesView?: CasesListView) {
    setCasesInitialView(casesView)
    // A search typed in one view doesn't silently filter the next one.
    if (next !== view) setSearch('')
    setView(next)
  }
  const { user } = useAuth()
  const { cases, notifications, decide } = useCases()
  const pendingCount = cases.filter((application) => application.status === 'UNDER_REVIEW').length
  const unreadCount = notifications.filter((notification) => !notification.read).length
  const tabRefs = useRef<Partial<Record<BackofficeView, HTMLButtonElement | null>>>({})
  const contentRef = useRef<HTMLDivElement>(null)

  // Same fix as LoginPage's tab switch: swapping the whole main content
  // area needs focus moved into it, or a keyboard/screen-reader user is
  // left on a nav button whose content just changed out from under them.
  // Opening a case from a notification lands on that case's heading.
  const focusCaseRef = useRef(false)
  useEffect(() => {
    if (focusCaseRef.current) {
      focusCaseRef.current = false
      requestAnimationFrame(() => (document.getElementById('case-review-heading') ?? contentRef.current)?.focus())
      return
    }
    contentRef.current?.focus()
  }, [view])

  function handleDecision(id: string, status: Decision, comment: string) {
    const actor = user?.role === 'client' ? 'Handläggare' : (user?.name ?? 'Handläggare')
    return decide(id, status, comment, actor)
  }

  function openCaseFromNotification(caseId: string) {
    setSelectedCaseId(caseId)
    setSearch('')
    focusCaseRef.current = true
    goTo('cases')
  }

  // Same roving-tabindex + arrow-key pattern as LoginPage's login-method
  // tablist (ArrowLeft/ArrowRight/Home/End), applied to this section
  // switcher now that it's marked up as real ARIA tabs.
  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = TABS.findIndex((tab) => tab.id === view)
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TABS.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = TABS.length - 1

    if (nextIndex === null) return
    event.preventDefault()
    const nextTab = TABS[nextIndex].id
    goTo(nextTab)
    tabRefs.current[nextTab]?.focus()
  }

  return (
    <div className={styles.appShell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Logo height={26} className={styles.brandLogo} />
        </div>
        <div className={styles.topBarContent}>
          <BackofficeTopBar search={search} onSearchChange={setSearch}>
            <nav className={styles.navigation} role="tablist" aria-label="Handläggarportal">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el }}
                  type="button"
                  role="tab"
                  id={`backoffice-tab-${tab.id}`}
                  aria-selected={view === tab.id}
                  aria-controls={`backoffice-panel-${tab.id}`}
                  tabIndex={view === tab.id ? 0 : -1}
                  className={joinClassNames(view === tab.id && styles.navActive)}
                  onClick={() => goTo(tab.id)}
                  onKeyDown={handleTabKeyDown}
                >
                  {tab.label}
                  {/* The badge keeps its space at 0, so the tabs don't shift. */}
                  {tab.id === 'dashboard' ? (
                    <span className={joinClassNames(styles.navCount, pendingCount === 0 && styles.navCountHidden)} aria-hidden={pendingCount === 0 || undefined}>{pendingCount > 9 ? '9+' : pendingCount}</span>
                  ) : null}
                  {tab.id === 'aviseringar' ? (
                    <span className={joinClassNames(styles.navCount, unreadCount === 0 && styles.navCountHidden)} aria-hidden={unreadCount === 0 || undefined}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                  ) : null}
                </button>
              ))}
            </nav>
          </BackofficeTopBar>
        </div>
      </header>

      {/* The main landmark stays a landmark; the tab panel sits inside it. */}
      <main className={styles.content} ref={contentRef} tabIndex={-1}>
        <div className={styles.tabPanel} role="tabpanel" id={`backoffice-panel-${view}`} aria-labelledby={`backoffice-tab-${view}`}>
        <ViewErrorBoundary key={view}>
        {view === 'dashboard' ? (
          <DashboardView search={search} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} onDecision={handleDecision} onShowAllCases={() => goTo('cases', 'HISTORY')} onOpenCase={openCaseFromNotification} />
        ) : view === 'cases' ? (
          <CasesView search={search} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} onDecision={handleDecision} initialView={casesInitialView} />
        ) : (
          <NotificationsView search={search} onOpenCase={openCaseFromNotification} />
        )}
        </ViewErrorBoundary>
        </div>
      </main>
    </div>
  )
}
