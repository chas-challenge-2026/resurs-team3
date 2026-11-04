export type BankIdLoginErrors = Partial<Record<'orgNumber', string>>

export interface BankIdLoginValues {
  orgNumber: string
}

// Same pattern as companyDetails.validation.ts — Swedish org numbers,
// hyphen optional.
const SWEDISH_ORG_NUMBER_PATTERN = /^\d{6}-?\d{4}$/

export function validateBankIdLogin(values: BankIdLoginValues): BankIdLoginErrors {
  const errors: BankIdLoginErrors = {}

  if (!values.orgNumber.trim()) {
    errors.orgNumber = 'Organisationsnummer måste anges.'
  } else if (!SWEDISH_ORG_NUMBER_PATTERN.test(values.orgNumber.trim())) {
    errors.orgNumber = 'Ange ett giltigt organisationsnummer, till exempel 556000-1234.'
  }

  return errors
}
