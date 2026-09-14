import { useAuth } from '../../context/useAuth'
import { AccountBadge } from '../../components/AccountBadge'
import styles from './WizardTopBar.module.css'

interface WizardTopBarProps {
  title: string
}

/** Mirrors BackofficeTopBar's avatar/logout treatment so the applicant and
 * caseworker shells read as the same product. */
export function WizardTopBar({ title }: WizardTopBarProps) {
  const { state, logout } = useAuth()

  return (
    <div className={styles.topBar}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.identity}>
        <AccountBadge companyDisplayName={state.companyDisplayName} onLogout={logout} />
      </div>
    </div>
  )
}
