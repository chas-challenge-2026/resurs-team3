import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useCases } from '../../context/useCases'
import type { Decision } from '../../context/cases-context'
import type { ApplicationStatus, CreditCase } from '../../types/case'
import { formatDate, formatDateTime, formatSEK } from '../../utils/format'
import { caseTriage, decidedAt, riskOf, waitingDays } from './caseTriage'
import { CaseReviewPanel } from './CaseReviewPanel'
import styles from './CasesView.module.css'
import { joinClassNames } from '../../lib/joinClassNames'

interface CasesViewProps {
  search: string
  selectedCaseId: string
  onSelectCase: (caseId: string) => void
  onDecision: (id: string, status: Decision, comment: string) => boolean
  /** Which list to open on; otherwise the one holding the selected case. */
  initialView?: CasesListView
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING_DOCS: 'Komplettering krävs',
  UNDER_REVIEW: 'Under granskning',
  APPROVED: 'Beviljad',
  REJECTED: 'Avslagen',
}

function matchesSearch(application: CreditCase, search: string) {
  const query = search.trim().toLocaleLowerCase('sv-SE')
  if (!query) return true
  return [application.companyName, application.orgNumber, application.id, application.purpose]
    .some((value) => value.toLocaleLowerCase('sv-SE').includes(query))
}

export type CasesListView = 'OPEN' | 'HISTORY'
const FILTERS: Array<{ id: CasesListView; label: string }> = [
  { id: 'OPEN', label: 'Aktiva' },
  { id: 'HISTORY', label: 'Historik' },
]
/** Aktiva: waiting for a decision. Historik: decided (automatically or by a case worker). */
function matchesFilter(application: CreditCase, filter: CasesListView) {
  const open = application.status === 'UNDER_REVIEW' || application.status === 'PENDING_DOCS'
  return filter === 'OPEN' ? open : !open
}

