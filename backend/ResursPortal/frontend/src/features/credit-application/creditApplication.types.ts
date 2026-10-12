export type CreditApplicationData = {
  orgNumber: string
  companyName: string
  authorizedSignatory: string
  financialYear: string
  /** ScoringService.java bransch code, or 'OTHER' for none of them. */
  industry: string

  equity: string
  totalCapital: string
  currentAssets: string
  shortTermLiabilities: string
  longTermLiabilities: string
  operatingProfit: string
  netSales: string
  operatingCashFlow: string
  investingCashFlow: string
  /** 'true' when the annual report has no kassaflödesanalys. */
  noCashFlowStatement: string
  interestExpenses: string

  requestedAmount: string
  repaymentTerm: string
  purpose: string
}
