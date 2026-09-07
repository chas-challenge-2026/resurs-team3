import { TextField } from '../../../components/ui/TextField'
import type { CreditApplicationData } from '../creditApplication.types'

type CompanyField = 'orgNumber' | 'companyName' | 'authorizedSignatory'

interface CompanyDetailsStepProps {
  data: CreditApplicationData
  onChange: (field: CompanyField, value: string) => void
}

export function CompanyDetailsStep({
  data,
  onChange,
}: CompanyDetailsStepProps) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white">Företagsuppgifter</h2>
      <p className="mt-1 text-sm text-resurs-muted">
        Ange uppgifter om företaget och behörig firmatecknare.
      </p>

      <div className="mt-6 space-y-4">
        <TextField
          label="Organisationsnummer"
          required
          value={data.orgNumber}
          onChange={(event) => onChange('orgNumber', event.target.value)}
          placeholder="556000-1234"
        />

        <TextField
          label="Företagsnamn"
          required
          value={data.companyName}
          onChange={(event) => onChange('companyName', event.target.value)}
        />

        <TextField
          label="Firmatecknare"
          required
          value={data.authorizedSignatory}
          onChange={(event) =>
            onChange('authorizedSignatory', event.target.value)
          }
        />
      </div>
    </section>
  )
}
