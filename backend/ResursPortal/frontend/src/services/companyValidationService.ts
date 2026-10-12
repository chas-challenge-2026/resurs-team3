import type { CompanyValidationResult } from '../types/case'

/**
 * CompanyValidationService (v2-targets: "Extern företagsvalidering som egen
 * service"). The wizard and backoffice only depend on this interface; the
 * mock below stands in for a real company-register lookup and can be
 * swapped for an HTTP client against the backend without touching the UI.
 */
export interface CompanyValidationService {
  lookup(orgNumber: string): Promise<CompanyValidationResult>
}

type RegistryEntry = Omit<CompanyValidationResult, 'orgNumber' | 'validatedAt'>

// Mock register. Covers the BankID test logins and the seed cases.
const REGISTRY: Record<string, RegistryEntry> = {
  '556000-1234': { companyName: 'Göteborg Handel AB', registrationStatus: 'ACTIVE', vatRegistered: true, fSkattRegistered: true, authorizedSignatories: ['Anna Andersson', 'Johan Berg'] },
  '556000-5678': { companyName: 'Malmö Fastigheter AB', registrationStatus: 'ACTIVE', vatRegistered: true, fSkattRegistered: true, authorizedSignatories: ['Sara Nilsson', 'Anna Andersson'] },
  '556012-3344': { companyName: 'Stockholm Tech AB', registrationStatus: 'ACTIVE', vatRegistered: true, fSkattRegistered: true, authorizedSignatories: ['Johan Berg'] },
  '556098-7621': { companyName: 'Norrland Logistik AB', registrationStatus: 'ACTIVE', vatRegistered: true, fSkattRegistered: true, authorizedSignatories: ['Erik Lindqvist'] },
  '559034-1122': { companyName: 'Västkust Design AB', registrationStatus: 'ACTIVE', vatRegistered: true, fSkattRegistered: true, authorizedSignatories: ['Maria Ström'] },
  '556077-4455': { companyName: 'Skåne Verkstad AB', registrationStatus: 'ACTIVE', vatRegistered: true, fSkattRegistered: true, authorizedSignatories: ['Peter Nilsson'] },
  '556145-9988': { companyName: 'Dalarna Trä AB', registrationStatus: 'ACTIVE', vatRegistered: true, fSkattRegistered: true, authorizedSignatories: ['Sara Holm'] },
}

const LOOKUP_LATENCY_MS = 500

export const mockCompanyValidationService: CompanyValidationService = {
  lookup(orgNumber) {
    const key = orgNumber.trim()
    return new Promise((resolve) => {
      setTimeout(() => {
        const entry = REGISTRY[key]
        resolve({
          orgNumber: key,
          companyName: entry?.companyName ?? '',
          registrationStatus: entry?.registrationStatus ?? 'NOT_FOUND',
          vatRegistered: entry?.vatRegistered ?? false,
          fSkattRegistered: entry?.fSkattRegistered ?? false,
          authorizedSignatories: entry?.authorizedSignatories ?? [],
          validatedAt: new Date().toISOString(),
        })
      }, LOOKUP_LATENCY_MS)
    })
  },
}

/** The implementation the app uses. Swap here for a real client. */
export const companyValidationService: CompanyValidationService = mockCompanyValidationService

/** Applicant-facing reason a company can't apply, or null if it can. */
export function companyBlockReason(result: CompanyValidationResult): string | null {
  switch (result.registrationStatus) {
    case 'ACTIVE':
      return null
    case 'UNDER_LIQUIDATION':
      return 'Företaget är under likvidation och kan därför inte ansöka om kredit.'
    case 'INACTIVE':
      return 'Företaget är inte längre registrerat som aktivt och kan därför inte ansöka om kredit.'
    default:
      return 'Vi hittar inte företaget i företagsregistret. Kontrollera organisationsnumret.'
  }
}
