import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/Icon'
import { useCases } from '../../context/useCases'
import type { CompanyValidationResult } from '../../types/case'
import { BankIdMark } from '../../components/BankIdMark'
import { companyValidationService } from '../../services/companyValidationService'
import { signApplication } from '../../features/credit-application/bankIdSigning'
import { CompanyDetailsStep } from '../../features/credit-application/steps/CompanyDetailsStep'
import { FinancialMetricsStep } from '../../features/credit-application/steps/FinancialMetricsStep'
import { CreditDetailsStep } from '../../features/credit-application/steps/CreditDetailsStep'
import type { CreditApplicationData } from '../../features/credit-application/creditApplication.types'
import { noFiguresEntered, validateCreditRequest, validateFinancialMetrics, type CreditRequestErrors, type FinancialErrors } from '../../features/credit-application/creditApplication.validation'
import {
  validateCompanyDetails,
  validateCompanyCheck,
  type CompanyDetailsErrors,
} from '../../features/credit-application/companyDetails.validation'
import { clearApplicationDraft, loadApplicationDraft, saveApplicationDraft } from '../../features/credit-application/applicationDraft'
import { toCaseSubmission } from '../../features/credit-application/creditApplication.mapper'
import { StepTabs } from './StepTabs'
import { SCORING_THRESHOLDS } from '../../utils/scoring'
import { SigningView } from './SigningView'
import { applicationStatusPath } from '../status/applicationProgress'
import { STEPS } from './steps'
import { joinClassNames } from '../../lib/joinClassNames'
import styles from './WizardPage.module.css'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { parseWizardStep, wizardStepPath } from '../../routes'

const TOTAL_STEPS = 4

// Step 2 figure names for the short "X saknas" summary items.
const FIGURE_LABEL: Record<string, string> = {
  netSales: 'Nettoomsättning',
  operatingProfit: 'Rörelseresultat',
  interestExpenses: 'Räntekostnader',
  currentAssets: 'Omsättningstillgångar',
  totalCapital: 'Balansomslutning',
  equity: 'Eget kapital',
  shortTermLiabilities: 'Kortfristiga skulder',
  longTermLiabilities: 'Långfristiga skulder',
  operatingCashFlow: 'Operativt kassaflöde',
  investingCashFlow: 'Investeringskassaflöde',
}

const initialApplicationData: CreditApplicationData = {
  orgNumber: '',
  companyName: '',
  authorizedSignatory: '',
  financialYear: String(new Date().getFullYear() - 1),
  industry: '',
  equity: '',
  totalCapital: '',
  currentAssets: '',
  shortTermLiabilities: '',
  longTermLiabilities: '',
  operatingProfit: '',
  netSales: '',
  operatingCashFlow: '',
  investingCashFlow: '',
  noCashFlowStatement: '',
  interestExpenses: '',
  requestedAmount: '',
  repaymentTerm: '36',
  purpose: '',
}

function createInitialApplicationData(user: ReturnType<typeof useAuth>['user']): CreditApplicationData {
  return {
    ...initialApplicationData,
    orgNumber: user?.role === 'client' ? user.orgNumber : '',
    companyName: user?.role === 'client' ? user.companyName : '',
    authorizedSignatory: user?.role === 'client' ? user.authorizedSignatory ?? '' : '',
  }
}

/**
 * The applicant-facing credit application flow. The step chrome (top bar,
 * step tabs, panel) is carried over from the resurs-direkt-app wireframes;
 * the field logic underneath is unchanged from features/credit-application —
 * one flat useState instead of that project's ApplicationContext/reducer.
 *
 * The panel/tabs/dialog visual treatment (white panel, ink text, pill
 * fields/buttons, focus-on-content-change, animated transitions) mirrors
 * LoginPage's rework — see WizardPage.module.css's .wizardShell for the
 * shared CSS-custom-property scope that makes this possible without
 * touching TextField/Button's own dark-panel-oriented defaults.
 *
 * Submitting now mirrors the other project's wiring too: addCase() (from
 * CasesContext) runs the same ScoringService the backoffice queue trusts
 * and drops the resulting case straight into it, so a submitted application
 * shows up in the caseworker dashboard exactly like a real POST /apply would.
 */

const INDUSTRY_LABEL: Record<string, string> = {
  BYGG: 'Bygg', FASTIGHET: 'Fastighet', FINANS: 'Finans', HANDEL: 'Handel', IT: 'IT', RESTAURANG: 'Restaurang',
  TILLVERKNING: 'Tillverkning', TRANSPORT: 'Transport', UTBILDNING: 'Utbildning', VÅRD: 'Vård', OTHER: 'Annan bransch',
}

/** Invalid fields, plus error messages that stand in for a field (the
 * company check), in document order. */
const ERROR_TARGETS = '[aria-invalid="true"], [data-error-target="true"]'

/** "5560001234" or "556000-1234" → "556000-1234"; null if not 10 digits. */
function normalizedOrgNumber(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 ? `${digits.slice(0, 6)}-${digits.slice(6)}` : null
}

