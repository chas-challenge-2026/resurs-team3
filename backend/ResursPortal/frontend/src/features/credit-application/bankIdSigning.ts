import { confirmBankIdMock } from '../../auth/mockBankId'
import { companyValidationService } from '../../services/companyValidationService'

/**
 * Frontend mock of BankID *signing* for the application.
 *
 * The backend's BankIdService (se.resurs.service, owned by another team
 * member) currently only has authenticateCompany(orgNumber). Signing and
 * the firmatecknarbehörighet check (v2-targets #5) don't exist there yet,
 * so this adapter simulates them on the happy path. When the backend gains
 * a signing endpoint, replace the body of `signApplication` with that call;
 * the wizard only depends on this function's signature.
 */
export type SigningResult =
  | { status: 'COMPLETE'; signedBy: string; signedAt: string; orderRef: string }
  | { status: 'FAILED'; reason: 'NOT_AUTHORIZED_SIGNATORY' | 'COMPANY_NOT_ACTIVE' }

export async function signApplication(orgNumber: string, signatoryName: string): Promise<SigningResult> {
  const [company] = await Promise.all([companyValidationService.lookup(orgNumber), confirmBankIdMock()])
  if (company.registrationStatus !== 'ACTIVE') return { status: 'FAILED', reason: 'COMPANY_NOT_ACTIVE' }

  const normalize = (name: string) => name.trim().toLocaleLowerCase('sv-SE')
  if (!company.authorizedSignatories.some((name) => normalize(name) === normalize(signatoryName))) {
    return { status: 'FAILED', reason: 'NOT_AUTHORIZED_SIGNATORY' }
  }
  return {
    status: 'COMPLETE',
    signedBy: signatoryName.trim(),
    signedAt: new Date().toISOString(),
    orderRef: `mock-sign-${Date.now()}`,
  }
}
