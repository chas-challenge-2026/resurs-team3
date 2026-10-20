import { useMemo, useState } from 'react'
import { useCases } from '../../context/useCases'
import type { Decision } from '../../context/cases-context'
import { QueueTable } from './QueueTable'
import { DecisionLog } from './DecisionLog'
import styles from './DashboardView.module.css'

interface DashboardViewProps {
  search: string
  selectedCaseId: string
  onSelectCase: (caseId: string) => void
  onDecision: (id: string, status: Decision, comment: string) => boolean
  onShowAllCases?: () => void
  onOpenCase?: (caseId: string) => void
}

function startOfCurrentWeek() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start.getTime()
}

function resolvedAt(caseItem: { auditTrail: { action: string; ts: string }[]; scoringResult: { scoredAt: string } }) {
  const manualDecision = [...caseItem.auditTrail].reverse().find((event) => event.action === 'MANUAL_DECISION')
  return new Date(manualDecision?.ts ?? caseItem.scoringResult.scoredAt).getTime()
}

function formatDays(value: number) {
  return new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}

function formatMillions(value: number) {
  return `${new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value / 1_000_000)} MSEK`
}

export function DashboardView({ search, selectedCaseId, onSelectCase, onDecision, onShowAllCases, onOpenCase }: DashboardViewProps) {
  const { cases } = useCases()
  // Date.now() is impure and react-hooks/purity flags any call to it
  // during render, memoized or not. useState's lazy initializer is the
  // sanctioned escape hatch — it runs once, outside the pure render
  // replay the rule is protecting, and gives a stable value after.
  const [now] = useState(() => Date.now())
  const weekStart = startOfCurrentWeek()
  const newThisWeek = cases.filter((caseItem) => {
    const submittedAt = new Date(caseItem.submittedAt).getTime()
    // No upper bound: an application submitted after this view opened
    // still counts as new this week.
    return submittedAt >= now - 7 * 86_400_000
  }).length
  const pending = cases.filter((caseItem) => caseItem.status === 'UNDER_REVIEW')
  const approvedThisWeek = cases.filter((caseItem) => caseItem.status === 'APPROVED' && resolvedAt(caseItem) >= weekStart)
  const approvedAmount = approvedThisWeek.reduce((sum, caseItem) => sum + caseItem.amount, 0)
  const manualHandlingDurations = useMemo(() => cases.flatMap((caseItem) => {
    const manualDecision = [...caseItem.auditTrail].reverse().find((event) => event.action === 'MANUAL_DECISION')
    if (!manualDecision) return []
    const submittedAt = new Date(caseItem.submittedAt).getTime()
    const decidedAt = new Date(manualDecision.ts).getTime()
    return Number.isFinite(submittedAt) && Number.isFinite(decidedAt) ? [Math.max(0, (decidedAt - submittedAt) / 86_400_000)] : []
  }), [cases])
  const averageHandlingDays = manualHandlingDurations.length
    ? manualHandlingDurations.reduce((sum, value) => sum + value, 0) / manualHandlingDurations.length
    : null

  const metrics: { label: string; value: string; unit: string; empty?: boolean }[] = [
    { label: 'Nya ansökningar, 7 dagar', value: String(newThisWeek), unit: 'st' },
    { label: 'Väntar på beslut', value: String(pending.length), unit: 'st' },
    { label: 'Beviljat belopp denna vecka', value: formatMillions(approvedAmount), unit: '' },
    { label: 'Snitt till manuellt beslut', value: averageHandlingDays === null ? 'Inga beslut än' : formatDays(averageHandlingDays), unit: averageHandlingDays === null ? '' : 'dagar', empty: averageHandlingDays === null },
  ]

  return (
    <div className={styles.dashboardView}>
      <h1 className={styles.pageHeading}>Översikt</h1>
      <section className={styles.metricsGrid} aria-label="Nyckeltal för handläggning">
        {metrics.map((metric) => (
          <article key={metric.label} className={styles.metricCard}>
            <p className={styles.metricLabel}>{metric.label}</p>
            <p className={metric.empty ? styles.metricEmpty : styles.metricValue}>{metric.value}{metric.unit ? <small>{metric.unit}</small> : null}</p>
          </article>
        ))}
      </section>

      <div className={styles.queueWrap}>
        <QueueTable search={search} selectedCaseId={selectedCaseId} onSelectCase={onSelectCase} onDecision={onDecision} onShowAllCases={onShowAllCases} />
      </div>
      <DecisionLog onOpenCase={onOpenCase} />
    </div>
  )
}
