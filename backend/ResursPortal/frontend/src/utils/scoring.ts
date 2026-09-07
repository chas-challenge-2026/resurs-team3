import type { ApplicationDecision, FinancialMetrics, ScoringMetricResult, ScoringResult, ScoringSeverity } from '../types/case'

/**
 * ScoringService (v2)
 *
 * Consolidated replacement for resurs-team3 v1's inline, 800+ line scoring
 * method in ApplicationController (see docs/known-bugs.md #7): v1 checked
 * the *same* metric — soliditet — against three different thresholds
 * (0.20, 0.25, and a branschjusterad 0.30-ish figure) scattered across the
 * file, plus a fourth ("KRITISK" at 0.15) that was defined but never even
 * called. This keeps v1's real metrics but gives each exactly one hard-reject
 * threshold and one flag threshold, defined once, in SCORING_THRESHOLDS below
 * — matching docs/v2-targets.md's "Definiera ScoringThresholds som en
 * konfigurerbar klass" goal. The per-industry branschFaktor multiplier v1
 * applied inconsistently to only one of its checks is dropped entirely.
 */
export const SCORING_THRESHOLDS = {
  // eget_kapital / totalt_kapital
  soliditet: { reject: 0.2, flag: 0.25 },
  // omsattningstillgangar / kortfristiga_skulder
  likviditetsgrad: { flag: 1.0 },
  // totala_skulder / eget_kapital
  skuldsattningsgrad: { reject: 3.0, flag: 2.0 },
  // rorelseresultat / nettoomsattning
  rorelsemarginal: { flag: 0.02, good: 0.1 },
  // operativt_kassaflode / totala_skulder
  kassaflodeskvot: { reject: 0, flag: 0.05 },
  // rorelseresultat / rantekostnader
  rantetackningsgrad: { reject: 1.5, flag: 2.5 },
} as const

function toNumber(value: string): number {
  const trimmed = value.replace(',', '.').trim()
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : 0
}

function metric(
  key: ScoringMetricResult['key'],
  label: string,
  value: number,
  severity: ScoringSeverity,
  note: string,
): ScoringMetricResult {
  return { key, label, value, severity, note }
}

/**
 * Runs the scoring engine against one application's financials and returns
 * a full ScoringResult — mirrors v1's synchronous "score inline during
 * POST /apply" behavior, just structured instead of a free-text blob.
 */
