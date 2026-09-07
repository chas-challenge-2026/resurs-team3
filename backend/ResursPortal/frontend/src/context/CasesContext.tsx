import React, { useMemo, useReducer } from 'react'
import type { AppNotification, DecisionLogEntry } from '../types/backoffice'
import type { CreditCase } from '../types/case'
import { MOCK_CASES } from '../data/mockCases'
import { computeScoringResult } from '../utils/scoring'
import { buildInitialAuditTrail, createAuditEvent } from '../utils/audit'
import { CasesContext, type CasesContextValue, type Decision } from './cases-context'

interface CasesState {
  cases: CreditCase[]
  decisions: DecisionLogEntry[]
  notifications: AppNotification[]
}

const initialState: CasesState = {
  cases: MOCK_CASES,
  decisions: [],
  notifications: [],
}

type Action =
  | { type: 'DECIDE'; id: string; status: Decision; comment: string }
  | { type: 'ADD_CASE'; newCase: CreditCase; notification: AppNotification }
  | { type: 'MARK_NOTIFICATIONS_READ' }

const DECISION_OUTCOME_LABEL: Record<string, string> = {
  APPROVED: 'automatiskt godkänd',
  REJECTED: 'automatiskt avslagen',
  UNDER_REVIEW: 'skickad till manuell granskning',
}

function reducer(state: CasesState, action: Action): CasesState {
  switch (action.type) {
    case 'DECIDE': {
      const target = state.cases.find((c) => c.id === action.id)
      if (!target) return state
      const decidedAt = new Date().toISOString()
      const auditEvent = createAuditEvent(action.id, 'MANUAL_DECISION', 'Karin Handläggare', {
        decision: action.status,
        comment: action.comment.trim() || null,
      })
      const entry: DecisionLogEntry = {
        id: `d-${Date.now()}`,
        caseId: action.id,
        companyName: target.companyName,
        action: action.status,
        comment: action.comment.trim(),
        decidedAt,
        decidedBy: 'Karin Handläggare',
      }
      return {
        ...state,
        cases: state.cases.map((c) =>
          c.id === action.id ? { ...c, status: action.status, auditTrail: [...c.auditTrail, auditEvent] } : c,
        ),
        decisions: [entry, ...state.decisions].slice(0, 20),
      }
    }
    case 'ADD_CASE':
      return {
        ...state,
        cases: [action.newCase, ...state.cases],
        notifications: [action.notification, ...state.notifications].slice(0, 20),
      }
    case 'MARK_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }
    default:
      return state
  }
}

export function CasesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const value = useMemo<CasesContextValue>(
    () => ({
      cases: state.cases,
      decisions: state.decisions,
      notifications: state.notifications,
      decide: (id, status, comment) => dispatch({ type: 'DECIDE', id, status, comment }),
      addCase: (companyInfo, financials, creditRequest) => {
        // Mirrors resurs-team3 v1's POST /apply: score synchronously at
        // intake (ApplicationController's inline scoring engine, here
        // utils/scoring.ts's ScoringService), then set the initial
        // application status straight from the decision — APPROVED/REJECTED
        // need no caseworker, REVIEW lands in the backoffice queue as
        // UNDER_REVIEW.
        const id = `c-${Date.now()}`
        const submittedAt = new Date().toISOString()
        const scoringResult = computeScoringResult(id, financials)
        const status = scoringResult.decision === 'REVIEW' ? 'UNDER_REVIEW' : scoringResult.decision

        const newCase: CreditCase = {
          id,
          companyName: companyInfo.companyName,
          orgNumber: companyInfo.orgNumber,
          signatory: companyInfo.signatory,
          amount: Number(creditRequest.amount) || 0,
          purpose: creditRequest.purpose,
          submittedAt,
          status,
          financials,
          scoringResult,
          auditTrail: buildInitialAuditTrail(id, companyInfo.orgNumber, scoringResult),
        }

        const notification: AppNotification = {
          id: `n-${Date.now()}`,
          caseId: id,
          companyName: newCase.companyName,
          message: `Ny ansökan från ${newCase.companyName} — ${DECISION_OUTCOME_LABEL[status] ?? status.toLowerCase()}`,
          createdAt: submittedAt,
          read: false,
        }

        dispatch({ type: 'ADD_CASE', newCase, notification })
        return newCase
      },
      markNotificationsRead: () => dispatch({ type: 'MARK_NOTIFICATIONS_READ' }),
    }),
    [state],
  )

  return <CasesContext.Provider value={value}>{children}</CasesContext.Provider>
}
