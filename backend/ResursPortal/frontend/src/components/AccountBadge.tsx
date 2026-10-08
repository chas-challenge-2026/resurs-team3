import styles from './AccountBadge.module.css'

interface AccountBadgeProps {
  companyDisplayName: string
  onLogout: () => void
}

/**
 * The avatar circle + display name + logout button cluster shared by
 * BackofficeTopBar (and the applicant top bar) — previously duplicated byte-for-byte
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
      {/* Quiet on purpose: orange is reserved for the one primary action on
          a screen (DESIGN.md), and logging out is never that. */}
      <button type="button" onClick={onLogout} className={styles.logoutButton}>
        Logga ut
      </button>
    </>
  )
}
