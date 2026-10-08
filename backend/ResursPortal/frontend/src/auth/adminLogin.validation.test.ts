import { describe, expect, it } from 'vitest'
import { validateAdminLogin } from './adminLogin.validation'

describe('validateAdminLogin', () => {
  it('returns no errors for a valid email and a non-empty password', () => {
    expect(validateAdminLogin({ email: 'karin@resurs.se', password: 'password123' })).toEqual({})
  })

  it('requires an email', () => {
    const errors = validateAdminLogin({ email: '', password: 'password123' })
    expect(errors.email).toBe('E-postadress måste anges.')
  })

  it('requires the email to look like an email', () => {
    const errors = validateAdminLogin({ email: 'not-an-email', password: 'password123' })
    expect(errors.email).toBe('Ange en giltig e-postadress.')
  })

  it('requires a password', () => {
    const errors = validateAdminLogin({ email: 'karin@resurs.se', password: '' })
    expect(errors.password).toBe('Lösenord måste anges.')
  })

  it('reports both fields independently when both are invalid', () => {
    const errors = validateAdminLogin({ email: '', password: '' })
    expect(errors.email).toBeDefined()
    expect(errors.password).toBeDefined()
  })

  it('trims whitespace before checking the email format', () => {
    expect(validateAdminLogin({ email: '  karin@resurs.se  ', password: 'x' })).toEqual({})
  })
})
