import { useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/Icon'
import { useAuth } from '../auth/useAuth'
import { validateAdminLogin } from '../auth/adminLogin.validation'
import type { AdminLoginErrors, AdminLoginValues } from '../auth/adminLogin.validation'
import { authenticateAdminMock } from '../auth/mockAdminDirectory'
import styles from './LoginPage.module.css'

const INITIAL_VALUES: AdminLoginValues = { email: 'karin@resurs.se', password: 'password123' }

type FieldName = keyof AdminLoginValues

/**
 * The Handläggare tab's login form. Owns its own values/errors/touched/
 * isSubmitting state rather than sharing LoginPage's, since it's the only
 * tab that validates and can fail. Validates a field on blur; once a field
 * has been touched, it revalidates live on every change (same "start quiet,
 * then keep up" pattern the wizard's step validation uses).
 */
export function AdminLoginForm() {
  const { loginAsAdmin } = useAuth()
  const [values, setValues] = useState<AdminLoginValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<AdminLoginErrors>({})
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function validateField(field: FieldName, nextValues: AdminLoginValues) {
    const fieldErrors = validateAdminLogin(nextValues)
    setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }))
  }

  function handleChange(field: FieldName, value: string) {
    const nextValues = { ...values, [field]: value }
    setValues(nextValues)
    if (formError) setFormError(null)
    if (touched[field]) {
      validateField(field, nextValues)
    }
  }

  function handleBlur(field: FieldName) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    validateField(field, values)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const fieldErrors = validateAdminLogin(values)
    setErrors(fieldErrors)
    setTouched({ email: true, password: true })

    if (Object.keys(fieldErrors).length > 0) {
      return
    }

    setFormError(null)
    setIsSubmitting(true)

    const user = await authenticateAdminMock(values.email, values.password)

    if (!user) {
      // Generic on purpose — never reveal whether the email itself exists.
      setFormError('Fel e-postadress eller lösenord.')
      setIsSubmitting(false)
      return
    }

    loginAsAdmin({ id: user.id, name: user.name, email: user.email })
    // No reset of isSubmitting on success — LoginPage unmounts on navigation.
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {formError ? (
        <p role="alert" className={styles.formError}>
          {formError}
        </p>
      ) : null}

      <p className={styles.requiredNote}>Alla fält är obligatoriska.</p>

      <TextField
        label="E-postadress"
        type="email"
        required
        hideRequiredMark
        autoComplete="email"
        className={styles.pillField}
        value={values.email}
        onChange={(e) => handleChange('email', e.target.value)}
        onBlur={() => handleBlur('email')}
        error={touched.email ? errors.email : undefined}
      />
      <TextField
        label="Lösenord"
        type="password"
        required
        hideRequiredMark
        autoComplete="current-password"
        className={styles.pillField}
        value={values.password}
        onChange={(e) => handleChange('password', e.target.value)}
        onBlur={() => handleBlur('password')}
        error={touched.password ? errors.password : undefined}
      />
      <Button
        type="submit"
        className={styles.submitButton}
        icon={<Icon name="lock" />}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Loggar in…' : 'Logga in'}
      </Button>
    </form>
  )
}
