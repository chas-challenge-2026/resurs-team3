import { TextArea, TextField } from '../../../components/ui/TextField'
import type { CreditApplicationData } from '../creditApplication.types'

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
      <h2 className="text-xl font-bold text-white">Kreditansökan</h2>

      <p className="mt-1 text-sm text-resurs-muted">
        Ange önskat kreditbelopp och vad krediten ska användas till.
      </p>

      <div className="mt-6 space-y-4">
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
