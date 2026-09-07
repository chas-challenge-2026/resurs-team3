import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { CompanyDetailsStep } from '../features/credit-application/steps/CompanyDetailsStep'
import { FinancialMetricsStep } from '../features/credit-application/steps/FinancialMetricsStep'
import { CreditDetailsStep } from '../features/credit-application/steps/CreditDetailsStep'
import type { CreditApplicationData } from '../features/credit-application/creditApplication.types'

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

export function WizardPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [applicationData, setApplicationData] =
    useState<CreditApplicationData>(initialApplicationData)

  function handleChange(field: keyof CreditApplicationData, value: string) {
    setApplicationData((currentData) => ({
      ...currentData,
      [field]: value,
    }))
  }

  function goToNextStep() {
    setCurrentStep((step) => Math.min(step + 1, 3))
  }

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(step - 1, 1))
  }

  return (
    <div className="w-full max-w-2xl">
      <p className="mb-4 text-sm font-medium text-resurs-muted">
        Steg {currentStep} av 3
      </p>

      {currentStep === 1 ? (
        <CompanyDetailsStep
          data={applicationData}
          onChange={handleChange}
        />
      ) : null}

      {currentStep === 2 ? (
        <FinancialMetricsStep
          data={applicationData}
          onChange={handleChange}
        />
      ) : null}

      {currentStep === 3 ? (
        <CreditDetailsStep
          data={applicationData}
          onChange={handleChange}
        />
      ) : null}

      <div className="mt-8 flex justify-between gap-4">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={goToPreviousStep}
          >
            Tillbaka
          </Button>
        ) : (
          <div />
        )}

        {currentStep < 3 ? (
          <Button type="button" onClick={goToNextStep}>
            Nästa
          </Button>
        ) : null}
      </div>
    </div>
  )
}
