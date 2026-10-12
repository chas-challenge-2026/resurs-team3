import type { AuditAction, AuditEvent, ScoringResult } from '../types/case'

let counter = 0
function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now()}-${counter}`
}

export function createAuditEvent(
  applicationId: string,
  action: AuditAction,
  actor: string | null,
  details: AuditEvent['details'] = {},
): AuditEvent {
  return {
    id: nextId('audit'),
    applicationId,
    ts: new Date().toISOString(),
    action,
    actor,
    details,
  }
}

/**
 * The v1 audit trail adds two entries for each new application, before
 * the data is moved into an indexed table (docs/v2-targets.md #2):
 * first APPLICATION_CREATED when the application arrives, then
 * SCORING_RUN after ScoringService makes a decision. This matches
 * ApplicationController's POST /apply, which inserts entries 2 and 3.
 */
export function buildInitialAuditTrail(applicationId: string, orgNumber: string, scoring: ScoringResult): AuditEvent[] {
  return [
    createAuditEvent(applicationId, 'APPLICATION_CREATED', null, { orgNumber }),
    createAuditEvent(applicationId, 'SCORING_RUN', null, {
      result: scoring.decision,
      flags: scoring.flagCount,
    }),
  ]
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  APPLICATION_CREATED: 'Ansökan skapad',
  APPLICATION_SIGNED: 'Signerad med BankID',
  SCORING_RUN: 'Automatisk scoring',
  DOCUMENT_UPLOADED: 'Dokument uppladdat',
  MANUAL_DECISION: 'Handläggarbeslut',
}
