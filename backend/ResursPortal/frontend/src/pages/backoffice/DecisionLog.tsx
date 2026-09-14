import { useCases } from '../../context/useCases'
import { formatDate } from '../../utils/format'
import { joinClassNames } from '../../lib/joinClassNames'
import styles from './DecisionLog.module.css'

export function DecisionLog() {
  const { decisions } = useCases()

  return (
    <div className={styles.wrap}>
      <h3 className={styles.heading}>Senaste beslut (max 20)</h3>
      {decisions.length === 0 ? (
        <p className={styles.emptyState}>Inga avgjorda ansökningar ännu.</p>
      ) : (
        <ul className={styles.list}>
          {decisions.map((d) => {
            const actionClass = d.action === 'APPROVED' ? styles.actionApproved : styles.actionRejected
            return (
              <li key={d.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.company}>{d.companyName}</span>
                  <span className={joinClassNames(styles.action, actionClass)}>
                    {d.action === 'APPROVED' ? 'Godkänd' : 'Avslagen'}
                  </span>
                  {d.comment ? <p className={styles.comment}>&quot;{d.comment}&quot;</p> : null}
                </div>
                <span className={styles.meta}>
                  {formatDate(d.decidedAt)} · {d.decidedBy}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
