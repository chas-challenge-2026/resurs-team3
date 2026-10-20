import React, { useEffect, useMemo, useReducer } from 'react'
import type { AppNotification, DecisionLogEntry } from '../types/backoffice'
import type { ApplicantMessage, CaseDocument, CreditCase } from '../types/case'
import { MOCK_CASES } from '../data/mockCases'
import { computeScoringResult } from '../utils/scoring'
import { buildInitialAuditTrail, createAuditEvent } from '../utils/audit'
import { CasesContext, type CasesContextValue } from './cases-context'
import { createApplicantMessage } from '../services/notificationService'

interface CasesState {
  cases: CreditCase[]
  decisions: DecisionLogEntry[]
  notifications: AppNotification[]
  /** Messages to applicants (NotificationService's simulated e-mail). */
  applicantMessages: ApplicantMessage[]
}

const initialState: CasesState = {
  cases: MOCK_CASES,
  decisions: [],
  notifications: [],
  applicantMessages: [],
}

// v2: applications and decisions saved while testing (under v1) are
// dropped once, so Mina ansökningar starts from the seed cases again.
// v4: seed decision times come from the seeds (earlier versions stored other times).
const STORAGE_KEY = 'resurs-backoffice-prototype-v4'
const OLD_STORAGE_KEYS = ['resurs-backoffice-prototype-v1', 'resurs-backoffice-prototype-v2', 'resurs-backoffice-prototype-v3']

const STATUSES = new Set(['PENDING_DOCS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'])
const str = (value: unknown) => (typeof value === 'string' ? value : '')
const arr = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

/** Stored data stands in for the backend here, so it is checked like a
 * response: a case without an id, name, status or scoring is dropped, and
 * missing strings/lists get safe defaults instead of crashing a view. */
function normalizeCase(raw: unknown): CreditCase | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  const scoring = c.scoringResult as Record<string, unknown> | undefined
  if (!str(c.id) || !str(c.companyName) || !STATUSES.has(str(c.status)) || !scoring || typeof scoring !== 'object') return null
  return {
    ...(c as unknown as CreditCase),
    orgNumber: str(c.orgNumber),
    signatory: str(c.signatory),
    purpose: str(c.purpose),
    amount: Number.isFinite(c.amount) ? (c.amount as number) : 0,
    submittedAt: str(c.submittedAt),
    financials: (c.financials && typeof c.financials === 'object' ? c.financials : {}) as CreditCase['financials'],
    auditTrail: arr(c.auditTrail),
    scoringResult: { ...(scoring as unknown as CreditCase['scoringResult']), metrics: arr<CreditCase['scoringResult']['metrics'][number]>(scoring.metrics).filter((m) => m && typeof m === 'object' && typeof m.label === 'string'), rules: arr<NonNullable<CreditCase['scoringResult']['rules']>[number]>(scoring.rules).filter((r) => r && typeof r === 'object' && typeof r.label === 'string'), decisionReason: str(scoring.decisionReason) },
  }
}

function loadInitialState(): CasesState {
  if (typeof window === 'undefined') return initialState
  try {
    OLD_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key))
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return initialState
    const parsed = JSON.parse(saved) as Partial<CasesState>
    if (!Array.isArray(parsed.cases) || !Array.isArray(parsed.decisions) || !Array.isArray(parsed.notifications)) {
      return initialState
    }
    return {
      cases: parsed.cases.map(normalizeCase).filter((c): c is CreditCase => c !== null),
      decisions: parsed.decisions as DecisionLogEntry[],
      notifications: parsed.notifications as AppNotification[],
      applicantMessages: Array.isArray(parsed.applicantMessages) ? (parsed.applicantMessages as ApplicantMessage[]) : [],
    }
  } catch {
    return initialState
  }
}

type Action =
  | { type: 'ADD_CASE'; newCase: CreditCase; notification: AppNotification; messages?: ApplicantMessage[] }
  | { type: 'MARK_NOTIFICATIONS_READ' }
  | { type: 'MARK_NOTIFICATION_READ'; id: string }
  | { type: 'MARK_NOTIFICATION_UNREAD'; id: string }
  | { type: 'SYNC_FROM_STORAGE'; state: CasesState }
  | {
      // One case changed, plus whatever the change produced (messages to the
      // applicant, notices to case workers, a decision log entry). Built in
      // the action creators so the reducer stays pure.
      type: 'UPDATE_CASE'
      updated: CreditCase
      messages?: ApplicantMessage[]
      notifications?: AppNotification[]
      decision?: DecisionLogEntry
    }
  | { type: 'MARK_MESSAGES_READ'; ids: string[] }

