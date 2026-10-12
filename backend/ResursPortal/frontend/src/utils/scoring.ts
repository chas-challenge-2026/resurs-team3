import type {
  ApplicationDecision,
  FinancialMetrics,
  Industry,
  ScoringMetricResult,
  ScoringResult,
  ScoringRuleHit,
  ScoringSeverity,
} from '../types/case'

/**
 * Frontend port of the backend's ScoringService.java (se.comerit.resurs).
 * The backend is the source of truth: every rule, threshold, credit-score
 * delta and message below mirrors the Java code in the same order, so the
 * prototype reaches the same decision the real service would. When the
 * When Java changes, this file changes to match.
 */
export const SCORING_THRESHOLDS = {
  soliditet: { reject: 0.2, flag: 0.25 },
  likviditetsgrad: { flag: 1.0, good: 2.0, marginal: 1.2 },
  skuldsattningsgrad: { reject: 3.0, flag: 2.0 },
  rorelsemarginal: { flag: 0.02, good: 0.1 },
  kassaflodeskvot: { reject: 0, flag: 0.05, recommended: 0.08 },
  rantetackningsgrad: { reject: 1.5, flag: 2.5 },
  storkredit: 5_000_000,
  lagOmsattning: 500_000,
  storkreditSoliditet: { amount: 1_000_000, soliditet: 0.3 },
  egetKapitalVsKredit: 0.3,
} as const

/** ScoringService.getBranschFaktor */
export const INDUSTRY_FACTOR: Record<Industry, number> = {
  BYGG: 0.85,
  HANDEL: 1.1,
  IT: 1.2,
  FASTIGHET: 0.9,
  TILLVERKNING: 0.95,
  TRANSPORT: 0.88,
  RESTAURANG: 0.8,
  FINANS: 1.15,
  VÅRD: 1.05,
  UTBILDNING: 1.0,
}

export interface ScoringInput {
  requestedAmount: number
  industry?: Industry | '' | null
}

function toNumber(value: string | undefined): number {
  const n = Number((value ?? '').replace(',', '.').trim())
  return Number.isFinite(n) ? n : 0
}

// Java's String.format("%.Nf"): rounds HALF_UP on the shortest decimal
// form of the double (0.175 → "0.18"), where JS toFixed would give "0.17".
// Uses '.' as decimal separator (Locale.US / ROOT on the server).
function javaFixed(n: number, digits: number): string {
  if (!Number.isFinite(n)) return n.toFixed(digits)
  const abs = Math.abs(n)
  const shifted = abs.toString().includes('e') ? Math.round(abs * 10 ** digits) : Math.round(Number(`${abs}e${digits}`))
  const rounded = Number(`${shifted}e-${digits}`)
  // Java keeps the sign of negative values that round to zero ("-0.00").
  return `${n < 0 || Object.is(n, -0) ? '-' : ''}${rounded.toFixed(digits)}`
}
const f2 = (n: number) => javaFixed(n, 2)
const f3 = (n: number) => javaFixed(n, 3)

class ScoringContext {
  scoringLog = ''
  decisionReason = ''
  flagCount = 0
  hardReject = false
  creditScore = 100
  metrics: ScoringMetricResult[] = []
  rules: ScoringRuleHit[] = []

  rule(key: string, label: string, severity: 'flagged' | 'reject', note: string, delta: number, reason: string, log: string) {
    if (severity === 'reject') this.hardReject = true
    else this.flagCount++
    this.creditScore += delta
    this.decisionReason += reason
    this.scoringLog += log
    this.rules.push({ key, label, severity, note })
  }

  metric(key: ScoringMetricResult['key'], label: string, value: number, severity: ScoringSeverity, note: string) {
    this.metrics.push({ key, label, value, severity, note })
  }
}

