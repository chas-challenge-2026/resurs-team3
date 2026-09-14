import { TextArea, TextField } from '../../../components/ui/TextField'
import type { CreditApplicationData } from '../creditApplication.types'
import styles from './CreditDetailsStep.module.css'

type CreditField = 'requestedAmount' | 'purpose'

interface CreditDetailsStepProps {
  data: CreditApplicationData
  onChange: (field: CreditField, value: string) => void
}

export function CreditDetailsStep({
  data,
  onChange,
}: CreditDetailsStepProps) {
  return (
    <section>
      <h2 className={styles.heading}>Kreditansökan</h2>

      <p className={styles.description}>
        Ange önskat kreditbelopp och vad krediten ska användas till.
      </p>

      <div className={styles.fields}>
        <TextField
          label="Önskat kreditbelopp"
          type="number"
          required
          value={data.requestedAmount}
          onChange={(event) =>
            onChange('requestedAmount', event.target.value)
          }
          helperText="Ange belopp i SEK"
        />

        <TextArea
          label="Syfte med krediten"
          required
          value={data.purpose}
          onChange={(event) => onChange('purpose', event.target.value)}
          placeholder="Beskriv kort vad krediten ska användas till"
        />
      </div>
    </section>
  )
}
