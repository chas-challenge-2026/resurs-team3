import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { CompanyDetailsStep } from '../features/credit-application/steps/CompanyDetailsStep'
import { FinancialMetricsStep } from '../features/credit-application/steps/FinancialMetricsStep'
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
    setCurrentStep(2)
  }

  function goToPreviousStep() {
    setCurrentStep(1)
  }

  return (
    <div className="w-full max-w-2xl">
      <p className="mb-4 text-sm font-medium text-resurs-muted">
        Steg {currentStep} av 4
      </p>

      {currentStep === 1 ? (
        <CompanyDetailsStep
          data={applicationData}
          onChange={handleChange}
        />
      ) : (
        <FinancialMetricsStep
          data={applicationData}
          onChange={handleChange}
        />
      )}

      <div className="mt-8 flex justify-between gap-4">
        {currentStep === 2 ? (
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

        {currentStep === 1 ? (
          <Button type="button" onClick={goToNextStep}>
            Nästa
          </Button>
        ) : null}
      </div>
    </div>
  )
}
