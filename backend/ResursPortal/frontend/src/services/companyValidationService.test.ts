
import { describe, expect, it } from 'vitest'
import { startBankIdMock } from '../auth/mockBankId'
import { companyValidationService } from './companyValidationService'

// Expected fictional identities from infra/seed.sql.
const seedCompanies = [
  {
    orgNumber: '556000-1234',
    companyName: 'Malmö Fastigheter AB',
    authorizedSignatory: 'Anders Karlsson',
  },
  {
    orgNumber: '556000-5678',
    companyName: 'Göteborg Handel AB',
    authorizedSignatory: 'Maria Svensson',
  },
] as const

describe('Demo company identities', () => {
  it.each(seedCompanies)(
    'keeps BankID and registry consistent for $orgNumber',
    async ({ orgNumber, companyName, authorizedSignatory }) => {
      const [loginCompany, registryCompany] = await Promise.all([
        startBankIdMock(orgNumber),
        companyValidationService.lookup(orgNumber),
      ])

      expect(loginCompany).toEqual({
        orgNumber,
        companyName,
      })

      expect(registryCompany).toMatchObject({
        orgNumber,
        companyName,
        registrationStatus: 'ACTIVE',
        authorizedSignatories: [authorizedSignatory],
      })
    },
  )
})
