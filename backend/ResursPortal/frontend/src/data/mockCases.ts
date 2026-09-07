import type { CreditCase, FinancialMetrics } from '../types/case'
import { computeScoringResult } from '../utils/scoring'
import { buildInitialAuditTrail } from '../utils/audit'

interface SeedCase {
  id: string
  companyName: string
  orgNumber: string
  signatory: string
  amount: number
  purpose: string
  submittedAt: string
  financials: FinancialMetrics
}

// Seed data — status is NOT hardcoded here. Each case is run through the same
// ScoringService (utils/scoring.ts) the applicant wizard uses at submit time,
// so the queue always reflects what the engine actually decides, the way
// resurs-team3 v1's applications table is populated by real POST /apply
// scoring runs rather than a fixed status column.
const SEED_CASES: SeedCase[] = [
  {
    // Matches resurs-team3 v1's seed.sql pre-existing application almost
    // exactly (same company/org number/amount/purpose, UNDER_REVIEW on a
    // flagged likviditetsgrad).
    id: 'c-1001',
    companyName: 'Göteborg Handel AB',
    orgNumber: '556000-5678',
    signatory: 'Anna Andersson',
    amount: 500000,
    purpose: 'Expansion av verksamheten',
    submittedAt: '2026-08-28',
    financials: {
      equity: '2240000',
      totalCapital: '8000000',
      currentAssets: '1900000',
      currentLiabilities: '2000000',
      totalLiabilities: '4400000',
      operatingProfit: '450000',
      netRevenue: '9500000',
      operatingCashFlow: '380000',
      investingCashFlow: '-120000',
      interestExpenses: '',
    },
  },
  {
    id: 'c-1002',
    companyName: 'Malmö Bygg & Design AB',
    orgNumber: '556012-3344',
    signatory: 'Johan Berg',
    amount: 1200000,
    purpose: 'Investering i ny maskinpark.',
    submittedAt: '2026-08-25',
    financials: {
      equity: '4200000',
      totalCapital: '15000000',
      currentAssets: '6000000',
      currentLiabilities: '3500000',
      totalLiabilities: '7800000',
      operatingProfit: '980000',
      netRevenue: '21000000',
      operatingCashFlow: '650000',
      investingCashFlow: '-300000',
      interestExpenses: '',
    },
  },
  {
    id: 'c-1003',
    companyName: 'Norrlands Livs AB',
    orgNumber: '556098-7621',
    signatory: 'Erik Lindqvist',
    amount: 250000,
    purpose: 'Rörelsekapital inför säsong.',
    submittedAt: '2026-08-30',
    financials: {
      equity: '700000',
      totalCapital: '3200000',
      currentAssets: '1100000',
      currentLiabilities: '1150000',
      totalLiabilities: '1050000',
      operatingProfit: '90000',
      netRevenue: '4100000',
      operatingCashFlow: '150000',
      investingCashFlow: '-50000',
      interestExpenses: '',
    },
  },
  {
    id: 'c-1004',
    companyName: 'Stockholm Tech Solutions AB',
    orgNumber: '559034-1122',
    signatory: 'Maria Ström',
    amount: 800000,
    purpose: 'Anställning av utvecklare och produktlansering.',
    submittedAt: '2026-08-20',
    financials: {
      equity: '600000',
      totalCapital: '2000000',
      currentAssets: '900000',
      currentLiabilities: '1200000',
      totalLiabilities: '1400000',
      operatingProfit: '-150000',
      netRevenue: '3000000',
      operatingCashFlow: '-80000',
      investingCashFlow: '-40000',
      interestExpenses: '60000',
    },
  },
  {
    id: 'c-1005',
    companyName: 'Öresund Logistik AB',
    orgNumber: '556077-4455',
    signatory: 'Peter Nilsson',
    amount: 350000,
    purpose: 'Nya transportfordon.',
    submittedAt: '2026-08-31',
    financials: {
      equity: '1800000',
      totalCapital: '6500000',
      currentAssets: '2200000',
      currentLiabilities: '1700000',
      totalLiabilities: '3400000',
      operatingProfit: '320000',
      netRevenue: '7800000',
      operatingCashFlow: '310000',
      investingCashFlow: '-90000',
      interestExpenses: '',
    },
  },
  {
    id: 'c-1006',
    companyName: 'Uppsala Grönt AB',
    orgNumber: '556145-9988',
    signatory: 'Sara Holm',
    amount: 600000,
    purpose: 'Utbyggnad av växthus.',
    submittedAt: '2026-08-18',
    financials: {
      equity: '2100000',
      totalCapital: '7200000',
      currentAssets: '2600000',
      currentLiabilities: '1900000',
      totalLiabilities: '5100000',
      operatingProfit: '410000',
      netRevenue: '8600000',
      operatingCashFlow: '410000',
      investingCashFlow: '-200000',
      interestExpenses: '',
    },
  },
]

function buildCase(seed: SeedCase): CreditCase {
  const scoringResult = computeScoringResult(seed.id, seed.financials)
  const status = scoringResult.decision === 'REVIEW' ? 'UNDER_REVIEW' : scoringResult.decision
  return {
    id: seed.id,
    companyName: seed.companyName,
    orgNumber: seed.orgNumber,
    signatory: seed.signatory,
    amount: seed.amount,
    purpose: seed.purpose,
    submittedAt: seed.submittedAt,
    status,
    financials: seed.financials,
    scoringResult,
    auditTrail: buildInitialAuditTrail(seed.id, seed.orgNumber, scoringResult),
  }
}

export const MOCK_CASES: CreditCase[] = SEED_CASES.map(buildCase)
