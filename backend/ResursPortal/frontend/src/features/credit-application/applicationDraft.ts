import type { CreditApplicationData } from './creditApplication.types'

const STORAGE_PREFIX = 'resurs-credit-application-draft:'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const keyFor = (userId: string) => `${STORAGE_PREFIX}${userId}`

interface StoredDraft {
  userId: string
  step: number
  /** Furthest step the applicant has reached; earlier drafts lack it. */
  maxStep?: number
  /** ISO time of the last save; drafts older than 7 days are dropped. */
  savedAt?: string
  data: CreditApplicationData
}

/**
 * The in-progress application lives in localStorage, one entry per logged-in
 * user: it survives closing the tab or the browser, so a signatory can stop
 * between meetings and continue later. It is only restored after the same
 * user logs in again, expires after 7 days, and is cleared on submit,
 * restart and logout.
 */
export function loadApplicationDraft(userId: string, fallback: CreditApplicationData): StoredDraft | null {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredDraft>
    if (parsed.userId !== userId || typeof parsed.step !== 'number' || !parsed.data) return null
    const savedAt = typeof parsed.savedAt === 'string' ? parsed.savedAt : undefined
    if (!savedAt || Date.now() - new Date(savedAt).getTime() > MAX_AGE_MS) {
      localStorage.removeItem(keyFor(userId))
      return null
    }
    // Only keep known string fields, so an older or tampered draft can't
    // inject unexpected shapes into the form.
    const data = { ...fallback }
    for (const key of Object.keys(fallback) as Array<keyof CreditApplicationData>) {
      const value = (parsed.data as Record<string, unknown>)[key]
      if (typeof value === 'string') data[key] = value
    }
    const clamp = (n: number) => Math.min(Math.max(Math.trunc(n), 1), 4)
    const step = clamp(parsed.step)
    const maxStep = typeof parsed.maxStep === 'number' ? Math.max(clamp(parsed.maxStep), step) : step
    return { userId, step, maxStep, savedAt, data }
  } catch {
    return null
  }
}

export function saveApplicationDraft(draft: StoredDraft): void {
  try {
    localStorage.setItem(keyFor(draft.userId), JSON.stringify({ ...draft, savedAt: new Date().toISOString() }))
  } catch {
    // Storage unavailable (private mode, quota) — the form still works,
    // the draft just won't survive leaving the page.
  }
}

/** Without a user id (logout), every stored draft is removed. */
export function clearApplicationDraft(userId?: string): void {
  try {
    if (userId) {
      localStorage.removeItem(keyFor(userId))
      return
    }
    Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key))
    sessionStorage.removeItem('resurs-credit-application-draft') // pre-localStorage drafts
  } catch {
    // ignore
  }
}
