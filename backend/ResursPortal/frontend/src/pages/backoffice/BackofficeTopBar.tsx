import { useAuth } from '../../auth/useAuth'
import { Icon } from '../../components/Icon'
import { AccountBadge } from '../../components/AccountBadge'
import styles from './BackofficeTopBar.module.css'

interface BackofficeTopBarProps {
  search: string
  onSearchChange: (value: string) => void
}

export function BackofficeTopBar({ search, onSearchChange }: BackofficeTopBarProps) {
  const { user, logout } = useAuth()
  const displayName = user?.role === 'admin' ? user.name : ''

  return (
    <div className={styles.topBar}>
      <div className={styles.searchWrap}>
        <label htmlFor="case-search" className={styles.srOnly}>
          Sök företag eller org.nummer
        </label>
        <input
          id="case-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Sök företag eller org.nummer"
          className={styles.searchInput}
        />
        <Icon name="search" className={styles.searchIcon} />
      </div>

      <div className={styles.identity}>
        <AccountBadge companyDisplayName={displayName} onLogout={logout} />
      </div>
    </div>
  )
}
