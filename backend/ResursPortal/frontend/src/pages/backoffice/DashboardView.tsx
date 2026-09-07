import type { CreditCase } from '../../types/case'
import { useCases } from '../../context/useCases'
import { formatSEK } from '../../utils/format'
import { Sparkline } from '../../components/Sparkline'
import { QueueTable } from './QueueTable'
import { DecisionLog } from './DecisionLog'

/**
 * Cumulative trend for a tile's metric, ordered by each case's submittedAt —
 * how the count (or amount) built up as applications came in, not a
 * fabricated series. With only a handful of seeded cases this is a short
 * line, but it's real data, not decoration.
 */
function buildTrend(cases: CreditCase[], match: (c: CreditCase) => boolean, weight?: (c: CreditCase) => number): number[] {
  const sorted = [...cases].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  let running = 0
  return sorted.map((c) => {
    if (match(c)) running += weight ? weight(c) : 1
    return running
  })
}

export function DashboardView() {
  const { cases } = useCases()
  const pending = cases.filter((c) => c.status === 'UNDER_REVIEW')
  const approved = cases.filter((c) => c.status === 'APPROVED')
  const rejected = cases.filter((c) => c.status === 'REJECTED')
  const totalRequested = pending.reduce((sum, c) => sum + c.amount, 0)

  const isPending = (c: CreditCase) => c.status === 'UNDER_REVIEW'

  const tiles = [
    {
      label: 'Väntar på beslut',
      value: String(pending.length),
      trend: buildTrend(cases, isPending),
    },
    {
      label: 'Godkända',
      value: String(approved.length),
      trend: buildTrend(cases, (c) => c.status === 'APPROVED'),
    },
    {
      label: 'Avslagna',
      value: String(rejected.length),
      trend: buildTrend(cases, (c) => c.status === 'REJECTED'),
    },
    {
      label: 'Belopp att bedöma',
      value: formatSEK(totalRequested),
      trend: buildTrend(cases, isPending, (c) => c.amount),
    },
  ]

  return (
    <div>
      <h2 className="text-lg font-extrabold text-white">Översikt</h2>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg bg-resurs-panel p-4">
            <p className="break-words text-xl font-extrabold text-white sm:text-2xl">{tile.value}</p>
            <p className="mt-1 text-xs text-resurs-muted">{tile.label}</p>
            <Sparkline values={tile.trend} className="mt-3 h-6 w-full text-resurs-tealLight" />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <QueueTable />
      </div>

      <DecisionLog />
    </div>
  )
}
