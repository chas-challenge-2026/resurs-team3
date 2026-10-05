import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Logo } from '../components/Logo'
import { BankIdMark } from '../components/BankIdMark'
import { Icon } from '../components/Icon'
import { Button } from '../components/ui/Button'
import { AdminLoginForm } from './AdminLoginForm'
import { BankIdLoginForm } from './BankIdLoginForm'
import { joinClassNames } from '../lib/joinClassNames'
import styles from './LoginPage.module.css'

type LoginTab = 'bankid' | 'handlaggare'

const TABS: Array<{ id: LoginTab; label: string }> = [
  { id: 'bankid', label: 'Företagsinloggning' },
  { id: 'handlaggare', label: 'Handläggare' },
]

/**
 * The headline/description/feature-checklist copy — identical on the intro
 * screen (paired with the CTA) and the login screen (paired with the
 * smaller logo + footer), so it's factored out rather than duplicated.
 */
function HeroCopy() {
  return (
    <>
      <h2 className={styles.heroHeadline}>Din ansökan, på ett och samma ställe.</h2>
      <p className={styles.heroDescription}>
        Logga in för att fortsätta med din kreditansökan. Identifiera dig enkelt med BankID.
      </p>
      <ul className={styles.heroFeatures}>
        <li className={styles.heroFeatureItem}>
          <Icon name="check" className={styles.heroFeatureIcon} />
          Enkel ansökningsprocess
        </li>
        <li className={styles.heroFeatureItem}>
          <Icon name="check" className={styles.heroFeatureIcon} />
          Snabba svarstider
        </li>
        <li className={styles.heroFeatureItem}>
          <Icon name="check" className={styles.heroFeatureIcon} />
          Kundsupport vid frågor
        </li>
      </ul>
    </>
  )
}

export function LoginPage() {
  // Gates the login layout behind an intro/landing step — left panel is
  // just the (huge) logo, right panel is the pitch copy + a CTA. Clicking
  // the CTA swaps straight to the login layout (no animation — an instant
  // state swap, matching the rest of this page's already-large unverified
  // change set rather than adding an animated transition on top of it).
  const [started, setStarted] = useState(false)
  const [activeTab, setActiveTab] = useState<LoginTab>('bankid')
  const tabRefs = useRef<Partial<Record<LoginTab, HTMLButtonElement | null>>>({})
  const loginTitleRef = useRef<HTMLHeadingElement>(null)

  // Same reasoning as BankIdLoginForm's pendingPanel focus effect: `started`
  // swaps out the entire intro section for the login section (a full DOM
  // replacement, not a content update), so without this a keyboard/screen-
  // reader user who clicks "Kom igång" loses focus into the void instead of
  // landing on the new "Resurs kreditansökan" heading.
  useEffect(() => {
    if (started) {
      loginTitleRef.current?.focus()
    }
  }, [started])

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

  if (!started) {
    return (
      <div className={styles.page}>
        <main className={styles.splitCard}>
          <section className={styles.introLogoPanel} aria-label="Resurs Direkt">
            <Logo width="70%" height="auto" />
          </section>

          <aside className={styles.heroPanel} aria-label="Information">
            <div className={styles.heroContent}>
              <HeroCopy />
              <Button type="button" className={styles.ctaButton} onClick={() => setStarted(true)}>
                Kom igång
              </Button>
            </div>
          </aside>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <main className={styles.splitCard}>
        <aside className={styles.heroPanel} aria-label="Information">
          <div className={styles.heroContent}>
            <div className={styles.brandLogo}><Logo height={112} /></div>
            <HeroCopy />
          </div>
          <footer className={styles.rightFooter}>
            <div className={styles.trustBadges}>
              <span className={styles.trustBadge}>
                <BankIdMark height={24} decorative />
                BankID-ansluten
              </span>
            </div>
            <a className={styles.helpLink} href="#hjalp">Hjälp &amp; FAQ</a>
          </footer>
        </aside>

        <section className={styles.formPanel} aria-labelledby="login-title">
          <div className={styles.formContainer}>
            <header className={styles.cardHeader}>
              <h1 className={styles.title} id="login-title" ref={loginTitleRef} tabIndex={-1}>Resurs kreditansökan</h1>
              <p className={styles.subtitle}>Logga in för att fortsätta.</p>
            </header>

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

          <footer className={styles.leftFooter}>
            <span>© 2026 Resurs Direkt AB</span>
            <nav className={styles.footerNav} aria-label="Juridisk information">
              <a href="#integritet">Integritetspolicy</a>
              <span aria-hidden="true">·</span>
              <a href="#villkor">Användarvillkor</a>
            </nav>
          </footer>
        </section>
      </main>
    </div>
  )
}
