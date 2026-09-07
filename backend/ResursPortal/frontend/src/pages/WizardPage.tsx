import { useState } from 'react'
import { CompanyDetailsStep } from '../features/credit-application/steps/CompanyDetailsStep'
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
  const [applicationData, setApplicationData] =
    useState<CreditApplicationData>(initialApplicationData)

  function handleChange(field: keyof CreditApplicationData, value: string) {
    setApplicationData((currentData) => ({
      ...currentData,
      [field]: value,
    }))
  }

  return (
    <div className="w-full max-w-2xl">
      <CompanyDetailsStep
        data={applicationData}
        onChange={handleChange}
      />
    </div>
  )
}
