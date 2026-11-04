import { TextField } from '../../../components/ui/TextField'
import type { CreditApplicationData } from '../creditApplication.types'
import styles from './CompanyDetailsStep.module.css'
import type { CompanyDetailsErrors } from '../companyDetails.validation'
import type { CompanyValidationResult } from '../../../types/case'
import { companyBlockReason } from '../../../services/companyValidationService'

type CompanyField = 'orgNumber' | 'companyName' | 'authorizedSignatory' | 'industry'

interface CompanyDetailsStepProps {
  data: CreditApplicationData
  errors: CompanyDetailsErrors
  onChange: (field: CompanyField, value: string) => void
  /** True when the company identity came from the BankID login — shown as
   * facts instead of asking the applicant to retype them. */
  identityFromLogin?: boolean
  /** Result of the company-register lookup; null while it runs. */
  companyCheck: CompanyValidationResult | null
  /** False when there's no valid org number to look up yet. */
  canCheckCompany: boolean
}

// The industries ScoringService.java adjusts the soliditet limit for.
const INDUSTRIES: Array<{ value: string; label: string }> = [
  { value: 'BYGG', label: 'Bygg' },
  { value: 'FASTIGHET', label: 'Fastighet' },
  { value: 'FINANS', label: 'Finans' },
  { value: 'HANDEL', label: 'Handel' },
  { value: 'IT', label: 'IT' },
  { value: 'RESTAURANG', label: 'Restaurang' },
  { value: 'TILLVERKNING', label: 'Tillverkning' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'UTBILDNING', label: 'Utbildning' },
  { value: 'VÅRD', label: 'Vård' },
  { value: 'OTHER', label: 'Annan bransch' },
]

const REGISTRATION_LABEL: Record<CompanyValidationResult['registrationStatus'], string> = {
  ACTIVE: 'Aktivt',
  INACTIVE: 'Avregistrerat',
  UNDER_LIQUIDATION: 'Under likvidation',
  NOT_FOUND: 'Hittades inte',
}

