import type { ApplicationStatus } from '../../types/case'

/** Applicant-facing status names — one word per status across the portal. */
export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPROVED: 'Beviljad',
  REJECTED: 'Avslagen',
  UNDER_REVIEW: 'Under granskning',
  PENDING_DOCS: 'Komplettering krävs',
}
