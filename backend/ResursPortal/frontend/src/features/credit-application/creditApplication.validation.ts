import type { CreditApplicationData } from './creditApplication.types'
import { isWholeKronor } from './amount'

export type FinancialErrors = Partial<Record<
  | 'financialYear'
  | 'equity'
  | 'totalCapital'
  | 'currentAssets'
  | 'shortTermLiabilities'
  | 'longTermLiabilities'
  | 'operatingProfit'
  | 'netSales'
  | 'operatingCashFlow'
  | 'investingCashFlow'
  | 'interestExpenses',
  string
>>

export type CreditRequestErrors = Partial<Record<'requestedAmount' | 'purpose', string>>

const FINANCIAL_FIELDS = [
  ['equity', 'Eget kapital'],
  ['totalCapital', 'Balansomslutning'],
  ['currentAssets', 'Omsättningstillgångar'],
  ['shortTermLiabilities', 'Kortfristiga skulder'],
  ['longTermLiabilities', 'Långfristiga skulder'],
  ['operatingProfit', 'Rörelseresultat'],
  ['netSales', 'Nettoomsättning'],
  ['interestExpenses', 'Räntekostnader'],
  ['operatingCashFlow', 'Operativt kassaflöde'],
  ['investingCashFlow', 'Investeringskassaflöde'],
] as const

// What to write when a figure is missing: where it is in the årsredovisning,
// since the field's hint (which says the same) is replaced by the error.
const MISSING_MESSAGE: Record<(typeof FINANCIAL_FIELDS)[number][0], string> = {
  netSales: 'Ange nettoomsättningen, första raden i resultaträkningen.',
  operatingProfit: 'Ange rörelseresultatet. Kan vara negativt.',
  interestExpenses: 'Ange räntekostnaderna, 0 om det saknas.',
  currentAssets: 'Ange omsättningstillgångarna, raden Summa omsättningstillgångar.',
  totalCapital: 'Ange balansomslutningen, raden Summa eget kapital och skulder.',
  equity: 'Ange eget kapital, raden Summa eget kapital.',
  shortTermLiabilities: 'Ange kortfristiga skulder, raden Summa kortfristiga skulder.',
  longTermLiabilities: 'Ange långfristiga skulder, 0 om det saknas.',
  operatingCashFlow: 'Ange operativt kassaflöde, raden Kassaflöde från den löpande verksamheten.',
  investingCashFlow: 'Ange investeringskassaflöde, raden Kassaflöde från investeringsverksamheten.',
}

/** True when no figure in step 2 has been entered yet. */
export function noFiguresEntered(data: CreditApplicationData): boolean {
  return FINANCIAL_FIELDS.every(([field]) => !data[field].trim())
}

const FIELDS_ALLOWED_TO_BE_NEGATIVE = new Set(['equity', 'operatingProfit', 'operatingCashFlow', 'investingCashFlow', 'interestExpenses'])

export function validateFinancialMetrics(data: CreditApplicationData): FinancialErrors {
  const errors: FinancialErrors = {}
  if (!data.financialYear) errors.financialYear = 'Välj vilket räkenskapsår siffrorna gäller.'

  const noCashFlowStatement = data.noCashFlowStatement === 'true'
  for (const [field, label] of FINANCIAL_FIELDS) {
    if (noCashFlowStatement && (field === 'operatingCashFlow' || field === 'investingCashFlow')) continue
    const rawValue = data[field].trim()
    if (!rawValue) {
      errors[field] = MISSING_MESSAGE[field]
      continue
    }
    if (!isWholeKronor(rawValue)) {
      errors[field] = `Ange ${label.toLowerCase()} i hela kronor, till exempel 1 250 000.`
    } else if (!FIELDS_ALLOWED_TO_BE_NEGATIVE.has(field) && Number(rawValue) < 0) {
      errors[field] = `${label} kan inte vara ett negativt belopp.`
    }
  }

  // Balance-sheet figures that cannot all be true at once. Checked only
  // when every figure involved is itself valid, and reported on the field
  // most likely to be wrong, so the message points at something fixable.
  const n = (field: keyof CreditApplicationData) => (errors[field as keyof FinancialErrors] ? null : Number(data[field]))
  const total = n('totalCapital')
  const equity = n('equity')
  const currentAssets = n('currentAssets')
  const shortTerm = n('shortTermLiabilities')
  const longTerm = n('longTermLiabilities')
  const totalDebt = shortTerm !== null && longTerm !== null ? shortTerm + longTerm : null
  if (currentAssets !== null && total !== null && currentAssets > total) {
    errors.currentAssets = 'Omsättningstillgångar kan inte vara större än balansomslutningen. Kontrollera båda beloppen.'
  }
  if (total !== null && equity !== null && totalDebt !== null && !errors.currentAssets && equity + totalDebt > total) {
    errors.totalCapital = 'Balansomslutningen ska vara minst eget kapital plus kortfristiga och långfristiga skulder. Kontrollera beloppen.'
  }

  return errors
}

export function validateCreditRequest(data: CreditApplicationData): CreditRequestErrors {
  const errors: CreditRequestErrors = {}
  const amount = Number(data.requestedAmount)
  if (!data.requestedAmount.trim()) {
    errors.requestedAmount = 'Ange önskat kreditbelopp.'
  } else if (!isWholeKronor(data.requestedAmount.trim())) {
    errors.requestedAmount = 'Ange beloppet i hela kronor, till exempel 1 500 000.'
  } else if (amount < 250_000 || amount > 10_000_000) {
    errors.requestedAmount = 'Beloppet ska vara mellan 250 000 och 10 000 000 SEK.'
  }

  if (!data.purpose.trim()) {
    errors.purpose = 'Beskriv kort vad krediten ska användas till.'
  } else if (data.purpose.trim().length > 500) {
    errors.purpose = 'Beskrivningen får vara högst 500 tecken.'
  }
  return errors
}

/**
 * Figures that look like they were typed in thousands (tkr) instead of
 * kronor: every filled amount is small, and net sales are under 100 000 kr,
 * which a company applying for at least 250 000 kr would not have.
 */
export function looksLikeThousands(data: CreditApplicationData): boolean {
  const keys = FINANCIAL_FIELDS.map(([field]) => field)
  const values = keys.map((key) => data[key].trim()).filter((v) => /^-?\d+$/.test(v)).map(Number)
  const sales = Number(data.netSales)
  return values.length >= 3 && /^\d+$/.test(data.netSales.trim()) && sales > 0 && sales < 100_000 && values.every((v) => Math.abs(v) < 100_000)
}

export const FINANCIAL_FIELD_KEYS = FINANCIAL_FIELDS.map(([field]) => field)