export function CompanyDetailsStep({
  data,
  errors,
  onChange,
  identityFromLogin = false,
  companyCheck,
  canCheckCompany,
}: CompanyDetailsStepProps) {
  const blockReason = companyCheck ? companyBlockReason(companyCheck) : null
  const signatories = companyCheck && !blockReason ? companyCheck.authorizedSignatories : []
  return (
    <section>
      <h2 className={styles.heading}>Företag och firmatecknare</h2>
      <p className={styles.description}>Ha företagets senaste fastställda årsredovisning till hands. Siffrorna från den behövs i nästa steg.</p>

      {identityFromLogin ? (
        <dl className={styles.identity}>
          <div className={styles.identityRow}><dt>Företag</dt><dd>{data.companyName}</dd></div>
          <div className={styles.identityRow}><dt>Organisationsnummer</dt><dd>{data.orgNumber}</dd></div>
        </dl>
      ) : null}

      <div className={styles.fields}>
        {identityFromLogin ? null : (
          <>
            <TextField
              id="field-orgNumber"
              label="Organisationsnummer"
              required
              hideRequiredMark
              className={styles.pillField}
              value={data.orgNumber}
              error={errors.orgNumber}
              inputMode="numeric"
              autoComplete="off"
              onChange={(event) => onChange('orgNumber', event.target.value)}
              placeholder="556000-1234"
            />

            <TextField
              id="field-companyName"
              label="Företagsnamn"
              required
              hideRequiredMark
              className={styles.pillField}
              value={data.companyName}
              error={errors.companyName}
              onChange={(event) => onChange('companyName', event.target.value)}
            />
          </>
        )}

        {canCheckCompany ? (
          <section className={styles.check} aria-labelledby="company-check-heading">
            <h3 id="company-check-heading" className={styles.checkTitle}>Kontroll i företagsregistret</h3>
            {/* The three rows are there while the check runs, with
                placeholders, so the answer doesn't push the form down. */}
            <dl className={styles.checkList} aria-busy={!companyCheck}>
              <div><dt>Registrering</dt><dd>{companyCheck ? REGISTRATION_LABEL[companyCheck.registrationStatus] : <span className={styles.skeleton} />}</dd></div>
              <div><dt>F-skatt</dt><dd>{companyCheck ? (companyCheck.fSkattRegistered ? 'Ja' : 'Nej') : <span className={styles.skeleton} />}</dd></div>
              <div><dt>Momsregistrerat</dt><dd>{companyCheck ? (companyCheck.vatRegistered ? 'Ja' : 'Nej') : <span className={styles.skeleton} />}</dd></div>
            </dl>
            {companyCheck && companyCheck.registrationStatus === 'ACTIVE' && (!companyCheck.fSkattRegistered || !companyCheck.vatRegistered) ? (
              <p className={styles.checkNote}>
                {!companyCheck.fSkattRegistered && !companyCheck.vatRegistered
                  ? 'Företaget saknar F-skatt och momsregistrering.'
                  : !companyCheck.fSkattRegistered ? 'Företaget saknar F-skatt.' : 'Företaget är inte momsregistrerat.'}{' '}
                Det hindrar inte ansökan.
              </p>
            ) : null}
            {companyCheck ? null : (
              <p className={styles.srOnly} role="status">Kontrollerar företaget…</p>
            )}
            {errors.companyStatus ? (
              <p id="field-companyStatus" tabIndex={-1} className={styles.checkError} data-error-target="true" role="alert">
                {errors.companyStatus}
              </p>
            ) : null}
          </section>
        ) : null}

        <div className={styles.industryField}>
          <label htmlFor="field-industry">Bransch</label>
          <select
            id="field-industry"
            value={data.industry}
            aria-invalid={Boolean(errors.industry)}
            aria-describedby={errors.industry ? 'field-industry-error' : 'industry-help'}
            onChange={(event) => onChange('industry', event.target.value)}
          >
            <option value="">Välj bransch</option>
            {INDUSTRIES.map((industry) => <option key={industry.value} value={industry.value}>{industry.label}</option>)}
          </select>
          {errors.industry
            ? <p id="field-industry-error" className={styles.checkError}>{errors.industry}</p>
            : <p id="industry-help" className={styles.signatoriesHelp}>Kreditbedömningen tar hänsyn till branschen.</p>}
        </div>

        {signatories.length > 0 ? (
          <fieldset className={styles.signatories} aria-describedby={errors.authorizedSignatory ? 'field-authorizedSignatory-error' : 'signatory-help'}>
            <legend className={styles.signatoriesLegend}>Vem signerar ansökan?</legend>
            <p id="signatory-help" className={styles.signatoriesHelp}>Behöriga firmatecknare enligt företagsregistret. Den ni väljer behöver själv intyga uppgifterna och signera med BankID i sista steget.</p>
            <div className={styles.signatoryOptions}>
              {signatories.map((name, index) => (
                <label key={name} className={styles.signatoryOption}>
                  <input
                    id={index === 0 ? 'field-authorizedSignatory' : undefined}
                    type="radio"
                    name="authorized-signatory"
                    value={name}
                    checked={data.authorizedSignatory.trim().toLocaleLowerCase('sv-SE') === name.toLocaleLowerCase('sv-SE')}
                    aria-invalid={index === 0 ? Boolean(errors.authorizedSignatory) : undefined}
                    onChange={() => onChange('authorizedSignatory', name)}
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
            {errors.authorizedSignatory ? <p id="field-authorizedSignatory-error" className={styles.checkError}>{errors.authorizedSignatory}</p> : null}
          </fieldset>
        ) : canCheckCompany && !companyCheck ? (
          // Same frame as the signatory choice, so it fills in instead of
          // appearing and shifting what follows.
          <div className={styles.signatories} aria-hidden="true">
            <p className={styles.signatoriesLegend}>Vem signerar ansökan?</p>
            <p className={styles.signatoriesHelp}>Hämtar behöriga firmatecknare…</p>
            <div className={styles.signatoryOptions}>
              <div className={styles.signatoryOption}><span className={styles.skeleton} style={{ width: '8rem' }} /></div>
            </div>
          </div>
        ) : !canCheckCompany ? (
          <TextField
            id="field-authorizedSignatory"
            label="Firmatecknarens namn"
            autoComplete="name"
            required
            hideRequiredMark
            className={styles.pillField}
            value={data.authorizedSignatory}
            error={errors.authorizedSignatory}
            helperText="Personen ska vara behörig firmatecknare för företaget."
            onChange={(event) => onChange('authorizedSignatory', event.target.value)}
          />
        ) : null}
      </div>
    </section>
  )
}
