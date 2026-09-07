import { useState } from 'react'
import type { CreditCase } from '../../types/case'
import { useCases } from '../../context/useCases'
import { formatSEK, formatDate } from '../../utils/format'

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
      <span className="font-semibold text-resurs-orange">
        {flagCount} flagga{flagCount === 1 ? '' : 'or'}
      </span>
      {flaggedMetrics.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
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
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        onClick={onApprove}
        className="min-h-[44px] flex-1 rounded-md bg-resurs-tealDark px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-resurs-tealDark focus:ring-offset-2 focus:ring-offset-resurs-panel sm:min-h-0 sm:flex-none"
      >
        Godkänn
      </button>
      <button
        type="button"
        onClick={onReject}
        className="min-h-[44px] flex-1 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-resurs-panel sm:min-h-0 sm:flex-none"
      >
        Avslå
      </button>
    </div>
  )
}

/** Table row — used from `sm:` up, where there's room for eight columns. */
function QueueRow({ item, index }: { item: CreditCase; index: number }) {
  const { comment, setComment, approve, reject } = useDecision(item.id)

  return (
    <tr className="border-b border-white/5 align-top last:border-0">
      <td className="px-3 py-3 text-white/70">{index + 1}</td>
      <td className="px-3 py-3 font-semibold text-white">{item.companyName}</td>
      <td className="px-3 py-3 text-white/80">{item.orgNumber}</td>
      <td className="px-3 py-3 text-white/80">{formatSEK(item.amount)}</td>
      <td className="px-3 py-3 text-white/80">{item.purpose || '—'}</td>
      <td className="px-3 py-3 text-xs text-white/70">
        <FlaggedMetrics item={item} />
      </td>
      <td className="px-3 py-3 text-white/80">{formatDate(item.submittedAt)}</td>
      <td className="px-3 py-3">
        <label htmlFor={`comment-${item.id}`} className="sr-only">
          Kommentar för {item.companyName}
        </label>
        <input
          id={`comment-${item.id}`}
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Kommentar (valfri)"
          className="w-40 rounded-md bg-resurs-input px-2 py-1.5 text-xs text-gray-800 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-resurs-orange"
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
    <div className="rounded-md bg-black/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-white">{item.companyName}</p>
        <p className="shrink-0 text-sm text-white/80">{formatSEK(item.amount)}</p>
      </div>
      <p className="mt-0.5 text-xs text-white/60">
        {item.orgNumber} · {formatDate(item.submittedAt)}
      </p>
      {item.purpose ? <p className="mt-1.5 text-sm text-white/80">{item.purpose}</p> : null}

      <div className="mt-2 text-xs text-white/70">
        <FlaggedMetrics item={item} />
      </div>

      <label htmlFor={`comment-${item.id}`} className="sr-only">
        Kommentar för {item.companyName}
      </label>
      <input
        id={`comment-${item.id}`}
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Kommentar (valfri)"
        className="mt-3 w-full rounded-md bg-resurs-input px-2 py-2 text-base text-gray-800 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-resurs-orange"
      />
      <DecisionButtons onApprove={approve} onReject={reject} />
    </div>
  )
}

export function QueueTable() {
  const { cases } = useCases()
  const pending = cases.filter((c) => c.status === 'UNDER_REVIEW')

  return (
    <div className="rounded-lg bg-resurs-panel p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-white">Handläggarkö</h3>
        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-resurs-orange px-1.5 text-xs font-bold text-resurs-onOrange">
          {pending.length}
        </span>
      </div>

      {pending.length === 0 ? (
        <p className="mt-4 text-sm text-resurs-muted">Inga ärenden väntar på granskning.</p>
      ) : (
        <>
          {/* Mobile: one card per case, no horizontal scrolling. */}
          <div className="mt-4 flex flex-col gap-3 sm:hidden">
            {pending.map((item) => (
              <QueueCard key={item.id} item={item} />
            ))}
          </div>

          {/* sm and up: full table. */}
          <div className="mt-4 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-resurs-muted">
                  <th scope="col" className="px-3 py-2">#</th>
                  <th scope="col" className="px-3 py-2">Företag</th>
                  <th scope="col" className="px-3 py-2">Org.nr</th>
                  <th scope="col" className="px-3 py-2">Belopp</th>
                  <th scope="col" className="px-3 py-2">Syfte</th>
                  <th scope="col" className="px-3 py-2">Scoring</th>
                  <th scope="col" className="px-3 py-2">Inlämnad</th>
                  <th scope="col" className="px-3 py-2">Beslut</th>
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
