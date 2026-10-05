import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/Icon'
import { BankIdMark } from '../components/BankIdMark'
import { useAuth } from '../auth/useAuth'
import { validateBankIdLogin } from '../auth/bankIdLogin.validation'
import type { BankIdLoginErrors, BankIdLoginValues } from '../auth/bankIdLogin.validation'
import { confirmBankIdMock, startBankIdMock } from '../auth/mockBankId'
import type { MockBankIdCompany } from '../auth/mockBankId'
import loginStyles from './LoginPage.module.css'
import styles from './BankIdLoginForm.module.css'

const INITIAL_VALUES: BankIdLoginValues = { orgNumber: '556000-1234' }

/**
 * The BankID tab's login flow. Phase 1 had this resolve instantly on
 * submit; this replaces that with a validated org-number step, a simulated
 * "waiting for the BankID app" step, and a manually-triggered confirm step
 * — there's no real phone app or backend polling endpoint to wait on (see
 * docs/auth.md, Phase 3), so confirmation is a button click instead of an
 * automatic poll loop.
 */
export function BankIdLoginForm() {
  const { loginAsClient } = useAuth()
  const [values, setValues] = useState<BankIdLoginValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<BankIdLoginErrors>({})
  const [touched, setTouched] = useState<{ orgNumber?: boolean }>({})
  const [isStarting, setIsStarting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingCompany, setPendingCompany] = useState<MockBankIdCompany | null>(null)

  const formRef = useRef<HTMLFormElement>(null)
  const pendingPanelRef = useRef<HTMLDivElement>(null)

  // Phase 5 (a11y): move focus to the pending panel when it appears, so
  // keyboard and screen-reader users land on the new state instead of
  // staying on a submit button that no longer exists in the DOM. The
  // panel's own role="status"/aria-live already announces it, but moving
  // focus there too is what lets a keyboard user immediately reach
  // "Avbryt"/"Jag har bekräftat" via Tab instead of hunting for them.
  useEffect(() => {
    if (pendingCompany) {
      pendingPanelRef.current?.focus()
    }
  }, [pendingCompany])

  // Focus needs to move back to the org-number field on cancel too, but
  // the form isn't back in the DOM yet at the point handleCancel runs —
  // it only remounts once the pendingCompany state update above has been
  // rendered. justCancelledRef records the intent; this effect acts on it
  // once the form is actually there to focus.
  const justCancelledRef = useRef(false)
  useEffect(() => {
    if (!pendingCompany && justCancelledRef.current) {
      justCancelledRef.current = false
      formRef.current?.querySelector('input')?.focus()
    }
  }, [pendingCompany])

  function validateField(nextValues: BankIdLoginValues) {
    const fieldErrors = validateBankIdLogin(nextValues)
    setErrors(fieldErrors)
  }

  function handleChange(value: string) {
    const nextValues = { orgNumber: value }
    setValues(nextValues)
    if (formError) setFormError(null)
    if (touched.orgNumber) {
      validateField(nextValues)
    }
  }

  function handleBlur() {
    setTouched({ orgNumber: true })
    validateField(values)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const fieldErrors = validateBankIdLogin(values)
    setErrors(fieldErrors)
    setTouched({ orgNumber: true })

    if (Object.keys(fieldErrors).length > 0) {
      return
    }

    setFormError(null)
    setIsStarting(true)
    const company = await startBankIdMock(values.orgNumber)
    setIsStarting(false)

    if (!company) {
      setFormError('Org.nummer hittades inte eller är inte godkänt för BankID-inloggning.')
      return
    }

    setPendingCompany(company)
  }

  async function handleConfirm() {
    if (!pendingCompany) return
    setIsConfirming(true)
    await confirmBankIdMock()
    loginAsClient({
      id: pendingCompany.orgNumber,
      orgNumber: pendingCompany.orgNumber,
      companyName: pendingCompany.companyName,
    })
    // No reset of isConfirming — LoginPage unmounts on navigation, same as
    // AdminLoginForm's isSubmitting.
  }

  function handleCancel() {
    justCancelledRef.current = true
    setPendingCompany(null)
    setIsConfirming(false)
    // Focus is restored to the org-number field by the effect above, once
    // the form has actually remounted — see justCancelledRef.
  }

  if (pendingCompany) {
    return (
      <div
        ref={pendingPanelRef}
        className={styles.pendingPanel}
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.pendingText}>
          Öppna BankID-appen på din telefon och bekräfta inloggningen för{' '}
          <span className={styles.pendingCompany}>{pendingCompany.companyName}</span>.
        </p>
        {import.meta.env.DEV ? (
          <p className={styles.devNote}>
            Ingen riktig BankID-integration finns ännu — klicka nedan för att simulera
            bekräftelse i appen.
          </p>
        ) : null}
        <div className={styles.pendingActions}>
          <Button type="button" variant="secondary" onClick={handleCancel} disabled={isConfirming}>
            Avbryt
          </Button>
          <Button type="button" onClick={handleConfirm} icon={<Icon name="check" />} disabled={isConfirming}>
            {isConfirming ? 'Bekräftar…' : 'Jag har bekräftat'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={loginStyles.form} noValidate>
      {formError ? (
        <p role="alert" className={loginStyles.formError}>
          {formError}
        </p>
      ) : null}

      <p className={loginStyles.requiredNote}>Alla fält är obligatoriska.</p>

      <TextField
        label="Organisationsnummer"
        labelHint="XXXXXX-XXXX"
        className={loginStyles.pillField}
        required
        hideRequiredMark
        value={values.orgNumber}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        error={touched.orgNumber ? errors.orgNumber : undefined}
        helperText="Ange organisationsnummer för BankID-autentisering"
      />
      <Button
        type="submit"
        className={loginStyles.submitButton}
        icon={<BankIdMark height={20} decorative />}
        disabled={isStarting}
      >
        {isStarting ? 'Kontrollerar…' : 'Logga in med BankID'}
      </Button>
    </form>
  )
}
