import type { AuthUser } from './types'

/**
 * Mock-only session persistence. There is no real backend session to
 * restore from yet — the backend's AuthService/BankIdService have no
 * /api/auth/* JSON endpoints, only session-based Thymeleaf-style checks.
 * This is a stand-in for a future HttpOnly/Secure/SameSite cookie session:
 * when that lands, swap this file out (loadMockSession/saveMockSession/
 * clearMockSession), not its callers.
 */
const STORAGE_KEY = 'resurs.mockSession'

/**
 * Idle timeout for the mock session (Phase 4). Mirrors the fact that the
 * real backend is HttpSession-based, so a session there also expires —
 * this is an arbitrary mock value, not read from anywhere server-side.
 */
export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000

/**
 * Narrows an unknown value to AuthUser at runtime. sessionStorage content
 * isn't type-checked by the browser — a previous app version, a manual
 * edit in devtools, or a future storage-format change could all leave
 * `raw` shaped differently than AuthUser. Without this, loadMockSession
 * would hand out a value TypeScript *believes* is a valid AuthUser but
 * isn't, and a bad `role` in particular would break the role branch in
 * AuthedRoot (App.tsx) and ProtectedRoute's allowedRoles check in ways
 * that are hard to trace back to "corrupted sessionStorage".
 */
function isValidAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>

  if (typeof candidate.id !== 'string' || candidate.id.length === 0) return false

  if (candidate.role === 'admin') {
    return typeof candidate.name === 'string' && typeof candidate.email === 'string'
  }

  if (candidate.role === 'client') {
    return (
      typeof candidate.orgNumber === 'string' &&
      typeof candidate.companyName === 'string' &&
      (candidate.authorizedSignatory === undefined ||
        typeof candidate.authorizedSignatory === 'string')
    )
  }

  return false
}

export function loadMockSession(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isValidAuthUser(parsed)) {
      // Malformed/tampered session — treat as logged out rather than
      // handing a bad shape to the rest of the app, and clean it up so
      // it doesn't keep failing this check on every reload.
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function saveMockSession(user: AuthUser) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    // sessionStorage unavailable (private mode, storage full, etc.) — the
    // session just won't survive a refresh; not worth failing login over.
  }
}

export function clearMockSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
