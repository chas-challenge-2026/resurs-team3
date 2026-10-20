import { useCases } from '../../context/useCases'
import { formatDateTime } from '../../utils/format'
import { joinClassNames } from '../../lib/joinClassNames'
import { Icon } from '../../components/Icon'
import styles from './DecisionLog.module.css'

interface DecisionLogProps {
  onOpenCase?: (caseId: string) => void
}

/** Collapsed by default, so the queue and the case get the room on a laptop. */
export function DecisionLog({ onOpenCase }: DecisionLogProps) {
  const { decisions, cases } = useCases()
  // Was this decision an override of the automatic one? (Audit event near the same time.)
  function isOverride(caseId: string, at: string) {
    const target = cases.find((item) => item.id === caseId)
    const time = new Date(at).getTime()
    return Boolean(target?.auditTrail.some((event) => event.action === 'MANUAL_DECISION' && event.details.override === true && Math.abs(new Date(event.ts).getTime() - time) < 5000))
  }

  return (
    <details className={styles.wrap}>
      <summary className={styles.summary}>
        <Icon name="chevron-down" className={styles.chevron} />
        <h2 id="decision-log-heading" className={styles.heading}>Senaste beslut</h2>
        <span className={styles.count}>{decisions.length}</span>
      </summary>
      {decisions.length === 0 ? (
        <p className={styles.emptyState}>Inga beslut ännu. Beslut från Översikt och Ärenden visas här.</p>
      ) : (
        // Scrolls on its own, so it is focusable for keyboard scrolling.
        <ul className={styles.list} tabIndex={0} aria-labelledby="decision-log-heading">
          {decisions.map((d) => (
            <li key={d.id} className={styles.item}>
              <div className={styles.itemMain}>
                {onOpenCase && cases.some((item) => item.id === d.caseId) ? (
                  <button type="button" className={styles.companyLink} onClick={() => onOpenCase(d.caseId)}>{d.companyName}</button>
                ) : (
                  <span className={styles.company}>{d.companyName}</span>
                )}
                <span className={joinClassNames(styles.action, d.action === 'APPROVED' ? styles.actionApproved : styles.actionRejected)}>
                  {d.action === 'APPROVED' ? 'Beviljad' : 'Avslagen'}
                </span>
                {isOverride(d.caseId, d.decidedAt) ? <span className={styles.override}>Ändrat automatiskt beslut</span> : null}
                {d.comment ? <p className={styles.comment}>{d.comment}</p> : null}
              </div>
              <span className={styles.meta}>{formatDateTime(d.decidedAt)} · {d.decidedBy}</span>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
