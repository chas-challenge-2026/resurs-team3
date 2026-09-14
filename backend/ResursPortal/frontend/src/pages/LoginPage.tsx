import { useState } from 'react'
import type { FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { BrandBlob } from '../components/BrandBlob'
import { BankIdMark } from '../components/BankIdMark'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { useAuth } from '../context/useAuth'
import type { LoginMethod } from '../types/auth'
import { Icon } from '../components/Icon'
import { joinClassNames } from '../lib/joinClassNames'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { login } = useAuth()
  const [activeTab, setActiveTab] = useState<LoginMethod>('bankid')
  const [orgNumber, setOrgNumber] = useState('556000-1234')
  const [email, setEmail] = useState('karin@resurs.se')
  const [password, setPassword] = useState('password123')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    login(activeTab, activeTab === 'bankid' ? 'Göteborg Handel AB' : 'Karin Handläggare')
  }

  return (
    <div className={styles.page}>
      <BrandBlob width={560} />

      <div className={styles.logoWrap} style={{ maxWidth: 450, aspectRatio: '450 / 240' }}>
        <Logo width="100%" height="100%" />
      </div>

      <div className={styles.contentWrap}>
        <div className={styles.card}>
          <h1 className={styles.title}>Resurs kreditansökan</h1>
          <p className={styles.subtitle}>Logga in för att fortsätta.</p>

          <div className={styles.tabRow}>
            <button
              type="button"
              onClick={() => setActiveTab('bankid')}
              className={joinClassNames(styles.tab, activeTab === 'bankid' && styles.tabActive)}
            >
              Företagsinloggning
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('handlaggare')}
              className={joinClassNames(styles.tab, activeTab === 'handlaggare' && styles.tabActive)}
            >
              Handläggare
            </button>
          </div>

          <div className={styles.bankIdRow}>
            <BankIdMark />
            <p className={styles.bankIdCaption}>Autentisering via BankID</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {activeTab === 'bankid' ? (
              <>
                <TextField
                  label="Organisationsnummer"
                  required
                  value={orgNumber}
                  onChange={(e) => setOrgNumber(e.target.value)}
                  helperText="Ange organisationsnummer för BankID-autentisering"
                />
                <Button type="submit" className={styles.submitButton} icon={<Icon name="lock" />}>
                  Logga in med BankID
                </Button>
              </>
            ) : (
              <>
                <TextField
                  label="E-postadress"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  label="Lösenord"
                  type="password"
                  className={styles.passwordField}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button type="submit" className={styles.submitButton} icon={<Icon name="lock" />}>
                  Logga in
                </Button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