export function CasesView({ search, selectedCaseId, onSelectCase, onDecision, initialView }: CasesViewProps) {
  const { cases } = useCases()
  // Open on the list that holds the selected case (e.g. from a notification).
  const [filter, setFilter] = useState<CasesListView>(() => {
    if (initialView) return initialView
    const current = cases.find((item) => item.id === selectedCaseId)
    return current && !matchesFilter(current, 'OPEN') ? 'HISTORY' : 'OPEN'
  })
  const [message, setMessage] = useState<{ text: string; tone: 'approved' | 'neutral' } | null>(null)
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const searched = useMemo(() => cases.filter((application) => matchesSearch(application, search)), [cases, search])
  const applications = useMemo(() => searched
    .filter((application) => matchesFilter(application, filter))
    // Aktiva like the queue (most serious first, then oldest); Historik newest decision first.
    .sort((a, b) => filter === 'OPEN'
      ? riskOf(b) - riskOf(a) || new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      : new Date(decidedAt(b).ts).getTime() - new Date(decidedAt(a).ts).getTime()), [searched, filter])
  const selected = applications.find((application) => application.id === selectedCaseId) ?? applications[0]

  useEffect(() => {
    if (selected && selected.id !== selectedCaseId) onSelectCase(selected.id)
  }, [onSelectCase, selected, selectedCaseId])

  // Same feedback as the queue: say what was saved, keep the decided case on
  // screen (leaving a status filter it no longer matches) and put focus on it.
  function handleDecision(id: string, status: Decision, comment: string) {
    const application = cases.find((item) => item.id === id)
    const saved = onDecision(id, status, comment)
    if (!saved || !application) return saved
    // Working through Aktiva: move on to the next active case, like the queue.
    // Last active case decided: show it where it now lives, in Historik.
    const next = filter === 'OPEN' ? applications.find((item) => item.id !== id) : undefined
    if (next) onSelectCase(next.id)
    else if (!matchesFilter({ ...application, status }, filter)) setFilter('HISTORY')
    setMessage({
      text: `${application.companyName}: ansökan ${status === 'APPROVED' ? 'beviljades' : 'avslogs'}. Motiveringen har sparats.${next ? ` Nästa ärende: ${next.companyName}.` : ''}`,
      tone: status === 'APPROVED' ? 'approved' : 'neutral',
    })
    requestAnimationFrame(() => {
      const heading = document.getElementById('case-review-heading')
      heading?.closest('article')?.scrollTo({ top: 0 })
      heading?.focus()
    })
    return true
  }

  function selectCase(caseId: string) {
    onSelectCase(caseId)
    setMessage(null)
    if (window.matchMedia('(max-width: 760px)').matches) {
      requestAnimationFrame(() => document.getElementById('case-review-heading')?.scrollIntoView({ block: 'start' }))
    }
  }

  // Same roving tabindex as the queue: one tab stop, arrows move between cases.
  function handleListKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null
    if (event.key === 'ArrowDown') next = Math.min(index + 1, applications.length - 1)
    else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = applications.length - 1
    if (next === null) return
    event.preventDefault()
    selectCase(applications[next].id)
    itemRefs.current[applications[next].id]?.focus()
  }

  return (
    <section className={styles.page} aria-labelledby="cases-heading">
      <header className={styles.header}>
        <div>
          <h1 id="cases-heading">Ärenden</h1>
          <p id="cases-hint">Aktiva väntar på beslut, Historik visar beslutade · pilar byter ärende</p>
        </div>
      </header>

      <div className={styles.filters} role="group" aria-label="Visa ärenden">
        {FILTERS.map((item) => {
          const count = searched.filter((application) => matchesFilter(application, item.id)).length
          return (
            <button key={item.id} type="button" aria-pressed={filter === item.id} className={styles.filter} onClick={() => { setFilter(item.id); setMessage(null) }}>
              {item.label} <span className={styles.filterCount}>{count}</span>
            </button>
          )
        })}
      </div>

      {message ? <p className={joinClassNames(styles.liveMessage, message.tone === 'neutral' && styles.liveMessageNeutral)} role="status" aria-live="polite">{message.text}</p> : null}

      {applications.length === 0 ? (
        <div className={styles.emptyState}>
          <p>
            {filter === 'OPEN'
              ? (search.trim() ? 'Inga aktiva ärenden matchar sökningen.' : 'Inga ärenden väntar på beslut.')
              : (search.trim() ? 'Inga beslutade ärenden matchar sökningen.' : 'Inga beslutade ärenden ännu.')}
          </p>
          {filter === 'OPEN' && searched.filter((application) => matchesFilter(application, 'HISTORY')).length > 0 ? (
            <button type="button" className={styles.emptyAction} onClick={() => setFilter('HISTORY')}>Visa historik ({searched.filter((application) => matchesFilter(application, 'HISTORY')).length})</button>
          ) : null}
        </div>
      ) : (
        <div className={styles.grid}>
          <ul className={styles.list} aria-label={filter === 'OPEN' ? 'Aktiva ärenden' : 'Beslutade ärenden'}>
            {applications.map((application, index) => (
              <li key={application.id}>
                <button
                  type="button"
                  ref={(el) => { itemRefs.current[application.id] = el }}
                  tabIndex={application.id === selected?.id ? 0 : -1}
                  aria-describedby="cases-hint"
                  onKeyDown={(event) => handleListKeyDown(event, index)}
                  aria-pressed={application.id === selected?.id}
                  className={joinClassNames(styles.item, application.id === selected?.id && styles.itemSelected)}
                  onClick={() => selectCase(application.id)}
                >
                  <span className={styles.company}>{application.companyName}</span>
                  <span className={styles.amount}>{formatSEK(application.amount)}</span>
                  {filter === 'OPEN' ? (
                    <>
                      <span className={styles.meta}>{application.orgNumber} · {formatDate(application.submittedAt)}{waitingDays(application.submittedAt) === null ? '' : ` · Väntat ${waitingDays(application.submittedAt)} d`}</span>
                      {application.status === 'PENDING_DOCS' ? (
                        <span className={joinClassNames(styles.status, styles.statusPENDING_DOCS)}>{STATUS_LABEL.PENDING_DOCS}</span>
                      ) : (() => {
                        const triage = caseTriage(application)
                        return <span className={joinClassNames(styles.triage, styles[`triage${triage.tone}`])}>{triage.text}</span>
                      })()}
                      <span className={styles.purpose}>{application.purpose || 'Syfte saknas'}</span>
                    </>
                  ) : (() => {
                    const decided = decidedAt(application)
                    return (
                      <>
                        <span className={styles.meta}>{application.orgNumber} · Beslutad {formatDateTime(decided.ts)} · {decided.manual ? (decided.override ? 'handläggare, ändrade automatiskt beslut' : 'handläggare') : 'automatiskt'}</span>
                        <span className={joinClassNames(styles.status, styles[`status${application.status}`])}>{STATUS_LABEL[application.status]}</span>
                      </>
                    )
                  })()}
                </button>
              </li>
            ))}
          </ul>
          {selected ? <CaseReviewPanel key={selected.id} application={selected} onDecision={handleDecision} /> : null}
        </div>
      )}
    </section>
  )
}
