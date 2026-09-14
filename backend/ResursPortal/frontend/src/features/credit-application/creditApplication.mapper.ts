import type { CompanyInfo, CreditRequest } from '../../types/wizard'
import type { FinancialMetrics } from '../../types/case'
import type { CreditApplicationData } from './creditApplication.types'

export interface CaseSubmission {
  companyInfo: CompanyInfo
  financials: FinancialMetrics
  creditRequest: CreditRequest
}

/**
 * Maps credit application form data to the case shape used by CasesContext.
 */
export function toCaseSubmission(data: CreditApplicationData): CaseSubmission {
  return {
    companyInfo: {
      orgNumber: data.orgNumber,
      companyName: data.companyName,
      signatory: data.authorizedSignatory,
      // Terms acceptance is not implemented yet.
      acceptedTerms: true,
    },
    financials: {
      equity: data.equity,
      totalCapital: data.totalCapital,
      currentAssets: data.currentAssets,
      currentLiabilities: data.shortTermLiabilities,
      totalLiabilities: data.totalDebt,
      operatingProfit: data.operatingProfit,
      netRevenue: data.netSales,
      // These optional financial fields are not collected in this flow.
      operatingCashFlow: '',
      investingCashFlow: '',
      interestExpenses: '',
    },
    creditRequest: {
      amount: data.requestedAmount,
      purpose: data.purpose,
    },
  }
}
