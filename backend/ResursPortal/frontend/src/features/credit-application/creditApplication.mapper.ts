import type { CompanyInfo, CreditRequest } from '../../types/wizard'
import type { FinancialMetrics, Industry } from '../../types/case'
import type { CreditApplicationData } from './creditApplication.types'

export interface CaseSubmission {
  companyInfo: CompanyInfo
  financials: FinancialMetrics
  creditRequest: CreditRequest
}

function sumWholeKronor(...values: string[]): string {
  return String(values.reduce((sum, value) => sum + (Number(value) || 0), 0))
}

/**
 * Maps credit application form data to the case shape used by CasesContext.
 */
export function toCaseSubmission(
  data: CreditApplicationData,
  { attested }: { attested: boolean },
): CaseSubmission {
  return {
    companyInfo: {
      orgNumber: data.orgNumber,
      companyName: data.companyName,
      signatory: data.authorizedSignatory,
      industry: data.industry && data.industry !== 'OTHER' ? (data.industry as Industry) : '',
      // The signatory's attestation on the review step.
      acceptedTerms: attested,
    },
    financials: {
      reportingPeriod: data.financialYear,
      equity: data.equity,
      totalCapital: data.totalCapital,
      currentAssets: data.currentAssets,
      currentLiabilities: data.shortTermLiabilities,
      // Total debt isn't a line in a Swedish annual report, so the applicant
      // gives short- and long-term debt and the total is computed here.
      totalLiabilities: sumWholeKronor(data.shortTermLiabilities, data.longTermLiabilities),
      operatingProfit: data.operatingProfit,
      netRevenue: data.netSales,
      // No kassaflödesanalys: ScoringService.java gets 0, which flags the
      // kassaflödeskvot and sends the case to a case worker.
      operatingCashFlow: data.noCashFlowStatement === 'true' ? '0' : data.operatingCashFlow,
      investingCashFlow: data.noCashFlowStatement === 'true' ? '0' : data.investingCashFlow,
      cashFlowStatementMissing: data.noCashFlowStatement === 'true',
      // Printed negative in the income statement; the scoring wants a cost.
      interestExpenses: data.interestExpenses.replace(/^-/, ''),
    },
    creditRequest: {
      amount: data.requestedAmount,
      termMonths: Number(data.repaymentTerm),
      purpose: data.purpose,
    },
  }
}
