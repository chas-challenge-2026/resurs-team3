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

// Backend currently has stricter validation for some financial fields
// (for example equity, total capital, assets and liabilities).
// Frontend intentionally keeps required + numeric validation only until
// the team confirms the final source-of-truth rules.
// Keep this validation in sync with CreateApplicationRequest when agreed.

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