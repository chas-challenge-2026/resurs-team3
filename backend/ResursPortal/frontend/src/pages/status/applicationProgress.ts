import type { CreditCase } from '../../types/case'
import { ROUTES } from '../../routes'

export type ProgressState = 'done' | 'current' | 'upcoming'

export interface ProgressStep {
  key: string
  title: string
  /** Estimated duration from StatusService ("1 dag", "3 dagar"); "—" = none. */
  eta: string
  detail: string
  state: ProgressState
}

/**
 * Port of the backend's StatusService.buildStatusSteps(currentStatus): same
 * step names, time estimates, descriptions and DONE / CURRENT / PENDING
 * logic, so the portal shows what the real status endpoint will return.
 */
export function buildApplicationProgress(creditCase: CreditCase): ProgressStep[] {
  const status = creditCase.status
  const step = (key: string, title: string, eta: string, detail: string, state: ProgressState): ProgressStep => ({ key, title, eta, detail, state })
  const steps: ProgressStep[] = [
    step('received', 'Inkommen', '—', 'Ansökan har mottagits av systemet.', 'done'),
    step('validating', 'Valideras', '1 dag', 'Ansökan och grundläggande uppgifter valideras.', 'done'),
  ]

  if (status === 'UNDER_REVIEW') {
    steps.push(step('review', 'Granskas', '3 dagar', 'Ansökan granskas och kreditbedömningen genomförs.', 'current'))
    steps.push(step('documents', 'Komplettering krävs', '1 dag', 'Ytterligare dokument eller information kan behöva skickas in.', 'upcoming'))
  } else if (status === 'PENDING_DOCS') {
    steps.push(step('review', 'Granskas', '3 dagar', 'Ansökan granskas och kreditbedömningen genomförs.', 'done'))
    steps.push(step('documents', 'Komplettering krävs', '1 dag', 'Ytterligare dokument eller information behöver skickas in.', 'current'))
  } else {
    steps.push(step('review', 'Granskas', '3 dagar', 'Ansökan granskas och kreditbedömningen genomförs.', 'done'))
    steps.push(step('documents', 'Komplettering krävs', '—', 'Ingen komplettering krävs.', 'done'))
  }

  const decided = status === 'APPROVED' || status === 'REJECTED'
  steps.push(step('decision', 'Beslut', '1 dag', 'Kreditbeslut fattas av handläggare eller automatiskt.', decided ? 'done' : 'upcoming'))
  return steps
}

/** The case worker's written motivation, when a person made the decision. */
export function manualDecisionComment(creditCase: CreditCase): string | null {
  const manual = creditCase.auditTrail.find((event) => event.action === 'MANUAL_DECISION')
  const comment = manual?.details.comment
  return typeof comment === 'string' && comment.trim() ? comment.trim() : null
}

/** Mina handlingar with one application preselected. */
export function documentsPath(id: string) {
  return `${ROUTES.documents}?ansokan=${encodeURIComponent(id)}`
}

/** Where an applicant follows one application after submitting it. */
export function applicationStatusPath(id: string) {
  return `${ROUTES.application}/${id}`
}
