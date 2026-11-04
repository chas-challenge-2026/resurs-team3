import { useMemo, useRef, useState } from 'react'
import type { AppNotification } from '../../types/backoffice'
import { useCases } from '../../context/useCases'
import { Icon } from '../../components/Icon'
import { joinClassNames } from '../../lib/joinClassNames'
import styles from './NotificationsView.module.css'

interface NotificationsViewProps {
  search: string
  onOpenCase: (caseId: string) => void
}

type InboxFilter = 'ALL' | 'UNREAD'

function matchesSearch(notification: AppNotification, search: string) {
  const query = search.trim().toLocaleLowerCase('sv-SE')
  if (!query) return true
  return [notification.companyName, notification.caseId, notification.message]
    .some((value) => value.toLocaleLowerCase('sv-SE').includes(query))
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** "Idag", "Igår", or the date ("11 okt. 2026"). */
function dayLabel(iso: string, today: number) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Okänt datum'
  const day = startOfDay(date)
  if (day === today) return 'Idag'
  if (day === today - 86_400_000) return 'Igår'
  return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function timeOf(iso: string) {
  const time = new Date(iso).getTime()
  return Number.isNaN(time) ? -Infinity : time
}

function timeLabel(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit' }).format(date)
}

/**
 * Aviseringar as an inbox: one compact row per notification (company,
 * message, time), unread in bold with a dot, grouped by day. A row opens its
 * case and marks it read; the envelope button toggles read/unread.
 */
export function NotificationsView({ search, onOpenCase }: NotificationsViewProps) {
  const { notifications, cases, markNotificationsRead, markNotificationRead, markNotificationUnread } = useCases()
  const [notice, setNotice] = useState('')
  const allFilterRef = useRef<HTMLButtonElement>(null)
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [filter, setFilter] = useState<InboxFilter>('ALL')
  const [today] = useState(() => startOfDay(new Date()))

  const searched = useMemo(() => notifications
    .filter((notification) => matchesSearch(notification, search))
    // Newest first; an unreadable date sorts last instead of splitting a day group.
    .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt)), [notifications, search])
  const visible = filter === 'UNREAD' ? searched.filter((notification) => !notification.read) : searched
  const unreadCount = notifications.filter((notification) => !notification.read).length

  const groups: Array<{ label: string; items: AppNotification[] }> = []
  for (const notification of visible) {
    const label = dayLabel(notification.createdAt, today)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(notification)
    else groups.push({ label, items: [notification] })
  }

  function openCase(notification: AppNotification) {
    markNotificationRead(notification.id)
    // A notification can outlive its case; never open a different case instead.
    if (!cases.some((item) => item.id === notification.caseId)) {
      setNotice(`Ärendet ${notification.caseId.toUpperCase()} finns inte längre. Aviseringen har markerats som läst.`)
      return
    }
    onOpenCase(notification.caseId)
  }

  function toggleRead(notification: AppNotification) {
    if (notification.read) {
      markNotificationUnread(notification.id)
      return
    }
    markNotificationRead(notification.id)
    // Under Olästa the row disappears: keep focus in the list, not on <body>.
    if (filter === 'UNREAD') {
      const index = visible.findIndex((item) => item.id === notification.id)
      const next = visible[index + 1] ?? visible[index - 1]
      requestAnimationFrame(() => (next ? rowRefs.current[next.id] : allFilterRef.current)?.focus())
    }
  }

  function markAllRead() {
    markNotificationsRead()
    // The button removes itself; focus moves to the list filters.
    requestAnimationFrame(() => allFilterRef.current?.focus())
  }

  const emptyTitle = search.trim()
    ? 'Inga aviseringar matchar sökningen'
    : filter === 'UNREAD' ? 'Inga olästa aviseringar' : 'Inga aviseringar ännu'
  const emptyText = search.trim()
    ? 'Prova ett annat företagsnamn, organisationsnummer eller ID.'
    : filter === 'UNREAD' ? 'Allt är läst. Välj Alla för att se tidigare aviseringar.' : 'Nya ansökningar visas här när de skickas in.'

  return (
    <section className={styles.page} aria-labelledby="notifications-heading">
      <header className={styles.header}>
        <div>
          <h1 id="notifications-heading">Aviseringar</h1>
          <p>Uppdateringar om inkomna ansökningar och deras automatiska bedömning.</p>
        </div>
        {unreadCount > 0 ? <button type="button" className={styles.markAllButton} onClick={markAllRead}>Markera alla som lästa</button> : null}
      </header>

      <div className={styles.filters} role="group" aria-label="Visa aviseringar">
        <button type="button" ref={allFilterRef} aria-pressed={filter === 'ALL'} className={styles.filter} onClick={() => setFilter('ALL')}>
          Alla <span className={styles.filterCount}>{searched.length}</span>
        </button>
        <button type="button" aria-pressed={filter === 'UNREAD'} className={styles.filter} onClick={() => setFilter('UNREAD')}>
          Olästa <span className={styles.filterCount}>{searched.filter((notification) => !notification.read).length}</span>
        </button>
      </div>

      {/* Mounted from the start, so the first notice is announced too. */}
      <p className={notice ? styles.notice : styles.srOnly} role="status">{notice}</p>

      {visible.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>{emptyTitle}</h2>
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className={styles.inbox}>
          {groups.map((group) => (
            <section key={group.label} className={styles.group} aria-label={group.label}>
              <h2 className={styles.groupLabel}>{group.label}</h2>
              <ul className={styles.list}>
                {group.items.map((notification) => (
                  <li key={notification.id} className={joinClassNames(styles.row, !notification.read && styles.unread)}>
                    <button type="button" ref={(el) => { rowRefs.current[notification.id] = el }} className={styles.rowMain} onClick={() => openCase(notification)}>
                      <span className={styles.dot} aria-hidden="true" />
                      <span className={styles.srOnly}>{notification.read ? 'Läst: ' : 'Oläst: '}</span>
                      <span className={styles.sender}>{notification.companyName}</span>
                      <span className={styles.preview}>{notification.message}</span>
                      <span className={styles.caseRef}>Ansökan {notification.caseId.toUpperCase()}</span>
                      <time className={styles.time} dateTime={notification.createdAt}>{timeLabel(notification.createdAt)}</time>
                    </button>
                    <button
                      type="button"
                      className={styles.toggle}
                      aria-label={notification.read ? `Markera som oläst: ${notification.companyName}` : `Markera som läst: ${notification.companyName}`}
                      title={notification.read ? 'Markera som oläst' : 'Markera som läst'}
                      onClick={() => toggleRead(notification)}
                    >
                      <Icon name={notification.read ? 'mail-open' : 'mail'} className={styles.toggleIcon} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
