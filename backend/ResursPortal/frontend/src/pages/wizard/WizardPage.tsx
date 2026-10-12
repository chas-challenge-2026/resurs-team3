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

if (companyValidationActive && currentStep === 1) {
  setCompanyDetailsErrors(validateCompanyDetails(updatedData))
}

if (financialValidationActive && currentStep === 2) {
  setFinancialMetricsErrors(validateFinancialMetrics(updatedData))
}

if (creditValidationActive && currentStep === 3) {
  setCreditDetailsErrors(validateCreditDetails(updatedData))
}
}

  function goToStep(step: number) {
    if (step <= currentStep) setCurrentStep(step)
  }

function goToNextStep() {
  if (currentStep === 1) {
    const errors = validateCompanyDetails(applicationData)

    setCompanyValidationActive(true)
    setCompanyDetailsErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }
  }

  if (currentStep === 2) {
  const errors = validateFinancialMetrics(applicationData)

  setFinancialValidationActive(true)
  setFinancialMetricsErrors(errors)

  if (Object.keys(errors).length > 0) {
    return
  }
}

  setCurrentStep((step) => Math.min(step + 1, TOTAL_STEPS))
}

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(step - 1, 1))
  }

  function handleOpenConfirmation() {
  const errors = validateCreditDetails(applicationData)

  setCreditValidationActive(true)
  setCreditDetailsErrors(errors)

  if (Object.keys(errors).length > 0) {
    return
  }

  setConfirmOpen(true)
}

  function handleSubmit() {
    const { companyInfo, financials, creditRequest } = toCaseSubmission(applicationData)
    const createdCase = addCase(companyInfo, financials, creditRequest)
    setSubmittedCase(createdCase)
  }

  function handleConfirmSubmit() {
    handleSubmit()
    setConfirmOpen(false)
  }

  function handleRestart() {
    setApplicationData(initialApplicationData)
    setCurrentStep(1)
    setSubmittedCase(null)

    setCompanyDetailsErrors({})
    setCompanyValidationActive(false)

    setFinancialMetricsErrors({})
    setFinancialValidationActive(false)

    setCreditDetailsErrors({})
    setCreditValidationActive(false)
  }

  return (
    <div>
      <WizardTopBar title="Ny kreditansökan" />

      <div className={styles.stepTabsWrap}>
        <StepTabs currentStep={currentStep} onSelectStep={goToStep} />
      </div>

      <div className={styles.panel}>
        {submittedCase ? (
          <div>
            <div className={styles.outcomeHeadingRow}>
              <h2 className={styles.outcomeHeading}>{OUTCOME_COPY[submittedCase.status].heading}</h2>
              <span className={joinClassNames(styles.statusBadge, STATUS_BADGE_CLASS[submittedCase.status])}>
                {submittedCase.status}
              </span>
            </div>
            <p className={styles.outcomeBody}>
              Tack, {applicationData.companyName || 'kund'}. {OUTCOME_COPY[submittedCase.status].body}
            </p>

            <div className={styles.reasonPanel}>
              <p className={styles.reasonLabel}>Motivering från kreditbedömningen</p>
              <p className={styles.reasonText}>{submittedCase.scoringResult.decisionReason}</p>
            </div>

            <div className={styles.restartWrap}>
              <Button type="button" variant="secondary" onClick={handleRestart}>
                Starta ny ansökan
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.formWrap}>
            {currentStep === 1 ? (
              <CompanyDetailsStep
                data={applicationData}
                errors={companyDetailsErrors}
                onChange={handleChange}
              />
            ) : null}
           {currentStep === 2 ? (
            <FinancialMetricsStep
              data={applicationData}
              errors={financialMetricsErrors}
              onChange={handleChange}
            />
          ) : null}

          {currentStep === 3 ? (
            <CreditDetailsStep
              data={applicationData}
              errors={creditDetailsErrors}
              onChange={handleChange}
            />
          ) : null}

            <div className={styles.actionsRow}>
              {currentStep > 1 ? (
                <Button type="button" variant="secondary" onClick={goToPreviousStep} icon={<Icon name="arrow-left" />}>
                  Tillbaka
                </Button>
              ) : null}

              {currentStep < TOTAL_STEPS ? (
                <Button type="button" onClick={goToNextStep} icon={<Icon name="arrow-right" />}>
                  Nästa
                </Button>
              ) : (
                <Button type="button" onClick={handleOpenConfirmation} icon={<Icon name="arrow-right" />}>
                  Skicka in ansökan
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bekräfta ansökan</DialogTitle>
            <DialogDescription>
              Kontrollera uppgifterna innan ansökan skickas in. Ansökan bedöms automatiskt baserat på de finansiella
              uppgifterna.
            </DialogDescription>
          </DialogHeader>

          <dl className={styles.confirmSummary}>
            <div className={styles.confirmRow}>
              <dt>Företag</dt>
              <dd>{applicationData.companyName || '\u2014'}</dd>
            </div>
            <div className={styles.confirmRow}>
              <dt>Organisationsnummer</dt>
              <dd>{applicationData.orgNumber || '\u2014'}</dd>
            </div>
            <div className={styles.confirmRow}>
              <dt>Begärt belopp</dt>
              <dd>{applicationData.requestedAmount ? `${applicationData.requestedAmount} SEK` : '\u2014'}</dd>
            </div>
          </dl>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
              Avbryt
            </Button>
            <Button type="button" onClick={handleConfirmSubmit}>
              Skicka in ansökan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
