import type { ReactNode } from 'react'
import { useAuth } from '../../auth/useAuth'
import { Icon } from '../../components/Icon'
import { AccountBadge } from '../../components/AccountBadge'
import styles from './BackofficeTopBar.module.css'
import { useState } from 'react'

interface BackofficeTopBarProps {
  search: string
  onSearchChange: (value: string) => void
  children?: ReactNode
}

export function BackofficeTopBar({ search, onSearchChange, children }: BackofficeTopBarProps) {
  const { user, logout } = useAuth()

const [logoutError, setLogoutError] = useState<string | null>(null)
const [loggingOut, setLoggingOut] = useState(false)

async function handleLogout() {
  if (loggingOut) return

  setLoggingOut(true)
  setLogoutError(null)

  try {
    const response = await fetch('/logout', {
      method: 'GET',
      credentials: 'same-origin',
      redirect: 'manual',
    })

    if (response.type !== 'opaqueredirect') {
      throw new Error('Unexpected logout response')
    }

    const verification = await fetch('/backoffice', {
      method: 'GET',
      credentials: 'same-origin',
      redirect: 'manual',
    })

    if (verification.type !== 'opaqueredirect') {
      throw new Error('Caseworker session is still active')
    }

    logout()
  } catch {
    setLogoutError('Utloggningen kunde inte verifieras. Försök igen.')
  } finally {
    setLoggingOut(false)
  }
}

  const displayName = user?.role === 'client' ? user.companyName : (user?.name ?? '')

  return (
    <div className={styles.topBar}>
      {children}

      <div className={styles.searchWrap}>
        <label htmlFor="case-search" className={styles.searchLabel}>
          Sök ärende
        </label>
        <div className={styles.inputWrap}>
          <input
            id="case-search"
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Sök företag, org.nr eller ID"
            className={styles.searchInput}
          />
          <Icon name="search" className={styles.searchIcon} />
        </div>
      </div>

      <div className={styles.identity}>
        <AccountBadge companyDisplayName={displayName} onLogout={handleLogout} />
        {logoutError ? <p role="alert">{logoutError}</p> : null}
      </div>
    </div>
  )
}
