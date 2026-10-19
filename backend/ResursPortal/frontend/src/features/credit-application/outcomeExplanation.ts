import { SCORING_THRESHOLDS } from '../../utils/scoring'
import type { CreditCase, ScoringMetricResult, ScoringRuleHit } from '../../types/case'

const percent = (value: number) =>
  new Intl.NumberFormat('sv-SE', { style: 'percent', maximumFractionDigits: 0 }).format(value)
const ratio = (value: number, digits = 1) =>
  new Intl.NumberFormat('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)

function explainMetric(m: ScoringMetricResult, cashFlowStatementMissing: boolean): string {
  const t = SCORING_THRESHOLDS
  const reject = m.severity === 'reject'
  switch (m.key) {
    case 'soliditet':
      return `Soliditeten (eget kapital i förhållande till balansomslutningen) är ${percent(m.value)}. ${reject ? `Kravet är minst ${percent(t.soliditet.reject)}.` : `Rekommenderad nivå är minst ${percent(t.soliditet.flag)}.`}`
    case 'likviditetsgrad':
      return `Likviditetsgraden (omsättningstillgångar i förhållande till kortfristiga skulder) är ${ratio(m.value, 2)}. Den bör vara minst ${ratio(t.likviditetsgrad.flag)}.`
    case 'skuldsattningsgrad':
      return `Skuldsättningsgraden (totala skulder i förhållande till eget kapital) är ${ratio(m.value)}. ${reject ? `Den får vara högst ${ratio(t.skuldsattningsgrad.reject)}.` : `Rekommenderad nivå är högst ${ratio(t.skuldsattningsgrad.flag)}.`}`
    case 'rorelsemarginal':
      return `Rörelsemarginalen (rörelseresultat i förhållande till nettoomsättningen) är ${percent(m.value)}. Rekommenderad nivå är minst ${percent(t.rorelsemarginal.flag)}.`
    case 'kassaflodeskvot':
      if (cashFlowStatementMissing) return 'Årsredovisningen saknar kassaflödesanalys, så en handläggare bedömer företagets kassaflöde.'
      return reject
        ? 'Det operativa kassaflödet är negativt, och då kan ansökan inte beviljas automatiskt.'
        : `Kassaflödeskvoten (operativt kassaflöde i förhållande till totala skulder) är ${ratio(m.value, 2)}. Rekommenderad nivå är minst ${ratio(m.value < t.kassaflodeskvot.flag ? t.kassaflodeskvot.flag : t.kassaflodeskvot.recommended, 2)}.`
    case 'rantetackningsgrad':
      return `Räntetäckningsgraden (rörelseresultat i förhållande till räntekostnader) är ${ratio(m.value)}. ${reject ? `Kravet är minst ${ratio(t.rantetackningsgrad.reject)}.` : `Rekommenderad nivå är minst ${ratio(t.rantetackningsgrad.flag)}.`}`
  }
}

// Applicant-facing wording for ScoringService.java's other rules.
const RULE_TEXT: Record<string, string> = {
  negativtEgetKapital: 'Företagets eget kapital är negativt.',
  storkredit: 'Belopp över 5 000 000 SEK granskas alltid av en handläggare.',
  lagOmsattning: 'Nettoomsättningen är under 500 000 SEK.',
  negativtRorelseresultat: 'Rörelseresultatet är negativt.',
  storkreditSoliditet: 'Beloppet är över 1 000 000 SEK samtidigt som soliditeten är under 30 %.',
  likviditetMarginal: 'Likviditetsgraden ligger nära gränsen (under 1,2).',
  skulderVsOmsattning: 'De totala skulderna är mer än dubbelt så stora som nettoomsättningen.',
  branschSoliditet: 'Soliditeten är under den gräns som gäller för företagets bransch.',
  investeringsKassaflode: 'Investeringarna (investeringskassaflödet) är höga i förhållande till omsättningen.',
  kombinationSoliditetSkuld: 'Låg soliditet i kombination med hög skuldsättning.',
  kombinationLikviditetResultat: 'Svag likviditet i kombination med ett negativt rörelseresultat.',
  kreditVsOmsattning: 'Det sökta beloppet är större än årsomsättningen.',
  egetKapitalVsKredit: 'Det egna kapitalet motsvarar mindre än 30 % av det sökta beloppet.',
  kombinationKassaflodeSkuld: 'Svagt kassaflöde i kombination med hög skuldsättning.',
}

const explainRule = (rule: ScoringRuleHit) => RULE_TEXT[rule.key] ?? `${rule.label}.`

/**
 * Turns the scoring result into sentences an applicant can act on. Only
 * what drove the decision is explained: hard rejects for an avslag, warning
 * flags for a manual review.
 */
export function explainOutcome(creditCase: CreditCase): string[] {
  const { decision, metrics, rules = [] } = creditCase.scoringResult
  if (decision === 'APPROVED') return []
  const relevant = decision === 'REJECTED' ? 'reject' : 'flagged'
  return [
    ...metrics.filter((m) => m.severity === relevant).map((m) => explainMetric(m, Boolean(creditCase.financials.cashFlowStatementMissing))),
    ...rules.filter((r) => r.severity === relevant).map(explainRule),
  ]
}

/**
 * For an automatic approval: the key ratios that cleared ScoringService's
 * thresholds, so a beviljad decision also comes with its motivation
 * (PRODUCT.md). Uses the same thresholds as the explanations above.
 */
export function explainApproval(creditCase: CreditCase): string[] {
  const t = SCORING_THRESHOLDS
  const lines: string[] = []
  for (const m of creditCase.scoringResult.metrics) {
    if ((m.severity !== 'ok' && m.severity !== 'good') || !Number.isFinite(m.value)) continue
    if (m.key === 'soliditet') lines.push(`Soliditet ${percent(m.value)}, kravet är minst ${percent(t.soliditet.reject)}.`)
    if (m.key === 'likviditetsgrad') lines.push(`Likviditetsgrad ${ratio(m.value, 2)}, bör vara minst ${ratio(t.likviditetsgrad.flag)}.`)
    if (m.key === 'skuldsattningsgrad') lines.push(`Skuldsättningsgrad ${ratio(m.value)}, får vara högst ${ratio(t.skuldsattningsgrad.reject)}.`)
    if (m.key === 'rantetackningsgrad') lines.push(`Räntetäckningsgrad ${ratio(m.value)}, kravet är minst ${ratio(t.rantetackningsgrad.reject)}.`)
  }
  return lines
}
