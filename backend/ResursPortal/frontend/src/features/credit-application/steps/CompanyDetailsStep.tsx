import { TextField } from "../../../components/ui/TextField";
import type { CreditApplicationData } from "../creditApplication.types";
import styles from "./CompanyDetailsStep.module.css";
import type { CompanyDetailsErrors } from "../companyDetails.validation";

type CompanyField = "orgNumber" | "companyName" | "authorizedSignatory";

interface CompanyDetailsStepProps {
  data: CreditApplicationData;
  errors: CompanyDetailsErrors;
  onChange: (field: CompanyField, value: string) => void;
}

export function CompanyDetailsStep({
  data,
  errors,
  onChange,
}: CompanyDetailsStepProps) {
  return (
    <section>
      <h2 className={styles.heading}>Företagsuppgifter</h2>
      <p className={styles.description}>
        Ange uppgifter om företaget och behörig firmatecknare.
      </p>

      <div className={styles.fields}>
        <TextField
          label="Organisationsnummer"
          required
          value={data.orgNumber}
          onChange={(event) => onChange("orgNumber", event.target.value)}
          placeholder="556000-1234"
          error={errors.orgNumber}
        />

        <TextField
          label="Företagsnamn"
          required
          value={data.companyName}
          onChange={(event) => onChange("companyName", event.target.value)}
          error={errors.companyName}
        />

        <TextField
          label="Firmatecknare"
          required
          value={data.authorizedSignatory}
          onChange={(event) =>
            onChange("authorizedSignatory", event.target.value)
          }
          error={errors.authorizedSignatory}
        />
      </div>
    </section>
  );
}
