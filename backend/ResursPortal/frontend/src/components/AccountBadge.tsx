import { Button } from './ui/Button'
import styles from './AccountBadge.module.css'

interface AccountBadgeProps {
  companyDisplayName: string
  onLogout: () => void
}

/**
 * The avatar circle + display name + logout button cluster shared by
 * WizardTopBar and BackofficeTopBar — previously duplicated byte-for-byte
 * in both. Each caller keeps its own outer flex wrapper since their
 * surrounding layouts differ slightly; this owns only the three elements
 * that were identical.
 */
export function AccountBadge({ companyDisplayName, onLogout }: AccountBadgeProps) {
  const initial = companyDisplayName.trim().charAt(0).toUpperCase() || '?'

  return (
    <>
      <div role="img" aria-label={companyDisplayName} className={styles.avatar}>
        {initial}
      </div>
      <span className={styles.name}>{companyDisplayName}</span>
      <Button variant="primary" onClick={onLogout} className={styles.logoutButton}>
        Logga ut
      </Button>
    </>
  )
}