const DECISION_OUTCOME_LABEL: Record<string, string> = {
  APPROVED: 'automatiskt godkänd',
  REJECTED: 'automatiskt avslagen',
  UNDER_REVIEW: 'skickad till manuell granskning',
  PENDING_DOCS: 'väntar på komplettering',
}

function reducer(state: CasesState, action: Action): CasesState {
  switch (action.type) {
    case 'ADD_CASE':
      return {
        ...state,
        cases: [action.newCase, ...state.cases],
        notifications: [action.notification, ...state.notifications].slice(0, 20),
        applicantMessages: [...(action.messages ?? []), ...state.applicantMessages].slice(0, 50),
      }
    case 'UPDATE_CASE':
      return {
        ...state,
        cases: state.cases.map((c) => (c.id === action.updated.id ? action.updated : c)),
        notifications: [...(action.notifications ?? []), ...state.notifications].slice(0, 20),
        applicantMessages: [...(action.messages ?? []), ...state.applicantMessages].slice(0, 50),
        decisions: action.decision ? [action.decision, ...state.decisions].slice(0, 20) : state.decisions,
      }
    case 'MARK_MESSAGES_READ':
      return {
        ...state,
        applicantMessages: state.applicantMessages.map((m) => (action.ids.includes(m.id) ? { ...m, read: true } : m)),
      }
    case 'MARK_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }
    case 'SYNC_FROM_STORAGE':
      return action.state
    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map((n) => n.id === action.id ? { ...n, read: true } : n) }
    case 'MARK_NOTIFICATION_UNREAD':
      return { ...state, notifications: state.notifications.map((n) => n.id === action.id ? { ...n, read: false } : n) }
    default:
      return state
  }
}