export function computeScoringResult(applicationId: string, financials: FinancialMetrics): ScoringResult {
  const equity = toNumber(financials.equity)
  const totalCapital = toNumber(financials.totalCapital)
  const currentAssets = toNumber(financials.currentAssets)
  const currentLiabilities = toNumber(financials.currentLiabilities)
  const totalLiabilities = toNumber(financials.totalLiabilities)
  const operatingProfit = toNumber(financials.operatingProfit)
  const netRevenue = toNumber(financials.netRevenue)
  const operatingCashFlow = toNumber(financials.operatingCashFlow)
  const interestExpenses = toNumber(financials.interestExpenses)

  const soliditet = totalCapital !== 0 ? equity / totalCapital : 0
  const likviditetsgrad = currentLiabilities !== 0 ? currentAssets / currentLiabilities : 0
  const skuldsattningsgrad = equity !== 0 ? totalLiabilities / equity : 0
  const rorelsemarginal = netRevenue !== 0 ? operatingProfit / netRevenue : 0
  const kassaflodeskvot = totalLiabilities !== 0 ? operatingCashFlow / totalLiabilities : 0
  // v1: no interest expense reported means "not applicable" (999), not a red flag
  const rantetackningsgrad = interestExpenses > 0 ? operatingProfit / interestExpenses : Number.POSITIVE_INFINITY

  const metrics: ScoringMetricResult[] = []
  const reasons: string[] = []
  let hardReject = false
  let flagCount = 0

  const t = SCORING_THRESHOLDS

  // --- Soliditet ---
  if (soliditet < t.soliditet.reject) {
    hardReject = true
    reasons.push(`AVSLAG: Soliditet för låg (${soliditet.toFixed(2)} < ${t.soliditet.reject.toFixed(2)}).`)
    metrics.push(metric('soliditet', 'Soliditet', soliditet, 'reject', `Under avslagsgräns ${t.soliditet.reject.toFixed(2)}`))
  } else if (soliditet < t.soliditet.flag) {
    flagCount++
    reasons.push(`VARNING: Soliditet låg (${soliditet.toFixed(2)}, rekommenderad miniminivå ${t.soliditet.flag.toFixed(2)}).`)
    metrics.push(metric('soliditet', 'Soliditet', soliditet, 'flagged', `Under rekommenderad nivå ${t.soliditet.flag.toFixed(2)}`))
  } else {
    reasons.push(`Soliditet OK (${soliditet.toFixed(2)}).`)
    metrics.push(metric('soliditet', 'Soliditet', soliditet, 'ok', 'Uppfyller krav'))
  }

  // --- Likviditetsgrad ---
  if (likviditetsgrad < t.likviditetsgrad.flag) {
    flagCount++
    reasons.push(
      `VARNING: Likviditetsgrad under ${t.likviditetsgrad.flag.toFixed(1)} (${likviditetsgrad.toFixed(2)}). Kortfristiga skulder överstiger omsättningstillgångar.`,
    )
    metrics.push(metric('likviditetsgrad', 'Likviditetsgrad', likviditetsgrad, 'flagged', `Under ${t.likviditetsgrad.flag.toFixed(1)}`))
  } else if (likviditetsgrad >= 2.0) {
    reasons.push(`Likviditetsgrad god (${likviditetsgrad.toFixed(2)}).`)
    metrics.push(metric('likviditetsgrad', 'Likviditetsgrad', likviditetsgrad, 'good', 'God nivå'))
  } else {
    reasons.push(`Likviditetsgrad godkänd (${likviditetsgrad.toFixed(2)}).`)
    metrics.push(metric('likviditetsgrad', 'Likviditetsgrad', likviditetsgrad, 'ok', 'Uppfyller krav'))
  }

  // --- Skuldsättningsgrad ---
  if (skuldsattningsgrad > t.skuldsattningsgrad.reject) {
    hardReject = true
    reasons.push(`AVSLAG: Skuldsättningsgrad för hög (${skuldsattningsgrad.toFixed(2)} > ${t.skuldsattningsgrad.reject.toFixed(1)}).`)
    metrics.push(metric('skuldsattningsgrad', 'Skuldsättningsgrad', skuldsattningsgrad, 'reject', `Över avslagsgräns ${t.skuldsattningsgrad.reject.toFixed(1)}`))
  } else if (skuldsattningsgrad > t.skuldsattningsgrad.flag) {
    flagCount++
    reasons.push(`VARNING: Skuldsättningsgrad hög (${skuldsattningsgrad.toFixed(2)}, rekommenderas under ${t.skuldsattningsgrad.flag.toFixed(1)}).`)
    metrics.push(metric('skuldsattningsgrad', 'Skuldsättningsgrad', skuldsattningsgrad, 'flagged', `Över rekommenderad nivå ${t.skuldsattningsgrad.flag.toFixed(1)}`))
  } else {
    reasons.push(`Skuldsättningsgrad OK (${skuldsattningsgrad.toFixed(2)}).`)
    metrics.push(metric('skuldsattningsgrad', 'Skuldsättningsgrad', skuldsattningsgrad, 'ok', 'Uppfyller krav'))
  }

  // --- Rörelsemarginal ---
  if (rorelsemarginal < t.rorelsemarginal.flag) {
    flagCount++
    reasons.push(`VARNING: Rörelseresultatmarginal låg (${(rorelsemarginal * 100).toFixed(1)}%, rekommenderas över ${(t.rorelsemarginal.flag * 100).toFixed(0)}%).`)
    metrics.push(metric('rorelsemarginal', 'Rörelsemarginal', rorelsemarginal, 'flagged', 'Under rekommenderad nivå'))
  } else if (rorelsemarginal >= t.rorelsemarginal.good) {
    reasons.push(`Rörelseresultatmarginal god (${(rorelsemarginal * 100).toFixed(1)}%).`)
    metrics.push(metric('rorelsemarginal', 'Rörelsemarginal', rorelsemarginal, 'good', 'God nivå'))
  } else {
    reasons.push(`Rörelseresultatmarginal godkänd (${(rorelsemarginal * 100).toFixed(1)}%).`)
    metrics.push(metric('rorelsemarginal', 'Rörelsemarginal', rorelsemarginal, 'ok', 'Uppfyller krav'))
  }

  // --- Kassaflödeskvot ---
  if (kassaflodeskvot < t.kassaflodeskvot.reject) {
    hardReject = true
    reasons.push(`AVSLAG: Negativt operativt kassaflöde (kassaflödeskvot=${kassaflodeskvot.toFixed(3)}).`)
    metrics.push(metric('kassaflodeskvot', 'Kassaflödeskvot', kassaflodeskvot, 'reject', 'Negativt operativt kassaflöde'))
  } else if (kassaflodeskvot < t.kassaflodeskvot.flag) {
    flagCount++
    reasons.push(`VARNING: Kassaflödeskvot låg (${kassaflodeskvot.toFixed(3)} < ${t.kassaflodeskvot.flag.toFixed(2)}).`)
    metrics.push(metric('kassaflodeskvot', 'Kassaflödeskvot', kassaflodeskvot, 'flagged', `Under ${t.kassaflodeskvot.flag.toFixed(2)}`))
  } else {
    reasons.push(`Kassaflödeskvot OK (${kassaflodeskvot.toFixed(3)}).`)
    metrics.push(metric('kassaflodeskvot', 'Kassaflödeskvot', kassaflodeskvot, 'ok', 'Uppfyller krav'))
  }

  // --- Räntetäckningsgrad --- (no interest expense reported => not applicable, score-neutral)
  if (!Number.isFinite(rantetackningsgrad)) {
    reasons.push('Räntetäckningsgrad ej tillämplig (inga räntekostnader).')
    metrics.push(metric('rantetackningsgrad', 'Räntetäckningsgrad', 0, 'ok', 'Ej tillämplig'))
  } else if (rantetackningsgrad < t.rantetackningsgrad.reject) {
    hardReject = true
    reasons.push(`AVSLAG: Räntetäckningsgrad under ${t.rantetackningsgrad.reject.toFixed(1)} (${rantetackningsgrad.toFixed(2)}). Rörelseresultat täcker ej räntekostnader.`)
    metrics.push(metric('rantetackningsgrad', 'Räntetäckningsgrad', rantetackningsgrad, 'reject', `Under avslagsgräns ${t.rantetackningsgrad.reject.toFixed(1)}`))
  } else if (rantetackningsgrad < t.rantetackningsgrad.flag) {
    flagCount++
    reasons.push(`VARNING: Räntetäckningsgrad låg (${rantetackningsgrad.toFixed(2)} < ${t.rantetackningsgrad.flag.toFixed(1)}, rekommenderas minst ${t.rantetackningsgrad.flag.toFixed(1)}).`)
    metrics.push(metric('rantetackningsgrad', 'Räntetäckningsgrad', rantetackningsgrad, 'flagged', `Under rekommenderad nivå ${t.rantetackningsgrad.flag.toFixed(1)}`))
  } else {
    reasons.push(`Räntetäckningsgrad OK (${rantetackningsgrad.toFixed(2)}).`)
    metrics.push(metric('rantetackningsgrad', 'Räntetäckningsgrad', rantetackningsgrad, 'ok', 'Uppfyller krav'))
  }

  let decision: ApplicationDecision
  let heading: string
  if (hardReject) {
    decision = 'REJECTED'
    heading = '=== ANSÖKAN AVSLAGEN ==='
  } else if (flagCount >= 1) {
    decision = 'REVIEW'
    heading =
      flagCount === 1
        ? '=== GRANSKNING REKOMMENDERAS === 1 varningsflagga.'
        : `=== MANUELL GRANSKNING === Antal varningsflaggor: ${flagCount}.`
  } else {
    decision = 'APPROVED'
    heading = '=== ANSÖKAN GODKÄND === Alla nyckeltal uppfyller krav.'
  }

  return {
    applicationId,
    decision,
    hardReject,
    flagCount,
    metrics,
    decisionReason: [heading, ...reasons].join(' '),
    scoredAt: new Date().toISOString(),
  }
}

/** Compact one-line summary for table views (caseworker queue). */
export function summarizeScoring(result: ScoringResult): string {
  const parts = result.metrics.map((m) => `${m.label.toLowerCase()}=${m.value.toFixed(2)} (${m.severity})`)
  return `${result.decision}: ${parts.join(', ')}`
}
