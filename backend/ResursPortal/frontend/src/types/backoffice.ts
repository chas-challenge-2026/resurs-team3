import type { ApplicationDecision } from './case'

export interface DecisionLogEntry {
  id: string
  caseId: string
  companyName: string
  action: ApplicationDecision
  comment: string
  decidedAt: string
  decidedBy: string
}

export interface AppNotification {
  id: string
  caseId: string
  companyName: string
  message: string
  createdAt: string
  read: boolean
}
