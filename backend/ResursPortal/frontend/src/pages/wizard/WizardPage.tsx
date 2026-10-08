import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/Icon'
import {
  validateFinancialMetrics,
  type FinancialMetricsErrors,
} from '../../features/credit-application/financialMetrics.validation'
import { CompanyDetailsStep } from '../../features/credit-application/steps/CompanyDetailsStep'
import { FinancialMetricsStep } from '../../features/credit-application/steps/FinancialMetricsStep'
import { CreditDetailsStep } from '../../features/credit-application/steps/CreditDetailsStep'
import type { CreditApplicationData } from '../../features/credit-application/creditApplication.types'
import {
  validateCompanyDetails,
  type CompanyDetailsErrors,
} from '../../features/credit-application/companyDetails.validation'
import {
  validateCreditDetails,
  type CreditDetailsErrors,
} from '../../features/credit-application/creditDetails.validation'
import { WizardTopBar } from './WizardTopBar'
import { StepTabs } from './StepTabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog'
import { joinClassNames } from '../../lib/joinClassNames'
import styles from './WizardPage.module.css'
import {
  ApplicationApiError,
  createApplication,
  toCreateApplicationRequest,
  type ApplicationValidationErrors,
  type CreateApplicationResponse,
} from '../../features/credit-application/creditApplication.api'


const TOTAL_STEPS = 3

const initialApplicationData: CreditApplicationData = {
  orgNumber: '',
  companyName: '',
  authorizedSignatory: '',
  equity: '',
  totalCapital: '',
  currentAssets: '',
  shortTermLiabilities: '',
  totalDebt: '',
  operatingProfit: '',
  netSales: '',
  requestedAmount: '',
  purpose: '',
}

// POST /api/applications currently returns only these scoring outcomes.
// PENDING_DOCS belongs to the wider application lifecycle handled separately.
const OUTCOME_COPY: Record<
  CreateApplicationResponse['status'],
  { heading: string; body: string }
> = {
  APPROVED: {
    heading: 'Ansökan godkänd',
    body: 'Grattis! Er kreditansökan har godkänts automatiskt baserat på era finansiella nyckeltal. Beslutet är slutgiltigt och kräver ingen ytterligare handläggning.',
  },
  REJECTED: {
    heading: 'Ansökan avslagen',
    body: 'Er kreditansökan kunde tyvärr inte godkännas baserat på de inlämnade finansiella nyckeltalen. Se motiveringen nedan för detaljer.',
  },
  UNDER_REVIEW: {
    heading: 'Ansökan under granskning',
    body: 'Er ansökan kräver manuell granskning av en handläggare innan ett slutgiltigt beslut kan fattas. Ni meddelas när beslut har fattats.',
  },
}

const STATUS_BADGE_CLASS: Record<CreateApplicationResponse['status'], string> = {
  APPROVED: styles.statusApproved,
  REJECTED: styles.statusRejected,
  UNDER_REVIEW: styles.statusUnderReview,
}

/**
 * Maps Java API field names back to the React form field names.
 *
 * The backend uses Swedish financial property names while the React form uses
 * English names, so validation errors need translating before they can be
 * shown beside the correct input.
 */
function mapBackendValidationErrors(errors: ApplicationValidationErrors) {
  const companyErrors: CompanyDetailsErrors = {}
  const financialErrors: FinancialMetricsErrors = {}
  const creditErrors: CreditDetailsErrors = {}

  if (errors.orgNumber) companyErrors.orgNumber = errors.orgNumber
  if (errors.companyName) companyErrors.companyName = errors.companyName
  if (errors.authorizedSignatory) {
    companyErrors.authorizedSignatory = errors.authorizedSignatory
  }

  if (errors.egetKapital) financialErrors.equity = errors.egetKapital
  if (errors.totaltKapital) financialErrors.totalCapital = errors.totaltKapital
  if (errors.omsattningstillgangar) {
    financialErrors.currentAssets = errors.omsattningstillgangar
  }
  if (errors.kortfristigaSkulder) {
    financialErrors.shortTermLiabilities = errors.kortfristigaSkulder
  }
  if (errors.totalaSkulder) financialErrors.totalDebt = errors.totalaSkulder
  if (errors.rorelseresultat) {
    financialErrors.operatingProfit = errors.rorelseresultat
  }
  if (errors.nettoomsattning) financialErrors.netSales = errors.nettoomsattning

  if (errors.requestedAmount) {
    creditErrors.requestedAmount = errors.requestedAmount
  }
  if (errors.purpose) creditErrors.purpose = errors.purpose

  return {
    companyErrors,
    financialErrors,
    creditErrors,
  }
}

export function WizardPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [applicationData, setApplicationData] = useState<CreditApplicationData>(initialApplicationData)
  const [companyDetailsErrors, setCompanyDetailsErrors] =
  useState<CompanyDetailsErrors>({})
  const [companyValidationActive, setCompanyValidationActive] =
  useState(false)
  const [financialMetricsErrors, setFinancialMetricsErrors] =
  useState<FinancialMetricsErrors>({})  
const [financialValidationActive, setFinancialValidationActive] =
  useState(false)

  const [creditDetailsErrors, setCreditDetailsErrors] =
  useState<CreditDetailsErrors>({})

const [creditValidationActive, setCreditValidationActive] =
  useState(false)
  const [submittedCase, setSubmittedCase] =
  useState<CreateApplicationResponse | null>(null)

const [isSubmitting, setIsSubmitting] = useState(false)
const [submitError, setSubmitError] = useState<string | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)

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

  setSubmitError(null)
  setConfirmOpen(true)
}

 async function handleConfirmSubmit() {
  setIsSubmitting(true)
  setSubmitError(null)

  try {
      // Convert the React form values to the JSON contract expected by the Java API.
      const request = toCreateApplicationRequest(applicationData)
      const result = await createApplication(request)

    setSubmittedCase(result)
    setConfirmOpen(false)
} catch (error) {
  if (error instanceof ApplicationApiError) {
    const {
      companyErrors,
      financialErrors,
      creditErrors,
    } = mapBackendValidationErrors(error.errors)

    const hasCompanyErrors = Object.keys(companyErrors).length > 0
    const hasFinancialErrors = Object.keys(financialErrors).length > 0
    const hasCreditErrors = Object.keys(creditErrors).length > 0

    setCompanyDetailsErrors(companyErrors)
    setFinancialMetricsErrors(financialErrors)
    setCreditDetailsErrors(creditErrors)

    // If Java returned field-specific validation errors, return the applicant
    // to the earliest wizard step containing an error.
    if (hasCompanyErrors) {
      setCompanyValidationActive(true)
      setCurrentStep(1)
      setConfirmOpen(false)
      setSubmitError(null)
    } else if (hasFinancialErrors) {
      setFinancialValidationActive(true)
      setCurrentStep(2)
      setConfirmOpen(false)
      setSubmitError(null)
    } else if (hasCreditErrors) {
      setCreditValidationActive(true)
      setCurrentStep(3)
      setConfirmOpen(false)
      setSubmitError(null)
    } else {
      // Keep the dialog open for API errors that cannot be mapped to a field.
      setSubmitError(error.message)
    }
  } else {
    setSubmitError('Ansökan kunde inte skickas. Försök igen.')
  }
} finally {
    setIsSubmitting(false)
  }
}

  function handleRestart() {
    setSubmitError(null)
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
              <p className={styles.reasonText}>{submittedCase.decisionReason}</p>
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

          {submitError ? (
             <p role="alert">
                {submitError}
             </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
              Avbryt
            </Button>
            <Button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Skickar...' : 'Skicka in ansökan'}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
