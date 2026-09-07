import type { CreditCase, FinancialMetrics } from './case'

export type WizardStep = 1 | 2 | 3 | 4

export interface CompanyInfo {
  orgNumber: string
  companyName: string
  signatory: string
  acceptedTerms: boolean
}

export interface CreditRequest {
  amount: string
  purpose: string
}

export interface ApplicationState {
  currentStep: WizardStep
  companyInfo: CompanyInfo
  financialMetrics: FinancialMetrics
  creditRequest: CreditRequest
  confirmationAccepted: boolean
  submitted: boolean
  // The application as scored/decided at submit time (v1 scores synchronously
  // inside POST /apply) — set once SUBMIT_APPLICATION fires, so the
  // confirmation screen can show the real outcome instead of a generic
  // "we'll review it" message.
  submittedCase: CreditCase | null
}