export function computeScoringResult(applicationId: string, financials: FinancialMetrics, input: ScoringInput): ScoringResult {
  const egetKapital = toNumber(financials.equity)
  const totaltKapital = toNumber(financials.totalCapital)
  const omsattningstillgangar = toNumber(financials.currentAssets)
  const kortfristigaSkulder = toNumber(financials.currentLiabilities)
  const totalaSkulder = toNumber(financials.totalLiabilities)
  const rorelseresultat = toNumber(financials.operatingProfit)
  const nettoomsattning = toNumber(financials.netRevenue)
  const operativtKassaflode = toNumber(financials.operatingCashFlow)
  const investeringsKassaflode = toNumber(financials.investingCashFlow)
  const ranteKostnader = toNumber(financials.interestExpenses)
  const requestedAmount = input.requestedAmount
  const bransch = input.industry ? input.industry : null

  const c = new ScoringContext()
  const t = SCORING_THRESHOLDS

  // --- evaluateSoliditetRule
  const soliditet = totaltKapital === 0 ? 0 : egetKapital / totaltKapital
  c.scoringLog += `soliditet=${f2(soliditet)}`
  if (soliditet < t.soliditet.reject) {
    c.hardReject = true
    c.creditScore -= 40
    c.decisionReason += `AVSLAG: Soliditet ${f2(soliditet)}. Miniminivå: 0.20. `
    c.scoringLog += ' [REJECT]'
    c.metric('soliditet', 'Soliditet', soliditet, 'reject', 'Under avslagsgräns 0.20')
  } else if (soliditet < t.soliditet.flag) {
    c.flagCount++
    c.creditScore -= 20
    c.decisionReason += `VARNING: Soliditet ${f2(soliditet)}. Rekommenderad nivå: minst 0.25. `
    c.scoringLog += ' [FLAGGED]'
    c.metric('soliditet', 'Soliditet', soliditet, 'flagged', 'Under rekommenderad nivå 0.25')
  } else {
    c.creditScore += 5
    c.decisionReason += `Soliditet ${f2(soliditet)} uppfyller kravet. `
    c.scoringLog += ' [OK]'
    c.metric('soliditet', 'Soliditet', soliditet, 'ok', 'Uppfyller krav')
  }

  // --- evaluateLiquidityRule
  const likviditetsgrad = kortfristigaSkulder === 0 ? 0 : omsattningstillgangar / kortfristigaSkulder
  c.scoringLog += `, likviditetsgrad=${f2(likviditetsgrad)}`
  if (likviditetsgrad < t.likviditetsgrad.flag) {
    c.flagCount++
    c.creditScore -= 15
    c.decisionReason += `VARNING: Likviditetsgrad ${f2(likviditetsgrad)}. Miniminivå: 1.0. `
    c.scoringLog += ' [FLAGGED]'
    c.metric('likviditetsgrad', 'Likviditetsgrad', likviditetsgrad, 'flagged', 'Under 1.0')
  } else if (likviditetsgrad >= t.likviditetsgrad.good) {
    c.creditScore += 10
    c.decisionReason += `Likviditetsgrad ${f2(likviditetsgrad)} är god. `
    c.scoringLog += ' [GOOD]'
    c.metric('likviditetsgrad', 'Likviditetsgrad', likviditetsgrad, 'good', 'God nivå')
  } else {
    c.decisionReason += `Likviditetsgrad ${f2(likviditetsgrad)} är godkänd. `
    c.scoringLog += ' [OK]'
    c.metric('likviditetsgrad', 'Likviditetsgrad', likviditetsgrad, 'ok', 'Uppfyller krav')
  }

  // --- evaluateDebtRatioRule
  const skuldsattningsgrad = egetKapital === 0 ? 0 : totalaSkulder / egetKapital
  c.scoringLog += `, skuldsättningsgrad=${f2(skuldsattningsgrad)}`
  if (skuldsattningsgrad > t.skuldsattningsgrad.reject) {
    c.hardReject = true
    c.creditScore -= 35
    c.decisionReason += `AVSLAG: Skuldsättningsgrad ${f2(skuldsattningsgrad)}. Maxnivå: 3.0. `
    c.scoringLog += ' [REJECT]'
    c.metric('skuldsattningsgrad', 'Skuldsättningsgrad', skuldsattningsgrad, 'reject', 'Över avslagsgräns 3.0')
  } else if (skuldsattningsgrad > t.skuldsattningsgrad.flag) {
    c.flagCount++
    c.creditScore -= 15
    c.decisionReason += `VARNING: Skuldsättningsgrad ${f2(skuldsattningsgrad)}. Rekommenderad nivå: högst 2.0. `
    c.scoringLog += ' [FLAGGED]'
    c.metric('skuldsattningsgrad', 'Skuldsättningsgrad', skuldsattningsgrad, 'flagged', 'Över rekommenderad nivå 2.0')
  } else {
    c.creditScore += 5
    c.decisionReason += `Skuldsättningsgrad ${f2(skuldsattningsgrad)} är godkänd. `
    c.scoringLog += ' [OK]'
    c.metric('skuldsattningsgrad', 'Skuldsättningsgrad', skuldsattningsgrad, 'ok', 'Uppfyller krav')
  }

  // --- evaluateOperatingMarginRule
  const rorelsemarginal = nettoomsattning === 0 ? 0 : rorelseresultat / nettoomsattning
  c.scoringLog += `, rörelsemarginal=${f2(rorelsemarginal)}`
  if (rorelsemarginal < t.rorelsemarginal.flag) {
    c.flagCount++
    c.creditScore -= 10
    c.decisionReason += `VARNING: Rörelsemarginal ${f2(rorelsemarginal * 100)}%. Rekommenderad nivå: minst 2%. `
    c.scoringLog += ' [FLAGGED]'
    c.metric('rorelsemarginal', 'Rörelsemarginal', rorelsemarginal, 'flagged', 'Under rekommenderad nivå 2 %')
  } else if (rorelsemarginal >= t.rorelsemarginal.good) {
    c.creditScore += 8
    c.decisionReason += `Rörelsemarginal ${f2(rorelsemarginal * 100)}% är god. `
    c.scoringLog += ' [GOOD]'
    c.metric('rorelsemarginal', 'Rörelsemarginal', rorelsemarginal, 'good', 'God nivå')
  } else {
    c.decisionReason += `Rörelsemarginal ${f2(rorelsemarginal * 100)}% är godkänd. `
    c.scoringLog += ' [OK]'
    c.metric('rorelsemarginal', 'Rörelsemarginal', rorelsemarginal, 'ok', 'Uppfyller krav')
  }

  // --- evaluateGeneralRiskRules
  if (egetKapital < 0) {
    c.rule('negativtEgetKapital', 'Negativt eget kapital', 'reject', 'Eget kapital är negativt', -50,
      'AVSLAG: Negativt eget kapital. ', ', negativt_eget_kapital [REJECT]')
  }
  if (requestedAmount > t.storkredit) {
    c.rule('storkredit', 'Kreditbelopp över 5 000 000 kr', 'flagged', 'Kräver manuell granskning', -10,
      'VARNING: Kreditbelopp över 5 000 000 kr kräver manuell granskning. ', ', storkredit [FLAGGED]')
  }
  if (nettoomsattning < t.lagOmsattning) {
    c.rule('lagOmsattning', 'Nettoomsättning under 500 000 kr', 'flagged', 'Låg omsättning', -7,
      'VARNING: Nettoomsättning under 500 000 kr. ', ', låg_omsättning [FLAGGED]')
  }
  if (rorelseresultat < 0) {
    c.rule('negativtRorelseresultat', 'Negativt rörelseresultat', 'flagged', 'Rörelseresultatet är negativt', -12,
      'VARNING: Negativt rörelseresultat. ', ', negativt_rörelseresultat [FLAGGED]')
  }
  if (soliditet < t.storkreditSoliditet.soliditet && requestedAmount > t.storkreditSoliditet.amount) {
    c.rule('storkreditSoliditet', 'Stort belopp med soliditet under 0.30', 'flagged', 'Över 1 000 000 kr med soliditet under 0.30', -12,
      'VARNING: Kreditbelopp över 1 000 000 kr med soliditet under 0.30. ', ', storkredit_soliditet [FLAGGED]')
  }
  if (likviditetsgrad < t.likviditetsgrad.marginal && likviditetsgrad >= t.likviditetsgrad.flag) {
    c.rule('likviditetMarginal', 'Likviditetsgrad nära gränsen', 'flagged', `${f2(likviditetsgrad)} är under 1.2`, -8,
      `VARNING: Likviditetsgrad ${f2(likviditetsgrad)} är nära minimigränsen 1.2. `, ', likviditet_marginal [FLAGGED]')
  }
  if (totalaSkulder > nettoomsattning * 2) {
    c.rule('skulderVsOmsattning', 'Skulder över dubbla omsättningen', 'flagged', 'Totala skulder > 2 × nettoomsättning', -10,
      'VARNING: Totala skulder överstiger dubbla nettoomsättningen. ', ', skulder_vs_omsattning [FLAGGED]')
  }

  // --- evaluateIndustryRule
  const branschFaktor = bransch ? INDUSTRY_FACTOR[bransch] ?? 1.0 : 1.0
  const branschGrans = 0.2 * branschFaktor
  c.scoringLog += `, bransch=${bransch ?? 'OKÄND'}(faktor=${f2(branschFaktor)})`
  if (soliditet < branschGrans) {
    c.rule('branschSoliditet', 'Soliditet under branschjusterad gräns', 'flagged', `Gräns ${f2(branschGrans)} för ${bransch}`, -8,
      `VARNING: Soliditet ${f2(soliditet)} understiger branschjusterad gräns ${f2(branschGrans)} för ${bransch}. `, ', bransch_soliditet [FLAGGED]')
  }

  // --- evaluateCashFlowRules
  const kassaflodeKvot = totalaSkulder === 0 ? 0 : operativtKassaflode / totalaSkulder
  c.scoringLog += `, kassaflödeskvot=${f3(kassaflodeKvot)}`
  if (kassaflodeKvot < t.kassaflodeskvot.reject) {
    c.hardReject = true
    c.creditScore -= 30
    c.decisionReason += `AVSLAG: Negativt operativt kassaflöde, kvot ${f3(kassaflodeKvot)}. `
    c.scoringLog += ' [REJECT]'
    c.metric('kassaflodeskvot', 'Kassaflödeskvot', kassaflodeKvot, 'reject', 'Negativt operativt kassaflöde')
  } else if (kassaflodeKvot < t.kassaflodeskvot.flag) {
    c.flagCount++
    c.creditScore -= 12
    c.decisionReason += `VARNING: Kassaflödeskvot ${f3(kassaflodeKvot)} understiger 0.05. `
    c.scoringLog += ' [FLAGGED]'
    c.metric('kassaflodeskvot', 'Kassaflödeskvot', kassaflodeKvot, 'flagged', 'Under 0.05')
  } else if (kassaflodeKvot < t.kassaflodeskvot.recommended) {
    c.flagCount++
    c.creditScore -= 6
    c.decisionReason += `VARNING: Kassaflödeskvot ${f3(kassaflodeKvot)} understiger rekommenderad nivå 0.08. `
    c.scoringLog += ' [FLAGGED]'
    c.metric('kassaflodeskvot', 'Kassaflödeskvot', kassaflodeKvot, 'flagged', 'Under rekommenderad nivå 0.08')
  } else {
    c.creditScore += 5
    c.decisionReason += `Kassaflödeskvot ${f3(kassaflodeKvot)} är godkänd. `
    c.scoringLog += ' [OK]'
    c.metric('kassaflodeskvot', 'Kassaflödeskvot', kassaflodeKvot, 'ok', 'Uppfyller krav')
  }
  if (investeringsKassaflode < -nettoomsattning * 0.3) {
    c.rule('investeringsKassaflode', 'Högt negativt investeringskassaflöde', 'flagged', 'Mer än 30 % av nettoomsättningen', -4,
      `VARNING: Högt negativt investeringskassaflöde ${javaFixed(investeringsKassaflode, 0)} kr. `, ', inv_kassaflode [FLAGGED]')
  }

  // --- evaluateInterestCoverageRule
  const ranteTackningsgrad = ranteKostnader <= 0 ? 999 : rorelseresultat / ranteKostnader
  c.scoringLog += `, ränteTäckning=${f2(ranteTackningsgrad)}`
  if (ranteTackningsgrad < t.rantetackningsgrad.reject) {
    c.hardReject = true
    c.creditScore -= 35
    c.decisionReason += `AVSLAG: Räntetäckningsgrad ${f2(ranteTackningsgrad)} understiger 1.5. `
    c.scoringLog += ' [REJECT]'
    c.metric('rantetackningsgrad', 'Räntetäckningsgrad', ranteTackningsgrad, 'reject', 'Under avslagsgräns 1.5')
  } else if (ranteTackningsgrad < t.rantetackningsgrad.flag) {
    c.flagCount++
    c.creditScore -= 15
    c.decisionReason += `VARNING: Räntetäckningsgrad ${f2(ranteTackningsgrad)} understiger rekommenderad nivå 2.5. `
    c.scoringLog += ' [FLAGGED]'
    c.metric('rantetackningsgrad', 'Räntetäckningsgrad', ranteTackningsgrad, 'flagged', 'Under rekommenderad nivå 2.5')
  } else if (ranteTackningsgrad >= 999) {
    c.decisionReason += 'Räntetäckningsgrad ej tillämplig eftersom räntekostnad saknas. '
    c.scoringLog += ' [N/A]'
    c.metric('rantetackningsgrad', 'Räntetäckningsgrad', 0, 'ok', 'Ej tillämplig')
  } else {
    c.creditScore += 8
    c.decisionReason += `Räntetäckningsgrad ${f2(ranteTackningsgrad)} är godkänd. `
    c.scoringLog += ' [OK]'
    c.metric('rantetackningsgrad', 'Räntetäckningsgrad', ranteTackningsgrad, 'ok', 'Uppfyller krav')
  }

  // --- evaluateCombinationRisks
  if (soliditet < 0.25 && skuldsattningsgrad > 2.5) {
    c.rule('kombinationSoliditetSkuld', 'Låg soliditet och hög skuldsättning', 'flagged', 'Soliditet < 0.25 och skuldsättning > 2.5', -18,
      'VARNING: Kombination av låg soliditet och hög skuldsättning. ', ', kombinationsrisk_soliditet_skuld [FLAGGED]')
  }
  if (likviditetsgrad < 1.0 && rorelseresultat < 0) {
    c.rule('kombinationLikviditetResultat', 'Svag likviditet och negativt resultat', 'reject', 'Likviditet < 1.0 och negativt rörelseresultat', -40,
      'AVSLAG: Dålig likviditet kombinerat med negativt rörelseresultat. ', ', kombinationsrisk_likviditet_resultat [REJECT]')
  }
  if (requestedAmount > nettoomsattning) {
    c.rule('kreditVsOmsattning', 'Belopp över årsomsättningen', 'flagged', 'Sökt belopp > nettoomsättning', -8,
      'VARNING: Kreditbelopp överstiger årsomsättningen. ', ', kredit_vs_omsattning [FLAGGED]')
  }
  if (requestedAmount > 0 && egetKapital / requestedAmount < t.egetKapitalVsKredit) {
    c.rule('egetKapitalVsKredit', 'Eget kapital under 30 % av beloppet', 'flagged', 'Eget kapital / sökt belopp < 0.3', -10,
      'VARNING: Eget kapital täcker mindre än 30% av kreditbeloppet. ', ', eget_kapital_vs_kredit [FLAGGED]')
  }
  if (kassaflodeKvot < 0.05 && skuldsattningsgrad > 2.0) {
    c.rule('kombinationKassaflodeSkuld', 'Svagt kassaflöde och hög skuldsättning', 'flagged', 'Kassaflödeskvot < 0.05 och skuldsättning > 2.0', -12,
      'VARNING: Kombinationsrisk kassaflöde och skuldsättning. ', ', kassaflode_skuld_kombination [FLAGGED]')
  }

  // --- buildFinalResult
  let decision: ApplicationDecision
  if (c.hardReject) {
    decision = 'REJECTED'
    c.decisionReason = `=== ANSÖKAN AVSLAGEN === ${c.decisionReason}`
  } else if (c.flagCount > 0) {
    decision = 'REVIEW'
    c.decisionReason = `=== MANUELL GRANSKNING === Antal varningsflaggor: ${c.flagCount}. ${c.decisionReason}`
  } else {
    decision = 'APPROVED'
    c.decisionReason = `=== ANSÖKAN GODKÄND === ${c.decisionReason}`
  }
  c.scoringLog += `, kreditPoäng=${c.creditScore}`

  return {
    applicationId,
    decision,
    hardReject: c.hardReject,
    flagCount: c.flagCount,
    metrics: c.metrics,
    rules: c.rules,
    creditScore: c.creditScore,
    scoringLog: c.scoringLog,
    decisionReason: c.decisionReason,
    scoredAt: new Date().toISOString(),
  }
}

/** Compact one-line summary for table views (caseworker queue). */
export function summarizeScoring(result: ScoringResult): string {
  const parts = result.metrics.map((m) => `${m.label.toLowerCase()}=${m.value.toFixed(2)} (${m.severity})`)
  return `${result.decision}: ${parts.join(', ')}`
}
