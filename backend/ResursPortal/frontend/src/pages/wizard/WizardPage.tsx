import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/Icon'
import { useCases } from '../../context/useCases'
import type { CreditCase, ApplicationStatus } from '../../types/case'
import { CompanyDetailsStep } from '../../features/credit-application/steps/CompanyDetailsStep'
import { FinancialMetricsStep } from '../../features/credit-application/steps/FinancialMetricsStep'
import { CreditDetailsStep } from '../../features/credit-application/steps/CreditDetailsStep'
import type { CreditApplicationData } from '../../features/credit-application/creditApplication.types'
import { WizardTopBar } from './WizardTopBar'
import { StepTabs } from './StepTabs'

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

// Same outcome copy the other project's Step4Confirmation shows — the case
// is scored synchronously by useCases().addCase (utils/scoring.ts), so the
// confirmation screen can show the real decision instead of a generic
// "we'll review it" message.
const OUTCOME_COPY: Record<ApplicationStatus, { heading: string; body: string }> = {
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
  PENDING_DOCS: {
    heading: 'Ansökan mottagen',
    body: 'Er ansökan har tagits emot och väntar på komplettering.',
  },
}

const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  APPROVED: 'bg-resurs-tealDark text-white',
  REJECTED: 'bg-red-700 text-white',
  UNDER_REVIEW: 'bg-resurs-orange text-resurs-onOrange',
  PENDING_DOCS: 'bg-white/10 text-white',
}

/**
 * The applicant-facing credit application flow. The step chrome (top bar,
 * step tabs, panel) is carried over from the resurs-direkt-app wireframes;
 * the field logic underneath is unchanged from features/credit-application —
 * one flat useState instead of that project's ApplicationContext/reducer.
 *
 * Submitting now mirrors the other project's wiring too: addCase() (from
 * CasesContext) runs the same ScoringService the backoffice queue trusts
 * and drops the resulting case straight into it, so a submitted application
 * shows up in the caseworker dashboard exactly like a real POST /apply would.
 */
export function WizardPage() {
  const { addCase } = useCases()
  const [currentStep, setCurrentStep] = useState(1)
  const [applicationData, setApplicationData] = useState<CreditApplicationData>(initialApplicationData)
  const [submittedCase, setSubmittedCase] = useState<CreditCase | null>(null)

  function handleChange(field: keyof CreditApplicationData, value: string) {
    setApplicationData((currentData) => ({
      ...currentData,
      [field]: value,
    }))
  }

  function goToStep(step: number) {
    if (step <= currentStep) setCurrentStep(step)
  }

  function goToNextStep() {
    setCurrentStep((step) => Math.min(step + 1, TOTAL_STEPS))
  }

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(step - 1, 1))
  }

  function handleSubmit() {
    const createdCase = addCase(
      {
        orgNumber: applicationData.orgNumber,
        companyName: applicationData.companyName,
        signatory: applicationData.authorizedSignatory,
        // No terms checkbox in this flow yet (unlike the other project's
        // Step1) — submitting the form is the only consent step there is.
        acceptedTerms: true,
      },
      {
        equity: applicationData.equity,
        totalCapital: applicationData.totalCapital,
        currentAssets: applicationData.currentAssets,
        currentLiabilities: applicationData.shortTermLiabilities,
        totalLiabilities: applicationData.totalDebt,
        operatingProfit: applicationData.operatingProfit,
        netRevenue: applicationData.netSales,
        // Not collected in this flow's step 2 (the other project's optional
        // "Kassaflöde och räntor" fields) — empty means "not provided" to
        // the scoring engine, same as it does for the seeded mock cases.
        operatingCashFlow: '',
        investingCashFlow: '',
        interestExpenses: '',
      },
      {
        amount: applicationData.requestedAmount,
        purpose: applicationData.purpose,
      },
    )
    setSubmittedCase(createdCase)
  }

  function handleRestart() {
    setApplicationData(initialApplicationData)
    setCurrentStep(1)
    setSubmittedCase(null)
  }

  return (
    <div>
      <WizardTopBar title="Ny kreditansökan" />

      <div className="mt-6">
        <StepTabs currentStep={currentStep} onSelectStep={goToStep} />
      </div>

      <div className="mt-6 rounded-lg bg-resurs-panel p-4 sm:p-6">
        {submittedCase ? (
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-extrabold text-white">{OUTCOME_COPY[submittedCase.status].heading}</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[submittedCase.status]}`}
              >
                {submittedCase.status}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm text-resurs-muted">
              Tack, {applicationData.companyName || 'kund'}. {OUTCOME_COPY[submittedCase.status].body}
            </p>

            <div className="mt-4 max-w-xl rounded-md bg-resurs-card p-4 text-sm text-white/80">
              <p className="font-semibold text-white">Motivering från kreditbedömningen</p>
              <p className="mt-1.5 leading-relaxed">{submittedCase.scoringResult.decisionReason}</p>
            </div>

            <div className="mt-6">
              <Button type="button" variant="secondary" onClick={handleRestart}>
                Starta ny ansökan
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            {currentStep === 1 ? <CompanyDetailsStep data={applicationData} onChange={handleChange} /> : null}
            {currentStep === 2 ? <FinancialMetricsStep data={applicationData} onChange={handleChange} /> : null}
            {currentStep === 3 ? <CreditDetailsStep data={applicationData} onChange={handleChange} /> : null}

            <div className="mt-8 flex gap-3">
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
                <Button type="button" onClick={handleSubmit} icon={<Icon name="arrow-right" />}>
                  Skicka in ansökan
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
