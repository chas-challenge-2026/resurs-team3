import { useAuth } from '../../context/useAuth'
import { Icon } from '../../components/Icon'
import { AccountBadge } from '../../components/AccountBadge'
import styles from './BackofficeTopBar.module.css'

interface BackofficeTopBarProps {
  search: string
  onSearchChange: (value: string) => void
}

export function BackofficeTopBar({ search, onSearchChange }: BackofficeTopBarProps) {
  const { state, logout } = useAuth()

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
        <AccountBadge companyDisplayName={state.companyDisplayName} onLogout={logout} />
      </div>
    </div>
  )
}
