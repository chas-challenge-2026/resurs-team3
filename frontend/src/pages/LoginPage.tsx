import { useState } from 'react'
import type { FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { BrandBlob } from '../components/BrandBlob'
import { BankIdMark } from '../components/BankIdMark'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { useAuth } from '../context/AuthContext'
import type { LoginMethod } from '../types/auth'
import { Icon } from '../components/Icon'

export function LoginPage() {
  const { login } = useAuth()
  const [activeTab, setActiveTab] = useState<LoginMethod>('bankid')
  const [orgNumber, setOrgNumber] = useState('556000-1234')
  const [email, setEmail] = useState('karin@resurs.se')
  const [password, setPassword] = useState('1234')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    login(activeTab, activeTab === 'bankid' ? 'Göteborg Handel AB' : 'Karin Handläggare')
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-resurs-bg">
      <BrandBlob width={560} />

      <div className="relative z-10 w-full" style={{ maxWidth: 450, aspectRatio: '450 / 240' }}>
        <Logo width="100%" height="100%" />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md rounded-lg bg-resurs-panel p-5 shadow-xl sm:p-8">
          <h1 className="text-xl font-extrabold text-white">Resurs kreditansökan</h1>
          <p className="mt-1 text-sm text-resurs-muted">Logga in för att fortsätta.</p>

          <div className="mt-6 flex rounded-md bg-black/20 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('bankid')}
              className={`min-h-[44px] min-w-0 flex-1 truncate rounded-md px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                activeTab === 'bankid' ? 'bg-resurs-orange text-resurs-onOrange' : 'text-white/80 hover:text-white'
              }`}
            >
              Företagsinloggning
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('handlaggare')}
              className={`min-h-[44px] min-w-0 flex-1 truncate rounded-md px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                activeTab === 'handlaggare' ? 'bg-resurs-orange text-resurs-onOrange' : 'text-white/80 hover:text-white'
              }`}
            >
              Handläggare
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <BankIdMark />
            <p className="mt-2 text-xs text-resurs-muted">Autentisering via BankID</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 rounded-md bg-resurs-card p-5">
            {activeTab === 'bankid' ? (
              <>
                <TextField
                  label="Organisationsnummer"
                  required
                  value={orgNumber}
                  onChange={(e) => setOrgNumber(e.target.value)}
                  helperText="Ange organisationsnummer för BankID-autentisering"
                />
                <Button type="submit" className="mt-4 w-full" icon={<Icon name="lock" />}>
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
                  className="mt-4"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button type="submit" className="mt-4 w-full" icon={<Icon name="lock" />}>
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