export function WizardPage() {
  const { user } = useAuth()
  const { addCase } = useCases()
  const navigate = useNavigate()
  // Resume an in-progress application from this tab, if there is one.
  const [restoredDraft] = useState(() => (user ? loadApplicationDraft(user.id, createInitialApplicationData(user)) : null))
  const [showRestoredNotice, setShowRestoredNotice] = useState(Boolean(restoredDraft))
  const [currentStep, setCurrentStep] = useState(restoredDraft?.step ?? 1)
  const [maxReachedStep, setMaxReachedStep] = useState(restoredDraft?.maxStep ?? restoredDraft?.step ?? 1)
  // Set when the applicant jumps back from the review via "Ändra", so the
  // primary action becomes "Tillbaka till granskning" instead of Nästa.
  const [editingFromReview, setEditingFromReview] = useState(false)

  // The step is mirrored in the URL (/kreditansokan/steg-2), one history entry per step,
  // so the browser's and the phone's Back go to the previous step instead
  // of leaving the wizard. State stays the source of truth; the URL follows
  // it, and a URL change from history (Back/Forward) is applied to it below.
  const { steg } = useParams()
  const urlStep = parseWizardStep(steg, TOTAL_STEPS)
  const [seenUrlStep, setSeenUrlStep] = useState(urlStep)
  const [confirmingRestart, setConfirmingRestart] = useState(false)
  // The signatory's attestation, given first thing in the signing view.
  // Deliberately not part of the saved draft: after a restore or an "Ändra"
  // round trip they confirm again against the figures as they are now.
  const [attested, setAttested] = useState(false)
  // Step 2 submitted with no figures at all (see showStepErrors).
  const [showFiguresPrompt, setShowFiguresPrompt] = useState(false)
  const [applicationData, setApplicationData] = useState<CreditApplicationData>(() => restoredDraft?.data ?? createInitialApplicationData(user))
  // BankID login already established which company is applying, so step 1
  // shows that identity as facts instead of asking for it again.
  // Company-register check for the org number being applied for. Results
  // are kept per org number, so a stale lookup never counts for a new one.
  const [companyCheck, setCompanyCheck] = useState<CompanyValidationResult | null>(null)
  const identityFromLogin = user?.role === 'client' && Boolean(user.orgNumber && user.companyName)
  const orgToCheck = normalizedOrgNumber(applicationData.orgNumber)
  const currentCompanyCheck = companyCheck && companyCheck.orgNumber === orgToCheck ? companyCheck : null

  useEffect(() => {
    if (!orgToCheck) return
    let cancelled = false
    companyValidationService.lookup(orgToCheck).then((result) => {
      if (!cancelled) setCompanyCheck(result)
    })
    return () => {
      cancelled = true
    }
  }, [orgToCheck])

  function companyErrorsFor(data: CreditApplicationData): CompanyDetailsErrors {
    const base = validateCompanyDetails(data, { checkOrgNumberChecksum: !identityFromLogin })
    const org = normalizedOrgNumber(data.orgNumber)
    if (!org || base.orgNumber) return base
    const check = companyCheck && companyCheck.orgNumber === org ? companyCheck : null
    const errors: CompanyDetailsErrors = { ...validateCompanyCheck(data, check), ...base }
    // Without a check result (still running) or for a blocked company there
    // is no signatory choice on screen, so don't point the summary at one.
    if (errors.companyStatus) delete errors.authorizedSignatory
    return errors
  }
  const [signingState, setSigningState] = useState<'idle' | 'awaiting' | 'signing'>('idle')
  const [signingError, setSigningError] = useState<{ message: string; fixStep?: number } | undefined>()
  const signingPanelRef = useRef<HTMLHeadingElement>(null)
  const signingErrorRef = useRef<HTMLDivElement>(null)
  const [financialErrors, setFinancialErrors] = useState<FinancialErrors>({})
  const [creditErrors, setCreditErrors] = useState<CreditRequestErrors>({})
  const [validatedSteps, setValidatedSteps] = useState<number[]>([])
  const companyDetailsErrors: CompanyDetailsErrors = validatedSteps.includes(1) ? companyErrorsFor(applicationData) : {}
  // Set once signing has created the case; the status page takes over from
  // here, so this only stops the draft from being saved again on the way out.
  const [submitted, setSubmitted] = useState(false)
  // The tab title names the step, so it is read out on each step change.
  useDocumentTitle(
    submitted ? false : `Steg ${currentStep} av ${TOTAL_STEPS}: ${signingState !== 'idle' ? 'Signera' : STEPS[currentStep - 1]?.label}`,
    'Ansök om företagskredit',
  )
  const [showErrorSummary, setShowErrorSummary] = useState(false)

  const formStepRef = useRef<HTMLFormElement>(null)
  const pageIntroRef = useRef<HTMLDivElement>(null)
  // True while an on-screen keyboard leaves little room: the sticky action
  // bar then scrolls with the form instead of covering a third of it.
  const [shortViewport, setShortViewport] = useState(false)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => setShortViewport(viewport.height < 560)
    update()
    viewport.addEventListener('resize', update)
    return () => viewport.removeEventListener('resize', update)
  }, [])
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const submittingRef = useRef(false)
  // Step the focus effect last handled; compared instead of a "first render"
  // flag so StrictMode's double effect run doesn't count as a step change.
  const lastFocusedStepRef = useRef<number | null>(null)
  // Set when a step change happens *because* of errors on the new step, so
  // focus lands on those errors instead of the step container.
  const focusErrorsAfterStepChangeRef = useRef(false)

  // Same reasoning as LoginPage's intro→login focus effect: switching steps
  // swaps the visible form content, so keyboard/screen-reader users need to
  // land on the new step instead of staying wherever the old "Nästa"/
  // "Tillbaka" button used to be. Skips the very first render (step 1 on
  // initial mount) since nothing changed yet.
  useEffect(() => {
    const previousStep = lastFocusedStepRef.current
    lastFocusedStepRef.current = currentStep
    if (previousStep === null || previousStep === currentStep) return
    if (focusErrorsAfterStepChangeRef.current) {
      focusErrorsAfterStepChangeRef.current = false
      focusFirstError()
      return
    }
    // The page scrolls, so bring the title, progress and the new step's
    // heading to the top instead of leaving the view mid-page.
    formStepRef.current?.focus({ preventScroll: true })
    pageIntroRef.current?.scrollIntoView({ block: 'start' })
  }, [currentStep])

  // State → URL. Arriving without ?steg, or with a step not reached yet,
  // replaces the entry; every step change made in the wizard adds one.
  useEffect(() => {
    if (submitted || urlStep === currentStep) return
    const replace = urlStep === null || urlStep > maxReachedStep
    navigate(wizardStepPath(currentStep), { replace })
  }, [currentStep, urlStep, maxReachedStep, submitted, navigate])

  // Keep the draft in this tab so leaving the page (or a reload) doesn't
  // lose the applicant's figures. An untouched form isn't a draft.
  useEffect(() => {
    if (!user || submitted) return
    const untouched = JSON.stringify(applicationData) === JSON.stringify(createInitialApplicationData(user))
    if (untouched && currentStep === 1) return
    saveApplicationDraft({ userId: user.id, step: currentStep, maxStep: maxReachedStep, data: applicationData })
  }, [user, applicationData, currentStep, maxReachedStep, submitted])

