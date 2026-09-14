import { useAuth } from '../../context/useAuth'
import { Button } from '../../components/ui/Button'
import styles from './WizardTopBar.module.css'

interface WizardTopBarProps {
  title: string
}

/** Mirrors BackofficeTopBar's avatar/logout treatment so the applicant and
 * caseworker shells read as the same product. */
export function WizardTopBar({ title }: WizardTopBarProps) {
  const { state, logout } = useAuth()
  const initial = state.companyDisplayName.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className={styles.topBar}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.identity}>
        <div role="img" aria-label={state.companyDisplayName} className={styles.avatar}>
          {initial}
        </div>
        <span className={styles.companyName}>{state.companyDisplayName}</span>
        <Button variant="primary" onClick={logout} className={styles.logoutButton}>
          Logga ut
        </Button>
      </div>
    </div>
  )
}
