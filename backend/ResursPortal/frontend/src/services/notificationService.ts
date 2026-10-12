import type { ApplicantMessage, CreditCase } from '../types/case'

/**
 * In the real system, the backend emails these notifications(Spring Mail) .
 * The frontend decides what to tell the applicant and sends it
 * through a transport. For now, the mock transport saves messages
 * in shared prototype state so the applicant can see them on Översikt
 * and in the status portal. When the backend is ready, replace the
 * mock transport with an HTTP call(Swap createMessage consumers' transport for an HTTP
call to the backend when it exists).
 */
export type ApplicantEvent =
  | { type: 'APPLICATION_RECEIVED' }
  | { type: 'DOCUMENTS_RECEIVED' }
  | { type: 'DECISION_MADE'; decision: 'APPROVED' | 'REJECTED' }

let counter = 0

export function createApplicantMessage(creditCase: Pick<CreditCase, 'id' | 'orgNumber' | 'companyName'>, event: ApplicantEvent): ApplicantMessage {
  counter += 1
  const reference = creditCase.id.toUpperCase()
  const base = {
    id: `m-${Date.now()}-${counter}`,
    caseId: creditCase.id,
    orgNumber: creditCase.orgNumber,
    channel: 'email' as const,
    createdAt: new Date().toISOString(),
    read: false,
  }
  switch (event.type) {
    case 'APPLICATION_RECEIVED':
      return { ...base, subject: `Vi har tagit emot ansökan ${reference}`, body: `Tack! Ansökan från ${creditCase.companyName} är mottagen. Ni kan följa den i kundportalen.` }
    case 'DOCUMENTS_RECEIVED':
      return { ...base, subject: `Vi har tagit emot era underlag för ansökan ${reference}`, body: 'En handläggare fortsätter nu granskningen. Ni meddelas när beslutet är klart.' }
    case 'DECISION_MADE':
      return event.decision === 'APPROVED'
        ? { ...base, subject: `Ansökan ${reference} är beviljad`, body: 'Resurs kontaktar er om avtal och utbetalning.' }
        : { ...base, subject: `Beslut om ansökan ${reference}`, body: 'Ansökan har tyvärr avslagits. Se motiveringen i kundportalen.' }
  }
}
