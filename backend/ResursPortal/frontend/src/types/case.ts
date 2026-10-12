// ---------------------------------------------------------------------------
// Shared credit-case model + backend-contract types (v2 target shape)
//
// Modeled on resurs-team3's real v1 schema (applications.status, decision,
// scoring_result, audit_log) and docs/v2-targets.md's planned services
// (ScoringService, a proper audit_events table instead of a JSON blob,
// CompanyValidationService). CreditCase below is the frontend's working
// model of one application and is built directly out of these types, so the
// mock UI mirrors the real API contract a v2 backend would return rather
// than a simplified, made-up shape.
//
// This file is deliberately self-contained (no imports from ../wizard or
// ../backoffice) — it's the shared model both the wizard and the backoffice
// build on, so it can't depend on either of them without a circular import.
// ---------------------------------------------------------------------------

export interface FinancialMetrics {
  /** Financial reporting period used for the submitted figures. */
  reportingPeriod?: string
  equity: string
  totalCapital: string
  currentAssets: string
  currentLiabilities: string
  totalLiabilities: string
  operatingProfit: string
  netRevenue: string
  // Added from resurs-team3 v1 (operativtKassaflode / investeringsKassaflode /
  // ranteKostnader) — optional in v1's form, needed for the kassaflödeskvot
  // and räntetäckningsgrad scoring metrics. Empty string = not provided.
  operatingCashFlow: string
  investingCashFlow: string
  interestExpenses: string
  /** The annual report has no kassaflödesanalys; cash flows sent as 0. */
  cashFlowStatementMissing?: boolean
}

// applications.status in v1 (PENDING_DOCS is pre-scoring; UNDER_REVIEW/APPROVED/REJECTED
// come out of the scoring engine or a caseworker's manual decision). This prototype has
// no document-upload step, so applications start scored (never sit in PENDING_DOCS).
export type ApplicationStatus = 'PENDING_DOCS' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'

// applications.decision — REVIEW means "no automatic decision, needs a caseworker"
export type ApplicationDecision = 'APPROVED' | 'REJECTED' | 'REVIEW'

export type ScoringMetricKey =
  | 'soliditet'
  | 'likviditetsgrad'
  | 'skuldsattningsgrad'
  | 'rorelsemarginal'
  | 'kassaflodeskvot'
  | 'rantetackningsgrad'

export type ScoringSeverity = 'ok' | 'good' | 'flagged' | 'reject'

export interface ScoringMetricResult {
  key: ScoringMetricKey
  label: string
  value: number
  severity: ScoringSeverity
  note: string
}

// v2's structured replacement for v1's free-text scoring_result column and
// its inline, magic-number-laden if/else chain in ApplicationController.
// Thresholds are consolidated to one value per metric (see utils/scoring.ts)
// instead of v1's three-different-thresholds-for-soliditet bug.
/** A rule from ScoringService.java beyond the six ratios (risk,
 * industry, cash-flow and combination rules). */
export interface ScoringRuleHit {
  key: string
  label: string
  severity: 'flagged' | 'reject'
  note: string
}

/** Industry codes ScoringService.java understands (branschfaktor). */
export type Industry =
  | 'BYGG' | 'HANDEL' | 'IT' | 'FASTIGHET' | 'TILLVERKNING'
  | 'TRANSPORT' | 'RESTAURANG' | 'FINANS' | 'VÅRD' | 'UTBILDNING'

export interface ScoringResult {
  applicationId: string
  decision: ApplicationDecision
  hardReject: boolean
  flagCount: number
  metrics: ScoringMetricResult[]
  /** Rules that fired beyond the six ratios. Optional for stored cases. */
  rules?: ScoringRuleHit[]
  /** ScoringService.java's kreditPoäng (starts at 100). */
  creditScore?: number
  /** Same format as ScoringService.java's scoringLog. */
  scoringLog?: string
  decisionReason: string
  scoredAt: string
}

// v1 stores every event as one entry in an applications.audit_log JSON blob
// (APPLICATION_CREATED, SCORING_RUN, DOCUMENT_UPLOADED, MANUAL_DECISION).
// v2 moves this to an indexed audit_events table; AuditEvent is the read
// view the frontend renders in a case's audit trail.
export type AuditAction =
  | 'APPLICATION_CREATED'
  | 'APPLICATION_SIGNED'
  | 'SCORING_RUN'
  | 'DOCUMENT_UPLOADED'
  | 'MANUAL_DECISION'

export interface AuditEvent {
  id: string
  applicationId: string
  ts: string
  action: AuditAction
  actor: string | null
  details: Record<string, string | number | boolean | null>
}

// v2-targets.md: "Extern företagsvalidering som egen service" — mocked in the
// MVP (registration status, VAT/F-tax status), swappable for a real lookup later
export type CompanyRegistrationStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_LIQUIDATION' | 'NOT_FOUND'

export interface CompanyValidationResult {
  orgNumber: string
  companyName: string
  registrationStatus: CompanyRegistrationStatus
  vatRegistered: boolean
  fSkattRegistered: boolean
  authorizedSignatories: string[]
  validatedAt: string
}

// The caseworker-facing / cross-context model of one credit application.
// status/scoringResult/auditTrail replace the old CaseStatus + ScoreMetric[]
// shapes now that scoring runs for real (see utils/scoring.ts) at submit time.
export interface CreditCase {
  id: string
  companyName: string
  orgNumber: string
  signatory: string
  amount: number
  termMonths?: number
  purpose: string
  submittedAt: string
  status: ApplicationStatus
  financials: FinancialMetrics
  scoringResult: ScoringResult
  auditTrail: AuditEvent[]
  // --- v2 flow additions (all optional so seed and stored cases still load)
  /** Industry used for ScoringService's branschfaktor; empty = unknown. */
  industry?: Industry | ''
  /** Company-register check made in the wizard (CompanyValidationService). */
  companyValidation?: CompanyValidationResult
  /** BankID signature of the application (BankIdService). */
  signature?: { signedBy: string; signedAt: string; orderRef: string }
  /** Documents the applicant has sent in (metadata only in the prototype). */
  documents?: CaseDocument[]
}

export interface CaseDocument {
  id: string
  category: string
  fileName: string
  size: number
  uploadedAt: string
}

/** A message to the applicant (e-mail via NotificationService). */
export interface ApplicantMessage {
  id: string
  caseId: string
  orgNumber: string
  channel: 'email'
  subject: string
  body: string
  createdAt: string
  read: boolean
}
