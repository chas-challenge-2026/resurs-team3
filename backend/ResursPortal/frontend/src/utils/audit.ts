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
 * The audit trail v1 writes for every new application, before this
 * refactors it into an indexed table (docs/v2-targets.md #2): one
 * APPLICATION_CREATED entry at intake, then one SCORING_RUN entry once the
 * ScoringService has produced a decision — same two events, same order, as
 * ApplicationController's POST /apply (INSERT 2 then INSERT 3).
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
  SCORING_RUN: 'Automatisk scoring',
  DOCUMENT_UPLOADED: 'Dokument uppladdat',
  MANUAL_DECISION: 'Handläggarbeslut',
}
