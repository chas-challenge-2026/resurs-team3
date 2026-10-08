import { TextField } from '../../../components/ui/TextField'
import type { CreditApplicationData } from '../creditApplication.types'
import styles from './FinancialMetricsStep.module.css'
import type { FinancialMetricsErrors } from '../financialMetrics.validation'

type FinancialField =
  | 'equity'
  | 'totalCapital'
  | 'currentAssets'
  | 'shortTermLiabilities'
  | 'totalDebt'
  | 'operatingProfit'
  | 'netSales'

interface FinancialMetricsStepProps {
  data: CreditApplicationData
  errors: FinancialMetricsErrors
  onChange: (field: FinancialField, value: string) => void
}

export function FinancialMetricsStep({
  data,
  errors,
  onChange,
}: FinancialMetricsStepProps) {
  return (
    <section>
      <h2 className={styles.heading}>Ekonomiska uppgifter</h2>
      <p className={styles.description}>
        Ange företagets senaste ekonomiska uppgifter i SEK.
      </p>

      <div className={styles.fields}>
        <TextField
          label="Eget kapital"
          type="number"
          required
          value={data.equity}
          error={errors.equity}
          onChange={(event) => onChange('equity', event.target.value)}
        />

        <TextField
          label="Totalt kapital"
          type="number"
          required
          value={data.totalCapital}
          error={errors.totalCapital}
          onChange={(event) => onChange('totalCapital', event.target.value)}
        />

        <TextField
          label="Omsättningstillgångar"
          type="number"
          required
          value={data.currentAssets}
          error={errors.currentAssets}
          onChange={(event) => onChange('currentAssets', event.target.value)}
        />

        <TextField
          label="Kortfristiga skulder"
          type="number"
          required
          value={data.shortTermLiabilities}
          error={errors.shortTermLiabilities}
          onChange={(event) =>
            onChange('shortTermLiabilities', event.target.value)
          }
        />

        <TextField
          label="Totala skulder"
          type="number"
          required
          value={data.totalDebt}
          error={errors.totalDebt}
          onChange={(event) => onChange('totalDebt', event.target.value)}
        />

        <TextField
          label="Rörelseresultat"
          type="number"
          required
          value={data.operatingProfit}
          error={errors.operatingProfit}
          onChange={(event) => onChange('operatingProfit', event.target.value)}
        />

        <TextField
          label="Nettoomsättning"
          type="number"
          required
          value={data.netSales}
          error={errors.netSales}
          onChange={(event) => onChange('netSales', event.target.value)}
        />
      </div>
    </section>
  )
}
