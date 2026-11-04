import { describe, expect, it } from 'vitest'
import { authenticateAdminMock } from './mockAdminDirectory'

describe('authenticateAdminMock', () => {
  it('resolves the case worker for a matching email and password', async () => {
    const user = await authenticateAdminMock('karin@resurs.se', 'password123')
    expect(user).toEqual({
      role: 'admin',
      id: 'karin@resurs.se',
      name: 'Karin Handläggare',
      email: 'karin@resurs.se',
    })
  })

  it('is case-insensitive and whitespace-tolerant on the email', async () => {
    const user = await authenticateAdminMock('  KARIN@resurs.se  ', 'password123')
    expect(user?.email).toBe('karin@resurs.se')
  })

  it('resolves null for a wrong password', async () => {
    const user = await authenticateAdminMock('karin@resurs.se', 'wrong-password')
    expect(user).toBeNull()
  })

  it('resolves null for an unknown email', async () => {
    const user = await authenticateAdminMock('nobody@resurs.se', 'password123')
    expect(user).toBeNull()
  })

  it('is case-sensitive on the password (never loosened alongside the email check)', async () => {
    const user = await authenticateAdminMock('karin@resurs.se', 'Password123')
    expect(user).toBeNull()
  })
})
