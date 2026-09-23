import type { CreditCase } from '../../types/case'
import { useCases } from '../../context/useCases'
import { formatSEK } from '../../utils/format'
import { QueueTable } from './QueueTable'
import { DecisionLog } from './DecisionLog'
import styles from './DashboardView.module.css'

export function DashboardView() {
  const { cases } = useCases()
  const pending = cases.filter((c) => c.status === 'UNDER_REVIEW')
  const approved = cases.filter((c) => c.status === 'APPROVED')
  const rejected = cases.filter((c) => c.status === 'REJECTED')
  const totalRequested = pending.reduce((sum: number, c: CreditCase) => sum + c.amount, 0)

  const tiles = [
    { label: 'Väntar på beslut', value: String(pending.length) },
    { label: 'Godkända', value: String(approved.length) },
    { label: 'Avslagna', value: String(rejected.length) },
    { label: 'Belopp att bedöma', value: formatSEK(totalRequested) },
  ]

  const [heroTile, ...secondaryTiles] = tiles

  return (
    <div>
      <h2 className={styles.heading}>Översikt</h2>

      <div className={styles.metricsWrap}>
        {/* Väntar på beslut is the one number a handläggare needs to act on
            first, so it gets the hero treatment; the other three are
            context, not the headline. No sparkline here — with only a
            handful of seeded cases a cumulative trend line can't show
            anything a handläggare could actually act on, so the number
            stands on its own instead of dressing up data that isn't there. */}
        <div className={styles.heroTile}>
          <p className={styles.heroValue}>{heroTile.value}</p>
          <p className={styles.heroLabel}>{heroTile.label}</p>
        </div>

        <div className={styles.secondaryGrid}>
          {secondaryTiles.map((tile) => (
            <div key={tile.label} className={styles.tile}>
              <p className={styles.tileValue}>{tile.value}</p>
              <p className={styles.tileLabel}>{tile.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.queueWrap}>
        <QueueTable />
      </div>

      <DecisionLog />
    </div>
  )
}
