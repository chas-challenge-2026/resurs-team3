import type { CreditApplicationData } from './creditApplication.types'
import type { CompanyValidationResult } from '../../types/case'
import { companyBlockReason } from '../../services/companyValidationService'

export type CompanyDetailsErrors = Partial<
  Record<'orgNumber' | 'companyName' | 'authorizedSignatory' | 'companyStatus' | 'industry', string>
>

const SWEDISH_ORG_NUMBER_PATTERN = /^\d{6}-?\d{4}$/

/** Luhn check over the 10 digits of a Swedish organisationsnummer. */
export function hasValidOrgNumberChecksum(orgNumber: string): boolean {
  const digits = orgNumber.replace('-', '')
  let sum = 0
  for (let i = 0; i < digits.length; i += 1) {
    let d = Number(digits[i]) * (i % 2 === 0 ? 2 : 1)
    if (d > 9) d -= 9
    sum += d
  }
  return sum % 10 === 0
}

/**
 * `checkOrgNumberChecksum` is off when the org number came from the BankID
 * login: it is already the authenticated company (and the mock test
 * companies use placeholder numbers that would not pass the checksum).
 */
export function validateCompanyDetails(
  data: CreditApplicationData,
  { checkOrgNumberChecksum = true }: { checkOrgNumberChecksum?: boolean } = {},
): CompanyDetailsErrors {
  const errors: CompanyDetailsErrors = {}

  if (!data.orgNumber.trim()) {
    errors.orgNumber = 'Ange organisationsnummer.'
  } else if (!SWEDISH_ORG_NUMBER_PATTERN.test(data.orgNumber.trim())) {
    errors.orgNumber =
      'Ange organisationsnumret med 10 siffror, till exempel 556000-1234.'
  } else if (checkOrgNumberChecksum && !hasValidOrgNumberChecksum(data.orgNumber.trim())) {
    errors.orgNumber = 'Organisationsnumret stämmer inte. Kontrollera siffrorna mot registreringsbeviset.'
  }

  if (!data.companyName.trim()) {
    errors.companyName = 'Ange företagsnamn.'
  }

  if (!data.authorizedSignatory.trim()) {
    errors.authorizedSignatory = 'Välj vem som signerar ansökan.'
  }

  if (!data.industry) {
    errors.industry = 'Välj företagets bransch.'
  }

  return errors
}

/**
 * Step 1 also depends on the company-register check: the company must be
 * active, and the signatory must be one of its registered firmatecknare.
 * `check` is null while the lookup is still running.
 */
export function validateCompanyCheck(
  data: CreditApplicationData,
  check: CompanyValidationResult | null,
): CompanyDetailsErrors {
  if (!check) return { companyStatus: 'Vänta tills kontrollen av företaget är klar.' }
  const blocked = companyBlockReason(check)
  if (blocked) return { companyStatus: blocked }
  const name = data.authorizedSignatory.trim().toLocaleLowerCase('sv-SE')
  if (name && !check.authorizedSignatories.some((n) => n.toLocaleLowerCase('sv-SE') === name)) {
    return { authorizedSignatory: 'Välj en firmatecknare som är registrerad för företaget.' }
  }
  return {}
}
