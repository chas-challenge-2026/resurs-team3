import { createContext } from 'react'
import type { CompanyInfo, CreditRequest } from '../types/wizard'
import type { AppNotification, DecisionLogEntry } from '../types/backoffice'
import type { ApplicationDecision, CreditCase, FinancialMetrics } from '../types/case'

// Manual caseworker decisions are always final — APPROVED or REJECTED, never REVIEW
export type Decision = Exclude<ApplicationDecision, 'REVIEW'>

export interface CasesContextValue {
  cases: CreditCase[]
  decisions: DecisionLogEntry[]
  notifications: AppNotification[]
  decide: (id: string, status: Decision, comment: string) => void
  addCase: (companyInfo: CompanyInfo, financials: FinancialMetrics, creditRequest: CreditRequest) => CreditCase
  markNotificationsRead: () => void
}

export const CasesContext = createContext<CasesContextValue | undefined>(undefined)
