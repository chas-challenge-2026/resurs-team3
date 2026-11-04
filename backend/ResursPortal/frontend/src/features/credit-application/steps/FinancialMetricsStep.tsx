import { AmountField } from '../AmountField'
import type { CreditApplicationData } from '../creditApplication.types'
import { FINANCIAL_FIELD_KEYS, looksLikeThousands, type FinancialErrors } from '../creditApplication.validation'
import { useState } from 'react'
import styles from './FinancialMetricsStep.module.css'

type FinancialField =
  | 'financialYear'
  | 'equity'
  | 'totalCapital'
  | 'currentAssets'
  | 'shortTermLiabilities'
  | 'longTermLiabilities'
  | 'operatingProfit'
  | 'netSales'
  | 'operatingCashFlow'
  | 'investingCashFlow'
  | 'interestExpenses'
  | 'noCashFlowStatement'

type FigureField = Exclude<FinancialField, 'financialYear' | 'noCashFlowStatement'>

// Ordered the way the figures appear in a Swedish årsredovisning:
// resultaträkningen first, then balansräkningen (assets side, then equity
// and liabilities), then kassaflödesanalysen, so the applicant can copy them top to bottom.
const FIGURE_GROUPS: Array<{ title: string; fields: Array<{ key: FigureField; label: string; hint?: string }> }> = [
  {
    title: 'Resultaträkning',
    fields: [
      { key: 'netSales', label: 'Nettoomsättning', hint: 'Första raden i resultaträkningen.' },
      { key: 'operatingProfit', label: 'Rörelseresultat', hint: 'Resultat före finansiella poster. Kan vara negativt.' },
      { key: 'interestExpenses', label: 'Räntekostnader', hint: 'Räntekostnader och liknande resultatposter. 0 om det saknas.' },
    ],
  },
  {
    title: 'Balansräkning',
    fields: [
      { key: 'currentAssets', label: 'Omsättningstillgångar', hint: 'Summa omsättningstillgångar.' },
      { key: 'totalCapital', label: 'Balansomslutning', hint: 'Summa eget kapital och skulder.' },
      { key: 'equity', label: 'Eget kapital', hint: 'Summa eget kapital.' },
      { key: 'shortTermLiabilities', label: 'Kortfristiga skulder', hint: 'Summa kortfristiga skulder.' },
      { key: 'longTermLiabilities', label: 'Långfristiga skulder', hint: 'Summa långfristiga skulder. 0 om det saknas.' },
    ],
  },
  {
    title: 'Kassaflödesanalys',
    fields: [
      { key: 'operatingCashFlow', label: 'Operativt kassaflöde', hint: 'Kassaflöde från den löpande verksamheten.' },
      { key: 'investingCashFlow', label: 'Investeringskassaflöde', hint: 'Kassaflöde från investeringsverksamheten.' },
    ],
  },
]

interface FinancialMetricsStepProps {
  data: CreditApplicationData
  errors: FinancialErrors
  onChange: (field: FinancialField, value: string) => void
  /** Several fields at once (the tkr → kronor conversion). */
  onChangeMany: (updates: Partial<Record<FinancialField, string>>) => void
}

export function FinancialMetricsStep({
  data,
  errors,
  onChange,
  onChangeMany,
}: FinancialMetricsStepProps) {
  const [thousandsDismissed, setThousandsDismissed] = useState(false)
  const showThousandsCheck = !thousandsDismissed && looksLikeThousands(data)
  const noCashFlowStatement = data.noCashFlowStatement === 'true'

  function convertFromThousands() {
    const updates: Partial<Record<FinancialField, string>> = {}
    for (const key of FINANCIAL_FIELD_KEYS) {
      const value = data[key].trim()
      if (/^-?\d+$/.test(value) && Number(value) !== 0) updates[key] = String(Number(value) * 1000)
    }
    onChangeMany(updates)
    setThousandsDismissed(true)
  }
  const latestCompletedYear = new Date().getFullYear() - 1
  const reportingYears = Array.from({ length: 6 }, (_, index) => String(latestCompletedYear - index))

  return (
    <section>
      <h2 className={styles.heading}>Ekonomi</h2>
      <p className={styles.description}>Ange beloppen i hela kronor, inte tusental (tkr), som de står i årsredovisningen. Eget kapital, rörelseresultat och kassaflöden kan vara negativa.</p>

      <div className={styles.fields}>

        <div className={styles.periodField}>
          <label htmlFor="field-financialYear">Räkenskapsår</label>
          <select
            id="field-financialYear"
            required
            value={data.financialYear}
            aria-invalid={Boolean(errors.financialYear)}
            aria-describedby={errors.financialYear ? 'field-financialYear-error' : undefined}
            onChange={(event) => onChange('financialYear', event.target.value)}
          >
            <option value="">Välj räkenskapsår</option>
            {reportingYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          {errors.financialYear ? <p id="field-financialYear-error" className={styles.fieldError}>{errors.financialYear}</p> : null}
        </div>

        {showThousandsCheck ? (
          <div className={styles.thousandsCheck} role="status">
            <p>Beloppen ser ut att vara angivna i tusental kronor (tkr). Ska vi räkna om dem till kronor?</p>
            <div className={styles.thousandsActions}>
              <button type="button" className={styles.thousandsPrimary} onClick={convertFromThousands}>Multiplicera med 1 000</button>
              <button type="button" className={styles.thousandsSecondary} onClick={() => setThousandsDismissed(true)}>Nej, beloppen stämmer</button>
            </div>
          </div>
        ) : null}

        {FIGURE_GROUPS.map((group) => (
          <fieldset key={group.title} className={styles.group}>
            <legend className={styles.groupTitle}>{group.title}</legend>
            {group.title === 'Kassaflödesanalys' ? (
              <label className={styles.noCashFlow}>
                <input
                  type="checkbox"
                  checked={noCashFlowStatement}
                  onChange={(event) => onChange('noCashFlowStatement', event.target.checked ? 'true' : '')}
                />
                <span>Årsredovisningen har ingen kassaflödesanalys</span>
              </label>
            ) : null}
            {group.title === 'Kassaflödesanalys' && noCashFlowStatement ? (
              <p className={styles.noCashFlowNote}>Då bedömer en handläggare företagets kassaflöde, och ansökan kan inte beviljas automatiskt.</p>
            ) : (
            <div className={styles.groupFields}>
              {group.fields.map((field) => (
                <AmountField
                  key={field.key}
                  id={`field-${field.key}`}
                  label={field.label}
                  helperText={field.hint}
                  allowNegative={field.key === 'equity' || field.key === 'operatingProfit' || field.key === 'operatingCashFlow' || field.key === 'investingCashFlow'}
                  className={styles.pillField}
                  value={data[field.key]}
                  error={errors[field.key]}
                  // Not filled in yet is a to-do, not a mistake: amber, not red.
                  errorTone={data[field.key].trim() ? 'error' : 'attention'}
                  onChange={(raw) => onChange(field.key, raw)}
                />
              ))}
            </div>
            )}
          </fieldset>
        ))}
      </div>
    </section>
  )
}