export function CasesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // The prototype remains usable when browser storage is unavailable.
    }
  }, [state])

  // Another tab (e.g. the backoffice, logged in as a case worker) changed
  // the shared prototype state: adopt it, so an open status page shows the
  // decision without a reload. The 'storage' event only fires in *other*
  // tabs, so this never loops with the save effect above.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      const next = loadInitialState()
      dispatch({ type: 'SYNC_FROM_STORAGE', state: next })
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo<CasesContextValue>(
    () => ({
      cases: state.cases,
      decisions: state.decisions,
      notifications: state.notifications,
      applicantMessages: state.applicantMessages,
      decide: (id, status, comment, actor = 'Handläggare') => {
        const target = state.cases.find((c) => c.id === id)
        const text = comment.trim()
        if (!target || !text) return false
        const open = target.status === 'UNDER_REVIEW' || target.status === 'PENDING_DOCS'
        // Overriding an automatic decision is allowed once; a person's
        // decision is final.
        const automaticallyDecided =
          (target.status === 'APPROVED' || target.status === 'REJECTED') &&
          !target.auditTrail.some((event) => event.action === 'MANUAL_DECISION')
        if (!open && !automaticallyDecided) return false

        const decidedAt = new Date().toISOString()
        const auditEvent = createAuditEvent(id, 'MANUAL_DECISION', actor, {
          decision: status,
          comment: text,
          override: automaticallyDecided,
          previousStatus: target.status,
        })
        const decision: DecisionLogEntry = {
          id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          caseId: id,
          companyName: target.companyName,
          action: status,
          comment: text,
          decidedAt,
          decidedBy: actor,
        }
        const changed = target.status !== status
        dispatch({
          type: 'UPDATE_CASE',
          updated: { ...target, status, auditTrail: [...target.auditTrail, auditEvent] },
          decision,
          messages: changed ? [createApplicantMessage(target, { type: 'DECISION_MADE', decision: status })] : [],
        })
        return true
      },
      addDocuments: (id, added) => {
        const target = state.cases.find((c) => c.id === id)
        if (!target || added.length === 0) return
        const documents: CaseDocument[] = [...added, ...(target.documents ?? [])]
        const audit = createAuditEvent(id, 'DOCUMENT_UPLOADED', 'Sökande', {
          count: added.length,
          categories: [...new Set(added.map((d) => d.category))].join(', '),
        })

        // Mirrors DocumentService.java: uploading an årsredovisning while the
        // case is PENDING_DOCS moves it back to UNDER_REVIEW; other document
        // types are stored but don't change the status.
        const fulfilled =
          target.status === 'PENDING_DOCS' && added.some((d) => d.category.toLocaleLowerCase('sv-SE') === 'årsredovisning')

        if (!fulfilled) {
          dispatch({ type: 'UPDATE_CASE', updated: { ...target, documents, auditTrail: [...target.auditTrail, audit] } })
          return
        }

        const receivedAt = new Date().toISOString()
        dispatch({
          type: 'UPDATE_CASE',
          updated: {
            ...target,
            status: 'UNDER_REVIEW',
            documents,
            auditTrail: [...target.auditTrail, audit],
          },
          messages: [createApplicantMessage(target, { type: 'DOCUMENTS_RECEIVED' })],
          notifications: [
            {
              id: `n-${Date.now()}`,
              caseId: id,
              companyName: target.companyName,
              message: `Komplettering inkommen från ${target.companyName} — redo för granskning`,
              createdAt: receivedAt,
              read: false,
            },
          ],
        })
      },
      markMessagesRead: (ids) => {
        if (ids.length) dispatch({ type: 'MARK_MESSAGES_READ', ids })
      },
      addCase: (companyInfo, financials, creditRequest, extras = {}) => {
        // Mirrors resurs-team3 v1's POST /apply: score synchronously at
        // intake (ApplicationController's inline scoring engine, here
        // utils/scoring.ts's ScoringService), then set the initial
        // application status straight from the decision — APPROVED/REJECTED
        // need no caseworker, REVIEW lands in the backoffice queue as
        // UNDER_REVIEW.
        // Short sequential ids continue the seed data (c-1001 …), so the
        // reference shown to the applicant ("Ansökan C-1005") is easy to
        // read out on the phone and matches what the case worker sees.
        const highest = state.cases.reduce((max, existing) => {
          const match = /^c-(\d{1,6})$/.exec(existing.id)
          return match ? Math.max(max, Number(match[1])) : max
        }, 1000)
        const id = `c-${highest + 1}`
        const submittedAt = new Date().toISOString()
        const scoringResult = computeScoringResult(id, financials, {
          requestedAmount: Number(creditRequest.amount) || 0,
          industry: companyInfo.industry,
        })
        // Same as ScoringService.java's buildFinalResult: REVIEW → UNDER_REVIEW.
        // The backend never sets PENDING_DOCS on its own, so neither do we.
        const status = scoringResult.decision === 'REVIEW' ? 'UNDER_REVIEW' : scoringResult.decision

        const newCase: CreditCase = {
          id,
          companyName: companyInfo.companyName,
          orgNumber: companyInfo.orgNumber,
          signatory: companyInfo.signatory,
          amount: Number(creditRequest.amount) || 0,
          termMonths: creditRequest.termMonths,
          purpose: creditRequest.purpose,
          submittedAt,
          status,
          financials,
          scoringResult,
          auditTrail: [
            ...buildInitialAuditTrail(id, companyInfo.orgNumber, scoringResult),
            ...(extras.signature
              ? [createAuditEvent(id, 'APPLICATION_SIGNED', extras.signature.signedBy, { orderRef: extras.signature.orderRef })]
              : []),
          ],
          industry: companyInfo.industry ?? '',
          companyValidation: extras.companyValidation,
          signature: extras.signature,
          documents: [],
        }

        const notification: AppNotification = {
          id: `n-${Date.now()}`,
          caseId: id,
          companyName: newCase.companyName,
          message: `Ny ansökan från ${newCase.companyName} — ${DECISION_OUTCOME_LABEL[status] ?? status.toLowerCase()}`,
          createdAt: submittedAt,
          read: false,
        }

        const messages = [
          status === 'APPROVED' || status === 'REJECTED'
            ? createApplicantMessage(newCase, { type: 'DECISION_MADE', decision: status })
            : createApplicantMessage(newCase, { type: 'APPLICATION_RECEIVED' }),
        ]

        dispatch({ type: 'ADD_CASE', newCase, notification, messages })
        return newCase
      },
      markNotificationsRead: () => dispatch({ type: 'MARK_NOTIFICATIONS_READ' }),
      markNotificationRead: (id) => dispatch({ type: 'MARK_NOTIFICATION_READ', id }),
      markNotificationUnread: (id) => dispatch({ type: 'MARK_NOTIFICATION_UNREAD', id }),
    }),
    [state],
  )

  return <CasesContext.Provider value={value}>{children}</CasesContext.Provider>
}
