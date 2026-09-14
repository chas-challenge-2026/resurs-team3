import { useState } from 'react'
import type { CreditCase } from '../../types/case'
import { useCases } from '../../context/useCases'
import { formatSEK, formatDate } from '../../utils/format'
import styles from './QueueTable.module.css'

function useDecision(itemId: string) {
  const { decide } = useCases()
  const [comment, setComment] = useState('')
  return {
    comment,
    setComment,
    approve: () => decide(itemId, 'APPROVED', comment),
    reject: () => decide(itemId, 'REJECTED', comment),
  }
}

function FlaggedMetrics({ item }: { item: CreditCase }) {
  const { metrics, flagCount } = item.scoringResult
  const flaggedMetrics = metrics.filter((m) => m.severity === 'flagged' || m.severity === 'reject')
  return (
    <>
      <span className={styles.flagCount}>
        {flagCount} flagga{flagCount === 1 ? '' : 'or'}
      </span>
      {flaggedMetrics.length > 0 ? (
        <ul className={styles.flaggedList}>
          {flaggedMetrics.map((m) => (
            <li key={m.key}>
              {m.label}: {m.value.toFixed(2)} ({m.note})
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

function DecisionButtons({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  return (
    <div className={styles.decisionButtons}>
      <button type="button" onClick={onApprove} className={styles.approveButton}>
        Godkänn
      </button>
      <button type="button" onClick={onReject} className={styles.rejectButton}>
        Avslå
      </button>
    </div>
  )
}

/** Table row — used from `sm:` up, where there's room for eight columns. */
function QueueRow({ item, index }: { item: CreditCase; index: number }) {
  const { comment, setComment, approve, reject } = useDecision(item.id)

  return (
    <tr className={styles.row}>
      <td className={styles.cellIndex}>{index + 1}</td>
      <td className={styles.cellCompany}>{item.companyName}</td>
      <td className={styles.cellText}>{item.orgNumber}</td>
      <td className={styles.cellText}>{formatSEK(item.amount)}</td>
      <td className={styles.cellText}>{item.purpose || '—'}</td>
      <td className={styles.cellScoring}>
        <FlaggedMetrics item={item} />
      </td>
      <td className={styles.cellText}>{formatDate(item.submittedAt)}</td>
      <td className={styles.cellActions}>
        <label htmlFor={`comment-${item.id}`} className={styles.srOnly}>
          Kommentar för {item.companyName}
        </label>
        <input
          id={`comment-${item.id}`}
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Kommentar (valfri)"
          className={styles.rowCommentInput}
        />
        <DecisionButtons onApprove={approve} onReject={reject} />
      </td>
    </tr>
  )
}

/** Stacked card — used below `sm:`, where an 8-column table would force horizontal scrolling. */
function QueueCard({ item }: { item: CreditCase }) {
  const { comment, setComment, approve, reject } = useDecision(item.id)

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <p className={styles.cardCompany}>{item.companyName}</p>
        <p className={styles.cardAmount}>{formatSEK(item.amount)}</p>
      </div>
      <p className={styles.cardMeta}>
        {item.orgNumber} · {formatDate(item.submittedAt)}
      </p>
      {item.purpose ? <p className={styles.cardPurpose}>{item.purpose}</p> : null}

      <div className={styles.cardScoring}>
        <FlaggedMetrics item={item} />
      </div>

      <label htmlFor={`comment-${item.id}`} className={styles.srOnly}>
        Kommentar för {item.companyName}
      </label>
      <input
        id={`comment-${item.id}`}
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Kommentar (valfri)"
        className={styles.cardCommentInput}
      />
      <DecisionButtons onApprove={approve} onReject={reject} />
    </div>
  )
}

export function QueueTable() {
  const { cases } = useCases()
  const pending = cases.filter((c) => c.status === 'UNDER_REVIEW')

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <h3 className={styles.heading}>Handläggarkö</h3>
        <span className={styles.countPill}>{pending.length}</span>
      </div>

      {pending.length === 0 ? (
        <p className={styles.emptyState}>Inga ärenden väntar på granskning.</p>
      ) : (
        <>
          {/* Mobile: one card per case, no horizontal scrolling. */}
          <div className={styles.cardsList}>
            {pending.map((item) => (
              <QueueCard key={item.id} item={item} />
            ))}
          </div>

          {/* sm and up: full table. */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeadRow}>
                  <th scope="col" className={styles.th}>#</th>
                  <th scope="col" className={styles.th}>Företag</th>
                  <th scope="col" className={styles.th}>Org.nr</th>
                  <th scope="col" className={styles.th}>Belopp</th>
                  <th scope="col" className={styles.th}>Syfte</th>
                  <th scope="col" className={styles.th}>Scoring</th>
                  <th scope="col" className={styles.th}>Inlämnad</th>
                  <th scope="col" className={styles.th}>Beslut</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((item, index) => (
                  <QueueRow key={item.id} item={item} index={index} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
