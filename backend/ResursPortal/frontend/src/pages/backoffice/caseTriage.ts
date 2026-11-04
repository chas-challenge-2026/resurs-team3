import type { CreditCase } from '../../types/case'
import { swedishDecimals } from '../../utils/format'

export function flagsOf(application: CreditCase) {
  return [
    ...application.scoringResult.metrics.filter((m) => m.severity === 'flagged' || m.severity === 'reject'),
    ...(application.scoringResult.rules ?? []).filter((r) => r.severity === 'flagged' || r.severity === 'reject'),
  ]
}

/** Sort key: any reject-level flag outranks any number of ordinary flags. */
export function riskOf(application: CreditCase) {
  const flags = flagsOf(application)
  return (flags.some((f) => f.severity === 'reject') ? 1000 : 0) + flags.length
}

/** Triage signal: how many flags the scoring raised, and the worst one. */
export function caseTriage(application: CreditCase): { text: string; tone: 'good' | 'warn' | 'alert' } {
  const flags = flagsOf(application)
  if (flags.length === 0) return { text: 'Inga varningar', tone: 'good' }
  const worst = flags.find((f) => f.severity === 'reject') ?? flags[0]
  return {
    text: `${flags.length} ${flags.length === 1 ? 'varning' : 'varningar'} · ${swedishDecimals(worst.label)}`,
    tone: worst.severity === 'reject' ? 'alert' : 'warn',
  }
}

/** When the case got its decision: the case worker's, else the scoring's. */
export function decidedAt(application: CreditCase): { ts: string; manual: boolean; override: boolean } {
  const manual = [...application.auditTrail].reverse().find((event) => event.action === 'MANUAL_DECISION')
  return manual
    ? { ts: manual.ts, manual: true, override: manual.details.override === true }
    : { ts: application.scoringResult.scoredAt, manual: false, override: false }
}

/** Whole days since the application came in; null for an unreadable date. */
export function waitingDays(submittedAt: string) {
  const submittedTime = new Date(submittedAt).getTime()
  if (!Number.isFinite(submittedTime)) return null
  return Math.max(0, Math.floor((Date.now() - submittedTime) / 86_400_000))
}
