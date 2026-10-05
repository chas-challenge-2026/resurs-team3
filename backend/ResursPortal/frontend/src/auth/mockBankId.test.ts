import { describe, expect, it } from 'vitest'
import { confirmBankIdMock, startBankIdMock } from './mockBankId'

describe('startBankIdMock', () => {
  it('resolves the matching company for a known org number', async () => {
    const company = await startBankIdMock('556000-1234')
    expect(company).toEqual({ orgNumber: '556000-1234', companyName: 'Göteborg Handel AB' })
  })

  it('resolves a different known org number to its own company', async () => {
    const company = await startBankIdMock('556000-5678')
    expect(company).toEqual({ orgNumber: '556000-5678', companyName: 'Malmö Fastigheter AB' })
  })

  it('resolves null for an org number that is not in the mock directory', async () => {
    const company = await startBankIdMock('999999-9999')
    expect(company).toBeNull()
  })

  it('trims whitespace before matching', async () => {
    const company = await startBankIdMock('  556000-1234  ')
    expect(company?.companyName).toBe('Göteborg Handel AB')
  })
})

describe('confirmBankIdMock', () => {
  it('resolves (simulating a confirmed BankID session)', async () => {
    await expect(confirmBankIdMock()).resolves.toBeUndefined()
  })
})
