import type { AdminUser } from './types'

/**
 * Mock-only stand-in for AuthService.authenticateCaseWorker. There is no
 * /api/auth/* endpoint yet, so this simulates a network round trip (with a
 * short artificial delay) against a tiny hardcoded directory instead of
 * calling the real backend. Replace this function's body — not its
 * signature or callers — once a real endpoint exists.
 *
 * On the backend, this check is currently unsalted MD5 (AuthService.md5Hash)
 * with no real hashing on the client either way; the mock intentionally
 * doesn't pretend to be more secure than what it stands in for.
 */
const MOCK_CASE_WORKERS: Array<{ email: string; password: string; name: string }> = [
  { email: 'karin@resurs.se', password: 'password123', name: 'Karin Handläggare' },
]

const MOCK_LATENCY_MS = 500

export function authenticateAdminMock(email: string, password: string): Promise<AdminUser | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const match = MOCK_CASE_WORKERS.find(
        (worker) =>
          worker.email.toLowerCase() === email.trim().toLowerCase() && worker.password === password,
      )
      resolve(match ? { role: 'admin', id: match.email, name: match.name, email: match.email } : null)
    }, MOCK_LATENCY_MS)
  })
}
