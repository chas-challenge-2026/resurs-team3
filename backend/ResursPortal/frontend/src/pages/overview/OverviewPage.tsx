import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useCases } from '../../context/useCases'
import type { ApplicationStatus, CreditCase } from '../../types/case'
import styles from './OverviewPage.module.css'
import { STATUS_LABEL } from '../../features/credit-application/statusLabels'
import { applicationStatusPath } from '../status/applicationProgress'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { ROUTES } from '../../routes'


const STATUS_CLASS: Record<ApplicationStatus, string> = {
  APPROVED: styles.approved,
  REJECTED: styles.rejected,
  UNDER_REVIEW: styles.review,
  PENDING_DOCS: styles.pending,
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(amount)
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium' }).format(date)
}

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`${styles.statusBadge} ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
}

function ApplicationCard({ application }: { application: CreditCase }) {
  return (
    <article className={styles.applicationCard}>
      <div className={styles.applicationMain}>
        <div className={styles.applicationHeading}>
          <h3><Link to={applicationStatusPath(application.id)} className={styles.applicationLink}>Ansökan {application.id.toUpperCase()}</Link></h3>
          <ApplicationStatusBadge status={application.status} />
        </div>
        <p className={styles.purpose}>{application.purpose || 'Företagskredit'}</p>
        <div className={styles.applicationMeta}>
          <span>{formatDate(application.submittedAt)}</span>
          <span>{formatAmount(application.amount)} SEK</span>
        </div>
      </div>
      <details className={styles.details}>
        <summary>Visa beslutsinformation</summary>
        <p>{application.scoringResult.decisionReason}</p>
      </details>
    </article>
  )
}

export function OverviewPage() {
  useDocumentTitle('Översikt')
  const { user } = useAuth()
  const { cases, applicantMessages } = useCases()
  const companyUser = user?.role === 'client' ? user : null
  const companyCases = companyUser
    ? cases
        .filter((item) => item.orgNumber === companyUser.orgNumber || item.companyName === companyUser.companyName)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    : []
  const activeCases = companyCases.filter((item) => item.status === 'UNDER_REVIEW' || item.status === 'PENDING_DOCS')
  const latestApplication = companyCases[0]
  const companyCaseIds = new Set(companyCases.map((item) => item.id))
  const companyMessages = applicantMessages.filter((message) => companyCaseIds.has(message.caseId)).slice(0, 5)

  return (
    <div className={styles.overview}>
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.breadcrumb}>Kundportal&nbsp; / &nbsp;Översikt</p>
          <h1>Översikt</h1>
          <p className={styles.intro}>Välkommen{companyUser?.companyName ? `, ${companyUser.companyName}` : ''}. Här ser du företagets kreditansökningar.</p>
        </div>
        <Link to={ROUTES.wizard} className={styles.primaryLink}>Ny kreditansökan <span aria-hidden="true">→</span></Link>
      </div>

      <section className={styles.metrics} aria-label="Ansökningsöversikt">
        <article className={styles.metricCard}>
          <p>Aktiva ansökningar</p>
          <strong>{activeCases.length}</strong>
          <span>Under granskning eller väntar på komplettering</span>
        </article>
        <article className={styles.metricCard}>
          <p>Totalt antal ansökningar</p>
          <strong>{companyCases.length}</strong>
          <span>Registrerade för företaget</span>
        </article>
        <article className={styles.metricCard}>
          <p>Senaste ansökan</p>
          {latestApplication ? <strong className={styles.latestValue}>{formatDate(latestApplication.submittedAt)}</strong> : <strong className={styles.latestValue}>Ingen ännu</strong>}
          <span>{latestApplication ? <ApplicationStatusBadge status={latestApplication.status} /> : 'Starta en ansökan när det passar dig'}</span>
        </article>
      </section>

      {companyMessages.length ? (
        <section className={styles.messagesSection} aria-labelledby="messages-heading">
          <h2 id="messages-heading">Meddelanden</h2>
          <ul className={styles.messageList}>
            {companyMessages.map((message) => (
              <li key={message.id} className={message.read ? undefined : styles.unread}>
                <Link to={applicationStatusPath(message.caseId)} className={styles.applicationLink}>{message.subject}</Link>
                {message.read ? null : <span className={styles.newTag}>Nytt</span>}
                <span className={styles.messageDate}>{formatDate(message.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.applicationsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Mina ansökningar</h2>
            <p>Följ status och se beslutsinformation för företagets ansökningar.</p>
          </div>
          <span className={styles.count}>{companyCases.length} {companyCases.length === 1 ? 'ansökan' : 'ansökningar'}</span>
        </div>

        {companyCases.length ? (
          <div className={styles.applicationList}>
            {companyCases.map((application) => <ApplicationCard key={application.id} application={application} />)}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">▤</span>
            <h3>Inga ansökningar ännu</h3>
            <p>När du skickat in en kreditansökan visas den här med aktuell status.</p>
            <Link to={ROUTES.wizard} className={styles.secondaryLink}>Starta en ansökan</Link>
          </div>
        )}
      </section>

      <section className={styles.helpCard}>
        <div>
          <h2>Behöver du hjälp?</h2>
          <p>Kontakta kundservice om du har frågor om en pågående ansökan.</p>
        </div>
        <span>Kundservice&nbsp; · &nbsp;08-500 120 00</span>
      </section>
    </div>
  )
}
