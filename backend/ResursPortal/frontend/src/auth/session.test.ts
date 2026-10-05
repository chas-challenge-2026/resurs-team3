import { beforeEach, describe, expect, it } from 'vitest'
import { clearMockSession, loadMockSession, saveMockSession } from './session'
import type { AdminUser, ClientUser } from './types'

const STORAGE_KEY = 'resurs.mockSession'

const adminUser: AdminUser = { role: 'admin', id: 'karin@resurs.se', name: 'Karin', email: 'karin@resurs.se' }
const clientUser: ClientUser = { role: 'client', id: '556000-1234', orgNumber: '556000-1234', companyName: 'Göteborg Handel AB' }

beforeEach(() => {
  sessionStorage.clear()
})

describe('saveMockSession / loadMockSession round trip', () => {
  it('restores an admin user exactly as saved', () => {
    saveMockSession(adminUser)
    expect(loadMockSession()).toEqual(adminUser)
  })

  it('restores a client user exactly as saved, including the optional field', () => {
    const withSignatory: ClientUser = { ...clientUser, authorizedSignatory: 'Anna Andersson' }
    saveMockSession(withSignatory)
    expect(loadMockSession()).toEqual(withSignatory)
  })

  it('returns null when nothing was saved', () => {
    expect(loadMockSession()).toBeNull()
  })
})

describe('clearMockSession', () => {
  it('removes a previously saved session', () => {
    saveMockSession(adminUser)
    clearMockSession()
    expect(loadMockSession()).toBeNull()
  })
})

// Phase 4 hardening: sessionStorage can hold anything (a stale format, a
// manual edit) — loadMockSession must not trust it blindly.
describe('loadMockSession — malformed data (Phase 4 hardening)', () => {
  it('treats invalid JSON as no session', () => {
    sessionStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadMockSession()).toBeNull()
  })

  it('rejects an object with an unknown role', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ role: 'superadmin', id: 'x' }))
    expect(loadMockSession()).toBeNull()
  })

  it('rejects an admin user missing a required field', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ role: 'admin', id: 'x', name: 'X' }))
    expect(loadMockSession()).toBeNull()
  })

  it('rejects a client user missing a required field', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ role: 'client', id: 'x', orgNumber: '556000-1234' }))
    expect(loadMockSession()).toBeNull()
  })

  it('rejects a bare string', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify('karin@resurs.se'))
    expect(loadMockSession()).toBeNull()
  })

  it('cleans up the malformed entry so it does not keep failing on every read', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ role: 'admin' }))
    loadMockSession()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
