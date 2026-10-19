import { TextArea } from '../../../components/ui/TextField'
import { SCORING_THRESHOLDS } from '../../../utils/scoring'
import { AmountField } from '../AmountField'
import type { CreditApplicationData } from '../creditApplication.types'
import type { CreditRequestErrors } from '../creditApplication.validation'
import styles from './CreditDetailsStep.module.css'

type CreditField = 'requestedAmount' | 'repaymentTerm' | 'purpose'

interface CreditDetailsStepProps {
  data: CreditApplicationData
  errors: CreditRequestErrors
  onChange: (field: CreditField, value: string) => void
  onAmountBlur?: () => void
}

export function CreditDetailsStep({
  data,
  errors,
  onChange,
  onAmountBlur,
}: CreditDetailsStepProps) {
  // ScoringService always sends large amounts to a case worker. Saying so
  // here sets the expectation before signing, not after.
  const alwaysManualReview = Number(data.requestedAmount) > SCORING_THRESHOLDS.storkredit
  return (
    <section>
      <h2 className={styles.heading}>Kredit</h2>

      <p className={styles.description}>
        Ange önskat kreditbelopp och vad krediten ska användas till.
      </p>

      <div className={styles.fields}>
        <AmountField
          id="field-requestedAmount"
          label="Önskat kreditbelopp"
          className={styles.pillField}
          value={data.requestedAmount}
          onChange={(raw) => onChange('requestedAmount', raw)}
          onBlur={onAmountBlur}
          helperText={
            alwaysManualReview
              ? 'Belopp över 5 000 000 SEK granskas alltid av en handläggare. Beslut inom cirka 3 dagar.'
              : 'Mellan 250 000 och 10 000 000 SEK.'
          }
          error={errors.requestedAmount}
        />

        <fieldset className={styles.termFieldset}>
          <legend>Löptid</legend>
          <p>Preliminär. Används för att beräkna månadskostnaden.</p>
          <div className={styles.termOptions}>
            {[
              { months: '12', label: '12 mån', duration: '1 år' },
              { months: '24', label: '24 mån', duration: '2 år' },
              { months: '36', label: '36 mån', duration: '3 år' },
              { months: '60', label: '60 mån', duration: '5 år' },
            ].map((term) => (
              <label key={term.months} className={data.repaymentTerm === term.months ? styles.termSelected : styles.termOption}>
                <input
                  type="radio"
                  name="repayment-term"
                  value={term.months}
                  checked={data.repaymentTerm === term.months}
                  onChange={(event) => onChange('repaymentTerm', event.target.value)}
                />
                <strong>{term.label}</strong>
                <span>{term.duration}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <TextArea
          id="field-purpose"
          label="Syfte med krediten"
          required
          maxLength={500}
          error={errors.purpose}
          aria-describedby="purpose-count"
          className={styles.pillField}
          value={data.purpose}
          onChange={(event) => onChange('purpose', event.target.value)}
          placeholder="Till exempel investering i maskiner eller rörelsekapital"
        />
        <p id="purpose-count" className={styles.characterCount}>{data.purpose.length} / 500 tecken</p>
      </div>
    </section>
  )
}
