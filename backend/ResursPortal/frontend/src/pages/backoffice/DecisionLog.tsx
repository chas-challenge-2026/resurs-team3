import { useCases } from '../../context/useCases'
import { formatDate } from '../../utils/format'

export function DecisionLog() {
  const { decisions } = useCases()

  return (
    <div className="mt-6 rounded-lg bg-resurs-panel p-4 sm:p-6">
      <h3 className="text-base font-semibold text-white">Senaste beslut (max 20)</h3>
      {decisions.length === 0 ? (
        <p className="mt-3 text-sm text-resurs-muted">Inga avgjorda ansökningar ännu.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/10 text-sm">
          {decisions.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <span className="font-semibold text-white">{d.companyName}</span>
                <span
                  className={`ml-2 text-xs font-semibold ${
                    d.action === 'APPROVED' ? 'text-resurs-tealLight' : 'text-red-400'
                  }`}
                >
                  {d.action === 'APPROVED' ? 'Godkänd' : 'Avslagen'}
                </span>
                {d.comment ? <p className="mt-0.5 text-xs text-resurs-muted">&quot;{d.comment}&quot;</p> : null}
              </div>
              <span className="shrink-0 text-xs text-resurs-muted">
                {formatDate(d.decidedAt)} · {d.decidedBy}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
