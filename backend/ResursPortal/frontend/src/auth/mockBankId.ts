export interface MockBankIdCompany {
  orgNumber: string
  companyName: string
}

// Mirrors the seed-data companies in README.md's test-login table, not just
// a single hardcoded name — so the confirmation screen actually reflects
// whichever org number was entered.
const MOCK_COMPANIES: MockBankIdCompany[] = [
  { orgNumber: '556000-1234', companyName: 'Göteborg Handel AB' },
  { orgNumber: '556000-5678', companyName: 'Malmö Fastigheter AB' },
]

const START_LATENCY_MS = 400
const CONFIRM_LATENCY_MS = 600

/**
 * Mock stand-in for the backend's org-number allowlist check — currently
 * AuthService.isAllowedCompanyOrgNumber via AuthController.loginCompany,
 * meant to move to BankIdService.authenticateCompany per #6 (unconfirmed
 * whether that's landed yet). Simulates the round trip to *start* a BankID
 * session: does this org number belong to a known company at all.
 */
export function startBankIdMock(orgNumber: string): Promise<MockBankIdCompany | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const match = MOCK_COMPANIES.find((c) => c.orgNumber === orgNumber.trim())
      resolve(match ?? null)
    }, START_LATENCY_MS)
  })
}

/**
 * The "user confirmed in the BankID app" step. There's no real phone app or
 * BankID SDK here, and per the dev on #6 there's no backend polling
 * endpoint either — so this is a manually-triggered mock (see
 * BankIdLoginForm's "Jag har bekräftat" button) rather than an automatic
 * poll loop. Keeps a short artificial delay so the confirming state has
 * something real to show rather than resolving instantly.
 */
export function confirmBankIdMock(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, CONFIRM_LATENCY_MS))
}
