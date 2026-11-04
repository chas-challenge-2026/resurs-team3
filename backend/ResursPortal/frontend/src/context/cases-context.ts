import { createContext } from 'react'
import type { CompanyInfo, CreditRequest } from '../types/wizard'
import type { AppNotification, DecisionLogEntry } from '../types/backoffice'
import type { ApplicantMessage, ApplicationDecision, CaseDocument, CompanyValidationResult, CreditCase, FinancialMetrics } from '../types/case'

// Manual caseworker decisions are always final — APPROVED or REJECTED, never REVIEW
export type Decision = Exclude<ApplicationDecision, 'REVIEW'>

export interface CasesContextValue {
  cases: CreditCase[]
  decisions: DecisionLogEntry[]
  notifications: AppNotification[]
  applicantMessages: ApplicantMessage[]
  /** Case worker decision; also overrides an automatic decision (once). */
  /** False when the case can no longer be decided (e.g. it was decided in another tab). */
  decide: (id: string, status: Decision, comment: string, actor?: string) => boolean
  addCase: (
    companyInfo: CompanyInfo,
    financials: FinancialMetrics,
    creditRequest: CreditRequest,
    extras?: { companyValidation?: CompanyValidationResult; signature?: CreditCase['signature'] },
  ) => CreditCase
  addDocuments: (id: string, documents: CaseDocument[]) => void
  markMessagesRead: (ids: string[]) => void
  markNotificationsRead: () => void
  markNotificationRead: (id: string) => void
  markNotificationUnread: (id: string) => void
}

export const CasesContext = createContext<CasesContextValue | undefined>(undefined)
