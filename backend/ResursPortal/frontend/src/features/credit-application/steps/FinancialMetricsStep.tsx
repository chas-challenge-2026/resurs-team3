import { TextField } from '../../../components/ui/TextField'
import type { CreditApplicationData } from '../creditApplication.types'
import styles from './FinancialMetricsStep.module.css'

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
  onChange: (field: FinancialField, value: string) => void
}

export function FinancialMetricsStep({
  data,
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
          onChange={(event) => onChange('equity', event.target.value)}
        />

        <TextField
          label="Totalt kapital"
          type="number"
          required
          value={data.totalCapital}
          onChange={(event) => onChange('totalCapital', event.target.value)}
        />

        <TextField
          label="Omsättningstillgångar"
          type="number"
          required
          value={data.currentAssets}
          onChange={(event) => onChange('currentAssets', event.target.value)}
        />

        <TextField
          label="Kortfristiga skulder"
          type="number"
          required
          value={data.shortTermLiabilities}
          onChange={(event) =>
            onChange('shortTermLiabilities', event.target.value)
          }
        />

        <TextField
          label="Totala skulder"
          type="number"
          required
          value={data.totalDebt}
          onChange={(event) => onChange('totalDebt', event.target.value)}
        />

        <TextField
          label="Rörelseresultat"
          type="number"
          required
          value={data.operatingProfit}
          onChange={(event) => onChange('operatingProfit', event.target.value)}
        />

        <TextField
          label="Nettoomsättning"
          type="number"
          required
          value={data.netSales}
          onChange={(event) => onChange('netSales', event.target.value)}
        />
      </div>
    </section>
  )
}
