import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Icon } from '../components/Icon'
import { AdminLoginForm } from './AdminLoginForm'
import { BankIdLoginForm } from './BankIdLoginForm'
import { joinClassNames } from '../lib/joinClassNames'
import { SCORING_THRESHOLDS } from '../utils/scoring'
import styles from './LoginPage.module.css'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { Logo } from '../components/Logo'

type LoginTab = 'bankid' | 'handlaggare'

const TABS: Array<{ id: LoginTab; label: string }> = [
  { id: 'bankid', label: 'Företagsinloggning' },
  { id: 'handlaggare', label: 'Handläggare' },
]

// Short, checkable promises; each one is confirmed by the team or follows
// from the app's own rules (scoring, validation range).
const PROMISES = [
  'Kostnadsfri ansökan',
  'Tar under 10 minuter',
  'Oftast beslut direkt efter signeringen',
  'Beslutet kommer med motivering',
]

const pct = (value: number) => `${Math.round(value * 100)} %`
const dec = (value: number) => value.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// An example of what the applicant gets back: the decision and the ratios
// behind it, worded like the status page (explainApproval). The company's
// values are invented and the card says so; the limits are the real ones.
const EXAMPLE_REASONS = [
  `Soliditet 38 %, kravet är minst ${pct(SCORING_THRESHOLDS.soliditet.reject)}.`,
  `Räntetäckningsgrad 6,2, kravet är minst ${dec(SCORING_THRESHOLDS.rantetackningsgrad.reject)}.`,
  `Skuldsättningsgrad 1,1, får vara högst ${dec(SCORING_THRESHOLDS.skuldsattningsgrad.reject)}.`,
]

function DecisionExample() {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleCaption}>Exempel på ett beslut</figcaption>
      <div className={styles.exampleCard}>
        <span className={styles.exampleBadge}>Beviljad</span>
        <p className={styles.exampleTitle}>Ansökan är beviljad</p>
        <p className={styles.exampleMeta}>500 000 SEK · 36 månader</p>
        <p className={styles.exampleReasonsTitle}>Därför beviljades ansökan</p>
        <ul className={styles.exampleReasons}>
          {EXAMPLE_REASONS.map((reason) => (
            <li key={reason}><Icon name="check" className={styles.exampleCheck} />{reason}</li>
          ))}
        </ul>
      </div>
    </figure>
  )
}

/**
 * Start page: one big promise on the dark side, the brand and the login on
 * the white side, joined by a curved seam. Phones get the white side only.
 */
export function LoginPage() {
  useDocumentTitle('Logga in')
  const [activeTab, setActiveTab] = useState<LoginTab>('bankid')
  const tabRefs = useRef<Partial<Record<LoginTab, HTMLButtonElement | null>>>({})

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab)
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TABS.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = TABS.length - 1

    if (nextIndex === null) return
    event.preventDefault()
    const nextTab = TABS[nextIndex].id
    setActiveTab(nextTab)
    tabRefs.current[nextTab]?.focus()
  }

  return (
    <main className={styles.page}>
      <aside className={styles.marketing} aria-label="Om ansökan">
        <div className={styles.pitch}>
          <h2 className={styles.headline}>
            Företagskredit upp till 10&nbsp;000&nbsp;000&nbsp;SEK.
          </h2>
          <p className={styles.tagline}>
            Från 250&nbsp;000&nbsp;SEK, 12–60 månader. Ansök med siffrorna från årsredovisningen och signera med BankID.
          </p>

          <ul className={styles.promises}>
            {PROMISES.map((promise) => (
              <li key={promise}><Icon name="check" className={styles.promiseIcon} />{promise}</li>
            ))}
          </ul>
          {/* Said plainly where the applicant decides to start, not in fine print. */}
          <p className={styles.ucNote}>En kreditupplysning (UC) tas på företaget.</p>
        </div>
        {/* The product shown, not described: what a decision looks like. */}
        <DecisionExample />
      </aside>

      <section className={styles.content} aria-labelledby="login-title">
        <header className={styles.contentHeader}>
          <Logo className={styles.logo} />
        </header>

        <div className={styles.card}>
          <h1 className={styles.title} id="login-title">Logga in</h1>
          <p className={styles.description}>
            Ansök om kredit eller fortsätt en påbörjad ansökan.
          </p>

          <div className={styles.tabContainer} role="tablist" aria-label="Inloggningsmetod">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el }}
                type="button"
                role="tab"
                id={`login-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`login-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={handleTabKeyDown}
                className={joinClassNames(styles.tabBtn, activeTab === tab.id && styles.tabActive)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            key={activeTab}
            role="tabpanel"
            id={`login-panel-${activeTab}`}
            aria-labelledby={`login-tab-${activeTab}`}
            className={styles.panel}
          >
            {activeTab === 'bankid' ? <BankIdLoginForm /> : <AdminLoginForm />}
          </div>
        </div>

        <footer className={styles.contentFooter}>
          <span>© 2026 Resurs Direkt AB</span>
        </footer>
      </section>
    </main>
  )
}
