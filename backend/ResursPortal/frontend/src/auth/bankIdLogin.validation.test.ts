import { describe, expect, it } from 'vitest'
import { validateBankIdLogin } from './bankIdLogin.validation'

describe('validateBankIdLogin', () => {
  it('accepts a hyphenated Swedish org number', () => {
    expect(validateBankIdLogin({ orgNumber: '556000-1234' })).toEqual({})
  })

  it('accepts the same org number without the hyphen', () => {
    expect(validateBankIdLogin({ orgNumber: '5560001234' })).toEqual({})
  })

  it('requires an org number', () => {
    const errors = validateBankIdLogin({ orgNumber: '' })
    expect(errors.orgNumber).toBe('Organisationsnummer måste anges.')
  })

  it('rejects the wrong number of digits', () => {
    const errors = validateBankIdLogin({ orgNumber: '123-456' })
    expect(errors.orgNumber).toBe('Ange ett giltigt organisationsnummer, till exempel 556000-1234.')
  })

  it('rejects non-numeric input', () => {
    const errors = validateBankIdLogin({ orgNumber: 'abcdef-ghij' })
    expect(errors.orgNumber).toBeDefined()
  })
})
