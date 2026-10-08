import type { CreditApplicationData } from './creditApplication.types'

export type CompanyDetailsErrors = Partial<
  Record<'orgNumber' | 'companyName' | 'authorizedSignatory', string>
>

const SWEDISH_ORG_NUMBER_PATTERN = /^\d{6}-?\d{4}$/

export function validateCompanyDetails(
  data: CreditApplicationData,
): CompanyDetailsErrors {
  const errors: CompanyDetailsErrors = {}

  if (!data.orgNumber.trim()) {
    errors.orgNumber = 'Organisationsnummer måste anges.'
  } else if (!SWEDISH_ORG_NUMBER_PATTERN.test(data.orgNumber.trim())) {
    errors.orgNumber =
      'Ange ett giltigt organisationsnummer, till exempel 556000-1234.'
  }

  if (!data.companyName.trim()) {
    errors.companyName = 'Företagsnamn måste anges.'
  }

  if (!data.authorizedSignatory.trim()) {
    errors.authorizedSignatory = 'Firmatecknare måste anges.'
  }

  return errors
}