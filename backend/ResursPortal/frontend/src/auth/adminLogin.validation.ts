export type AdminLoginErrors = Partial<Record<'email' | 'password', string>>

export interface AdminLoginValues {
  email: string
  password: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateAdminLogin(values: AdminLoginValues): AdminLoginErrors {
  const errors: AdminLoginErrors = {}

  if (!values.email.trim()) {
    errors.email = 'E-postadress måste anges.'
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Ange en giltig e-postadress.'
  }

  if (!values.password) {
    errors.password = 'Lösenord måste anges.'
  }

  return errors
}
