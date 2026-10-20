import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { CreditCase } from '../../types/case'
import type { Decision } from '../../context/cases-context'
import { useCases } from '../../context/useCases'
import { formatDate, formatSEK } from '../../utils/format'
import { CaseReviewPanel } from './CaseReviewPanel'
import { caseTriage, riskOf } from './caseTriage'
import styles from './QueueTable.module.css'
import { joinClassNames } from '../../lib/joinClassNames'

interface QueueTableProps {
  search: string
  selectedCaseId: string
  onSelectCase: (caseId: string) => void
  onDecision: (id: string, status: Decision, comment: string) => boolean
  /** Next step when the queue is empty. */
  onShowAllCases?: () => void
}

function daysWaiting(submittedAt: string) {
  const submittedTime = new Date(submittedAt).getTime()
  if (!Number.isFinite(submittedTime)) return null
  return Math.max(0, Math.floor((Date.now() - submittedTime) / 86_400_000))
}


function matchesSearch(application: CreditCase, search: string) {
  const query = search.trim().toLocaleLowerCase('sv-SE')
  if (!query) return true
  return [application.companyName, application.orgNumber, application.id, application.purpose]
    .some((value) => value.toLocaleLowerCase('sv-SE').includes(query))
}

export function QueueTable({ search, selectedCaseId, onSelectCase, onDecision, onShowAllCases }: QueueTableProps) {
  const { cases } = useCases()
  const [decisionMessage, setDecisionMessage] = useState('')
  // Green only for an approval; a rejection or a notice is neutral.
  const [messageTone, setMessageTone] = useState<'approved' | 'neutral'>('neutral')
  const [advanced, setAdvanced] = useState(false)
  const emptyActionRef = useRef<HTMLButtonElement>(null)
  const [decidedHere, setDecidedHere] = useState('')
  // The open case can leave the queue without a decision here: another tab
  // or case worker decided it (storage sync). Say so instead of silently
  // swapping the panel to the next case.
  const [shownCase, setShownCase] = useState<{ id: string; name: string } | null>(null)
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const pending = useMemo(() => cases
    .filter((application) => application.status === 'UNDER_REVIEW' && matchesSearch(application, search))
    // Most serious first (reject-level flags, then more flags), oldest within that.
    .sort((a, b) => riskOf(b) - riskOf(a) || new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()), [cases, search])
  const selected = pending.find((application) => application.id === selectedCaseId) ?? pending[0]

  if ((selected?.id ?? null) !== (shownCase?.id ?? null)) {
    setShownCase(selected ? { id: selected.id, name: selected.companyName } : null)
    const goneCase = shownCase ? cases.find((item) => item.id === shownCase.id) : undefined
    if (shownCase && goneCase && goneCase.status !== 'UNDER_REVIEW' && shownCase.id !== decidedHere) {
      setMessageTone('neutral')
      setDecisionMessage(`${shownCase.name} fick ett beslut i en annan flik eller av en annan handläggare.${selected ? ` Nu visas ${selected.companyName}.` : ''}`)
    }
  }

  useEffect(() => {
    if (selected && selected.id !== selectedCaseId) onSelectCase(selected.id)
  }, [onSelectCase, selected, selectedCaseId])

  function handleDecision(id: string, status: Decision, comment: string) {
    const application = pending.find((item) => item.id === id)
    const next = pending.find((item) => item.id !== id)
    const saved = onDecision(id, status, comment)
    if (!saved) return false
    setDecidedHere(id)
    if (application) {
      setMessageTone(status === 'APPROVED' ? 'approved' : 'neutral')
      setDecisionMessage(`${application.companyName}: ansökan ${status === 'APPROVED' ? 'beviljades' : 'avslogs'}. Motiveringen har sparats.${next ? ` Nästa ärende: ${next.companyName}.` : ''}`)
    }
    // The next case opens at its heading, not on its decision buttons.
    setAdvanced(true)
    // Phone: the confirmation sits above the list; bring it into view.
    if (window.matchMedia('(max-width: 760px)').matches) {
      requestAnimationFrame(() => document.querySelector(`.${styles.liveMessage}`)?.scrollIntoView({ block: 'start' }))
    }
    // Last case decided: focus the way on instead of dropping to <body>.
    if (!next) requestAnimationFrame(() => (emptyActionRef.current ?? document.getElementById('queue-heading'))?.focus())
    return true
  }

  function selectCase(caseId: string) {
    onSelectCase(caseId)
    setDecisionMessage('')
    setAdvanced(false)
    // Phone: the case opens below the list, so bring it into view.
    if (window.matchMedia('(max-width: 760px)').matches) {
      requestAnimationFrame(() => document.getElementById('case-review-heading')?.scrollIntoView({ block: 'start' }))
    }
  }

  // Roving tabindex: one tab stop for the queue, arrow keys move between cases.
  function handleQueueKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null
    if (event.key === 'ArrowDown') nextIndex = Math.min(index + 1, pending.length - 1)
    else if (event.key === 'ArrowUp') nextIndex = Math.max(index - 1, 0)
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = pending.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    const nextCase = pending[nextIndex]
    selectCase(nextCase.id)
    itemRefs.current[nextCase.id]?.focus()
  }

  return (
    <section className={styles.wrap} aria-labelledby="queue-heading">
      {/* One live region that stays mounted when the queue empties, so the
          last decision is announced too. */}
      <p className={styles.srOnly} role="status" aria-live="polite">{decisionMessage}</p>
      {pending.length === 0 ? (
        <div className={joinClassNames(styles.queuePane, styles.queuePaneEmpty)}>
          <header className={styles.headerRow}>
            <div>
              <h2 id="queue-heading" className={styles.heading}>Ärendekö</h2>
              <p className={styles.subheading}>Allvarligast först, sedan äldst</p>
            </div>
            <span className={styles.countPill}><span aria-hidden="true">{pending.length}</span><span className={styles.srOnly}>{pending.length} väntande ansökningar</span></span>
          </header>
          {decisionMessage ? <p className={joinClassNames(styles.liveMessage, messageTone === 'neutral' && styles.liveMessageNeutral)}>{decisionMessage}</p> : null}
          <p className={styles.emptyState}>{search.trim() ? 'Inga väntande ansökningar matchar sökningen. Sök på företag, org.nr eller ID.' : 'Inga ansökningar väntar på beslut. Nya ansökningar som behöver granskas hamnar här.'}</p>
          {!search.trim() && onShowAllCases ? (
            <p className={styles.emptyAction}><button type="button" ref={emptyActionRef} onClick={onShowAllCases}>Visa beslutade ärenden</button></p>
          ) : null}
        </div>
      ) : (
        <div className={styles.queueGrid}>
          <section className={joinClassNames(styles.queuePane, styles.queuePaneActive)} aria-label="Ärenden som väntar på beslut">
            <header className={styles.headerRow}>
              <div>
                <h2 id="queue-heading" className={styles.heading}>Ärendekö</h2>
                <p className={styles.subheading} id="queue-hint">Allvarligast först · pilar byter ärende</p>
              </div>
              <span className={styles.countPill}><span aria-hidden="true">{pending.length}</span><span className={styles.srOnly}>{pending.length} väntande ansökningar</span></span>
            </header>
            {decisionMessage ? <p className={joinClassNames(styles.liveMessage, messageTone === 'neutral' && styles.liveMessageNeutral)}>{decisionMessage}</p> : null}
            <ul className={styles.caseList} aria-label="Ansökningar som väntar på beslut">
              {pending.map((application, index) => {
                const age = daysWaiting(application.submittedAt)
                const triage = caseTriage(application)
                return (
                  <li key={application.id}>
                    <button
                      type="button"
                      ref={(el) => { itemRefs.current[application.id] = el }}
                      tabIndex={application.id === selected?.id ? 0 : -1}
                      aria-describedby="queue-hint"
                      onKeyDown={(event) => handleQueueKeyDown(event, index)}
                      aria-pressed={application.id === selected?.id}
                      className={joinClassNames(styles.caseItem, application.id === selected?.id && styles.caseItemSelected)}
                      onClick={() => selectCase(application.id)}
                    >
                      <span className={styles.caseTitle}>{application.companyName}</span>
                      <span className={styles.caseAmount}>{formatSEK(application.amount)}</span>
                      <span className={styles.caseMeta}>{application.orgNumber} · {formatDate(application.submittedAt)}{age === null ? '' : ` · Väntat ${age} d`}</span>
                      <span className={joinClassNames(styles.casePriority, triage.tone === 'good' ? styles.casePriorityGood : triage.tone === 'alert' ? styles.casePriorityAlert : styles.casePriorityWarn)}>{triage.text}</span>
                      <span className={styles.casePurpose}>{application.purpose || 'Syfte saknas'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {selected ? (
            <CaseReviewPanel key={selected.id} application={selected} onDecision={handleDecision} focusOnMount={advanced} />
          ) : null}
        </div>
      )}
    </section>
  )
}
