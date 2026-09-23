import type { CreditApplicationData } from './creditApplication.types'

type FinancialField =
  | 'equity'
  | 'totalCapital'
  | 'currentAssets'
  | 'shortTermLiabilities'
  | 'totalDebt'
  | 'operatingProfit'
  | 'netSales'

export type FinancialMetricsErrors = Partial<
  Record<FinancialField, string>
>

const financialFields: FinancialField[] = [
  'equity',
  'totalCapital',
  'currentAssets',
  'shortTermLiabilities',
  'totalDebt',
  'operatingProfit',
  'netSales',
]

export function validateFinancialMetrics(
  data: CreditApplicationData,
): FinancialMetricsErrors {
  const errors: FinancialMetricsErrors = {}

  for (const field of financialFields) {
    const value = data[field].trim()

    if (!value) {
      errors[field] = 'Fältet måste fyllas i.'
      continue
    }

    if (!Number.isFinite(Number(value))) {
      errors[field] = 'Ange ett giltigt nummer.'
    }
  }

  return errors
}