# Wizard — validation & type wiring

This covers the application wizard's validation module structure and a set
of compile-time mismatches found while wiring `WizardPage.tsx` up to the
rest of the credit-application feature and the backoffice. None of it
changes behavior for anything that was already working — it's entirely
"the types/imports didn't match what the code actually needed."

## Status

**All fixed, not committed.** Everything below is sitting as uncommitted
working-tree state on `feature/application-wizard`, alongside the rest of
last week's wizard/backoffice work. `tsc -p tsconfig.app.json`, `eslint`,
and the full `vitest` suite are all clean as of this write-up.

## Bug 1 — WizardPage.tsx imported a validation module that doesn't exist

**Symptom:** vite's dev server and `tsc` both failed on the same line:

```
Failed to resolve import "../../features/credit-application/creditApplication.validation" from "src/pages/wizard/WizardPage.tsx".
```

**Cause:** there is no `creditApplication.validation.ts`. The real
validators live in two separate files, `creditDetails.validation.ts` and
`financialMetrics.validation.ts` — and the names `WizardPage.tsx` tried to
import (`validateCreditRequest`, `CreditRequestErrors`, `FinancialErrors`)
didn't match what those files actually export either
(`validateCreditDetails`/`CreditDetailsErrors`, `FinancialMetricsErrors`).

**Fix:** split the one broken import into two correct ones, and renamed
every local usage (the two `useState` declarations and both
`validateCreditRequest(...)` call sites) to match the real names.

## Bug 2 — companyDetails.validation.ts only had one combined validator

**Symptom:** `validateCompanyIdentity` and `validateSignatory`, both used
in `WizardPage.tsx`, didn't exist anywhere.

**Cause:** the module exported a single `validateCompanyDetails`, checking
org number, company name, and authorized signatory all together. But the
wizard validates these on two different steps — identity on step 1, the
signatory on step 4 — so it needs them as two separate functions.

**Fix:** split `validateCompanyDetails` into `validateCompanyIdentity`
(org number + company name) and `validateSignatory` (authorized
signatory). Both still return the same `CompanyDetailsErrors` shape, since
that type is the shared error-state object both steps' UI already read
from.

## Bug 3 — CreditApplicationData was missing two fields WizardPage.tsx relies on

**Symptom:**

```
error TS2353: Object literal may only specify known properties, and 'financialYear' does not exist in type 'CreditApplicationData'.
error TS2339: Property 'repaymentTerm' does not exist on type 'CreditApplicationData'.
```

**Cause:** `WizardPage.tsx` sets defaults for `financialYear` and
`repaymentTerm` and uses them in the confirm-dialog summary and the loan
repayment estimate — but neither field was ever declared on
`CreditApplicationData`. Neither is bound to an actual form input anywhere
(no step component reads or writes them); they're fixed defaults used
purely for display and calculation.

**Fix:** added both fields to `CreditApplicationData` in
`creditApplication.types.ts`.

## Bug 4 — backoffice's decide() was called with an extra argument

**Symptom:** `error TS2554: Expected 3 arguments, but got 4.` in
`BackofficeLayout.tsx`.

**Cause:** `handleDecision` computes an `actor` (whoever's signed in) and
calls `decide(id, status, comment, actor)`, but `CasesContextValue.decide`
only accepted 3 parameters — and the reducer had `'Karin Handläggare'`
hardcoded as the decider on every decision, regardless of who was
actually signed in.

**Fix:** added `actor: string` as `decide`'s 4th parameter in
`cases-context.ts`, and threaded it through `CasesContext.tsx`'s `DECIDE`
action into both the audit-trail entry and `decidedBy`, replacing the
hardcoded name.

## Bug 5 — CreditCase/FinancialMetrics were missing two fields CaseReviewPanel reads

**Symptom:**

```
error TS2339: Property 'termMonths' does not exist on type 'CreditCase'.
error TS2339: Property 'reportingPeriod' does not exist on type 'FinancialMetrics'.
```

**Cause:** `CaseReviewPanel.tsx` displays a case's loan term and its
financial figures' reporting period, with Swedish fallback text for when
either is missing ("Ej angiven" / "Rapporteringsperiod saknas") — but
neither field existed on the shared types at all.

**Fix:** added `termMonths?: number` to `CreditCase` and
`reportingPeriod?: string` to `FinancialMetrics`, both optional since the
mock seed data (`mockCases.ts`) doesn't set either and wasn't touched.

## Bug 6 — NotificationsView called a markNotificationRead(id) that didn't exist

**Symptom:** `error TS2339: Property 'markNotificationRead' does not
exist on type 'CasesContextValue'.`

**Cause:** only the bulk `markNotificationsRead()` existed. Opening a
single notification needs to mark just that one as read, not the whole
list.

**Fix:** added a `MARK_NOTIFICATION_READ` action and a
`markNotificationRead(id)` context method alongside the existing bulk
one, in both `cases-context.ts` and `CasesContext.tsx`.

## Closing the loop — the mapper never set either new field

Fixing bugs 3 and 5 made everything compile, but left a silent gap: a
submitted application still showed "Ej angiven" / "Rapporteringsperiod
saknas" on the backoffice side, because `creditApplication.mapper.ts`'s
`toCaseSubmission` never actually read `data.financialYear` or
`data.repaymentTerm` into the objects it builds. Fixed by setting
`financials.reportingPeriod` from `financialYear` and
`creditRequest.termMonths` from `repaymentTerm` in the mapper, and having
`CasesContext.tsx`'s `addCase` convert that string `repaymentTerm` into
the number `CreditCase.termMonths` expects.

## A note on Bug 1 recurring mid-fix

After Bug 1 was fixed once, the exact same broken import reappeared
verbatim in `WizardPage.tsx` later in the same session, with none of the
other fixes affected. The likely cause: switching branches (to
`feature/application-wizard`) while the fix was still uncommitted — if
that branch's own last-committed version of the file predates the fix,
checking it out can silently carry the old content back into the working
tree over an uncommitted edit. Re-applying the same fix resolved it a
second time. Worth remembering: re-verify `WizardPage.tsx`'s import block
specifically after any branch switch, before assuming a fix made earlier
in the session is still there.

## What's still open

- Nothing here is committed yet. It's uncommitted working-tree state on
  `feature/application-wizard`, same as the rest of last week's wizard/
  backoffice work — it'll need its own commit(s) once that group is
  scoped out.
- Several other backoffice files showed as modified in `git status`
  (`BackofficeTopBar`, `DashboardView`, `QueueTable`, `DecisionLog`,
  `OverviewPage`, `DocumentsPage`) but weren't touched by any of the fixes
  above. The whole project typechecks and lints clean right now, which is
  a good sign, but given Bug 1's recurrence, it's worth a second look at
  those files' actual on-disk content before committing, rather than
  assuming they're untouched.