function handleChange(field: keyof CreditApplicationData, value: string) {
  const updatedData = {
    ...applicationData,
    [field]: value,
  }

  setApplicationData(updatedData)
  if (showFiguresPrompt && field !== 'financialYear' && value.trim()) setShowFiguresPrompt(false)

  if (validatedSteps.includes(currentStep)) {
    if (currentStep === 2) setFinancialErrors(validateFinancialMetrics(updatedData))
    if (currentStep === 3) setCreditErrors(validateCreditRequest(updatedData))
  } else if (field === 'requestedAmount' && creditErrors.requestedAmount) {
    setCreditErrors({ ...creditErrors, requestedAmount: validateCreditRequest(updatedData).requestedAmount })
  }
}

/** An amount outside the range is said when the applicant leaves the
 * field, not first when they press Nästa. An empty field stays quiet. */
function checkAmountOnBlur() {
  if (!applicationData.requestedAmount.trim()) return
  setCreditErrors((errors) => ({ ...errors, requestedAmount: validateCreditRequest(applicationData).requestedAmount }))
}

function handleChangeMany(updates: Partial<Record<keyof CreditApplicationData, string>>) {
  const updatedData = { ...applicationData, ...updates }
  setApplicationData(updatedData)
  if (validatedSteps.includes(2)) setFinancialErrors(validateFinancialMetrics(updatedData))
}

  /** Pure check of one step against the current data (no UI side effects). */
  function validationErrorsFor(step: number): Record<string, string> {
    if (step === 1) return companyErrorsFor(applicationData) as Record<string, string>
    if (step === 2) return validateFinancialMetrics(applicationData) as Record<string, string>
    if (step === 3) return validateCreditRequest(applicationData) as Record<string, string>
    return {}
  }

  /** Shows a step's errors and moves focus: the summary when there are
   * several, the field itself when there is one. */
  function focusFirstError() {
    const invalidCount = document.querySelectorAll(ERROR_TARGETS).length
    // Empty step 2: the prompt is announced (role=alert) and focus goes
    // straight to where to start typing.
    if (invalidCount === 0 && document.getElementById('figures-prompt')) {
      document.getElementById('field-netSales')?.focus()
      return
    }
    if (invalidCount > 1 && errorSummaryRef.current) errorSummaryRef.current.focus()
    else document.querySelector<HTMLElement>(ERROR_TARGETS)?.focus()
  }

  function showStepErrors(step: number) {
    // Nothing entered yet on step 2: one pointer to where to start instead
    // of ten "Ange …" errors. The step isn't marked validated, so typing
    // the first figure doesn't make the other nine light up.
    if (step === 2 && noFiguresEntered(applicationData)) {
      setFinancialErrors({})
      setShowErrorSummary(false)
      setShowFiguresPrompt(true)
      if (step !== currentStep) focusErrorsAfterStepChangeRef.current = true
      else requestAnimationFrame(focusFirstError)
      return
    }
    setShowFiguresPrompt(false)
    setValidatedSteps((steps) => (steps.includes(step) ? steps : [...steps, step]))
    const errors = validationErrorsFor(step)
    if (step === 2) setFinancialErrors(errors)
    if (step === 3) setCreditErrors(errors)
    setShowErrorSummary(true)
    if (step !== currentStep) {
      // The step-change effect will focus the errors once the step renders.
      focusErrorsAfterStepChangeRef.current = true
    } else {
      requestAnimationFrame(focusFirstError)
    }
  }

  /** First step before `target` whose data is invalid right now, if any.
   * Any step can change after it was first passed (via tabs or "Ändra"),
   * so forward moves and the final submit check every step, not only the
   * one on screen. */
  function firstInvalidStepBefore(target: number): number | null {
    for (let step = 1; step < target && step < TOTAL_STEPS; step += 1) {
      if (Object.keys(validationErrorsFor(step)).length > 0) return step
    }
    return null
  }

  /** Back is always free. Forward (Nästa, a later tab, back to review)
   * requires every step before the target to be valid; if one isn't, the
   * applicant lands on it with its errors shown. */
  function goToStep(target: number) {
    if (target === currentStep || target > maxReachedStep + 1) return
    if (currentStep === TOTAL_STEPS) resetAttestation()

    if (target > currentStep) {
      const invalidStep = firstInvalidStepBefore(target)
      if (invalidStep !== null) {
        if (invalidStep !== currentStep) setCurrentStep(invalidStep)
        showStepErrors(invalidStep)
        return
      }
    }

    setShowErrorSummary(false)
    setShowFiguresPrompt(false)
    if (target === TOTAL_STEPS) setEditingFromReview(false)
    setMaxReachedStep((reached) => Math.max(reached, target))
    setCurrentStep(target)
  }

  function goToNextStep() {
    goToStep(editingFromReview ? TOTAL_STEPS : Math.min(currentStep + 1, TOTAL_STEPS))
  }

  // Leaving the review in any direction means the figures may change, so
  // the attestation has to be given again against what is shown.
  function resetAttestation() {
    setAttested(false)
    setSigningState('idle')
    setSigningError(undefined)
  }

  function editFromReview(step: number) {
    setEditingFromReview(true)
    goToStep(step)
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (currentStep === TOTAL_STEPS) handleSubmit()
    else goToNextStep()
  }

  function goToPreviousStep() {
    if (currentStep === TOTAL_STEPS) resetAttestation()
    setShowErrorSummary(false)
    setShowFiguresPrompt(false)
    setCurrentStep((step) => Math.max(step - 1, 1))
  }

  function handleSubmit() {
    // A fast double click must not create two cases.
    if (submittingRef.current) return
    // Last line of defence: nothing invalid reaches scoring, whatever path
    // the applicant took through the tabs.
    const invalidStep = firstInvalidStepBefore(TOTAL_STEPS)
    if (invalidStep !== null) {
      resetAttestation()
      setCurrentStep(invalidStep)
      showStepErrors(invalidStep)
      return
    }
    // Everything checks out: open signing (attestation, then BankID).
    // The attestation lives there, next to the signature it belongs to,
    // so this button can't fail on a box further down the page.
    setSigningError(undefined)
    setSigningState('awaiting')
    requestAnimationFrame(() => signingPanelRef.current?.focus())
  }

  async function confirmSigning() {
    if (signingState === 'signing' || submittingRef.current) return
    setSigningState('signing')
    // The mock answers in ~0.6 s; hold "Kontrollerar signaturen…" long
    // enough to be read as a state rather than a flicker.
    const [result] = await Promise.all([
      signApplication(orgToCheck ?? applicationData.orgNumber, applicationData.authorizedSignatory),
      new Promise((resolve) => window.setTimeout(resolve, 1200)),
    ])
    if (result.status === 'FAILED') {
      setSigningState('idle')
      setSigningError(
        result.reason === 'NOT_AUTHORIZED_SIGNATORY'
          ? { message: `${applicationData.authorizedSignatory} är inte registrerad som firmatecknare för ${applicationData.companyName}. Välj en annan firmatecknare.`, fixStep: 1 }
          : { message: 'Företaget är inte aktivt i företagsregistret och kan inte ansöka om kredit.' },
      )
      
      requestAnimationFrame(() => signingErrorRef.current?.focus())
      return
    }
    submittingRef.current = true
    const { companyInfo, financials, creditRequest } = toCaseSubmission(applicationData, { attested })
    const createdCase = addCase(companyInfo, financials, creditRequest, {
      companyValidation: currentCompanyCheck ?? undefined,
      signature: { signedBy: result.signedBy, signedAt: result.signedAt, orderRef: result.orderRef },
    })
    clearApplicationDraft(user?.id)
    setShowRestoredNotice(false)
    setSigningState('idle')
    setSubmitted(true)
    // The status page is the end of the flow: decision, BankID receipt,
    // next steps and progress live there (and update when a case worker
    // decides). justSubmitted makes it open with the confirmation.
    navigate(applicationStatusPath(createdCase.id), { state: { justSubmitted: true } })
  }

  // Back to the review with the attestation still given: nothing changed.
  // Focus returns to the button that opened signing.
  function cancelSigning() {
    setSigningState('idle')
    requestAnimationFrame(() => document.getElementById('signing-start')?.focus())
  }

  function handleRestart() {
    submittingRef.current = false
    clearApplicationDraft(user?.id)
    setShowRestoredNotice(false)
    setConfirmingRestart(false)
    setShowErrorSummary(false)
    setEditingFromReview(false)
    resetAttestation()
    setApplicationData(createInitialApplicationData(user))
    setCurrentStep(1)
    setMaxReachedStep(1)
    setSubmitted(false)
    setFinancialErrors({})
    setCreditErrors({})
    setValidatedSteps([])
  }

  const FIELD_ORDER: Record<number, string[]> = {
    1: ['orgNumber', 'companyName', 'companyStatus', 'industry', 'authorizedSignatory'],
    // Same order as the form (resultaträkning, balansräkning, kassaflöde).
    2: ['financialYear', 'netSales', 'operatingProfit', 'interestExpenses', 'currentAssets', 'totalCapital', 'equity', 'shortTermLiabilities', 'longTermLiabilities', 'operatingCashFlow', 'investingCashFlow'],
    3: ['requestedAmount', 'purpose'],
  }
  const stepErrors: Record<string, string | undefined> =
    currentStep === 1 ? companyDetailsErrors : currentStep === 2 ? financialErrors : currentStep === 3 ? creditErrors : {}
  // Missing figures on step 2 get a short "X saknas" in the summary; the
  // full where-to-find-it message stays next to the field. Other errors
  // (format, balance checks) keep their own wording.
  const summaryItems = (FIELD_ORDER[currentStep] ?? [])
    .filter((key) => stepErrors[key])
    .map((key) => {
      const missingFigure = currentStep === 2 && key in FIGURE_LABEL && !applicationData[key as keyof CreditApplicationData].trim()
      return { id: `field-${key}`, message: missingFigure ? `${FIGURE_LABEL[key]} saknas` : (stepErrors[key] as string), missingFigure }
    })
  const summaryTitle = summaryItems.every((item) => item.missingFigure)
    // The count lives in the action bar; this line only says what to do.
    ? 'Fyll i de belopp som saknas'
    : `Rätta ${summaryItems.length} uppgifter innan ni går vidare`

  // Step 2 with only empty figures left: one line and a way to the next
  // empty field, instead of a list of every missing figure.
  const onlyMissingFigures = summaryItems.length > 0 && summaryItems.every((item) => item.missingFigure)
  const figureKeys = Object.keys(FIGURE_LABEL).filter((key) => applicationData.noCashFlowStatement !== 'true' || !/CashFlow$/.test(key))
  // Step 2 marks one empty figure at a time, the next one to fill in; the
  // bar counts the rest. Real errors (format, balance) are always shown.
  const firstEmptyFigure = figureKeys.find((key) => financialErrors[key as keyof FinancialErrors] && !applicationData[key as keyof CreditApplicationData].trim())
  const visibleFinancialErrors = Object.fromEntries(
    Object.entries(financialErrors).filter(([key]) => !(key in FIGURE_LABEL) || applicationData[key as keyof CreditApplicationData].trim() || key === firstEmptyFigure),
  ) as FinancialErrors
  const filledFigures = figureKeys.filter((key) => applicationData[key as keyof CreditApplicationData].trim()).length
  function focusNextEmptyFigure() {
    const next = figureKeys.find((key) => !applicationData[key as keyof CreditApplicationData].trim())
    if (next) document.getElementById(`field-${next}`)?.focus()
  }

  const validSteps = [1, 2, 3].filter((step) => Object.keys(validationErrorsFor(step)).length === 0)

  const requestedAmount = Number(applicationData.requestedAmount) || 0
  // An estimate is only shown for an amount the application would accept;
  // a monthly cost for 100 000 SEK when the minimum is higher misleads.
  const amountAccepted = requestedAmount > 0 && !validateCreditRequest(applicationData).requestedAmount
  const monthlyRate = 0.085 / 12
  const repaymentTerm = Number(applicationData.repaymentTerm) || 36
  const estimatedMonthlyPayment = requestedAmount > 0
    ? requestedAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -repaymentTerm))
    : 0
  const formatSek = (amount: number) => new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(amount)
  // Said instead of a bare "—" when an amount is entered but out of range.
  // The range rule is said once: by the estimate until the field has been
  // checked, then only by the field's own error.
  const amountOutOfRange = requestedAmount > 0 && !amountAccepted && !creditErrors.requestedAmount
  const RANGE_NOTE = 'Exempel visas för 250 000–10 000 000 SEK'
  const decisionText = requestedAmount > SCORING_THRESHOLDS.storkredit
    ? 'Granskas av en handläggare. Beslut inom cirka 3 dagar.'
    : 'Bedöms automatiskt direkt efter signeringen. Ibland granskar en handläggare den.'
  const sek = (raw: string) => (raw.trim() && Number.isFinite(Number(raw)) ? `${formatSek(Number(raw))} SEK` : '—')

  // One review, grouped the way the applicant entered it, each group with a
  // way back to its step. Everything the automatic scoring reads is here.
  const reviewSections: Array<{ step: number; title: string; rows: Array<{ label: string; value: string; stacked?: boolean; group?: string }> }> = [
    {
      step: 1,
      title: 'Företag',
      rows: [
        { label: 'Företag', value: applicationData.companyName || '—' },
        { label: 'Organisationsnummer', value: applicationData.orgNumber || '—' },
        { label: 'Firmatecknare', value: applicationData.authorizedSignatory || '—' },
        { label: 'Bransch', value: INDUSTRY_LABEL[applicationData.industry] ?? '—' },
      ],
    },
    {
      step: 2,
      title: 'Ekonomi',
      rows: [
        { label: 'Räkenskapsår', value: applicationData.financialYear || '—' },
        { label: 'Nettoomsättning', value: sek(applicationData.netSales), group: 'Resultaträkning' },
        { label: 'Rörelseresultat', value: sek(applicationData.operatingProfit), group: 'Resultaträkning' },
        { label: 'Räntekostnader', value: sek(applicationData.interestExpenses.replace(/^-/, '')), group: 'Resultaträkning' },
        { label: 'Omsättningstillgångar', value: sek(applicationData.currentAssets), group: 'Balansräkning' },
        { label: 'Balansomslutning', value: sek(applicationData.totalCapital), group: 'Balansräkning' },
        { label: 'Eget kapital', value: sek(applicationData.equity), group: 'Balansräkning' },
        { label: 'Kortfristiga skulder', value: sek(applicationData.shortTermLiabilities), group: 'Balansräkning' },
        { label: 'Långfristiga skulder', value: sek(applicationData.longTermLiabilities), group: 'Balansräkning' },
        ...(applicationData.noCashFlowStatement === 'true'
          ? [{ label: 'Kassaflödesanalys', value: 'Saknas i årsredovisningen', group: 'Kassaflöde' }]
          : [
              { label: 'Operativt kassaflöde', value: sek(applicationData.operatingCashFlow), group: 'Kassaflöde' },
              { label: 'Investeringskassaflöde', value: sek(applicationData.investingCashFlow), group: 'Kassaflöde' },
            ]),
      ],
    },
  ]

  // URL → state: Back/Forward changed ?steg. Never further than the
  // applicant has reached (e.g. Forward after "Börja om"); leaving the
  // review drops the attestation, like the in-app Tillbaka does.
  if (urlStep !== seenUrlStep) {
    setSeenUrlStep(urlStep)
    if (urlStep !== null && urlStep !== currentStep && !submitted) {
      const target = Math.min(urlStep, maxReachedStep)
      if (currentStep === TOTAL_STEPS) resetAttestation()
      setShowErrorSummary(false)
      setShowFiguresPrompt(false)
      setEditingFromReview(false)
      setCurrentStep(target)
    }
  }

  return (
    <div className={joinClassNames(styles.wizardShell, shortViewport && styles.shortViewport)}>
      <div ref={pageIntroRef} className={styles.pageIntro}>
        <h1 className={styles.pageTitle}>Ansök om företagskredit</h1>
        {submitted || currentStep !== 1 ? null : <p className={styles.statusNote}>Utkastet sparas automatiskt i den här webbläsaren i 7 dagar, så ni kan fortsätta senare.</p>}
        {/* After step 1 the saving is confirmed, quietly, instead of explained. */}
        {submitted || currentStep === 1 || signingState !== 'idle' ? null : (
          <p className={joinClassNames(styles.statusNote, styles.savedNote)}><Icon name="check" className={styles.savedIcon} />Utkastet är sparat i den här webbläsaren</p>
        )}
        {showRestoredNotice && !submitted ? (
          <div className={styles.restoredNotice}>
            {confirmingRestart ? (
              <>
                <span>Radera utkastet och börja om från början?</span>
                <button type="button" className={styles.editLink} onClick={handleRestart}>Radera utkastet</button>
                <button type="button" className={styles.editLink} onClick={() => setConfirmingRestart(false)}>Behåll</button>
              </>
            ) : (
              <>
                <span>
                  Vi har återställt ert påbörjade utkast
                  {restoredDraft?.savedAt ? ` från ${new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(restoredDraft.savedAt))}` : ''}.
                </span>
                <button type="button" className={styles.editLink} onClick={() => setConfirmingRestart(true)}>Börja om</button>
              </>
            )}
          </div>
        ) : null}
      </div>

      {submitted ? null : (
        <div className={styles.stepTabsWrap}>
          <StepTabs currentStep={currentStep} maxReachedStep={maxReachedStep} validSteps={validSteps} signing={signingState !== 'idle'} />
        </div>
      )}

      {/* Signing is its own stage: one column, no side cards, and the dark
          signing card is the container itself rather than a card in a card. */}
      <div className={joinClassNames(styles.contentGrid, signingState !== 'idle' && styles.contentGridSigning)}>
        <div className={joinClassNames(styles.panel, signingState !== 'idle' && styles.panelSigning)}>
          {submitted ? null : (
          <form key={currentStep} ref={formStepRef} tabIndex={-1} aria-label={`Steg ${currentStep} av ${TOTAL_STEPS}: ${STEPS[currentStep - 1]?.label ?? ''}`} className={styles.formWrap} onSubmit={handleFormSubmit} noValidate>
            {showErrorSummary && summaryItems.length > 1 && onlyMissingFigures ? (
              <div ref={errorSummaryRef} tabIndex={-1} role="group" className={joinClassNames(styles.errorSummary, styles.errorSummaryAttention, styles.errorSummaryCompact)} aria-labelledby="error-summary-title">
                <h2 id="error-summary-title" className={styles.errorSummaryTitle}>{summaryTitle}</h2>
                <button type="button" className={styles.nextEmptyLink} onClick={focusNextEmptyFigure}>Gå till nästa tomma</button>
              </div>
            ) : null}
            {showErrorSummary && summaryItems.length > 1 && !onlyMissingFigures ? (
              <div ref={errorSummaryRef} tabIndex={-1} role="group" className={styles.errorSummary} aria-labelledby="error-summary-title">
                <h2 id="error-summary-title" className={styles.errorSummaryTitle}>{summaryTitle}</h2>
                <ul>
                  {summaryItems.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(event) => {
                          event.preventDefault()
                          document.getElementById(item.id)?.focus()
                        }}
                      >
                        {item.message}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {currentStep === 1 ? (
              <CompanyDetailsStep
                data={applicationData}
                errors={companyDetailsErrors}
                onChange={handleChange}
                identityFromLogin={identityFromLogin}
                companyCheck={currentCompanyCheck}
                canCheckCompany={Boolean(orgToCheck)}
              />
            ) : null}
            {currentStep === 2 && showFiguresPrompt ? (
              <p id="figures-prompt" className={styles.figuresPrompt} role="alert">
                Fyll i siffrorna från årsredovisningen för {applicationData.financialYear || 'det senaste räkenskapsåret'}. Börja med nettoomsättningen i resultaträkningen.
              </p>
            ) : null}
            {/* Empty step 2: the prompt above can be off screen on a phone, so the
                field that gets focus says the same thing where the eye is. */}
            {currentStep === 2 ? <FinancialMetricsStep data={applicationData} errors={showFiguresPrompt ? { netSales: 'Börja här. Nettoomsättningen står på första raden i resultaträkningen.' } : visibleFinancialErrors} onChange={handleChange} onChangeMany={handleChangeMany} /> : null}
            {currentStep === 3 ? <CreditDetailsStep data={applicationData} errors={creditErrors} onChange={handleChange} onAmountBlur={checkAmountOnBlur} /> : null}
            {currentStep === TOTAL_STEPS && signingState !== 'idle' ? (
              <SigningView
                companyName={applicationData.companyName}
                signatory={applicationData.authorizedSignatory}
                amountText={`${formatSek(requestedAmount)} SEK`}
                termText={`${repaymentTerm} månader`}
                monthlyText={amountAccepted ? `${formatSek(estimatedMonthlyPayment)} SEK` : ''}
                checking={signingState === 'signing'}
                headingRef={signingPanelRef}
                attested={attested}
                onAttestedChange={setAttested}
                onConfirm={confirmSigning}
                onCancel={cancelSigning}
              />
            ) : null}
            {currentStep === 4 && signingState === 'idle' ? (
              <section>
                <h2 className={styles.stepHeading}>Granska och signera</h2>
                <p className={styles.stepDescription}>Stämmer allt? I nästa steg intygar ni uppgifterna och signerar med BankID.</p>
                {/* What is being committed to comes first; the details follow. */}
                <section className={styles.commitment} aria-labelledby="review-3">
                  <div className={styles.reviewSectionHeader}>
                    <h3 id="review-3" className={styles.reviewSectionTitle}>Ni ansöker om</h3>
                    <button type="button" className={styles.editLink} onClick={() => editFromReview(3)} aria-label="Ändra kredit">Ändra</button>
                  </div>
                  <p className={styles.commitmentAmount}>{formatSek(requestedAmount)} SEK <span>över {repaymentTerm} månader</span></p>
                  <dl className={styles.commitmentFacts}>
                    <div><dt>Ca per månad</dt><dd>{amountAccepted ? `${formatSek(estimatedMonthlyPayment)} SEK` : '—'}</dd></div>
                    <div><dt>Beslut</dt><dd>{decisionText}</dd></div>
                    <div className={styles.commitmentPurpose}><dt>Syfte</dt><dd>{applicationData.purpose || '—'}</dd></div>
                  </dl>
                </section>
                {reviewSections.map((section) => {
                  // Everything that is attested is shown; Ekonomi is grouped as
                  // in the årsredovisning, two columns on wide screens.
                  const rows = section.rows.filter((row) => !row.group)
                  const groups = [...new Set(section.rows.map((row) => row.group).filter(Boolean))] as string[]
                  return (
                  <section key={section.step} className={styles.reviewSection} aria-labelledby={`review-${section.step}`}>
                    <div className={styles.reviewSectionHeader}>
                      <h3 id={`review-${section.step}`} className={styles.reviewSectionTitle}>{section.title}</h3>
                      <button
                        type="button"
                        className={styles.editLink}
                        onClick={() => editFromReview(section.step)}
                        aria-label={`Ändra ${section.title.toLowerCase()}`}
                      >
                        Ändra
                      </button>
                    </div>
                    <dl id={`review-rows-${section.step}`} className={styles.reviewSummary}>
                      {rows.map((row) => (
                        <div key={row.label} className={joinClassNames(styles.reviewRow, row.stacked ? styles.reviewRowStacked : undefined)}>
                          <dt>{row.label}</dt><dd>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                    {groups.map((group) => (
                      <div key={group} className={styles.reviewGroup}>
                        <h4 className={styles.reviewGroupTitle}>{group}</h4>
                        <dl className={joinClassNames(styles.reviewSummary, styles.reviewGrid)}>
                          {section.rows.filter((row) => row.group === group).map((row) => (
                            <div key={row.label} className={styles.reviewRow}>
                              <dt>{row.label}</dt><dd>{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </section>
                  )
                })}

              </section>
            ) : null}

            {currentStep === TOTAL_STEPS && signingError ? (
              <div ref={signingErrorRef} tabIndex={-1} className={styles.signingError} role="alert">
                <p>{signingError.message}</p>
                {signingError.fixStep ? (
                  <button type="button" className={styles.editLink} onClick={() => editFromReview(signingError.fixStep as number)}>
                    Ändra firmatecknare
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* While signing, the card holds every action: a sticky bar with
                only "Avbryt" would put cancelling in the thumb zone. */}
            {signingState !== 'idle' ? null : (
            <div className={styles.actionsRow}>
              {currentStep === 2 ? (
                <p className={styles.barCount}><strong>{filledFigures}</strong> av {figureKeys.length} belopp ifyllda</p>
              ) : null}
              {currentStep === 3 ? (
                <p className={styles.barEstimate}>
                  {amountOutOfRange ? <span>{RANGE_NOTE}</span> : (
                    <>
                      <span>Ca per månad, {repaymentTerm} mån</span>
                      <strong>{amountAccepted ? `${formatSek(estimatedMonthlyPayment)} SEK` : '—'}</strong>
                    </>
                  )}
                </p>
              ) : null}
              {currentStep > 1 && !editingFromReview && signingState === 'idle' ? (
                <Button
                  type="button"
                  variant="secondary"
                  surface="paper"
                  onClick={goToPreviousStep}
                  icon={<Icon name="arrow-left" />}
                >
                  Tillbaka
                </Button>
              ) : null}

              {currentStep < TOTAL_STEPS ? (
                <Button
                  type="submit"
                  surface="paper"
                  icon={<Icon name="arrow-right" />}
                >
                  {editingFromReview ? 'Tillbaka till granskning' : 'Nästa'}
                </Button>
              ) : (
                signingState === 'idle' ? (
                  <Button
                    id="signing-start"
                    type="submit"
                    surface="paper"
                    icon={<BankIdMark height={18} decorative />}
                  >
                    Signera med BankID
                  </Button>
                ) : null
              )}
            </div>
            )}
          </form>
          )}
        </div>

        {!submitted && signingState === 'idle' ? (
          <aside className={styles.sideColumn} aria-label="Ansökningsinformation">
            {/* Step 3 only: on the review and signing card the monthly cost
                is already part of the commitment. */}
            {currentStep === 3 ? (
              <section className={joinClassNames(styles.sideCard, styles.estimateCard)}>
                <h3>Beräknad månadskostnad</h3>
                <p className={styles.estimateAmount}>{amountAccepted ? <>{formatSek(estimatedMonthlyPayment)} <small>SEK / mån</small></> : '—'}</p>
                {amountOutOfRange ? <p className={styles.estimateRange}>{RANGE_NOTE}.</p> : null}
                <p className={styles.estimateNote}>Exempel med annuitetsbetalning och 8,5 % årsränta, exklusive avgifter. Faktiska villkor fastställs efter kreditprövning.</p>
                <div className={styles.estimateDetails}>
                  <div className={styles.estimateRow}><span>Önskat belopp</span><strong>{amountAccepted ? `${formatSek(requestedAmount)} SEK` : '—'}</strong></div>
                  <div className={styles.estimateRow}><span>Löptid</span><strong>{repaymentTerm} månader</strong></div>
                </div>
              </section>
            ) : null}
            {/* Help where people get stuck, on every step (and on phones,
                below the form), instead of only after submitting. */}
            <section className={styles.sideCard} aria-labelledby="help-title">
              <h3 id="help-title">Frågor om ansökan?</h3>
              <p className={styles.sideCopy}>Ring kundservice om något är oklart, till exempel vilken rad i årsredovisningen ett belopp står på.</p>
              <a className={styles.helpLink} href="tel:+46850012000">08-500 120 00</a>
              <p className={styles.helpNote}>Uppgifterna omfattas av banksekretess.</p>
            </section>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
